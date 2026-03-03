import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  resolveAscendancyNode,
  resolveMechanicClaim,
  resolveSkill,
  resolveUniqueItem,
  resolvePassiveNode,
  resolveSupportGem,
} from '@/lib/poe2-knowledge';
import type {
  KnowledgeEntityType,
  KnowledgeProvider,
  LookupResult,
} from '@/lib/poe2-knowledge-types';

const DEFAULT_WEEKLY_CRON = '0 3 * * 1';
const DEFAULT_MAX_PAGES_PER_RUN = 240;

const SKILL_SEEDS = [
  'Leap Slam',
  'Shield Charge',
  'Armour Breaker',
  'Shockwave Totem',
  'Herald of Ash',
  'Infernal Cry',
  'Earthquake',
  'Sunder',
  'Seismic Cry',
  'Earthshatter',
  'Boneshatter',
  'Volcanic Fissure',
  'Rolling Slam',
  'Supercharged Slam',
  'Ancestral Warrior Totem',
  'Perfect Strike',
  'Resonating Shield',
  'Magma Barrier',
  'Scavenged Plating',
  'Molten Blast',
  'Hammer of the Gods',
  'Stampede',
  'Shield Wall',
  'Fortifying Cry',
  'Time of Need',
  'Overwhelming Presence',
  'Berserk',
  'Iron Ward',
  'Forge Hammer',
  'Ancestral Cry',
  'Sniper\'s Mark',
  'Rain of Arrows',
  'Lightning Arrow',
  'Barrage',
  'Herald of Thunder',
  'Plague Bearer',
  'Rapid Assault',
  'Disengage',
  'Whirling Slash',
  'Spearfield',
  'Lightning Spear',
  'Glacial Lance',
  'Escape Shot',
  'Spiral Volley',
  'Detonating Arrow',
  'Poisonburst Arrow',
  'Toxic Growth',
  'Stormcaller Arrow',
  'Lightning Rod',
  'Ice Shot',
  'Tornado Shot',
  'Mirage Archer',
  'Primal Strikes',
  'Cull The Weak',
  'Fangs of Frost',
  'Rake',
  'Spear of Solaris',
  'Storm Lance',
];

const ASCENDANCY_SEEDS = [
  'Earthbreaker',
  'Ancestral Empowerment',
  'Surprising Strength',
  'Crushing Impacts',
  'Hulking Form',
  'Colossal Capacity',
  'Mysterious Lineage',
  'Stone Skin',
  'Anvil\'s Weight',
  'Imploding Impacts',
  'Jade Heritage',
  'Warcaller\'s Bellow',
  'Greatwolf\'s Howl',
  'Answered Call',
  'Wooden Wall',
  'Renly\'s Training',
  'Turtle Charm',
  'Heat of the Forge',
  'Living Weapon',
  'Against the Anvil',
  'Coal Stoker',
  'Forged in Flame',
  'Smith\'s Masterwork',
  'Tantalum Alloy',
  'Padded Plates',
  'Lead Lining',
  'Support Straps',
  'Kitavan Engraving',
  'Heavy Bracing',
  'Leather Bindings',
  'Flowing Metal',
  'Molten Symbol',
  'Internal Layer',
  'Dedication to Kitava',
  'Heatproofing',
  'Beidat\'s Gaze',
  'Endless Munitions',
  'Gathering Winds',
  'Eagle Eyes',
  'Avidity',
  'Called Shots',
  'Projectile Proximity Specialisation',
  'Far Shot',
  'Point Blank',
  'Thrilling Chase',
  'Wind Ward',
  'Brew Concoction',
  'Contagious Contamination',
  'Connected Chemistry',
  'Overwhelming Toxicity',
  'Running Assault',
  'Relentless Pursuit',
  'Traveller\'s Wisdom',
  'Enduring Elixirs',
  'Loyal Hellhound',
  'Pyromantic Pact',
  'Bringer of Flame',
  'Demonic Possession',
];

