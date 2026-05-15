from __future__ import annotations

from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Query

from ..db import db_session
from ..utils import (
    MEAL_LABELS,
    MEAL_ORDER,
    ensure_daily_quota,
    get_energy_reward_status,
    map_meal_entry,
    ok,
    refresh_daily_summary,
)

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
def get_dashboard(user_id: int = Query(..., gt=0), date_value: date = Query(..., alias="date")):
    with db_session(commit=True) as (_, cursor):
        refresh_daily_summary(cursor, user_id, date_value)
        quota = ensure_daily_quota(cursor, user_id, date_value)
        rewards = get_energy_reward_status(cursor, user_id, date_value)

        cursor.execute(
            """
            SELECT *
            FROM daily_nutrition_summary
            WHERE user_id = %s AND summary_date = %s
            LIMIT 1
            """,
            (user_id, date_value),
        )
        summary = cursor.fetchone()

        cursor.execute(
            """
            SELECT balance
            FROM wallet_accounts
            WHERE user_id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        wallet = cursor.fetchone() or {"balance": 0}

        cursor.execute(
            """
            SELECT *
            FROM meal_entries
            WHERE user_id = %s AND entry_date = %s
            ORDER BY FIELD(meal_type, 'breakfast', 'lunch', 'dinner', 'snack'), created_at ASC
            """,
            (user_id, date_value),
        )
        rows = cursor.fetchall()

    grouped: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        grouped[row["meal_type"]].append(map_meal_entry(row))

    meals = []
    for meal_type in MEAL_ORDER:
        items = grouped.get(meal_type, [])
        meals.append(
            {
                "meal_type": meal_type,
                "meal_type_label": MEAL_LABELS[meal_type],
                "item_count": len(items),
                "total_calories": sum(item["calories"] for item in items),
                "items": items,
            }
        )

    summary = summary or {
        "target_calories": 0,
        "consumed_calories": 0,
        "remaining_calories": 0,
        "target_protein_g": 0,
        "consumed_protein_g": 0,
        "target_carbs_g": 0,
        "consumed_carbs_g": 0,
        "target_fat_g": 0,
        "consumed_fat_g": 0,
    }

    return ok(
        {
            "date": date_value.isoformat(),
            "calories": {
                "target": float(summary["target_calories"]),
                "consumed": float(summary["consumed_calories"]),
                "remaining": float(summary["remaining_calories"]),
            },
            "macros": {
                "protein": {
                    "current": float(summary["consumed_protein_g"]),
                    "target": float(summary["target_protein_g"]),
                },
                "carbs": {
                    "current": float(summary["consumed_carbs_g"]),
                    "target": float(summary["target_carbs_g"]),
                },
                "fat": {
                    "current": float(summary["consumed_fat_g"]),
                    "target": float(summary["target_fat_g"]),
                },
            },
            "quota": {
                "free_quota_total": quota["free_quota_total"],
                "free_quota_used": quota["free_quota_used"],
                "free_quota_remaining": max(
                    quota["free_quota_total"] - quota["free_quota_used"], 0
                ),
                "paid_scan_count": quota["paid_scan_count"],
            },
            "wallet": {
                "coins": wallet["balance"],
            },
            "rewards": rewards,
            "meals": meals,
        }
    )
