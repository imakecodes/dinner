-- AlterTable
ALTER TABLE `Ingredient` ADD COLUMN `originalIngredientId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Recipe` ADD COLUMN `originalRecipeId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ShoppingItem` ADD COLUMN `originalShoppingItemId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Ingredient` ADD CONSTRAINT `Ingredient_originalIngredientId_fkey` FOREIGN KEY (`originalIngredientId`) REFERENCES `Ingredient`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShoppingItem` ADD CONSTRAINT `ShoppingItem_originalShoppingItemId_fkey` FOREIGN KEY (`originalShoppingItemId`) REFERENCES `ShoppingItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Recipe` ADD CONSTRAINT `Recipe_originalRecipeId_fkey` FOREIGN KEY (`originalRecipeId`) REFERENCES `Recipe`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
