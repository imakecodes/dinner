import { writeFile } from 'fs/promises';
import path from 'path';
import { prisma } from '../lib/prisma.ts';
import { assessTextDomain } from '../lib/domain-guardrails.ts';

type CliOptions = {
  dryRun: boolean;
  allHideouts: boolean;
  hideoutId?: string;
  reportFile?: string;
};

type HideoutReport = {
  hideoutId: string;
  hideoutName: string;
  buildIdsToDelete: string[];
  buildItemIdsToDelete: string[];
  ingredientIdsToDelete: string[];
  stashItemIdsToDelete: string[];
  samples: {
    builds: string[];
    buildItems: string[];
    ingredients: string[];
    stashItems: string[];
  };
};

type CleanupReport = {
  mode: 'dry-run' | 'apply';
  generatedAt: string;
  options: CliOptions;
  summary: {
    hideoutsScanned: number;
    buildsMarked: number;
    buildItemsMarked: number;
    ingredientsMarked: number;
    stashItemsMarked: number;
  };
  hideouts: HideoutReport[];
};

const parseArgs = (args: string[]): CliOptions => {
  const apply = args.includes('--apply');
  const hideoutArg = args.find((arg) => arg.startsWith('--hideout-id='));
  const reportArg = args.find((arg) => arg.startsWith('--report-file='));

  const hideoutId = hideoutArg ? hideoutArg.split('=')[1]?.trim() : undefined;
  const reportFile = reportArg ? reportArg.split('=').slice(1).join('=').trim() : undefined;

  return {
    dryRun: !apply,
    allHideouts: !hideoutId,
    hideoutId: hideoutId || undefined,
    reportFile: reportFile || undefined,
  };
};

const isLikelyCulinary = (text: string): boolean => {
  const assessment = assessTextDomain(text);
  return assessment.isCulinaryLikely;
};

const compactBuildText = (build: {
  recipe_title: string;
  analysis_log: string;
  match_reasoning: string;
  meal_type: string;
  difficulty: string;
}) =>
  [
    build.recipe_title,
    build.analysis_log,
    build.match_reasoning,
    build.meal_type,
    build.difficulty,
  ]
    .filter(Boolean)
    .join('\n');

async function collectHideoutReport(hideoutId: string, hideoutName: string): Promise<HideoutReport> {
  const builds = await prisma.recipe.findMany({
    where: { kitchenId: hideoutId },
    select: {
      id: true,
      recipe_title: true,
      analysis_log: true,
      match_reasoning: true,
      meal_type: true,
      difficulty: true,
    },
  });

  const buildIdsToDelete = builds
    .filter((build) => isLikelyCulinary(compactBuildText(build)))
    .map((build) => build.id);
  const buildIdSet = new Set(buildIdsToDelete);

  const buildItems = await prisma.shoppingItem.findMany({
    where: { kitchenId: hideoutId },
    select: {
      id: true,
      name: true,
      recipeItems: {
        select: { recipeId: true },
      },
    },
  });

  const buildItemIdsToDelete = buildItems
    .filter((item) => {
      if (!isLikelyCulinary(item.name)) return false;
      const remainingLinks = item.recipeItems.filter((ref) => !buildIdSet.has(ref.recipeId)).length;
      return remainingLinks === 0;
    })
    .map((item) => item.id);

  const ingredients = await prisma.ingredient.findMany({
    where: { kitchenId: hideoutId },
    select: {
      id: true,
      name: true,
      recipeIngredients: {
        select: { recipeId: true },
      },
    },
  });

  const ingredientIdsToDelete = ingredients
    .filter((ingredient) => {
      if (!isLikelyCulinary(ingredient.name)) return false;
      const remainingLinks = ingredient.recipeIngredients.filter((ref) => !buildIdSet.has(ref.recipeId)).length;
      return remainingLinks === 0;
    })
    .map((ingredient) => ingredient.id);

  const stashItems = await prisma.pantryItem.findMany({
    where: { kitchenId: hideoutId },
    select: { id: true, name: true },
  });

  const stashItemIdsToDelete = stashItems
    .filter((item) => isLikelyCulinary(item.name))
    .map((item) => item.id);

  return {
    hideoutId,
    hideoutName,
    buildIdsToDelete,
    buildItemIdsToDelete,
    ingredientIdsToDelete,
    stashItemIdsToDelete,
    samples: {
      builds: builds
        .filter((build) => buildIdsToDelete.includes(build.id))
        .slice(0, 10)
        .map((build) => build.recipe_title),
      buildItems: buildItems
        .filter((item) => buildItemIdsToDelete.includes(item.id))
        .slice(0, 10)
        .map((item) => item.name),
      ingredients: ingredients
        .filter((item) => ingredientIdsToDelete.includes(item.id))
        .slice(0, 10)
        .map((item) => item.name),
      stashItems: stashItems
        .filter((item) => stashItemIdsToDelete.includes(item.id))
        .slice(0, 10)
        .map((item) => item.name),
    },
  };
}

