-- CreateTable
CREATE TABLE `_KitchenMemberToMealPlan` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_KitchenMemberToMealPlan_AB_unique`(`A`, `B`),
    INDEX `_KitchenMemberToMealPlan_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_KitchenMemberToMealPlan` ADD CONSTRAINT `_KitchenMemberToMealPlan_A_fkey` FOREIGN KEY (`A`) REFERENCES `KitchenMember`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_KitchenMemberToMealPlan` ADD CONSTRAINT `_KitchenMemberToMealPlan_B_fkey` FOREIGN KEY (`B`) REFERENCES `MealPlan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
