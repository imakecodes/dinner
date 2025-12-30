-- AlterTable
ALTER TABLE `Ingredient` ADD COLUMN `originalIngredientId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Recipe` ADD COLUMN `originalRecipeId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ShoppingItem` ADD COLUMN `originalShoppingItemId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `language` VARCHAR(191) NOT NULL DEFAULT 'en';

-- CreateTable
CREATE TABLE `MealPlan` (
    `id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `mealType` VARCHAR(191) NOT NULL,
    `status` ENUM('PLANNED', 'COOKED', 'SKIPPED') NOT NULL DEFAULT 'PLANNED',
    `notes` TEXT NULL,
    `kitchenId` VARCHAR(191) NOT NULL,
    `recipeId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MealPlan_kitchenId_date_mealType_key`(`kitchenId`, `date`, `mealType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgentLog` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `message` TEXT NOT NULL,
    `type` ENUM('INFO', 'REPLANNING', 'WARNING') NOT NULL DEFAULT 'INFO',
    `kitchenId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MealPlan` ADD CONSTRAINT `MealPlan_kitchenId_fkey` FOREIGN KEY (`kitchenId`) REFERENCES `Kitchen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MealPlan` ADD CONSTRAINT `MealPlan_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `Recipe`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgentLog` ADD CONSTRAINT `AgentLog_kitchenId_fkey` FOREIGN KEY (`kitchenId`) REFERENCES `Kitchen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ingredient` ADD CONSTRAINT `Ingredient_originalIngredientId_fkey` FOREIGN KEY (`originalIngredientId`) REFERENCES `Ingredient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShoppingItem` ADD CONSTRAINT `ShoppingItem_originalShoppingItemId_fkey` FOREIGN KEY (`originalShoppingItemId`) REFERENCES `ShoppingItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Recipe` ADD CONSTRAINT `Recipe_originalRecipeId_fkey` FOREIGN KEY (`originalRecipeId`) REFERENCES `Recipe`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
