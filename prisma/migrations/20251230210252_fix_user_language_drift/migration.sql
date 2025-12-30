-- Mix Fix: Add language column if it is missing
-- We use a stored procedure to safely add the column only if it doesn't exist
-- to prevent errors if the state is mixed.

DROP PROCEDURE IF EXISTS `AddLanguageToUser`;

CREATE PROCEDURE `AddLanguageToUser`()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'User'
        AND COLUMN_NAME = 'language'
    ) THEN
        ALTER TABLE `User` ADD COLUMN `language` VARCHAR(191) NOT NULL DEFAULT 'en';
    END IF;
END;

CALL `AddLanguageToUser`();

DROP PROCEDURE `AddLanguageToUser`;