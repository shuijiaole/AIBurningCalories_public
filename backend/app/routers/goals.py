from __future__ import annotations

from datetime import date
from typing import Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from ..db import db_session
from ..utils import not_found, ok

router = APIRouter(tags=["goal-profile"])


class GoalProfileRequest(BaseModel):
    user_id: int
    gender: Literal["male", "female"]
    age: int = Field(..., ge=1, le=120)
    height_cm: float = Field(..., gt=0)
    weight_kg: float = Field(..., gt=0)
    activity_level: float = Field(..., gt=0)
    goal: Literal["cut", "maintain", "bulk"]
    bmr: int = Field(..., ge=0)
    tdee: int = Field(..., ge=0)
    target_calories: int = Field(..., ge=0)
    target_protein_g: float = Field(..., ge=0)
    target_carbs_g: float = Field(..., ge=0)
    target_fat_g: float = Field(..., ge=0)
    effective_from: date


@router.get("/goal-profile/active")
def get_active_goal_profile(user_id: int = Query(..., gt=0)):
    with db_session() as (_, cursor):
        cursor.execute(
            """
            SELECT *
            FROM user_goal_profiles
            WHERE user_id = %s AND is_active = 1
            ORDER BY id DESC
            LIMIT 1
            """,
            (user_id,),
        )
        profile = cursor.fetchone()

    if not profile:
        not_found("Active goal profile not found")

    profile["effective_from"] = profile["effective_from"].isoformat()
    profile["created_at"] = profile["created_at"].isoformat()
    profile["updated_at"] = profile["updated_at"].isoformat()
    return ok(profile)


@router.post("/goal-profile")
def save_goal_profile(payload: GoalProfileRequest):
    with db_session(commit=True) as (_, cursor):
        cursor.execute(
            """
            UPDATE user_goal_profiles
            SET is_active = 0
            WHERE user_id = %s AND is_active = 1
            """,
            (payload.user_id,),
        )

        cursor.execute(
            """
            INSERT INTO user_goal_profiles (
              user_id, gender, age, height_cm, weight_kg, activity_level, goal,
              bmr, tdee, target_calories, target_protein_g, target_carbs_g,
              target_fat_g, effective_from, is_active
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 1)
            """,
            (
                payload.user_id,
                payload.gender,
                payload.age,
                payload.height_cm,
                payload.weight_kg,
                payload.activity_level,
                payload.goal,
                payload.bmr,
                payload.tdee,
                payload.target_calories,
                payload.target_protein_g,
                payload.target_carbs_g,
                payload.target_fat_g,
                payload.effective_from,
            ),
        )
        profile_id = cursor.lastrowid

        cursor.execute(
            "SELECT * FROM user_goal_profiles WHERE id = %s LIMIT 1",
            (profile_id,),
        )
        profile = cursor.fetchone()

    profile["effective_from"] = profile["effective_from"].isoformat()
    profile["created_at"] = profile["created_at"].isoformat()
    profile["updated_at"] = profile["updated_at"].isoformat()
    return ok(profile, message="goal profile saved")

