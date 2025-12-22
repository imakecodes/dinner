-- CreateTable
CREATE TABLE `HouseholdMember` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `restrictions` JSON NOT NULL,
    `likes` JSON NOT NULL,
    `dislikes` JSON NOT NULL,
    `isGuest` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PantryItem` (
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Recipe` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `recipe_title` VARCHAR(191) NOT NULL,
    `analysis_log` TEXT NOT NULL,
    `match_reasoning` TEXT NOT NULL,
    `ingredients_from_pantry` JSON NOT NULL,
    `shopping_list` JSON NOT NULL,
    `step_by_step` JSON NOT NULL,
    `safety_badge` BOOLEAN NOT NULL,
    `meal_type` VARCHAR(191) NOT NULL,
    `difficulty` VARCHAR(191) NOT NULL,
    `prep_time` VARCHAR(191) NOT NULL,
    `dishImage` TEXT NULL,
    `isFavorite` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
