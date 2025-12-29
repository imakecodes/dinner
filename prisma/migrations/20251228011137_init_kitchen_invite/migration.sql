/*
  Warnings:

  - The primary key for the `PantryItem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `ingredients_from_pantry` on the `Recipe` table. All the data in the column will be lost.
  - You are about to drop the column `isFavorite` on the `Recipe` table. All the data in the column will be lost.
  - You are about to drop the column `shopping_list` on the `Recipe` table. All the data in the column will be lost.
  - You are about to drop the `HouseholdMember` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[shoppingItemId]` on the table `PantryItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,kitchenId]` on the table `PantryItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[category,tag,kitchenId]` on the table `TagSuggestion` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `PantryItem` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `kitchenId` to the `PantryItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kitchenId` to the `Recipe` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kitchenId` to the `TagSuggestion` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `TagSuggestion_category_tag_key` ON `TagSuggestion`;

-- AlterTable
ALTER TABLE `PantryItem` DROP PRIMARY KEY,
    ADD COLUMN `id` VARCHAR(191) NOT NULL,
    ADD COLUMN `inStock` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `kitchenId` VARCHAR(191) NOT NULL,
    ADD COLUMN `replenishmentRule` ENUM('ALWAYS', 'ONE_SHOT', 'NEVER') NOT NULL DEFAULT 'NEVER',
    ADD COLUMN `shoppingItemId` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `Recipe` DROP COLUMN `ingredients_from_pantry`,
    DROP COLUMN `isFavorite`,
    DROP COLUMN `shopping_list`,
    ADD COLUMN `kitchenId` VARCHAR(191) NOT NULL,
    ADD COLUMN `language` VARCHAR(191) NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE `TagSuggestion` ADD COLUMN `kitchenId` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `HouseholdMember`;

-- CreateTable
CREATE TABLE `Kitchen` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT 'My Kitchen',
    `inviteCode` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Kitchen_inviteCode_key`(`inviteCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `surname` VARCHAR(191) NOT NULL,
    `measurementSystem` ENUM('METRIC', 'IMPERIAL') NOT NULL DEFAULT 'METRIC',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KitchenMember` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `isGuest` BOOLEAN NOT NULL DEFAULT false,
    `role` ENUM('ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
    `kitchenId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,

    UNIQUE INDEX `KitchenMember_userId_kitchenId_key`(`userId`, `kitchenId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Restriction` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Like` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Dislike` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ingredient` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `kitchenId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Ingredient_name_kitchenId_key`(`name`, `kitchenId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShoppingItem` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `quantity` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `checked` BOOLEAN NOT NULL DEFAULT false,
    `kitchenId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `ShoppingItem_name_kitchenId_key`(`name`, `kitchenId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecipeIngredient` (
    `id` VARCHAR(191) NOT NULL,
    `amount` VARCHAR(191) NULL,
    `quantity` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NULL,
    `inPantry` BOOLEAN NOT NULL,
    `recipeId` VARCHAR(191) NOT NULL,
    `ingredientId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecipeShoppingItem` (
    `id` VARCHAR(191) NOT NULL,
    `recipeId` VARCHAR(191) NOT NULL,
    `shoppingItemId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `RecipeShoppingItem_recipeId_shoppingItemId_key`(`recipeId`, `shoppingItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FavoriteRecipe` (
    `id` VARCHAR(191) NOT NULL,
    `memberId` VARCHAR(191) NOT NULL,
    `recipeId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `FavoriteRecipe_memberId_recipeId_key`(`memberId`, `recipeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GeminiUsage` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `prompt` TEXT NOT NULL,
    `response` TEXT NOT NULL,
    `inputTokens` INTEGER NOT NULL DEFAULT 0,
    `outputTokens` INTEGER NOT NULL DEFAULT 0,
    `userId` VARCHAR(191) NULL,
    `kitchenId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_KitchenMemberToRestriction` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_KitchenMemberToRestriction_AB_unique`(`A`, `B`),
    INDEX `_KitchenMemberToRestriction_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_KitchenMemberToLike` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_KitchenMemberToLike_AB_unique`(`A`, `B`),
    INDEX `_KitchenMemberToLike_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_DislikeToKitchenMember` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_DislikeToKitchenMember_AB_unique`(`A`, `B`),
    INDEX `_DislikeToKitchenMember_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `PantryItem_shoppingItemId_key` ON `PantryItem`(`shoppingItemId`);

-- CreateIndex
CREATE UNIQUE INDEX `PantryItem_name_kitchenId_key` ON `PantryItem`(`name`, `kitchenId`);

-- CreateIndex
CREATE UNIQUE INDEX `TagSuggestion_category_tag_kitchenId_key` ON `TagSuggestion`(`category`, `tag`, `kitchenId`);

-- AddForeignKey
ALTER TABLE `KitchenMember` ADD CONSTRAINT `KitchenMember_kitchenId_fkey` FOREIGN KEY (`kitchenId`) REFERENCES `Kitchen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KitchenMember` ADD CONSTRAINT `KitchenMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PantryItem` ADD CONSTRAINT `PantryItem_kitchenId_fkey` FOREIGN KEY (`kitchenId`) REFERENCES `Kitchen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PantryItem` ADD CONSTRAINT `PantryItem_shoppingItemId_fkey` FOREIGN KEY (`shoppingItemId`) REFERENCES `ShoppingItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ingredient` ADD CONSTRAINT `Ingredient_kitchenId_fkey` FOREIGN KEY (`kitchenId`) REFERENCES `Kitchen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShoppingItem` ADD CONSTRAINT `ShoppingItem_kitchenId_fkey` FOREIGN KEY (`kitchenId`) REFERENCES `Kitchen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Recipe` ADD CONSTRAINT `Recipe_kitchenId_fkey` FOREIGN KEY (`kitchenId`) REFERENCES `Kitchen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecipeIngredient` ADD CONSTRAINT `RecipeIngredient_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `Recipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecipeIngredient` ADD CONSTRAINT `RecipeIngredient_ingredientId_fkey` FOREIGN KEY (`ingredientId`) REFERENCES `Ingredient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecipeShoppingItem` ADD CONSTRAINT `RecipeShoppingItem_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `Recipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecipeShoppingItem` ADD CONSTRAINT `RecipeShoppingItem_shoppingItemId_fkey` FOREIGN KEY (`shoppingItemId`) REFERENCES `ShoppingItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FavoriteRecipe` ADD CONSTRAINT `FavoriteRecipe_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `KitchenMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FavoriteRecipe` ADD CONSTRAINT `FavoriteRecipe_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `Recipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TagSuggestion` ADD CONSTRAINT `TagSuggestion_kitchenId_fkey` FOREIGN KEY (`kitchenId`) REFERENCES `Kitchen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GeminiUsage` ADD CONSTRAINT `GeminiUsage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GeminiUsage` ADD CONSTRAINT `GeminiUsage_kitchenId_fkey` FOREIGN KEY (`kitchenId`) REFERENCES `Kitchen`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_KitchenMemberToRestriction` ADD CONSTRAINT `_KitchenMemberToRestriction_A_fkey` FOREIGN KEY (`A`) REFERENCES `KitchenMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_KitchenMemberToRestriction` ADD CONSTRAINT `_KitchenMemberToRestriction_B_fkey` FOREIGN KEY (`B`) REFERENCES `Restriction`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_KitchenMemberToLike` ADD CONSTRAINT `_KitchenMemberToLike_A_fkey` FOREIGN KEY (`A`) REFERENCES `KitchenMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_KitchenMemberToLike` ADD CONSTRAINT `_KitchenMemberToLike_B_fkey` FOREIGN KEY (`B`) REFERENCES `Like`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DislikeToKitchenMember` ADD CONSTRAINT `_DislikeToKitchenMember_A_fkey` FOREIGN KEY (`A`) REFERENCES `Dislike`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DislikeToKitchenMember` ADD CONSTRAINT `_DislikeToKitchenMember_B_fkey` FOREIGN KEY (`B`) REFERENCES `KitchenMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
