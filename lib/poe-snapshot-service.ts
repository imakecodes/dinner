import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  resolveAscendancyNode,
  resolveMechanicClaim,
  resolveSkill,
  resolveUniqueItem,
} from '@/lib/poe2-knowledge';
import type {
  KnowledgeEntityType,
  KnowledgeProvider,
  LookupResult,
} from '@/lib/poe2-knowledge-types';

const DEFAULT_WEEKLY_CRON = '0 3 * * 1';
const DEFAULT_MAX_PAGES_PER_RUN = 240;

const SKILL_SEEDS = [
  'Frostbolt',
  'Fireball',
  'Spark',
  'Arc',
  'Ice Nova',
  'Flame Wall',
  'Freezing Shards',
  'Firestorm',
  'Cold Snap',
  'Eye of Winter',
];

const ASCENDANCY_SEEDS = [
  'Infernalist',
  'Invoker',
  'Deadeye',
  'Stormweaver',
  'Warbringer',
  'Chronomancer',
];

const MECHANIC_SEEDS = [
  'cold to fire conversion',
  'damage taken as',
  'supports attacks',
  'supports spells',
  'gain as extra',
  'avatar of fire',
];

const normalizeToken = (value: string): string =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const compact = (value: unknown): string => String(value || '').trim();

const toEntityEnum = (value: KnowledgeEntityType): 'SKILL' | 'ASCENDANCY_NODE' | 'UNIQUE_ITEM' | 'MECHANIC_CLAIM' => {
  if (value === 'skill') return 'SKILL';
  if (value === 'ascendancy_node') return 'ASCENDANCY_NODE';
  if (value === 'unique_item') return 'UNIQUE_ITEM';
  return 'MECHANIC_CLAIM';
};

const toProviderEnum = (value: KnowledgeProvider): 'POE2DB' | 'POE2WIKI' | null => {
  if (value === 'poe2db') return 'POE2DB';
  if (value === 'poe2wiki') return 'POE2WIKI';
  return null;
};

const getSnapshotAt = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 0, 0, 0));
};

const getWeeklyCronExpression = (): string => {
  const value = compact(process.env.POE_SNAPSHOT_CRON_SCHEDULE);
  return value || DEFAULT_WEEKLY_CRON;
};

const getMaxPagesPerRun = (): number => {
  const parsed = Number(process.env.POE_SNAPSHOT_MAX_PAGES_PER_RUN);
  return Number.isFinite(parsed) && parsed >= 20 ? Math.floor(parsed) : DEFAULT_MAX_PAGES_PER_RUN;
};

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

const loadUniqueSeeds = (): string[] => {
  try {
    const manifestPath = path.join(process.cwd(), 'item_examples', '_unique_item_examples_manifest.json');
    const raw = readFileSync(manifestPath, 'utf-8');
    const parsed = JSON.parse(raw) as { entries?: Array<{ expectedName?: string }> };
    return unique((parsed.entries || []).map((entry) => compact(entry.expectedName)).filter(Boolean));
  } catch {
    return [];
  }
};

const loadPreviousSeeds = async (): Promise<string[]> => {
  try {
    const [entities, aliases] = await Promise.all([
      prisma.poeEntitySnapshot.findMany({
        take: 300,
        orderBy: { snapshotAt: 'desc' },
        select: { canonicalTerm: true },
      }),
      prisma.poeAliasSnapshot.findMany({
        take: 300,
        orderBy: { snapshotAt: 'desc' },
        select: { aliasTerm: true },
      }),
    ]);

    return unique([
      ...entities.map((row) => compact(row.canonicalTerm)),
      ...aliases.map((row) => compact(row.aliasTerm)),
    ].filter(Boolean));
  } catch {
    return [];
  }
};

