from __future__ import annotations

import os
from datetime import date
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, File, Form, Query, UploadFile
from pydantic import BaseModel, Field

from ..config import settings
from ..db import db_session
from ..services.gemini_openai_v2 import analyze_food_image, analyze_food_text
from ..utils import (
    bad_request,
    ensure_daily_quota,
    ensure_wallet_account,
    generate_session_no,
    ok,
    refresh_daily_summary,
    upsert_manual_food_history,
)

router = APIRouter(tags=["ai"])


class AiFoodPayload(BaseModel):
    food_name: str = Field(..., min_length=1, max_length=120)
    unit_label: str | None = Field(default=None, max_length=100)
    base_calories: float = Field(..., ge=0)
    base_protein_g: float = Field(..., ge=0)
    base_carbs_g: float = Field(..., ge=0)
    base_fat_g: float = Field(..., ge=0)
    quantity: float = Field(default=1, gt=0)
    sort_no: int = Field(default=0, ge=0)


class SaveAiScanRequest(BaseModel):
    user_id: int
    entry_date: date
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"]
    foods: list[AiFoodPayload]


class AnalyzeFoodTextRequest(BaseModel):
    user_id: int
    entry_date: date
    description: str = Field(..., min_length=1, max_length=1000)


def _calculate_totals(foods: list[dict]):
    return {
        "total_calories": sum(float(item["base_calories"]) * float(item["quantity"]) for item in foods),
        "total_protein_g": sum(float(item["base_protein_g"]) * float(item["quantity"]) for item in foods),
        "total_carbs_g": sum(float(item["base_carbs_g"]) * float(item["quantity"]) for item in foods),
        "total_fat_g": sum(float(item["base_fat_g"]) * float(item["quantity"]) for item in foods),
    }


def _ensure_ai_usage_available(cursor, user_id: int, coin_cost: int):
    if coin_cost <= 0:
        return

    cursor.execute(
        """
        SELECT balance
        FROM wallet_accounts
        WHERE user_id = %s
        LIMIT 1
        FOR UPDATE
        """,
        (user_id,),
    )
    wallet = cursor.fetchone()
    if not wallet or int(wallet["balance"]) < coin_cost:
        bad_request("能量币不足，请先充值")


def _consume_ai_usage(cursor, user_id: int, session_id: int, coin_cost: int):
    if coin_cost == 0:
        cursor.execute(
            """
            UPDATE users
            SET today_ai_scan_count = today_ai_scan_count + 1
            WHERE id = %s
            """,
            (user_id,),
        )
        return

    cursor.execute(
        """
        SELECT id, balance
        FROM wallet_accounts
        WHERE user_id = %s
        LIMIT 1
        FOR UPDATE
        """,
        (user_id,),
    )
    wallet = cursor.fetchone()
    if not wallet or int(wallet["balance"]) < coin_cost:
        bad_request("能量币不足，请先充值")

    next_balance = int(wallet["balance"]) - coin_cost
    cursor.execute(
        """
        UPDATE wallet_accounts
        SET balance = %s,
            total_spent = total_spent + %s
        WHERE user_id = %s
        """,
        (next_balance, coin_cost, user_id),
    )
    cursor.execute(
        """
        INSERT INTO wallet_transactions (
          wallet_account_id, user_id, txn_type, biz_type, biz_id,
          coins_delta, balance_after, amount_cny, remark
        ) VALUES (%s, %s, 'consume', 'ai_scan', %s, %s, %s, NULL, 'AI 识别扣费')
        """,
        (wallet["id"], user_id, session_id, -coin_cost, next_balance),
    )


