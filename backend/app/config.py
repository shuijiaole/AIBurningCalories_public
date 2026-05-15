from __future__ import annotations

import os
from dataclasses import dataclass, field


def _load_env_file() -> None:
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if not os.path.exists(env_path):
        return

    with open(env_path, "r", encoding="utf-8") as file:
        for raw_line in file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


_load_env_file()


def _to_bool(value: str | None, default: bool) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    app_host: str = os.getenv("APP_HOST", "0.0.0.0")
    app_port: int = int(os.getenv("APP_PORT", "8080"))
    app_debug: bool = _to_bool(os.getenv("APP_DEBUG"), True)
    frontend_dist_dir: str = os.getenv("FRONTEND_DIST_DIR", "")
    app_cors_origins: list[str] = field(
        default_factory=lambda: (
            os.getenv("APP_CORS_ORIGINS", "*").split(",")
            if os.getenv("APP_CORS_ORIGINS")
            else ["*"]
        )
    )

    mysql_host: str = os.getenv("MYSQL_HOST", "127.0.0.1")
    mysql_port: int = int(os.getenv("MYSQL_PORT", "3306"))
    mysql_user: str = os.getenv("MYSQL_USER", "root")
    mysql_password: str = os.getenv("MYSQL_PASSWORD", "")
    mysql_database: str = os.getenv("MYSQL_DATABASE", "fitness")
    mysql_charset: str = os.getenv("MYSQL_CHARSET", "utf8mb4")

    wechat_appid: str = os.getenv("WECHAT_APPID", "")
    wechat_secret: str = os.getenv("WECHAT_SECRET", "")

    default_daily_free_quota: int = int(os.getenv("DEFAULT_DAILY_FREE_QUOTA", "1"))
    default_muscle_boost_free_quota: int = int(os.getenv("DEFAULT_MUSCLE_BOOST_FREE_QUOTA", "0"))
    ai_scan_coin_cost: int = int(os.getenv("AI_SCAN_COIN_COST", "7"))
    muscle_boost_coin_cost: int = int(os.getenv("MUSCLE_BOOST_COIN_COST", "14"))
    vertex_project_id: str = os.getenv("VERTEX_PROJECT_ID", "")
    vertex_location: str = os.getenv("VERTEX_LOCATION", "global")
    vertex_food_model: str = os.getenv("VERTEX_FOOD_MODEL", "google/gemini-2.5-flash-lite")
    vertex_muscle_model: str = os.getenv(
        "VERTEX_MUSCLE_MODEL", "google/gemini-3.1-flash-image-preview"
    )


settings = Settings()