async function applyHideoutCleanup(report: HideoutReport) {
  await prisma.$transaction(async (tx) => {
    if (report.buildIdsToDelete.length > 0) {
      await tx.recipe.deleteMany({ where: { id: { in: report.buildIdsToDelete } } });
    }

    if (report.stashItemIdsToDelete.length > 0) {
      await tx.pantryItem.deleteMany({ where: { id: { in: report.stashItemIdsToDelete } } });
    }

    if (report.buildItemIdsToDelete.length > 0) {
      await tx.shoppingItem.deleteMany({ where: { id: { in: report.buildItemIdsToDelete } } });
    }

    if (report.ingredientIdsToDelete.length > 0) {
      await tx.ingredient.deleteMany({ where: { id: { in: report.ingredientIdsToDelete } } });
    }
  });
}

function summarize(hideouts: HideoutReport[]) {
  return {
    hideoutsScanned: hideouts.length,
    buildsMarked: hideouts.reduce((acc, item) => acc + item.buildIdsToDelete.length, 0),
    buildItemsMarked: hideouts.reduce((acc, item) => acc + item.buildItemIdsToDelete.length, 0),
    ingredientsMarked: hideouts.reduce((acc, item) => acc + item.ingredientIdsToDelete.length, 0),
    stashItemsMarked: hideouts.reduce((acc, item) => acc + item.stashItemIdsToDelete.length, 0),
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const hideouts = options.allHideouts
    ? await prisma.kitchen.findMany({ select: { id: true, name: true }, orderBy: { createdAt: 'asc' } })
    : options.hideoutId
      ? await prisma.kitchen.findMany({ where: { id: options.hideoutId }, select: { id: true, name: true } })
      : [];

  if (hideouts.length === 0) {
    console.log('[cleanup-legacy-content] No hideouts found for the selected scope.');
    return;
  }

  const hideoutReports: HideoutReport[] = [];

  for (const hideout of hideouts) {
    const report = await collectHideoutReport(hideout.id, hideout.name);
    hideoutReports.push(report);

    if (!options.dryRun) {
      await applyHideoutCleanup(report);
    }
  }

  const report: CleanupReport = {
    mode: options.dryRun ? 'dry-run' : 'apply',
    generatedAt: new Date().toISOString(),
    options,
    summary: summarize(hideoutReports),
    hideouts: hideoutReports,
  };

  console.log('[cleanup-legacy-content] Mode:', report.mode);
  console.log('[cleanup-legacy-content] Hideouts scanned:', report.summary.hideoutsScanned);
  console.log('[cleanup-legacy-content] Builds marked:', report.summary.buildsMarked);
  console.log('[cleanup-legacy-content] Build items marked:', report.summary.buildItemsMarked);
  console.log('[cleanup-legacy-content] Ingredients marked:', report.summary.ingredientsMarked);
  console.log('[cleanup-legacy-content] Stash items marked:', report.summary.stashItemsMarked);

  if (options.reportFile) {
    const reportPath = path.resolve(process.cwd(), options.reportFile);
    await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
    console.log('[cleanup-legacy-content] Report written to:', reportPath);
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

main()
  .catch((error) => {
    console.error('[cleanup-legacy-content] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