const loadSeedTerms = async (maxPages: number): Promise<Array<{ entityType: KnowledgeEntityType; term: string }>> => {
  const uniqueSeeds = loadUniqueSeeds();
  const previous = await loadPreviousSeeds();

  const candidates: Array<{ entityType: KnowledgeEntityType; term: string }> = [
    ...SKILL_SEEDS.map((term) => ({ entityType: 'skill' as const, term })),
    ...ASCENDANCY_SEEDS.map((term) => ({ entityType: 'ascendancy_node' as const, term })),
    ...uniqueSeeds.map((term) => ({ entityType: 'unique_item' as const, term })),
    ...MECHANIC_SEEDS.map((term) => ({ entityType: 'mechanic_claim' as const, term })),
    ...previous.map((term) => ({ entityType: 'skill' as const, term })),
  ];

  const seen = new Set<string>();
  const deduped: Array<{ entityType: KnowledgeEntityType; term: string }> = [];

  for (const candidate of candidates) {
    const normalized = normalizeToken(candidate.term);
    if (!normalized) continue;

    const key = `${candidate.entityType}:${normalized}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({ entityType: candidate.entityType, term: candidate.term });

    if (deduped.length >= maxPages) {
      break;
    }
  }

  return deduped;
};

const resolveEntity = async (entityType: KnowledgeEntityType, term: string): Promise<LookupResult> => {
  if (entityType === 'skill') {
    return resolveSkill(term, { lookupMode: 'online_first' });
  }
  if (entityType === 'ascendancy_node') {
    return resolveAscendancyNode(term, { lookupMode: 'online_first' });
  }
  if (entityType === 'unique_item') {
    return resolveUniqueItem(term, { lookupMode: 'online_first' });
  }
  return resolveMechanicClaim('snapshot_seed', term, { lookupMode: 'online_first' });
};

const hashPayload = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value || '')).digest('hex');

const shouldPersistLookup = (lookup: LookupResult): boolean =>
  lookup.status === 'verified' || lookup.status === 'unverified_external';

export async function runWeeklyPoeSnapshot(): Promise<void> {
  const snapshotAt = getSnapshotAt();
  const maxPages = getMaxPagesPerRun();
  const seeds = await loadSeedTerms(maxPages);

  const run = await prisma.poeSnapshotRun.create({
    data: {
      snapshotAt,
      status: 'RUNNING',
      maxPages,
      attemptedTerms: 0,
      persistedTerms: 0,
      failedTerms: 0,
    },
  });

  let attemptedTerms = 0;
  let persistedTerms = 0;
  let failedTerms = 0;

  try {
    for (const seed of seeds) {
      attemptedTerms += 1;

      let lookup: LookupResult;
      try {
        lookup = await resolveEntity(seed.entityType, seed.term);
      } catch {
        failedTerms += 1;
        continue;
      }

      if (!shouldPersistLookup(lookup)) {
        if (lookup.status === 'source_unavailable' || lookup.status === 'error') {
          failedTerms += 1;
        }
        continue;
      }

      const officialSources = lookup.sources.filter((source) => source.provider === 'poe2db' || source.provider === 'poe2wiki');
      if (officialSources.length === 0) {
        continue;
      }

      for (const source of officialSources) {
        const providerEnum = toProviderEnum(source.provider);
        if (!providerEnum) {
          continue;
        }

        const normalizedTerm = normalizeToken(seed.term);
        const canonicalTerm = compact(lookup.query) || compact(seed.term);
        const payloadHash = hashPayload({
          canonicalTerm,
          sourceUrl: source.url,
          rawText: lookup.rawText || '',
          facts: lookup.facts,
        });

        const entity = await prisma.poeEntitySnapshot.upsert({
          where: {
            provider_sourceUrl_snapshotAt: {
              provider: providerEnum,
              sourceUrl: source.url,
              snapshotAt,
            },
          },
          update: {
            canonicalTerm,
            normalizedTerm,
            rawText: lookup.rawText || '',
            contentHash: payloadHash,
            facts: lookup.facts as unknown as Prisma.InputJsonValue,
            runId: run.id,
          },
          create: {
            snapshotAt,
            entityType: toEntityEnum(seed.entityType),
            provider: providerEnum,
            canonicalTerm,
            normalizedTerm,
            sourceUrl: source.url,
            rawText: lookup.rawText || '',
            contentHash: payloadHash,
            facts: lookup.facts as unknown as Prisma.InputJsonValue,
            runId: run.id,
          },
        });

        await prisma.poeAliasSnapshot.create({
          data: {
            snapshotAt,
            entityType: toEntityEnum(seed.entityType),
            aliasTerm: seed.term,
            aliasNormalized: normalizedTerm,
            canonicalTerm,
            runId: run.id,
            entityId: entity.id,
          },
        });

        persistedTerms += 1;
      }
    }

    const status = failedTerms > 0 ? 'PARTIAL' : 'SUCCESS';
    await prisma.poeSnapshotRun.update({
      where: { id: run.id },
      data: {
        status,
        attemptedTerms,
        persistedTerms,
        failedTerms,
        completedAt: new Date(),
      },
    });
  } catch (error: any) {
    await prisma.poeSnapshotRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        attemptedTerms,
        persistedTerms,
        failedTerms,
        completedAt: new Date(),
        errorMessage: String(error?.message || error || 'snapshot_failed'),
      },
    });
    throw error;
  }
}

export const getPoeSnapshotCronSchedule = (): string => getWeeklyCronExpression();

export const isPoeSnapshotCronEnabled = (): boolean =>
  String(process.env.ENABLE_POE_SNAPSHOT_CRON || 'true').toLowerCase() !== 'false';