const MECHANIC_SEEDS = [
  // Core mechanics present in both POE1 and POE2
  'damage conversion',
  'damage taken as',
  'supports attacks',
  'supports spells',
  'gain as extra',
  'energy shield',
  'armour',
  'evasion',
  'block chance',
  'spell suppression',
  'critical strike chance',
  'critical strike multiplier',
  'life leech',
  'mana leech',
  'energy shield leech',
  'life gain on hit',
  'mana gain on hit',
  'life regeneration',
  'mana regeneration',
  'energy shield regeneration',
  'ailment immunity',
  'curse immunity',
  'stun immunity',
  'freeze immunity',
  'shock immunity',
  'ignite immunity',
  'bleed immunity',
  'poison immunity',
  'chaos resistance',
  'elemental resistance',
  'maximum resistance',
  'reduced elemental damage taken',
  'reduced physical damage taken',
  'increased area of effect',
  'increased projectile speed',
  'increased cast speed',
  'increased attack speed',
  'increased movement speed',
  'cooldown recovery rate',
  'skill effect duration',
  'aura effect',
  'curse effect',
  'minion life',
  'minion damage',
  'totem life',
  'totem damage',
  'trap damage',
  'mine damage',
  'dot multiplier',
  'ignite damage',
  'bleed damage',
  'poison damage',
  // POE2-specific mechanics
  'jagged ground',
  'molten fissures',
  'heavy stun',
  'glory',
  'rage',
  'infernal flame',
  'ancestrally boosted',
  'empowered',
  'crushing blows',
  'break armour',
  'aftershocks',
  'sundered armour',
  'broken stance',
  'dazed',
  'primed for stun',
  'overkill',
  'endurance charges',
  'frenzy charges',
  'power charges',
  'jade',
  'scavenged plating',
  'thorns',
  'blockable',
  'knockback',
  'maim',
  'hinder',
  'slow',
  'blind',
  'taunt',
  'intimidate',
  'unnerved',
  'brittle',
  'sapped',
  'scorched',
  'shocked ground',
  'chilled ground',
  'ignited ground',
  'elemental ground surfaces',
  'fire attunement',
  'elemental armament',
  'immolate',
  'fire exposure',
];

const normalizeToken = (value: string): string =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const compact = (value: unknown): string => String(value || '').trim();

