SET NAMES utf8mb4;

USE `fitness`;

CREATE TABLE IF NOT EXISTS `user_daily_feature_quota` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `feature_code` VARCHAR(64) NOT NULL,
  `quota_date` DATE NOT NULL,
  `free_quota_total` INT UNSIGNED NOT NULL DEFAULT 0,
  `free_quota_used` INT UNSIGNED NOT NULL DEFAULT 0,
  `paid_use_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_feature_quota_user_feature_date` (`user_id`, `feature_code`, `quota_date`),
  CONSTRAINT `fk_feature_quota_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daily quota for member feature tools';

CREATE TABLE IF NOT EXISTS `muscle_boost_jobs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `job_no` VARCHAR(64) NOT NULL,
  `source_image_url` VARCHAR(512) DEFAULT NULL,
  `result_image_url` VARCHAR(512) DEFAULT NULL,
  `source_type` ENUM('camera', 'album', 'other') NOT NULL DEFAULT 'camera',
  `status` ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending',
  `title` VARCHAR(120) DEFAULT NULL,
  `subtitle` VARCHAR(255) DEFAULT NULL,
  `enhancement_focus_json` JSON DEFAULT NULL,
  `analysis_json` JSON DEFAULT NULL,
  `is_membership_free` TINYINT(1) NOT NULL DEFAULT 0,
  `coin_cost` INT NOT NULL DEFAULT 0,
  `error_message` VARCHAR(500) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_muscle_boost_jobs_job_no` (`job_no`),
  KEY `idx_muscle_boost_jobs_user_created` (`user_id`, `created_at`),
  CONSTRAINT `fk_muscle_boost_jobs_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Muscle boost image enhancement jobs';
