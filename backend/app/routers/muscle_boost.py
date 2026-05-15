from __future__ import annotations

import json
import os
from datetime import date
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, File, Form, Query, UploadFile

from ..config import settings
from ..db import db_session
from ..services.gemini_openai_v2 import analyze_muscle_image
from ..services.muscle_boost import (
    build_muscle_boost_result,
    save_muscle_boost_assets,
)
from ..utils import (
    FEATURE_MUSCLE_BOOST,
    bad_request,
    ensure_daily_feature_quota,
    ensure_feature_tables,
    ensure_wallet_account,
    generate_job_no,
    get_active_membership,
    ok,
)

router = APIRouter(tags=["muscle-boost"])


def _serialize_job(row: dict):
    focus = row.get("enhancement_focus_json")
    if isinstance(focus, str):
        try:
            focus = json.loads(focus)
        except json.JSONDecodeError:
            focus = []

    return {
        "id": row["id"],
        "job_no": row["job_no"],
        "title": row["title"] or "变大变强",
        "subtitle": row["subtitle"] or "已完成肌肉宽度增强",
        "source_image_url": row["source_image_url"],
        "result_image_url": row["result_image_url"],
        "status": row["status"],
        "enhancement_focus": focus if isinstance(focus, list) else [],
        "is_membership_free": bool(row["is_membership_free"]),
        "coin_cost": row["coin_cost"],
        "created_at": row["created_at"].isoformat(),
    }


@router.get("/membership/features/muscle-boost")
def get_muscle_boost_overview(
    user_id: int = Query(..., gt=0),
    date_value: date = Query(..., alias="date"),
):
    with db_session(commit=True) as (_, cursor):
        ensure_feature_tables(cursor)
        ensure_wallet_account(cursor, user_id)
        quota = ensure_daily_feature_quota(cursor, user_id, FEATURE_MUSCLE_BOOST, date_value)
        membership = get_active_membership(cursor, user_id)

        cursor.execute(
            """
            SELECT id, job_no, title, subtitle, source_image_url, result_image_url, status,
                   enhancement_focus_json, is_membership_free, coin_cost, created_at
            FROM muscle_boost_jobs
            WHERE user_id = %s
            ORDER BY created_at DESC, id DESC
            LIMIT 6
            """,
            (user_id,),
        )
        jobs = cursor.fetchall()

    return ok(
        {
            "feature_code": FEATURE_MUSCLE_BOOST,
            "feature_name": "变大变强",
            "membership_active": membership is not None,
            "membership_plan_name": membership["plan_name"] if membership else None,
            "coin_cost": settings.muscle_boost_coin_cost,
            "quota": {
                "date": date_value.isoformat(),
                "free_quota_total": int(quota["free_quota_total"]),
                "free_quota_used": int(quota["free_quota_used"]),
                "free_quota_remaining": max(
                    int(quota["free_quota_total"]) - int(quota["free_quota_used"]),
                    0,
                ),
                "paid_use_count": int(quota["paid_use_count"]),
            },
            "recent_jobs": [_serialize_job(row) for row in jobs],
        }
    )


