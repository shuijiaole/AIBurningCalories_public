from __future__ import annotations

from datetime import date, datetime
from hashlib import sha256
from uuid import uuid4

from fastapi import HTTPException

from .config import settings

MEAL_LABELS = {
    "breakfast": "早餐",
    "lunch": "午餐",
    "dinner": "晚餐",
    "snack": "加餐",
}

MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"]
FEATURE_MUSCLE_BOOST = "muscle_boost"
REWARD_DAILY_SIGN_IN = "daily_sign_in"
REWARD_CALORIE_GOAL = "calorie_goal"


def ok(data=None, message: str = "ok"):
    return {"code": 0, "message": message, "data": data}


def not_found(message: str):
    raise HTTPException(status_code=404, detail=message)


def bad_request(message: str):
    raise HTTPException(status_code=400, detail=message)


def ensure_energy_coin_reward_tables(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS user_energy_coin_rewards (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          reward_date DATE NOT NULL,
          reward_type ENUM('daily_sign_in', 'calorie_goal') NOT NULL,
          coins INT NOT NULL DEFAULT 1,
          wallet_transaction_id BIGINT UNSIGNED DEFAULT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_energy_rewards_user_date_type (user_id, reward_date, reward_type),
          KEY idx_energy_rewards_user_date (user_id, reward_date),
          CONSTRAINT fk_energy_rewards_user
            FOREIGN KEY (user_id) REFERENCES users (id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )


def award_energy_coin_once(
    cursor,
    *,
    user_id: int,
    reward_date: date,
    reward_type: str,
    remark: str,
    coins: int = 1,
):
    ensure_energy_coin_reward_tables(cursor)
    wallet_id = ensure_wallet_account(cursor, user_id)

    cursor.execute(
        """
        INSERT IGNORE INTO user_energy_coin_rewards (
          user_id, reward_date, reward_type, coins
        ) VALUES (%s, %s, %s, %s)
        """,
        (user_id, reward_date, reward_type, coins),
    )
    if cursor.rowcount != 1:
        cursor.execute(
            """
            SELECT 1
            FROM user_energy_coin_rewards
            WHERE user_id = %s AND reward_date = %s AND reward_type = %s
            LIMIT 1
            """,
            (user_id, reward_date, reward_type),
        )
        return {"awarded": False, "coins": 0}

    cursor.execute(
        """
        SELECT id, balance
        FROM wallet_accounts
        WHERE id = %s
        LIMIT 1
        FOR UPDATE
        """,
        (wallet_id,),
    )
    wallet = cursor.fetchone()
    next_balance = int(wallet["balance"]) + coins
    cursor.execute(
        """
        UPDATE wallet_accounts
        SET balance = %s,
            total_bonus = total_bonus + %s
        WHERE id = %s
        """,
        (next_balance, coins, wallet_id),
    )
    cursor.execute(
        """
        INSERT INTO wallet_transactions (
          wallet_account_id, user_id, txn_type, biz_type, biz_id,
          coins_delta, balance_after, amount_cny, remark
        ) VALUES (%s, %s, 'bonus', 'system', NULL, %s, %s, NULL, %s)
        """,
        (wallet_id, user_id, coins, next_balance, remark),
    )
    transaction_id = cursor.lastrowid
    cursor.execute(
        """
        UPDATE user_energy_coin_rewards
        SET wallet_transaction_id = %s
        WHERE user_id = %s AND reward_date = %s AND reward_type = %s
        """,
        (transaction_id, user_id, reward_date, reward_type),
    )
    return {"awarded": True, "coins": coins, "balance": next_balance}


def ensure_manual_food_history_table(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS manual_food_history (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          dedupe_key CHAR(64) NOT NULL,
          food_name VARCHAR(120) NOT NULL,
          brand VARCHAR(120) DEFAULT NULL,
          serving_desc VARCHAR(120) DEFAULT NULL,
          calories DECIMAL(10,2) NOT NULL DEFAULT 0,
          protein_g DECIMAL(10,2) NOT NULL DEFAULT 0,
          carbs_g DECIMAL(10,2) NOT NULL DEFAULT 0,
          fat_g DECIMAL(10,2) NOT NULL DEFAULT 0,
          note VARCHAR(255) DEFAULT NULL,
          last_used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_manual_food_history_user_dedupe (user_id, dedupe_key),
          KEY idx_manual_food_history_user_last_used (user_id, last_used_at),
          CONSTRAINT fk_manual_food_history_user
            FOREIGN KEY (user_id) REFERENCES users (id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )


def build_manual_food_history_dedupe_key(
    food_name: str,
    brand: str | None,
    serving_desc: str | None,
    calories: float,
    protein_g: float,
    carbs_g: float,
    fat_g: float,
    note: str | None,
):
    normalized_food_name = " ".join((food_name or "").strip().lower().split())
    return sha256(normalized_food_name.encode("utf-8")).hexdigest()


def upsert_manual_food_history(
    cursor,
    *,
    user_id: int,
    food_name: str,
    brand: str | None,
    serving_desc: str | None,
    calories: float,
    protein_g: float,
    carbs_g: float,
    fat_g: float,
    note: str | None,
    last_used_at: datetime | None = None,
):
    ensure_manual_food_history_table(cursor)
    dedupe_key = build_manual_food_history_dedupe_key(
        food_name,
        brand,
        serving_desc,
        calories,
        protein_g,
        carbs_g,
        fat_g,
        note,
    )
    timestamp = last_used_at or datetime.now()

    cursor.execute(
        """
        INSERT INTO manual_food_history (
          user_id, dedupe_key, food_name, brand, serving_desc,
          calories, protein_g, carbs_g, fat_g, note, last_used_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
          food_name = VALUES(food_name),
          brand = VALUES(brand),
          serving_desc = VALUES(serving_desc),
          calories = VALUES(calories),
          protein_g = VALUES(protein_g),
          carbs_g = VALUES(carbs_g),
          fat_g = VALUES(fat_g),
          note = VALUES(note),
          last_used_at = GREATEST(last_used_at, VALUES(last_used_at))
        """,
        (
            user_id,
            dedupe_key,
            food_name,
            brand,
            serving_desc,
            calories,
            protein_g,
            carbs_g,
            fat_g,
            note,
            timestamp,
        ),
    )


def ensure_wallet_account(cursor, user_id: int):
    cursor.execute(
        "SELECT id FROM wallet_accounts WHERE user_id = %s LIMIT 1",
        (user_id,),
    )
    wallet = cursor.fetchone()
    if wallet:
        return wallet["id"]

    cursor.execute(
        """
        INSERT INTO wallet_accounts (
          user_id, balance, total_recharged, total_bonus, total_spent
        ) VALUES (%s, 0, 0, 0, 0)
        """,
        (user_id,),
    )
    return cursor.lastrowid


def get_energy_reward_status(cursor, user_id: int, reward_date: date):
    ensure_energy_coin_reward_tables(cursor)
    cursor.execute(
        """
        SELECT reward_type
        FROM user_energy_coin_rewards
        WHERE user_id = %s AND reward_date = %s
        """,
        (user_id, reward_date),
    )
    reward_types = {row["reward_type"] for row in cursor.fetchall()}
    return {
        "daily_sign_in_awarded": REWARD_DAILY_SIGN_IN in reward_types,
        "calorie_goal_awarded": REWARD_CALORIE_GOAL in reward_types,
    }


def ensure_catalog_seeded(cursor):
    cursor.execute("SELECT COUNT(*) AS total FROM recharge_packages")
    recharge_total = cursor.fetchone()["total"]
    if recharge_total == 0:
        cursor.executemany(
            """
            INSERT INTO recharge_packages (
              package_code, package_name, coins, bonus_coins, price_cny, is_active, sort_no
            ) VALUES (%s, %s, %s, %s, %s, 1, %s)
            """,
            [
                ("coins_60", "轻量包", 60, 0, 6.0, 1),
                ("coins_180", "常用包", 180, 20, 18.0, 2),
                ("coins_500", "进阶包", 500, 80, 50.0, 3),
            ],
        )

    cursor.execute("SELECT COUNT(*) AS total FROM membership_plans")
    membership_total = cursor.fetchone()["total"]
    if membership_total == 0:
        cursor.executemany(
            """
            INSERT INTO membership_plans (
              plan_code, plan_name, duration_days, price_cny, original_price_cny,
              ai_scan_limit_per_day, muscle_boost_limit_per_day, description, is_active, sort_no
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 1, %s)
            """,
            [
                ("vip_month", "月度 VIP", 30, 25.0, 30.0, None, 5, "无限次拍照识别", 1),
                ("vip_quarter", "季度 VIP", 90, 68.0, 90.0, None, 5, "更划算的季度会员", 2),
            ],
        )


def get_active_membership(cursor, user_id: int):
    cursor.execute(
        """
        SELECT um.*, mp.plan_name, mp.ai_scan_limit_per_day, mp.muscle_boost_limit_per_day
        FROM user_memberships um
        JOIN membership_plans mp ON mp.id = um.plan_id
        WHERE um.user_id = %s
          AND um.status = 'active'
          AND um.expires_at IS NOT NULL
          AND um.expires_at > NOW()
        ORDER BY um.id DESC
        LIMIT 1
        """,
        (user_id,),
    )
    return cursor.fetchone()


def resolve_daily_quota_total(cursor, user_id: int) -> int:
    membership = get_active_membership(cursor, user_id)
    if not membership:
        return settings.default_daily_free_quota

    limit = membership.get("ai_scan_limit_per_day")
    if limit is None:
        return 9999
    return int(limit)


def generate_session_no() -> str:
    return generate_job_no("scan")


def generate_job_no(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:20]}"


def ensure_feature_tables(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS user_daily_feature_quota (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          feature_code VARCHAR(64) NOT NULL,
          quota_date DATE NOT NULL,
          free_quota_total INT UNSIGNED NOT NULL DEFAULT 0,
          free_quota_used INT UNSIGNED NOT NULL DEFAULT 0,
          paid_use_count INT UNSIGNED NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_feature_quota_user_feature_date (user_id, feature_code, quota_date),
          CONSTRAINT fk_feature_quota_user
            FOREIGN KEY (user_id) REFERENCES users (id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS muscle_boost_jobs (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          job_no VARCHAR(64) NOT NULL,
          source_image_url VARCHAR(512) DEFAULT NULL,
          result_image_url VARCHAR(512) DEFAULT NULL,
          source_type ENUM('camera', 'album', 'other') NOT NULL DEFAULT 'camera',
          status ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending',
          title VARCHAR(120) DEFAULT NULL,
          subtitle VARCHAR(255) DEFAULT NULL,
          enhancement_focus_json JSON DEFAULT NULL,
          analysis_json JSON DEFAULT NULL,
          is_membership_free TINYINT(1) NOT NULL DEFAULT 0,
          coin_cost INT NOT NULL DEFAULT 0,
          prompt_type VARCHAR(32) DEFAULT 'natural',
          error_message VARCHAR(500) DEFAULT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_muscle_boost_jobs_job_no (job_no),
          KEY idx_muscle_boost_jobs_user_created (user_id, created_at),
          CONSTRAINT fk_muscle_boost_jobs_user
            FOREIGN KEY (user_id) REFERENCES users (id)
            ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )


def resolve_feature_daily_quota_total(cursor, user_id: int, feature_code: str) -> int:
    if feature_code != FEATURE_MUSCLE_BOOST:
        return 0

    # 1. Check for Account Override in users table
    cursor.execute(
        "SELECT custom_muscle_boost_limit FROM users WHERE id = %s LIMIT 1",
        (user_id,),
    )
    user_row = cursor.fetchone()
    if user_row and user_row.get("custom_muscle_boost_limit") is not None:
        return int(user_row["custom_muscle_boost_limit"])

    # 2. Check Membership Plan Limit
    membership = get_active_membership(cursor, user_id)
    if membership:
        return int(membership.get("muscle_boost_limit_per_day") or 0)

    # 3. Fallback to Guest Default
    return settings.default_muscle_boost_free_quota


def ensure_daily_feature_quota(cursor, user_id: int, feature_code: str, quota_date: date):
    # This project currently only supports muscle_boost as a feature code for daily quotas
    if feature_code != FEATURE_MUSCLE_BOOST:
        return {
            "free_quota_total": 0,
            "free_quota_used": 0,
            "paid_use_count": 0
        }

    expected_total = resolve_feature_daily_quota_total(cursor, user_id, feature_code)
    
    # 1. Get current state from users table
    cursor.execute(
        "SELECT last_muscle_boost_date, today_muscle_boost_count FROM users WHERE id = %s FOR UPDATE",
        (user_id,)
    )
    user_row = cursor.fetchone()
    if not user_row:
        return {"free_quota_total": expected_total, "free_quota_used": 0, "paid_use_count": 0}

    last_date = user_row.get("last_muscle_boost_date")
    current_used = user_row.get("today_muscle_boost_count") or 0

    # 2. Daily Reset Logic
    if last_date != quota_date:
        cursor.execute(
            """
            UPDATE users 
            SET last_muscle_boost_date = %s, today_muscle_boost_count = 0 
            WHERE id = %s
            """,
            (quota_date, user_id)
        )
        current_used = 0

    return {
        "free_quota_total": expected_total,
        "free_quota_used": current_used,
        "paid_use_count": 0 # We can track this in a separate log if needed, but for quota it's usually 0
    }


def ensure_daily_quota(cursor, user_id: int, quota_date: date):
    expected_total = resolve_daily_quota_total(cursor, user_id)

    # 1. Get current state from users table
    cursor.execute(
        "SELECT last_ai_scan_date, today_ai_scan_count FROM users WHERE id = %s FOR UPDATE",
        (user_id,)
    )
    user_row = cursor.fetchone()
    if not user_row:
        return {"free_quota_total": expected_total, "free_quota_used": 0}

    last_date = user_row.get("last_ai_scan_date")
    current_used = user_row.get("today_ai_scan_count") or 0

    # 2. Daily Reset Logic
    if last_date != quota_date:
        cursor.execute(
            """
            UPDATE users 
            SET last_ai_scan_date = %s, today_ai_scan_count = 0 
            WHERE id = %s
            """,
            (quota_date, user_id)
        )
        current_used = 0

    return {
        "free_quota_total": expected_total,
        "free_quota_used": current_used,
        "paid_scan_count": 0
    }


def refresh_daily_summary(cursor, user_id: int, summary_date: date):
    cursor.execute(
        """
        INSERT INTO daily_nutrition_summary (
          user_id,
          summary_date,
          target_calories,
          consumed_calories,
          remaining_calories,
          target_protein_g,
          consumed_protein_g,
          target_carbs_g,
          consumed_carbs_g,
          target_fat_g,
          consumed_fat_g,
          manual_entry_count,
          ai_entry_count,
          last_entry_at
        )
        SELECT
          %s AS user_id,
          %s AS summary_date,
          COALESCE(g.target_calories, 0) AS target_calories,
          COALESCE(m.consumed_calories, 0) AS consumed_calories,
          GREATEST(COALESCE(g.target_calories, 0) - COALESCE(m.consumed_calories, 0), 0) AS remaining_calories,
          COALESCE(g.target_protein_g, 0) AS target_protein_g,
          COALESCE(m.consumed_protein_g, 0) AS consumed_protein_g,
          COALESCE(g.target_carbs_g, 0) AS target_carbs_g,
          COALESCE(m.consumed_carbs_g, 0) AS consumed_carbs_g,
          COALESCE(g.target_fat_g, 0) AS target_fat_g,
          COALESCE(m.consumed_fat_g, 0) AS consumed_fat_g,
          COALESCE(m.manual_entry_count, 0) AS manual_entry_count,
          COALESCE(m.ai_entry_count, 0) AS ai_entry_count,
          m.last_entry_at AS last_entry_at
        FROM (SELECT 1 AS seed) seeded
        LEFT JOIN user_goal_profiles g
          ON g.user_id = %s
         AND g.is_active = 1
        LEFT JOIN (
          SELECT
            user_id,
            entry_date,
            SUM(calories) AS consumed_calories,
            SUM(protein_g) AS consumed_protein_g,
            SUM(carbs_g) AS consumed_carbs_g,
            SUM(fat_g) AS consumed_fat_g,
            SUM(CASE WHEN entry_source = 'manual' THEN 1 ELSE 0 END) AS manual_entry_count,
            SUM(CASE WHEN entry_source = 'ai' THEN 1 ELSE 0 END) AS ai_entry_count,
            MAX(created_at) AS last_entry_at
          FROM meal_entries
          WHERE user_id = %s
            AND entry_date = %s
          GROUP BY user_id, entry_date
        ) m
          ON m.user_id = %s
         AND m.entry_date = %s
        ON DUPLICATE KEY UPDATE
          target_calories = VALUES(target_calories),
          consumed_calories = VALUES(consumed_calories),
          remaining_calories = VALUES(remaining_calories),
          target_protein_g = VALUES(target_protein_g),
          consumed_protein_g = VALUES(consumed_protein_g),
          target_carbs_g = VALUES(target_carbs_g),
          consumed_carbs_g = VALUES(consumed_carbs_g),
          target_fat_g = VALUES(target_fat_g),
          consumed_fat_g = VALUES(consumed_fat_g),
          manual_entry_count = VALUES(manual_entry_count),
          ai_entry_count = VALUES(ai_entry_count),
          last_entry_at = VALUES(last_entry_at)
        """,
        (user_id, summary_date, user_id, user_id, summary_date, user_id, summary_date),
    )
    cursor.execute(
        """
        SELECT target_calories, consumed_calories
        FROM daily_nutrition_summary
        WHERE user_id = %s AND summary_date = %s
        LIMIT 1
        """,
        (user_id, summary_date),
    )
    summary = cursor.fetchone()
    if (
        summary
        and float(summary["target_calories"]) > 0
        and float(summary["consumed_calories"]) >= float(summary["target_calories"])
    ):
        award_energy_coin_once(
            cursor,
            user_id=user_id,
            reward_date=summary_date,
            reward_type=REWARD_CALORIE_GOAL,
            remark="每日卡路里目标达成奖励",
        )


def map_meal_entry(row: dict):
    meal_type = row["meal_type"]
    return {
        "id": row["id"],
        "entry_source": row["entry_source"],
        "entry_date": row["entry_date"].isoformat(),
        "meal_type": meal_type,
        "meal_type_label": MEAL_LABELS.get(meal_type, meal_type),
        "food_name": row["food_name"],
        "brand": row["brand"],
        "serving_desc": row["serving_desc"],
        "quantity": float(row["quantity"]),
        "calories": float(row["calories"]),
        "protein_g": float(row["protein_g"]),
        "carbs_g": float(row["carbs_g"]),
        "fat_g": float(row["fat_g"]),
        "note": row["note"],
        "ai_session_id": row["ai_session_id"],
        "consumed_at": row["consumed_at"].isoformat() if row["consumed_at"] else None,
        "created_at": row["created_at"].isoformat(),
        "updated_at": row["updated_at"].isoformat(),
    }
