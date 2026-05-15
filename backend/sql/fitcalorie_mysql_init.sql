SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `fitness`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `fitness`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `wx_openid` VARCHAR(64) NOT NULL,
  `unionid` VARCHAR(64) DEFAULT NULL,
  `nickname` VARCHAR(100) DEFAULT NULL,
  `avatar_url` VARCHAR(512) DEFAULT NULL,
  `gender` ENUM('unknown', 'male', 'female') NOT NULL DEFAULT 'unknown',
  `timezone` VARCHAR(64) NOT NULL DEFAULT 'Asia/Shanghai',
  `custom_muscle_boost_limit` INT DEFAULT NULL,
  `last_ai_scan_date` DATE DEFAULT NULL,
  `today_ai_scan_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `last_muscle_boost_date` DATE DEFAULT NULL,
  `today_muscle_boost_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `status` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_wx_openid` (`wx_openid`),
  UNIQUE KEY `uk_users_unionid` (`unionid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Miniapp users';

CREATE TABLE IF NOT EXISTS `user_goal_profiles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `gender` ENUM('male', 'female') NOT NULL,
  `age` SMALLINT UNSIGNED NOT NULL,
  `height_cm` DECIMAL(5,2) NOT NULL,
  `weight_kg` DECIMAL(5,2) NOT NULL,
  `activity_level` DECIMAL(4,3) NOT NULL,
  `goal` ENUM('cut', 'maintain', 'bulk') NOT NULL,
  `bmr` INT UNSIGNED NOT NULL,
  `tdee` INT UNSIGNED NOT NULL,
  `target_calories` INT UNSIGNED NOT NULL,
  `target_protein_g` DECIMAL(6,2) NOT NULL,
  `target_carbs_g` DECIMAL(6,2) NOT NULL,
  `target_fat_g` DECIMAL(6,2) NOT NULL,
  `effective_from` DATE NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_goal_profiles_user_id` (`user_id`),
  KEY `idx_goal_profiles_user_active` (`user_id`, `is_active`),
  CONSTRAINT `fk_goal_profiles_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='TDEE input and calculated targets';

CREATE TABLE IF NOT EXISTS `ai_scan_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `session_no` VARCHAR(64) NOT NULL,
  `image_url` VARCHAR(512) DEFAULT NULL,
  `image_hash` VARCHAR(128) DEFAULT NULL,
  `source_type` ENUM('camera', 'album', 'other') NOT NULL DEFAULT 'camera',
  `recognition_status` ENUM('pending', 'success', 'failed', 'saved', 'discarded') NOT NULL DEFAULT 'pending',
  `selected_meal_type` ENUM('breakfast', 'lunch', 'dinner', 'snack') DEFAULT NULL,
  `total_calories` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `total_protein_g` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `total_carbs_g` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `total_fat_g` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `is_vip_free` TINYINT(1) NOT NULL DEFAULT 0,
  `free_quota_used` TINYINT(1) NOT NULL DEFAULT 0,
  `coin_cost` INT NOT NULL DEFAULT 0,
  `raw_result_json` JSON DEFAULT NULL,
  `error_message` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ai_scan_sessions_session_no` (`session_no`),
  KEY `idx_ai_scan_sessions_user_id` (`user_id`),
  KEY `idx_ai_scan_sessions_user_status` (`user_id`, `recognition_status`),
  CONSTRAINT `fk_ai_scan_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='One AI recognition request';

CREATE TABLE IF NOT EXISTS `ai_scan_food_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `session_id` BIGINT UNSIGNED NOT NULL,
  `food_name` VARCHAR(120) NOT NULL,
  `unit_label` VARCHAR(100) DEFAULT NULL,
  `base_calories` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `base_protein_g` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `base_carbs_g` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `base_fat_g` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `quantity` DECIMAL(10,2) NOT NULL DEFAULT 1,
  `sort_no` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ai_scan_food_items_session_id` (`session_id`),
  CONSTRAINT `fk_ai_scan_food_items_session`
    FOREIGN KEY (`session_id`) REFERENCES `ai_scan_sessions` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Food items recognized in one session';

CREATE TABLE IF NOT EXISTS `meal_entries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `entry_source` ENUM('manual', 'ai') NOT NULL DEFAULT 'manual',
  `entry_date` DATE NOT NULL,
  `meal_type` ENUM('breakfast', 'lunch', 'dinner', 'snack') NOT NULL,
  `food_name` VARCHAR(120) NOT NULL,
  `brand` VARCHAR(120) DEFAULT NULL,
  `serving_desc` VARCHAR(120) DEFAULT NULL,
  `quantity` DECIMAL(10,2) NOT NULL DEFAULT 1,
  `calories` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `protein_g` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `carbs_g` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `fat_g` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `note` VARCHAR(255) DEFAULT NULL,
  `ai_session_id` BIGINT UNSIGNED DEFAULT NULL,
  `consumed_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_meal_entries_user_date` (`user_id`, `entry_date`),
  KEY `idx_meal_entries_user_date_meal` (`user_id`, `entry_date`, `meal_type`),
  KEY `idx_meal_entries_ai_session_id` (`ai_session_id`),
  CONSTRAINT `fk_meal_entries_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_meal_entries_ai_session`
    FOREIGN KEY (`ai_session_id`) REFERENCES `ai_scan_sessions` (`id`)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daily food entries from manual or AI';

CREATE TABLE IF NOT EXISTS `daily_nutrition_summary` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `summary_date` DATE NOT NULL,
  `target_calories` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `consumed_calories` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `remaining_calories` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `target_protein_g` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `consumed_protein_g` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `target_carbs_g` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `consumed_carbs_g` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `target_fat_g` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `consumed_fat_g` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `manual_entry_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `ai_entry_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `last_entry_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_daily_nutrition_summary_user_date` (`user_id`, `summary_date`),
  CONSTRAINT `fk_daily_nutrition_summary_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Dashboard cache per user/date';