@router.post("/ai-scans/analyze")
async def analyze_ai_scan(
    user_id: int = Form(...),
    entry_date: date = Form(...),
    source_type: Literal["camera", "album", "other"] = Form(default="camera"),
    file: UploadFile = File(...),
):
    with db_session(commit=True) as (_, cursor):
        ensure_wallet_account(cursor, user_id)
        quota = ensure_daily_quota(cursor, user_id, entry_date)
        free_remaining = max(quota["free_quota_total"] - quota["free_quota_used"], 0)
        coin_cost = 0 if free_remaining > 0 else settings.ai_scan_coin_cost
        _ensure_ai_usage_available(cursor, user_id, coin_cost)

        image_bytes = await file.read()
        if not image_bytes:
            bad_request("uploaded image is empty")

        analysis = analyze_food_image(
            image_bytes=image_bytes,
            mime_type=file.content_type or "image/jpeg",
        )

        session_no = generate_session_no()
        totals = _calculate_totals(analysis["foods"])

        cursor.execute(
            """
            INSERT INTO ai_scan_sessions (
              user_id, session_no, image_url, image_hash, source_type, recognition_status,
              selected_meal_type, total_calories, total_protein_g, total_carbs_g, total_fat_g,
              is_vip_free, free_quota_used, coin_cost, raw_result_json
            ) VALUES (%s, %s, NULL, NULL, 'camera', 'success', 'lunch', %s, %s, %s, %s, %s, 0, %s, NULL)
            """,
            (
                user_id,
                session_no,
                totals["total_calories"],
                totals["total_protein_g"],
                totals["total_carbs_g"],
                totals["total_fat_g"],
                1 if coin_cost == 0 else 0,
                coin_cost,
            ),
        )
        session_id = cursor.lastrowid
        _consume_ai_usage(cursor, user_id, session_id, coin_cost)

        cursor.executemany(
            """
            INSERT INTO ai_scan_food_items (
              session_id, food_name, unit_label, base_calories, base_protein_g,
              base_carbs_g, base_fat_g, quantity, sort_no
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            [
                (
                    session_id,
                    item["food_name"],
                    item["unit_label"],
                    item["base_calories"],
                    item["base_protein_g"],
                    item["base_carbs_g"],
                    item["base_fat_g"],
                    item["quantity"],
                    item["sort_no"],
                )
                for item in analysis["foods"]
            ],
        )

    return ok(
        {
            "session_id": session_id,
            "session_no": session_no,
            "title": analysis["title"],
            "subtitle": analysis["subtitle"],
            "quota": {
                "free_quota_total": quota["free_quota_total"],
                "free_quota_used": quota["free_quota_used"] + (1 if coin_cost == 0 else 0),
                "free_quota_remaining": max(
                    quota["free_quota_total"] - quota["free_quota_used"] - (1 if coin_cost == 0 else 0),
                    0,
                ),
                "coin_cost": coin_cost,
            },
            "foods": analysis["foods"],
            **totals,
        }
    )


@router.post("/ai-scans/analyze-text")
def analyze_ai_text(payload: AnalyzeFoodTextRequest):
    with db_session(commit=True) as (_, cursor):
        ensure_wallet_account(cursor, payload.user_id)
        quota = ensure_daily_quota(cursor, payload.user_id, payload.entry_date)
        free_remaining = max(quota["free_quota_total"] - quota["free_quota_used"], 0)
        coin_cost = 0 if free_remaining > 0 else settings.ai_scan_coin_cost
        _ensure_ai_usage_available(cursor, payload.user_id, coin_cost)

        analysis = analyze_food_text(payload.description)

        session_no = generate_session_no()
        totals = _calculate_totals(analysis["foods"])

        cursor.execute(
            """
            INSERT INTO ai_scan_sessions (
              user_id, session_no, image_url, image_hash, source_type, recognition_status,
              selected_meal_type, total_calories, total_protein_g, total_carbs_g, total_fat_g,
              is_vip_free, free_quota_used, coin_cost, raw_result_json
            ) VALUES (%s, %s, NULL, NULL, 'other', 'success', 'lunch', %s, %s, %s, %s, %s, 0, %s, NULL)
            """,
            (
                payload.user_id,
                session_no,
                totals["total_calories"],
                totals["total_protein_g"],
                totals["total_carbs_g"],
                totals["total_fat_g"],
                1 if coin_cost == 0 else 0,
                coin_cost,
            ),
        )
        session_id = cursor.lastrowid
        _consume_ai_usage(cursor, payload.user_id, session_id, coin_cost)

        cursor.executemany(
            """
            INSERT INTO ai_scan_food_items (
              session_id, food_name, unit_label, base_calories, base_protein_g,
              base_carbs_g, base_fat_g, quantity, sort_no
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            [
                (
                    session_id,
                    item["food_name"],
                    item["unit_label"],
                    item["base_calories"],
                    item["base_protein_g"],
                    item["base_carbs_g"],
                    item["base_fat_g"],
                    item["quantity"],
                    item["sort_no"],
                )
                for item in analysis["foods"]
            ],
        )

    return ok(
        {
            "session_id": session_id,
            "session_no": session_no,
            "title": analysis["title"],
            "subtitle": analysis["subtitle"],
            "quota": {
                "free_quota_total": quota["free_quota_total"],
                "free_quota_used": quota["free_quota_used"] + (1 if coin_cost == 0 else 0),
                "free_quota_remaining": max(
                    quota["free_quota_total"] - quota["free_quota_used"] - (1 if coin_cost == 0 else 0),
                    0,
                ),
                "coin_cost": coin_cost,
            },
            "foods": analysis["foods"],
            **totals,
        }
    )


@router.get("/ai-scans/{session_id}")
def get_ai_scan(session_id: int, user_id: int = Query(..., gt=0)):
    with db_session() as (_, cursor):
        cursor.execute(
            """
            SELECT *
            FROM ai_scan_sessions
            WHERE id = %s AND user_id = %s
            LIMIT 1
            """,
            (session_id, user_id),
        )
        session = cursor.fetchone()
        if not session:
            bad_request("AI session not found")

        cursor.execute(
            """
            SELECT *
            FROM ai_scan_food_items
            WHERE session_id = %s
            ORDER BY sort_no ASC, id ASC
            """,
            (session_id,),
        )
        foods = cursor.fetchall()

    return ok(
        {
            "session_id": session["id"],
            "session_no": session["session_no"],
            "recognition_status": session["recognition_status"],
            "selected_meal_type": session["selected_meal_type"],
            "coin_cost": session["coin_cost"],
            "foods": [
                {
                    "id": row["id"],
                    "food_name": row["food_name"],
                    "unit_label": row["unit_label"],
                    "base_calories": float(row["base_calories"]),
                    "base_protein_g": float(row["base_protein_g"]),
                    "base_carbs_g": float(row["base_carbs_g"]),
                    "base_fat_g": float(row["base_fat_g"]),
                    "quantity": float(row["quantity"]),
                    "sort_no": row["sort_no"],
                }
                for row in foods
            ],
        }
    )


@router.post("/ai-scans/{session_id}/save")
def save_ai_scan(session_id: int, payload: SaveAiScanRequest):
    if not payload.foods:
        bad_request("foods cannot be empty")

    with db_session(commit=True) as (_, cursor):
        ensure_wallet_account(cursor, payload.user_id)

        cursor.execute(
            """
            SELECT *
            FROM ai_scan_sessions
            WHERE id = %s AND user_id = %s
            LIMIT 1
            FOR UPDATE
            """,
            (session_id, payload.user_id),
        )
        session = cursor.fetchone()
        if not session:
            bad_request("AI session not found")
        if session["recognition_status"] == "saved":
            bad_request("AI session already saved")

        coin_cost = int(session["coin_cost"])

        totals = _calculate_totals([item.model_dump() for item in payload.foods])

        cursor.execute("DELETE FROM ai_scan_food_items WHERE session_id = %s", (session_id,))
        cursor.executemany(
            """
            INSERT INTO ai_scan_food_items (
              session_id, food_name, unit_label, base_calories, base_protein_g,
              base_carbs_g, base_fat_g, quantity, sort_no
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            [
                (
                    session_id,
                    item.food_name,
                    item.unit_label,
                    item.base_calories,
                    item.base_protein_g,
                    item.base_carbs_g,
                    item.base_fat_g,
                    item.quantity,
                    item.sort_no,
                )
                for item in payload.foods
            ],
        )

        cursor.executemany(
            """
            INSERT INTO meal_entries (
              user_id, entry_source, entry_date, meal_type, food_name, serving_desc,
              quantity, calories, protein_g, carbs_g, fat_g, ai_session_id, consumed_at
            ) VALUES (%s, 'ai', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """,
            [
                (
                    payload.user_id,
                    payload.entry_date,
                    payload.meal_type,
                    item.food_name,
                    item.unit_label,
                    item.quantity,
                    item.base_calories * item.quantity,
                    item.base_protein_g * item.quantity,
                    item.base_carbs_g * item.quantity,
                    item.base_fat_g * item.quantity,
                    session_id,
                )
                for item in payload.foods
            ],
        )

        for item in payload.foods:
            upsert_manual_food_history(
                cursor,
                user_id=payload.user_id,
                food_name=item.food_name,
                brand="AI 识别",
                serving_desc=item.unit_label,
                calories=item.base_calories,
                protein_g=item.base_protein_g,
                carbs_g=item.base_carbs_g,
                fat_g=item.base_fat_g,
                note="由 AI 识别保存",
            )

        cursor.execute(
            """
            UPDATE ai_scan_sessions
            SET recognition_status = 'saved',
                selected_meal_type = %s,
                total_calories = %s,
                total_protein_g = %s,
                total_carbs_g = %s,
                total_fat_g = %s,
                is_vip_free = %s,
                free_quota_used = %s,
                coin_cost = %s
            WHERE id = %s AND user_id = %s
            """,
            (
                payload.meal_type,
                totals["total_calories"],
                totals["total_protein_g"],
                totals["total_carbs_g"],
                totals["total_fat_g"],
                1 if coin_cost == 0 else 0,
                1 if coin_cost == 0 else 0,
                coin_cost,
                session_id,
                payload.user_id,
            ),
        )

        refresh_daily_summary(cursor, payload.user_id, payload.entry_date)

    return ok(
        {
            "saved": True,
            "session_id": session_id,
            "entry_date": payload.entry_date.isoformat(),
            "meal_type": payload.meal_type,
            "coin_cost": coin_cost,
            **totals,
        },
        message="ai scan saved",
    )


@router.delete("/ai-scans/{session_id}")
def delete_ai_scan(session_id: int, user_id: int = Query(..., gt=0)):
    """删除AI识别会话及其关联的照片文件"""
    with db_session(commit=True) as (_, cursor):
        # 1. 查询会话信息
        cursor.execute(
            """
            SELECT id, user_id, image_url, recognition_status
            FROM ai_scan_sessions
            WHERE id = %s AND user_id = %s
            LIMIT 1
            """,
            (session_id, user_id),
        )
        session = cursor.fetchone()
        if not session:
            bad_request("AI session not found")

        # 2. 如果已保存为饮食记录,需要先删除关联的饮食记录
        if session["recognition_status"] == "saved":
            cursor.execute(
                """
                SELECT id, entry_date
                FROM meal_entries
                WHERE ai_session_id = %s AND user_id = %s
                """,
                (session_id, user_id),
            )
            meal_entries_list = cursor.fetchall()
            
            # 删除关联的饮食记录
            cursor.execute(
                "DELETE FROM meal_entries WHERE ai_session_id = %s AND user_id = %s",
                (session_id, user_id),
            )
            
            # 刷新每日营养摘要
            if meal_entries_list:
                entry_dates = set(entry["entry_date"] for entry in meal_entries_list)
                for entry_date in entry_dates:
                    refresh_daily_summary(cursor, user_id, entry_date)

        # 3. 删除关联的食物项
        cursor.execute(
            "DELETE FROM ai_scan_food_items WHERE session_id = %s",
            (session_id,),
        )

        # 4. 删除AI会话记录
        cursor.execute(
            "DELETE FROM ai_scan_sessions WHERE id = %s AND user_id = %s",
            (session_id, user_id),
        )

    # 5. 删除照片文件(如果有)
    image_url = session.get("image_url")
    if image_url:
        try:
            # 解析文件路径: /media/xxx/yyy.jpg -> storage/xxx/yyy.jpg
            if image_url.startswith("/media/"):
                relative_path = image_url[len("/media/"):]
                storage_root = Path(__file__).resolve().parents[2] / "storage"
                file_path = storage_root / relative_path
                
                if file_path.exists():
                    os.remove(file_path)
        except Exception as e:
            # 文件删除失败不影响数据库删除
            print(f"Failed to delete image file: {image_url}, error: {e}")

    return ok({"deleted": True, "session_id": session_id}, message="ai scan deleted")
