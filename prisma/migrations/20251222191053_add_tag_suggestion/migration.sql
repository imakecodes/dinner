-- CreateTable
CREATE TABLE `TagSuggestion` (
    `id` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `tag` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `TagSuggestion_category_tag_key`(`category`, `tag`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
