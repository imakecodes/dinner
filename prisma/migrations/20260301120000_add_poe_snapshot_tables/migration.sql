-- CreateTable
CREATE TABLE `PoeSnapshotRun` (
  `id` VARCHAR(191) NOT NULL,
  `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `completedAt` DATETIME(3) NULL,
  `snapshotAt` DATETIME(3) NOT NULL,
  `status` ENUM('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED') NOT NULL DEFAULT 'RUNNING',
  `maxPages` INTEGER NOT NULL DEFAULT 0,
  `attemptedTerms` INTEGER NOT NULL DEFAULT 0,
  `persistedTerms` INTEGER NOT NULL DEFAULT 0,
  `failedTerms` INTEGER NOT NULL DEFAULT 0,
  `errorMessage` TEXT NULL,

  PRIMARY KEY (`id`),
  INDEX `PoeSnapshotRun_snapshotAt_idx`(`snapshotAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PoeEntitySnapshot` (
  `id` VARCHAR(191) NOT NULL,
  `snapshotAt` DATETIME(3) NOT NULL,
  `entityType` ENUM('SKILL', 'ASCENDANCY_NODE', 'UNIQUE_ITEM', 'MECHANIC_CLAIM') NOT NULL,
  `provider` ENUM('POE2DB', 'POE2WIKI') NOT NULL,
  `canonicalTerm` VARCHAR(191) NOT NULL,
  `normalizedTerm` VARCHAR(191) NOT NULL,
  `sourceUrl` VARCHAR(191) NOT NULL,
  `rawText` TEXT NOT NULL,
  `contentHash` VARCHAR(191) NOT NULL,
  `facts` JSON NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `runId` VARCHAR(191) NULL,

  PRIMARY KEY (`id`),
  UNIQUE INDEX `PoeEntitySnapshot_provider_sourceUrl_snapshotAt_key`(`provider`, `sourceUrl`, `snapshotAt`),
  INDEX `PoeEntitySnapshot_normalizedTerm_entityType_snapshotAt_idx`(`normalizedTerm`, `entityType`, `snapshotAt`),
  INDEX `PoeEntitySnapshot_snapshotAt_idx`(`snapshotAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PoeAliasSnapshot` (
  `id` VARCHAR(191) NOT NULL,
  `snapshotAt` DATETIME(3) NOT NULL,
  `entityType` ENUM('SKILL', 'ASCENDANCY_NODE', 'UNIQUE_ITEM', 'MECHANIC_CLAIM') NOT NULL,
  `aliasTerm` VARCHAR(191) NOT NULL,
  `aliasNormalized` VARCHAR(191) NOT NULL,
  `canonicalTerm` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `runId` VARCHAR(191) NULL,
  `entityId` VARCHAR(191) NULL,

  PRIMARY KEY (`id`),
  INDEX `PoeAliasSnapshot_aliasNormalized_entityType_snapshotAt_idx`(`aliasNormalized`, `entityType`, `snapshotAt`),
  INDEX `PoeAliasSnapshot_snapshotAt_idx`(`snapshotAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PoeEntitySnapshot`
  ADD CONSTRAINT `PoeEntitySnapshot_runId_fkey`
  FOREIGN KEY (`runId`) REFERENCES `PoeSnapshotRun`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PoeAliasSnapshot`
  ADD CONSTRAINT `PoeAliasSnapshot_runId_fkey`
  FOREIGN KEY (`runId`) REFERENCES `PoeSnapshotRun`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PoeAliasSnapshot`
  ADD CONSTRAINT `PoeAliasSnapshot_entityId_fkey`
  FOREIGN KEY (`entityId`) REFERENCES `PoeEntitySnapshot`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
