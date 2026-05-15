SET NAMES utf8mb4;

USE `fitness`;

CREATE TABLE IF NOT EXISTS `user_energy_coin_rewards` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `reward_date` DATE NOT NULL,
  `reward_type` ENUM('daily_sign_in', 'calorie_goal') NOT NULL,
  `coins` INT NOT NULL DEFAULT 1,
  `wallet_transaction_id` BIGINT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_energy_rewards_user_date_type` (`user_id`, `reward_date`, `reward_type`),
  KEY `idx_energy_rewards_user_date` (`user_id`, `reward_date`),
  CONSTRAINT `fk_energy_rewards_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daily energy coin rewards';

-- Feature costs used by the backend defaults:
-- AI image/text recognition: 7 energy coins per paid use.
-- Muscle boost enhancement: 14 energy coins per paid use.
-- Existing deployments can also override these with AI_SCAN_COIN_COST=7 and MUSCLE_BOOST_COIN_COST=14.