const toEntityEnum = (value: KnowledgeEntityType): 'SKILL' | 'ASCENDANCY_NODE' | 'UNIQUE_ITEM' | 'MECHANIC_CLAIM' | 'PASSIVE_NODE' | 'SUPPORT_GEM' => {
  if (value === 'skill') return 'SKILL';
  if (value === 'ascendancy_node') return 'ASCENDANCY_NODE';
  if (value === 'unique_item') return 'UNIQUE_ITEM';
  if (value === 'passive_node') return 'PASSIVE_NODE';
  if (value === 'support_gem') return 'SUPPORT_GEM';
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
        take: 500,
        orderBy: { snapshotAt: 'desc' },
        select: { canonicalTerm: true },
      }),
      prisma.poeAliasSnapshot.findMany({
        take: 500,
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

// NOVA FUNÇÃO: Carregar seeds de arquivo externo
const loadExternalSeeds = (): Array<{ entityType: KnowledgeEntityType; term: string }> => {
  try {
    const seedsPath = path.join(process.cwd(), 'data', 'poe2-seeds.json');

    // Verificar se o arquivo existe
    if (!existsSync(seedsPath)) {
      console.log('[PoeSnapshot] External seeds file not found, skipping');
      return [];
    }

    const raw = readFileSync(seedsPath, 'utf-8');
    const parsed = JSON.parse(raw) as {
      skills?: string[];
      ascendancy_nodes?: string[];
      mechanic_claims?: string[];
      passive_nodes?: string[];
      support_gems?: string[];
    };

    const seeds: Array<{ entityType: KnowledgeEntityType; term: string }> = [];

    if (parsed.skills) {
      seeds.push(...parsed.skills.map(term => ({ entityType: 'skill' as const, term })));
    }

    if (parsed.ascendancy_nodes) {
      seeds.push(...parsed.ascendancy_nodes.map(term => ({ entityType: 'ascendancy_node' as const, term })));
    }

    if (parsed.mechanic_claims) {
      seeds.push(...parsed.mechanic_claims.map(term => ({ entityType: 'mechanic_claim' as const, term })));
    }

    if (parsed.passive_nodes) {
      seeds.push(...parsed.passive_nodes.map(term => ({ entityType: 'passive_node' as const, term })));
    }

    if (parsed.support_gems) {
      seeds.push(...parsed.support_gems.map(term => ({ entityType: 'support_gem' as const, term })));
    }

    console.log(`[PoeSnapshot] Loaded ${seeds.length} seeds from external file`);
    return seeds;
  } catch (error) {
    console.warn('[PoeSnapshot] Failed to load external seeds:', error);
    return [];
  }
};

const loadSeedTerms = async (maxPages: number): Promise<Array<{ entityType: KnowledgeEntityType; term: string }>> => {
  const uniqueSeeds = loadUniqueSeeds();
  const previous = await loadPreviousSeeds();
  const externalSeeds = loadExternalSeeds();

  const candidates: Array<{ entityType: KnowledgeEntityType; term: string }> = [
    ...SKILL_SEEDS.map((term) => ({ entityType: 'skill' as const, term })),
    ...ASCENDANCY_SEEDS.map((term) => ({ entityType: 'ascendancy_node' as const, term })),
    ...uniqueSeeds.map((term) => ({ entityType: 'unique_item' as const, term })),
    ...MECHANIC_SEEDS.map((term) => ({ entityType: 'mechanic_claim' as const, term })),
    ...externalSeeds,
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

  console.log(`[PoeSnapshot] Loaded ${deduped.length} seed terms for snapshot`);
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
  if (entityType === 'passive_node') {
    return resolvePassiveNode(term, { lookupMode: 'online_first' });
  }
  if (entityType === 'support_gem') {
    return resolveSupportGem(term, { lookupMode: 'online_first' });
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

  console.log(`[PoeSnapshot] Starting weekly snapshot with ${seeds.length} terms`);

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
  const startTime = Date.now();

  // Inicializar métricas
  const metrics: ProviderMetrics = {
    poe2db: { success: 0, failed: 0, notFound: 0 },
    poe2wiki: { success: 0, failed: 0, notFound: 0 },
  };

  try {
    for (const seed of seeds) {
      attemptedTerms += 1;

      let lookup: LookupResult;
      try {
        lookup = await resolveEntity(seed.entityType, seed.term);
        // Coletar métricas
        collectProviderMetrics(lookup, metrics);
      } catch (error) {
        failedTerms += 1;
        console.warn(`[PoeSnapshot] Failed to resolve ${seed.entityType}: "${seed.term}"`, error);
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

    // Logar métricas finais
    logMetrics(metrics, startTime);
    console.log(`[PoeSnapshot] Completed: ${persistedTerms} persisted, ${failedTerms} failed out of ${attemptedTerms} attempted`);

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

// NOVA FUNÇÃO: Coletar métricas por provedor
interface ProviderMetrics {
  poe2db: { success: number; failed: number; notFound: number };
  poe2wiki: { success: number; failed: number; notFound: number };
}

const collectProviderMetrics = (lookup: LookupResult, metrics: ProviderMetrics): void => {
  if (!lookup.providerAttempts) return;

  for (const attempt of lookup.providerAttempts) {
    if (attempt.provider === 'poe2db') {
      if (attempt.status === 'verified') metrics.poe2db.success++;
      else if (attempt.status === 'not_found') metrics.poe2db.notFound++;
      else metrics.poe2db.failed++;
    } else if (attempt.provider === 'poe2wiki') {
      if (attempt.status === 'verified') metrics.poe2wiki.success++;
      else if (attempt.status === 'not_found') metrics.poe2wiki.notFound++;
      else metrics.poe2wiki.failed++;
    }
  }
};

const logMetrics = (metrics: ProviderMetrics, startTime: number): void => {
  const duration = Date.now() - startTime;
  console.log(`[PoeSnapshot] Metrics after ${duration}ms:`);
  console.log(`  POE2DB: ${metrics.poe2db.success} success, ${metrics.poe2db.notFound} not found, ${metrics.poe2db.failed} failed`);
  console.log(`  POE2Wiki: ${metrics.poe2wiki.success} success, ${metrics.poe2wiki.notFound} not found, ${metrics.poe2wiki.failed} failed`);

  const totalAttempts = metrics.poe2db.success + metrics.poe2db.failed + metrics.poe2db.notFound +
    metrics.poe2wiki.success + metrics.poe2wiki.failed + metrics.poe2wiki.notFound;

  if (totalAttempts > 0) {
    const successRate = ((metrics.poe2db.success + metrics.poe2wiki.success) / totalAttempts * 100).toFixed(1);
    console.log(`  Overall success rate: ${successRate}%`);
  }
};

export const getPoeSnapshotCronSchedule = (): string => getWeeklyCronExpression();

export const isPoeSnapshotCronEnabled = (): boolean =>
  String(process.env.ENABLE_POE_SNAPSHOT_CRON || 'true').toLowerCase() !== 'false';
