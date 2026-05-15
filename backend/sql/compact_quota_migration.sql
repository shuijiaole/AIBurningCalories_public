-- 迁移脚本：重构额度系统，将每日计数器移至 users 表
USE `fitness`;

-- 添加 AI 扫描相关的计数器和日期
ALTER TABLE `users` ADD COLUMN `last_ai_scan_date` DATE DEFAULT NULL AFTER `custom_muscle_boost_limit`;
ALTER TABLE `users` ADD COLUMN `today_ai_scan_count` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `last_ai_scan_date`;

-- 添加 肌肉增强 相关的计数器和日期
ALTER TABLE `users` ADD COLUMN `last_muscle_boost_date` DATE DEFAULT NULL AFTER `today_ai_scan_count`;
ALTER TABLE `users` ADD COLUMN `today_muscle_boost_count` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `last_muscle_boost_date`;

-- 注意：旧的 user_daily_ai_quota 和 user_daily_feature_quota 表及其数据将被停用。
-- 你可以根据需要手动删除它们：
-- DROP TABLE user_daily_ai_quota;
-- DROP TABLE user_daily_feature_quota;
