from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from ..db import db_session
from ..utils import (
    bad_request,
    ensure_manual_food_history_table,
    map_meal_entry,
    not_found,
    ok,
    refresh_daily_summary,
    upsert_manual_food_history,
)

router = APIRouter(tags=["meal-entries"])


class MealEntryBase(BaseModel):
    user_id: int
    entry_date: date
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"]
    food_name: str = Field(..., min_length=1, max_length=120)
    brand: str | None = Field(default=None, max_length=120)
    serving_desc: str | None = Field(default=None, max_length=120)
    quantity: float = Field(default=1, gt=0)
    calories: float = Field(..., gt=0)
    protein_g: float = Field(default=0, ge=0)
    carbs_g: float = Field(default=0, ge=0)
    fat_g: float = Field(default=0, ge=0)
    note: str | None = Field(default=None, max_length=255)


class ManualMealEntryRequest(MealEntryBase):
    pass


class UpdateMealEntryRequest(MealEntryBase):
    pass


def _ensure_manual_food_history_state_table(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS manual_food_history_state (
          user_id BIGINT UNSIGNED NOT NULL,
          initialized_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id),
          CONSTRAINT fk_manual_food_history_state_user
            FOREIGN KEY (user_id) REFERENCES users (id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )


def _mark_manual_food_history_initialized(cursor, user_id: int):
    _ensure_manual_food_history_state_table(cursor)
    cursor.execute(
        """
        INSERT INTO manual_food_history_state (user_id)
        VALUES (%s)
        ON DUPLICATE KEY UPDATE initialized_at = initialized_at
        """,
        (user_id,),
    )


def _bootstrap_manual_food_history(cursor, user_id: int):
    cursor.execute(
        """
        SELECT
          food_name,
          brand,
          serving_desc,
          calories,
          protein_g,
          carbs_g,
          fat_g,
          note,
          created_at
        FROM meal_entries
        WHERE user_id = %s
          AND entry_source = 'manual'
        ORDER BY created_at DESC, id DESC
        LIMIT 200
        """,
        (user_id,),
    )
    rows = cursor.fetchall()

    seen = set()
    for row in rows:
        dedupe_marker = (
            row["food_name"] or "",
            row["brand"] or "",
            row["serving_desc"] or "",
            float(row["calories"]),
            float(row["protein_g"]),
            float(row["carbs_g"]),
            float(row["fat_g"]),
            row["note"] or "",
        )
        if dedupe_marker in seen:
            continue
        seen.add(dedupe_marker)
        upsert_manual_food_history(
            cursor,
            user_id=user_id,
            food_name=row["food_name"],
            brand=row["brand"],
            serving_desc=row["serving_desc"],
            calories=float(row["calories"]),
            protein_g=float(row["protein_g"]),
            carbs_g=float(row["carbs_g"]),
            fat_g=float(row["fat_g"]),
            note=row["note"],
            last_used_at=row["created_at"],
        )


def _normalize_history_food_name(value: str | None) -> str:
    return " ".join((value or "").strip().lower().split())


@router.get("/meal-entries/history")
def list_manual_food_history(
    user_id: int = Query(..., gt=0),
    limit: int = Query(default=12, ge=1, le=50),
):
    with db_session(commit=True) as (_, cursor):
        ensure_manual_food_history_table(cursor)
        _ensure_manual_food_history_state_table(cursor)
        history_state = None
        cursor.execute(
            """
            SELECT
              id,
              food_name,
              brand,
              serving_desc,
              calories,
              protein_g,
              carbs_g,
              fat_g,
              note,
              last_used_at
            FROM manual_food_history
            WHERE user_id = %s
            ORDER BY last_used_at DESC, id DESC
            LIMIT %s
            """,
            (user_id, max(limit * 4, 50)),
        )
        rows = cursor.fetchall()

        if rows:
            _mark_manual_food_history_initialized(cursor, user_id)
        else:
            cursor.execute(
                """
                SELECT user_id
                FROM manual_food_history_state
                WHERE user_id = %s
                LIMIT 1
                """,
                (user_id,),
            )
            history_state = cursor.fetchone()

        if not rows and not history_state:
            _bootstrap_manual_food_history(cursor, user_id)
            _mark_manual_food_history_initialized(cursor, user_id)
            cursor.execute(
                """
                SELECT
                  id,
                  food_name,
                  brand,
                  serving_desc,
                  calories,
                  protein_g,
                  carbs_g,
                  fat_g,
                  note,
                  last_used_at
                FROM manual_food_history
                WHERE user_id = %s
                ORDER BY last_used_at DESC, id DESC
                LIMIT %s
                """,
                (user_id, max(limit * 4, 50)),
            )
            rows = cursor.fetchall()

    history = []
    seen_names = set()
    for row in rows:
        normalized_name = _normalize_history_food_name(row["food_name"])
        if normalized_name in seen_names:
            continue
        seen_names.add(normalized_name)
        history.append(
            {
                "template_id": row["id"],
                "food_name": row["food_name"],
                "brand": row["brand"],
                "serving_desc": row["serving_desc"],
                "calories": float(row["calories"]),
                "protein_g": float(row["protein_g"]),
                "carbs_g": float(row["carbs_g"]),
                "fat_g": float(row["fat_g"]),
                "note": row["note"],
                "last_used_at": row["last_used_at"].isoformat(),
            }
        )
        if len(history) >= limit:
            break

    return ok(history)


@router.delete("/meal-entries/history/{template_id}")
def delete_manual_food_history_item(
    template_id: int,
    user_id: int = Query(..., gt=0),
):
    with db_session(commit=True) as (_, cursor):
        ensure_manual_food_history_table(cursor)
        cursor.execute(
            """
            SELECT id
                 , food_name
            FROM manual_food_history
            WHERE id = %s AND user_id = %s
            LIMIT 1
            """,
            (template_id, user_id),
        )
        existing = cursor.fetchone()
        if not existing:
            not_found("Manual food history item not found")

        normalized_name = _normalize_history_food_name(existing["food_name"])
        cursor.execute(
            """
            SELECT id, food_name
            FROM manual_food_history
            WHERE user_id = %s
            """,
            (user_id,),
        )
        duplicate_rows = cursor.fetchall()
        target_ids = [
            row["id"]
            for row in duplicate_rows
            if _normalize_history_food_name(row["food_name"]) == normalized_name
        ]
        if not target_ids:
            not_found("Manual food history item not found")

        placeholders = ", ".join(["%s"] * len(target_ids))
        cursor.execute(
            f"DELETE FROM manual_food_history WHERE user_id = %s AND id IN ({placeholders})",
            (user_id, *target_ids),
        )
        if cursor.rowcount < 1:
            bad_request("Delete manual food history item failed")

    return ok(
        {"deleted": True, "template_id": template_id},
        message="manual food history item deleted",
    )


@router.get("/meal-entries")
def list_meal_entries(
    user_id: int = Query(..., gt=0),
    date_value: date = Query(..., alias="date"),
    meal_type: Literal["breakfast", "lunch", "dinner", "snack"] | None = Query(
        default=None
    ),
):
    sql = """
        SELECT *
        FROM meal_entries
        WHERE user_id = %s
          AND entry_date = %s
    """
    params: list = [user_id, date_value]

    if meal_type:
        sql += " AND meal_type = %s"
        params.append(meal_type)

    sql += " ORDER BY FIELD(meal_type, 'breakfast', 'lunch', 'dinner', 'snack'), created_at ASC"

    with db_session() as (_, cursor):
        cursor.execute(sql, tuple(params))
        rows = cursor.fetchall()

    return ok([map_meal_entry(row) for row in rows])


@router.post("/meal-entries/manual")
def create_manual_meal_entry(payload: ManualMealEntryRequest):
    with db_session(commit=True) as (_, cursor):
        cursor.execute(
            """
            INSERT INTO meal_entries (
              user_id, entry_source, entry_date, meal_type, food_name, brand, serving_desc,
              quantity, calories, protein_g, carbs_g, fat_g, note, consumed_at
            ) VALUES (%s, 'manual', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """,
            (
                payload.user_id,
                payload.entry_date,
                payload.meal_type,
                payload.food_name,
                payload.brand,
                payload.serving_desc,
                payload.quantity,
                payload.calories,
                payload.protein_g,
                payload.carbs_g,
                payload.fat_g,
                payload.note,
            ),
        )
        entry_id = cursor.lastrowid
        upsert_manual_food_history(
            cursor,
            user_id=payload.user_id,
            food_name=payload.food_name,
            brand=payload.brand,
            serving_desc=payload.serving_desc,
            calories=payload.calories,
            protein_g=payload.protein_g,
            carbs_g=payload.carbs_g,
            fat_g=payload.fat_g,
            note=payload.note,
        )
        refresh_daily_summary(cursor, payload.user_id, payload.entry_date)
        cursor.execute("SELECT * FROM meal_entries WHERE id = %s LIMIT 1", (entry_id,))
        entry = cursor.fetchone()

    return ok(map_meal_entry(entry), message="meal entry created")


@router.put("/meal-entries/{entry_id}")
def update_meal_entry(entry_id: int, payload: UpdateMealEntryRequest):
    with db_session(commit=True) as (_, cursor):
        cursor.execute(
            "SELECT * FROM meal_entries WHERE id = %s AND user_id = %s LIMIT 1",
            (entry_id, payload.user_id),
        )
        existing = cursor.fetchone()
        if not existing:
            not_found("Meal entry not found")

        cursor.execute(
            """
            UPDATE meal_entries
            SET entry_date = %s,
                meal_type = %s,
                food_name = %s,
                brand = %s,
                serving_desc = %s,
                quantity = %s,
                calories = %s,
                protein_g = %s,
                carbs_g = %s,
                fat_g = %s,
                note = %s
            WHERE id = %s AND user_id = %s
            """,
            (
                payload.entry_date,
                payload.meal_type,
                payload.food_name,
                payload.brand,
                payload.serving_desc,
                payload.quantity,
                payload.calories,
                payload.protein_g,
                payload.carbs_g,
                payload.fat_g,
                payload.note,
                entry_id,
                payload.user_id,
            ),
        )

        old_date = existing["entry_date"]
        refresh_daily_summary(cursor, payload.user_id, old_date)
        if payload.entry_date != old_date:
            refresh_daily_summary(cursor, payload.user_id, payload.entry_date)

        if existing["entry_source"] == "manual":
            upsert_manual_food_history(
                cursor,
                user_id=payload.user_id,
                food_name=payload.food_name,
                brand=payload.brand,
                serving_desc=payload.serving_desc,
                calories=payload.calories,
                protein_g=payload.protein_g,
                carbs_g=payload.carbs_g,
                fat_g=payload.fat_g,
                note=payload.note,
            )

        cursor.execute("SELECT * FROM meal_entries WHERE id = %s LIMIT 1", (entry_id,))
        entry = cursor.fetchone()

    return ok(map_meal_entry(entry), message="meal entry updated")


@router.delete("/meal-entries/{entry_id}")
def delete_meal_entry(entry_id: int, user_id: int = Query(..., gt=0)):
    with db_session(commit=True) as (_, cursor):
        cursor.execute(
            "SELECT * FROM meal_entries WHERE id = %s AND user_id = %s LIMIT 1",
            (entry_id, user_id),
        )
        existing = cursor.fetchone()
        if not existing:
            not_found("Meal entry not found")

        cursor.execute(
            "DELETE FROM meal_entries WHERE id = %s AND user_id = %s",
            (entry_id, user_id),
        )
        if cursor.rowcount != 1:
            bad_request("Delete meal entry failed")

        refresh_daily_summary(cursor, user_id, existing["entry_date"])

    return ok({"deleted": True, "entry_id": entry_id}, message="meal entry deleted")
