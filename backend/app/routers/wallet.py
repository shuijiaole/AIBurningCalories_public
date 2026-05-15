from __future__ import annotations

from fastapi import APIRouter, Query

from ..db import db_session
from ..utils import ensure_catalog_seeded, get_active_membership, ok

router = APIRouter(tags=["wallet"])


@router.get("/wallet/overview")
def get_wallet_overview(user_id: int = Query(..., gt=0)):
    with db_session(commit=True) as (_, cursor):
        ensure_catalog_seeded(cursor)
        cursor.execute(
            """
            SELECT balance, total_recharged, total_bonus, total_spent
            FROM wallet_accounts
            WHERE user_id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        wallet = cursor.fetchone() or {
            "balance": 0,
            "total_recharged": 0,
            "total_bonus": 0,
            "total_spent": 0,
        }

        cursor.execute(
            """
            SELECT COALESCE(SUM(ABS(coins_delta)), 0) AS monthly_spent
            FROM wallet_transactions
            WHERE user_id = %s
              AND coins_delta < 0
              AND DATE_FORMAT(created_at, '%%Y-%%m') = DATE_FORMAT(CURDATE(), '%%Y-%%m')
            """,
            (user_id,),
        )
        monthly = cursor.fetchone() or {"monthly_spent": 0}

        membership = get_active_membership(cursor, user_id)

        cursor.execute(
            """
            SELECT id, txn_type, biz_type, biz_id, coins_delta, balance_after, amount_cny, remark, created_at
            FROM wallet_transactions
            WHERE user_id = %s
            ORDER BY created_at DESC, id DESC
            LIMIT 10
            """,
            (user_id,),
        )
        transactions = cursor.fetchall()

    return ok(
        {
            "balance": wallet["balance"],
            "total_recharged": wallet["total_recharged"],
            "total_bonus": wallet["total_bonus"],
            "total_spent": wallet["total_spent"],
            "monthly_spent": monthly["monthly_spent"],
            "membership": (
                {
                    "plan_name": membership["plan_name"],
                    "status": membership["status"],
                    "started_at": membership["started_at"].isoformat()
                    if membership["started_at"]
                    else None,
                    "expires_at": membership["expires_at"].isoformat()
                    if membership["expires_at"]
                    else None,
                }
                if membership
                else None
            ),
            "transactions": [
                {
                    **row,
                    "amount_cny": float(row["amount_cny"]) if row["amount_cny"] is not None else None,
                    "created_at": row["created_at"].isoformat(),
                }
                for row in transactions
            ],
        }
    )


@router.get("/recharge-packages")
def get_recharge_packages():
    with db_session(commit=True) as (_, cursor):
        ensure_catalog_seeded(cursor)
        cursor.execute(
            """
            SELECT id, package_code, package_name, coins, bonus_coins, price_cny, sort_no
            FROM recharge_packages
            WHERE is_active = 1
            ORDER BY sort_no ASC, id ASC
            """
        )
        rows = cursor.fetchall()

    return ok(
        [
            {
                "id": row["id"],
                "package_code": row["package_code"],
                "package_name": row["package_name"],
                "coins": row["coins"],
                "bonus_coins": row["bonus_coins"],
                "price_cny": float(row["price_cny"]),
                "sort_no": row["sort_no"],
            }
            for row in rows
        ]
    )


@router.get("/membership/plans")
def get_membership_plans():
    with db_session(commit=True) as (_, cursor):
        ensure_catalog_seeded(cursor)
        cursor.execute(
            """
            SELECT id, plan_code, plan_name, duration_days, price_cny, original_price_cny,
                   ai_scan_limit_per_day, description, sort_no
            FROM membership_plans
            WHERE is_active = 1
            ORDER BY sort_no ASC, id ASC
            """
        )
        rows = cursor.fetchall()

    return ok(
        [
            {
                "id": row["id"],
                "plan_code": row["plan_code"],
                "plan_name": row["plan_name"],
                "duration_days": row["duration_days"],
                "price_cny": float(row["price_cny"]),
                "original_price_cny": float(row["original_price_cny"])
                if row["original_price_cny"] is not None
                else None,
                "ai_scan_limit_per_day": row["ai_scan_limit_per_day"],
                "description": row["description"],
                "sort_no": row["sort_no"],
            }
            for row in rows
        ]
    )
