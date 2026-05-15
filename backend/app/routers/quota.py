from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Query

from ..db import db_session
from ..utils import ensure_daily_quota, ok

router = APIRouter(tags=["quota"])


@router.get("/quota/daily")
def get_daily_quota(user_id: int = Query(..., gt=0), date_value: date = Query(..., alias="date")):
    with db_session(commit=True) as (_, cursor):
        quota = ensure_daily_quota(cursor, user_id, date_value)

    return ok(
        {
            "date": date_value.isoformat(),
            "free_quota_total": quota["free_quota_total"],
            "free_quota_used": quota["free_quota_used"],
            "free_quota_remaining": max(quota["free_quota_total"] - quota["free_quota_used"], 0),
            "paid_scan_count": quota["paid_scan_count"],
        }
    )