CREATE TABLE IF NOT EXISTS `user_daily_ai_quota` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `quota_date` DATE NOT NULL,
  `free_quota_total` INT UNSIGNED NOT NULL DEFAULT 0,
  `free_quota_used` INT UNSIGNED NOT NULL DEFAULT 0,
  `paid_scan_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_daily_ai_quota_user_date` (`user_id`, `quota_date`),
  CONSTRAINT `fk_user_daily_ai_quota_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daily free scan quota for home and AI pages';

CREATE TABLE IF NOT EXISTS `wallet_accounts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `balance` INT NOT NULL DEFAULT 0,
  `total_recharged` INT NOT NULL DEFAULT 0,
  `total_bonus` INT NOT NULL DEFAULT 0,
  `total_spent` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wallet_accounts_user_id` (`user_id`),
  CONSTRAINT `fk_wallet_accounts_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User coin wallet';

CREATE TABLE IF NOT EXISTS `recharge_packages` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `package_code` VARCHAR(64) NOT NULL,
  `package_name` VARCHAR(100) NOT NULL,
  `coins` INT UNSIGNED NOT NULL,
  `bonus_coins` INT UNSIGNED NOT NULL DEFAULT 0,
  `price_cny` DECIMAL(10,2) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_no` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_recharge_packages_package_code` (`package_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Coin recharge packages';

CREATE TABLE IF NOT EXISTS `membership_plans` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `plan_code` VARCHAR(64) NOT NULL,
  `plan_name` VARCHAR(100) NOT NULL,
  `duration_days` INT UNSIGNED NOT NULL,
  `price_cny` DECIMAL(10,2) NOT NULL,
  `original_price_cny` DECIMAL(10,2) DEFAULT NULL,
  `ai_scan_limit_per_day` INT DEFAULT NULL,
  `description` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_no` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_membership_plans_plan_code` (`plan_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='VIP membership plans';

CREATE TABLE IF NOT EXISTS `user_memberships` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `plan_id` BIGINT UNSIGNED NOT NULL,
  `status` ENUM('pending', 'active', 'expired', 'cancelled') NOT NULL DEFAULT 'pending',
  `auto_renew` TINYINT(1) NOT NULL DEFAULT 0,
  `started_at` DATETIME DEFAULT NULL,
  `expires_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_memberships_user_status` (`user_id`, `status`),
  CONSTRAINT `fk_user_memberships_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_user_memberships_plan`
    FOREIGN KEY (`plan_id`) REFERENCES `membership_plans` (`id`)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='User VIP subscriptions';

CREATE TABLE IF NOT EXISTS `payment_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `order_no` VARCHAR(64) NOT NULL,
  `order_type` ENUM('coin_recharge', 'membership') NOT NULL,
  `biz_id` BIGINT UNSIGNED DEFAULT NULL,
  `pay_channel` ENUM('wechat_pay') NOT NULL DEFAULT 'wechat_pay',
  `amount_cny` DECIMAL(10,2) NOT NULL,
  `status` ENUM('pending', 'paid', 'closed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  `paid_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_orders_order_no` (`order_no`),
  KEY `idx_payment_orders_user_status` (`user_id`, `status`),
  CONSTRAINT `fk_payment_orders_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Payment orders for recharge and VIP';

CREATE TABLE IF NOT EXISTS `wallet_transactions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `wallet_account_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `txn_type` ENUM('recharge', 'bonus', 'consume', 'refund', 'membership', 'system') NOT NULL,
  `biz_type` ENUM('ai_scan', 'recharge_package', 'membership_plan', 'manual_adjust', 'system') NOT NULL,
  `biz_id` BIGINT UNSIGNED DEFAULT NULL,
  `coins_delta` INT NOT NULL,
  `balance_after` INT NOT NULL,
  `amount_cny` DECIMAL(10,2) DEFAULT NULL,
  `remark` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wallet_transactions_wallet_id` (`wallet_account_id`),
  KEY `idx_wallet_transactions_user_id` (`user_id`),
  KEY `idx_wallet_transactions_user_created_at` (`user_id`, `created_at`),
  CONSTRAINT `fk_wallet_transactions_wallet`
    FOREIGN KEY (`wallet_account_id`) REFERENCES `wallet_accounts` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_wallet_transactions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Coin wallet ledger';
