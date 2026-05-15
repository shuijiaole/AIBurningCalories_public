from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Query
from pydantic import BaseModel

from ..db import db_session
from ..utils import (
    REWARD_DAILY_SIGN_IN,
    award_energy_coin_once,
    bad_request,
    get_energy_reward_status,
    ok,
)

router = APIRouter(tags=["rewards"])


class DailySignInRequest(BaseModel):
    user_id: int
    sign_date: date


@router.get("/rewards/daily")
def get_daily_rewards(
    user_id: int = Query(..., gt=0),
    date_value: date = Query(..., alias="date"),
):
    with db_session(commit=True) as (_, cursor):
        status = get_energy_reward_status(cursor, user_id, date_value)

    return ok({"date": date_value.isoformat(), **status})


@router.post("/rewards/daily-sign-in")
def daily_sign_in(payload: DailySignInRequest):
    if payload.sign_date != date.today():
        bad_request("只能签到当天")

    with db_session(commit=True) as (_, cursor):
        result = award_energy_coin_once(
            cursor,
            user_id=payload.user_id,
            reward_date=payload.sign_date,
            reward_type=REWARD_DAILY_SIGN_IN,
            remark="每日签到奖励",
        )
        status = get_energy_reward_status(cursor, payload.user_id, payload.sign_date)

    return ok(
        {
            "date": payload.sign_date.isoformat(),
            "awarded": result["awarded"],
            "coins": result["coins"],
            "balance": result.get("balance"),
            **status,
        },
        message="daily sign-in completed" if result["awarded"] else "daily sign-in already completed",
    )
