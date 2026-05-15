-- 迁移脚本：在 users 表中添加自定义肌肉增强限额字段
USE `fitness`;

-- 检查字段是否已存在，如果不存在则添加
SET @dbname = DATABASE();
SET @tablename = "users";
SET @columnname = "custom_muscle_boost_limit";
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = @dbname
     AND TABLE_NAME = @tablename
     AND COLUMN_NAME = @columnname) > 0,
  "SELECT 1",
  "ALTER TABLE `users` ADD COLUMN `custom_muscle_boost_limit` INT DEFAULT NULL AFTER `timezone`"
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 初始为 NULL，表示使用系统默认或会员配置
-- 如果你想手动给 ID 为 1 的用户 10 次额度，可以运行：
-- UPDATE users SET custom_muscle_boost_limit = 10 WHERE id = 1;