@router.post("/membership/features/muscle-boost/create")
async def create_muscle_boost_job(
    user_id: int = Form(...),
    use_date: date = Form(...),
    source_type: Literal["camera", "album", "other"] = Form(default="camera"),
    prompt_type: Literal["natural", "fitness"] = Form(default="natural"),
    file: UploadFile = File(...),
):
    image_bytes = await file.read()
    if not image_bytes:
        bad_request("上传的图片为空")

    analysis = analyze_muscle_image(
        image_bytes=image_bytes,
        mime_type=file.content_type or "image/jpeg",
    )
    if not analysis["is_muscle_photo"]:
        bad_request(analysis["reason"] or "请上传肌肉训练或健身展示照片")

    job_no = generate_job_no("muscle")
    result_bytes, image_meta = build_muscle_boost_result(
        image_bytes,
        prompt_type=prompt_type,
    )
    source_extension = Path(file.filename or "upload.jpg").suffix or ".jpg"
    asset_urls = save_muscle_boost_assets(
        job_no=job_no,
        source_bytes=image_bytes,
        result_bytes=result_bytes,
        source_extension=source_extension,
    )

    with db_session(commit=True) as (_, cursor):
        ensure_feature_tables(cursor)
        ensure_wallet_account(cursor, user_id)
        quota = ensure_daily_feature_quota(cursor, user_id, FEATURE_MUSCLE_BOOST, use_date)
        membership = get_active_membership(cursor, user_id)

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

        free_remaining = max(int(quota["free_quota_total"]) - int(quota["free_quota_used"]), 0)
        coin_cost = 0 if free_remaining > 0 else settings.muscle_boost_coin_cost
        if coin_cost > 0 and int(wallet["balance"]) < coin_cost:
            bad_request("能量币不足，请先开通会员或充值")

        cursor.execute(
            """
            INSERT INTO muscle_boost_jobs (
              user_id, job_no, source_image_url, result_image_url, source_type, status,
              title, subtitle, enhancement_focus_json, analysis_json,
              is_membership_free, coin_cost, error_message
            ) VALUES (%s, %s, %s, %s, %s, 'success', %s, %s, %s, %s, %s, %s, NULL)
            """,
            (
                user_id,
                job_no,
                asset_urls["source_image_url"],
                asset_urls["result_image_url"],
                source_type,
                analysis["title"],
                analysis["subtitle"],
                json.dumps(analysis["enhancement_focus"], ensure_ascii=False),
                json.dumps(analysis, ensure_ascii=False),
                1 if coin_cost == 0 else 0,
                coin_cost,
            ),
        )
        job_id = cursor.lastrowid

        if coin_cost == 0:
            cursor.execute(
                """
                UPDATE users
                SET today_muscle_boost_count = today_muscle_boost_count + 1
                WHERE id = %s
                """,
                (user_id,),
            )
        else:
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
                ) VALUES (%s, %s, 'consume', 'system', %s, %s, %s, NULL, '变大变强图片增强')
                """,
                (wallet["id"], user_id, job_id, -coin_cost, next_balance),
            )

        # Fetch final state for response
        quota = ensure_daily_feature_quota(cursor, user_id, FEATURE_MUSCLE_BOOST, use_date)

    return ok(
        {
            "job": {
                "id": job_id,
                "job_no": job_no,
                "title": analysis["title"],
                "subtitle": analysis["subtitle"],
                "source_image_url": asset_urls["source_image_url"],
                "result_image_url": asset_urls["result_image_url"],
                "status": "success",
                "enhancement_focus": analysis["enhancement_focus"],
                "is_membership_free": coin_cost == 0,
                "coin_cost": coin_cost,
                "created_at": use_date.isoformat(),
            },
            "membership_active": membership is not None,
            "coin_cost": coin_cost,
            "image_meta": image_meta,
            "quota": {
                "date": use_date.isoformat(),
                "free_quota_total": int(quota["free_quota_total"]),
                "free_quota_used": int(quota["free_quota_used"]),
                "free_quota_remaining": max(
                    int(quota["free_quota_total"]) - int(quota["free_quota_used"]),
                    0,
                ),
                "paid_use_count": int(quota["paid_use_count"]),
            },
        },
        message="muscle boost created",
    )


@router.delete("/membership/features/muscle-boost/{job_id}")
def delete_muscle_boost_job(job_id: int, user_id: int = Query(..., gt=0)):
    """删除肌肉增强任务及其关联的照片文件"""
    with db_session(commit=True) as (_, cursor):
        # 1. 查询任务信息
        cursor.execute(
            """
            SELECT id, user_id, job_no, source_image_url, result_image_url
            FROM muscle_boost_jobs
            WHERE id = %s AND user_id = %s
            LIMIT 1
            """,
            (job_id, user_id),
        )
        job = cursor.fetchone()
        if not job:
            bad_request("Muscle boost job not found")

        # 2. 删除任务记录
        cursor.execute(
            "DELETE FROM muscle_boost_jobs WHERE id = %s AND user_id = %s",
            (job_id, user_id),
        )

    # 3. 删除照片文件
    storage_root = Path(__file__).resolve().parents[2] / "storage" / "muscle_boost"
    
    # 删除源图片
    source_image_url = job.get("source_image_url")
    if source_image_url:
        try:
            if source_image_url.startswith("/media/muscle_boost/"):
                relative_path = source_image_url[len("/media/muscle_boost/"):]
                file_path = storage_root / relative_path
                
                if file_path.exists():
                    os.remove(file_path)
        except Exception as e:
            print(f"Failed to delete source image: {source_image_url}, error: {e}")

    # 删除结果图片
    result_image_url = job.get("result_image_url")
    if result_image_url:
        try:
            if result_image_url.startswith("/media/muscle_boost/"):
                relative_path = result_image_url[len("/media/muscle_boost/"):]
                file_path = storage_root / relative_path
                
                if file_path.exists():
                    os.remove(file_path)
        except Exception as e:
            print(f"Failed to delete result image: {result_image_url}, error: {e}")

    return ok({"deleted": True, "job_id": job_id, "job_no": job["job_no"]}, message="muscle boost job deleted")
