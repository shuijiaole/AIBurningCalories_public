from __future__ import annotations

from typing import Literal

import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..config import settings
from ..db import db_session
from ..utils import ensure_wallet_account, ok

router = APIRouter(tags=["auth"])


class WeappLoginRequest(BaseModel):
    js_code: str | None = Field(default=None, min_length=1, max_length=128)
    wx_openid: str | None = Field(default=None, min_length=1, max_length=64)
    unionid: str | None = Field(default=None, max_length=64)
    nickname: str | None = Field(default=None, max_length=100)
    avatar_url: str | None = Field(default=None, max_length=512)
    gender: Literal["unknown", "male", "female"] = "unknown"


class UserProfileUpdateRequest(BaseModel):
    user_id: int = Field(gt=0)
    nickname: str | None = Field(default=None, min_length=1, max_length=100)
    avatar_url: str | None = Field(default=None, max_length=512)


def _exchange_weapp_code(js_code: str) -> tuple[str, str | None]:
    if not settings.wechat_appid or not settings.wechat_secret:
        raise HTTPException(
            status_code=500,
            detail="微信登录未配置：请在 backend/.env 设置 WECHAT_APPID 和 WECHAT_SECRET",
        )

    try:
        response = requests.get(
            "https://api.weixin.qq.com/sns/jscode2session",
            params={
                "appid": settings.wechat_appid,
                "secret": settings.wechat_secret,
                "js_code": js_code,
                "grant_type": "authorization_code",
            },
            timeout=5,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="微信登录服务请求失败") from exc
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="微信登录服务返回异常") from exc

    openid = data.get("openid")
    if not openid:
        message = data.get("errmsg") or "微信登录凭证校验失败"
        raise HTTPException(status_code=400, detail=message)

    return openid, data.get("unionid")


@router.post("/auth/weapp-login")
def weapp_login(payload: WeappLoginRequest):
    wx_openid = payload.wx_openid
    unionid = payload.unionid

    if payload.js_code:
        wx_openid, code_unionid = _exchange_weapp_code(payload.js_code)
        unionid = code_unionid or unionid

    if not wx_openid:
        raise HTTPException(status_code=400, detail="缺少微信登录凭证")

    with db_session(commit=True) as (_, cursor):
        cursor.execute(
            "SELECT * FROM users WHERE wx_openid = %s LIMIT 1",
            (wx_openid,),
        )
        user = cursor.fetchone()

        if user:
            cursor.execute(
                """
                UPDATE users
                SET unionid = COALESCE(%s, unionid),
                    nickname = COALESCE(%s, nickname),
                    avatar_url = COALESCE(%s, avatar_url),
                    gender = %s
                WHERE id = %s
                """,
                (
                    unionid,
                    payload.nickname.strip() if payload.nickname else None,
                    payload.avatar_url.strip() if payload.avatar_url else None,
                    payload.gender,
                    user["id"],
                ),
            )
            user_id = user["id"]
        else:
            cursor.execute(
                """
                INSERT INTO users (
                  wx_openid, unionid, nickname, avatar_url, gender, timezone
                ) VALUES (%s, %s, %s, %s, %s, 'Asia/Shanghai')
                """,
                (
                    wx_openid,
                    unionid,
                    payload.nickname.strip() if payload.nickname else "微信用户",
                    payload.avatar_url.strip() if payload.avatar_url else None,
                    payload.gender,
                ),
            )
            user_id = cursor.lastrowid

        ensure_wallet_account(cursor, user_id)

        cursor.execute(
            """
            SELECT id, wx_openid, unionid, nickname, avatar_url, gender, timezone, created_at
            FROM users
            WHERE id = %s
            """,
            (user_id,),
        )
        user_info = cursor.fetchone()

        cursor.execute(
            """
            SELECT balance, total_recharged, total_bonus, total_spent
            FROM wallet_accounts
            WHERE user_id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        wallet = cursor.fetchone()

    return ok(
        {
            "user_id": user_info["id"],
            "user": {
                **user_info,
                "created_at": user_info["created_at"].isoformat(),
            },
            "wallet": wallet,
        }
    )


@router.put("/users/profile")
def update_user_profile(payload: UserProfileUpdateRequest):
    nickname = payload.nickname.strip() if payload.nickname else None
    avatar_url = payload.avatar_url.strip() if payload.avatar_url else None

    if not nickname and not avatar_url:
        raise HTTPException(status_code=400, detail="请填写昵称")

    with db_session(commit=True) as (_, cursor):
        cursor.execute(
            """
            UPDATE users
            SET nickname = COALESCE(%s, nickname),
                avatar_url = COALESCE(%s, avatar_url)
            WHERE id = %s
            """,
            (nickname, avatar_url, payload.user_id),
        )

        cursor.execute(
            """
            SELECT id, wx_openid, unionid, nickname, avatar_url, gender, timezone, created_at
            FROM users
            WHERE id = %s
            """,
            (payload.user_id,),
        )
        user_info = cursor.fetchone()

        if not user_info:
            raise HTTPException(status_code=404, detail="用户不存在")

    return ok(
        {
            "user_id": user_info["id"],
            "user": {
                **user_info,
                "created_at": user_info["created_at"].isoformat(),
            },
        },
        message="profile updated",
    )
