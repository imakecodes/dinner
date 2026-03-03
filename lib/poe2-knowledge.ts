import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import {
  KnowledgeEntityType,
  KnowledgeFact,
  KnowledgeLookupMode,
  KnowledgeProvider,
  KnowledgeSource,
  LookupOptions,
  LookupResult,
  LookupStatus,
  ProviderLookupAttempt,
  ProviderLookupStatus,
} from '@/lib/poe2-knowledge-types';

type CacheEntry = {
  expiresAt: number;
  result: LookupResult;
};

const ALLOWED_HOSTNAMES = new Set([
  'poe2db.tw',
  'www.poe2db.tw',
  'poe2wiki.net',
  'www.poe2wiki.net',
]);
const CACHE = new Map<string, CacheEntry>();
let uniqueSnapshotCache: Set<string> | null = null;

const DEFAULT_CACHE_TTL_MIN = 360;
const DEFAULT_FETCH_TIMEOUT_MS = 2500;
const TRANSIENT_ERROR_CACHE_TTL_MS = 5_000;
const OFFICIAL_PROVIDERS: Array<'poe2db' | 'poe2wiki'> = ['poe2db', 'poe2wiki'];
const DEFAULT_LOOKUP_MODE: KnowledgeLookupMode = 'snapshot_first';

const nowIso = (): string => new Date().toISOString();

const readNumberEnv = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getCacheTtlMs = (): number =>
  readNumberEnv(process.env.POE_KNOWLEDGE_CACHE_TTL_MIN, DEFAULT_CACHE_TTL_MIN) * 60 * 1000;

const getFetchTimeoutMs = (): number =>
  readNumberEnv(process.env.POE_KNOWLEDGE_FETCH_TIMEOUT_MS, DEFAULT_FETCH_TIMEOUT_MS);

const normalizeToken = (value: string): string =>
  String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const toSlug = (value: string): string =>
  normalizeToken(value)
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');

const makeCacheKey = (entityType: KnowledgeEntityType, query: string): string =>
  `${entityType}:${normalizeToken(query)}`;

const makeCacheKeyWithMode = (
  entityType: KnowledgeEntityType,
  query: string,
  lookupMode: KnowledgeLookupMode,
): string => `${makeCacheKey(entityType, query)}:${lookupMode}`;

const toSource = (provider: KnowledgeProvider, url: string): KnowledgeSource => ({
  provider,
  url,
  fetchedAt: nowIso(),
});

const removeHtmlTags = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/giu, ' ')
    .replace(/<style[\s\S]*?<\/style>/giu, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

const isLikelyMissingPage = (text: string): boolean => {
  const normalized = text.toLowerCase();
  return (
    normalized.includes('page not found') ||
    normalized.includes('there is currently no text in this page') ||
    normalized.includes('404') ||
    normalized.includes('not found')
  );
};

const ensureAllowedDomain = (url: string): void => {
  const parsed = new URL(url);
  if (!ALLOWED_HOSTNAMES.has(parsed.hostname)) {
    throw new Error(`Blocked non-whitelisted knowledge domain: ${parsed.hostname}`);
  }
};

const isDeadlineExceeded = (deadlineAtMs?: number): boolean =>
  Number.isFinite(deadlineAtMs) ? Date.now() >= Number(deadlineAtMs) : false;

const fetchWithTimeout = async (
  url: string,
  timeoutMs: number,
  deadlineAtMs?: number,
): Promise<Response> => {
  if (isDeadlineExceeded(deadlineAtMs)) {
    throw new Error('deadline_exceeded');
  }

  const remainingMs = Number.isFinite(deadlineAtMs)
    ? Math.max(1, Number(deadlineAtMs) - Date.now())
    : timeoutMs;
  const effectiveTimeoutMs = Math.max(1, Math.min(timeoutMs, remainingMs));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), effectiveTimeoutMs);

  try {
    ensureAllowedDomain(url);
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    ensureAllowedDomain(response.url);
    return response;
  } finally {
    clearTimeout(timeout);
  }
};

const extractFacts = (
  entityType: KnowledgeEntityType,
  query: string,
  rawText: string,
  source: KnowledgeSource,
): KnowledgeFact[] => {
  const normalizedText = rawText.toLowerCase();
  const facts: KnowledgeFact[] = [];

  if (normalizedText.includes(normalizeToken(query))) {
    facts.push({
      key: 'entity.mentioned',
      value: query,
      confidence: 'high',
      source,
    });
  }

  if (entityType === 'skill') {
    if (/\bcold\b/iu.test(rawText)) {
      facts.push({ key: 'tag.damage_type', value: 'cold', confidence: 'medium', source });
    }
    if (/\bfire\b/iu.test(rawText)) {
      facts.push({ key: 'tag.damage_type', value: 'fire', confidence: 'medium', source });
    }
    if (/\bspell\b/iu.test(rawText)) {
      facts.push({ key: 'tag.skill_type', value: 'spell', confidence: 'high', source });
    }
    if (/\battack\b/iu.test(rawText)) {
      facts.push({ key: 'tag.skill_type', value: 'attack', confidence: 'high', source });
    }
    if (/\bprojectile\b/iu.test(rawText)) {
      facts.push({ key: 'tag.skill_tag', value: 'projectile', confidence: 'medium', source });
    }
  }

  if (/\bdamage taken as\b/iu.test(rawText)) {
    facts.push({
      key: 'defensive.damage_taken_as',
      value: 'present',
      confidence: 'medium',
      source,
    });
  }

  if (/\b(convert|conversion|converted)\b/iu.test(rawText)) {
    facts.push({
      key: 'offensive.conversion_reference',
      value: 'present',
      confidence: 'medium',
      source,
    });
  }

  if (/\bsupports?\s+attacks?\b/iu.test(rawText)) {
    facts.push({
      key: 'support.compatibility',
      value: 'attacks_only',
      confidence: 'high',
      source,
    });
  }

  if (/\bsupports?\s+spells?\b/iu.test(rawText)) {
    facts.push({
      key: 'support.compatibility',
      value: 'spells_only',
      confidence: 'high',
      source,
    });
  }

  return facts;
};

const loadUniqueSnapshot = (): Set<string> => {
  if (uniqueSnapshotCache) {
    return uniqueSnapshotCache;
  }

  try {
    const manifestPath = path.join(process.cwd(), 'item_examples', '_unique_item_examples_manifest.json');
    if (!existsSync(manifestPath)) {
      uniqueSnapshotCache = new Set<string>();
      return uniqueSnapshotCache;
    }
    const raw = readFileSync(manifestPath, 'utf-8');
    const parsed = JSON.parse(raw) as { entries?: Array<{ expectedName?: string }> };
    uniqueSnapshotCache = new Set(
      (parsed.entries || [])
        .map((entry) => normalizeToken(entry.expectedName || ''))
        .filter(Boolean),
    );
    return uniqueSnapshotCache;
  } catch {
    uniqueSnapshotCache = new Set<string>();
    return uniqueSnapshotCache;
  }
};

const inferLookupMode = (options: LookupOptions = {}): KnowledgeLookupMode => {
  if (options.lookupMode) {
    return options.lookupMode;
  }
  const envMode = String(process.env.POE_KNOWLEDGE_LOOKUP_MODE || '').trim().toLowerCase();
  if (envMode === 'snapshot_only' || envMode === 'online_first' || envMode === 'snapshot_first') {
    return envMode;
  }
  return DEFAULT_LOOKUP_MODE;
};

const normalizeSnapshotEntityType = (entityType: KnowledgeEntityType): 'SKILL' | 'ASCENDANCY_NODE' | 'UNIQUE_ITEM' | 'MECHANIC_CLAIM' | 'PASSIVE_NODE' | 'SUPPORT_GEM' => {
  if (entityType === 'skill') return 'SKILL';
  if (entityType === 'ascendancy_node') return 'ASCENDANCY_NODE';
  if (entityType === 'unique_item') return 'UNIQUE_ITEM';
  if (entityType === 'passive_node') return 'PASSIVE_NODE';
  if (entityType === 'support_gem') return 'SUPPORT_GEM';
  return 'MECHANIC_CLAIM';
};

const resolveFromSnapshotDb = async (
  entityType: KnowledgeEntityType,
  query: string,
): Promise<LookupResult | null> => {
  const normalizedQuery = normalizeToken(query);
  if (!normalizedQuery) {
    return null;
  }

  try {
    const enumEntityType = normalizeSnapshotEntityType(entityType);

    const alias = await prisma.poeAliasSnapshot.findFirst({
      where: {
        aliasNormalized: normalizedQuery,
        entityType: enumEntityType,
      },
      orderBy: { snapshotAt: 'desc' },
      include: { entity: true },
    });

    const entity = alias?.entity || await prisma.poeEntitySnapshot.findFirst({
      where: {
        normalizedTerm: normalizedQuery,
        entityType: enumEntityType,
      },
      orderBy: { snapshotAt: 'desc' },
    });

    if (!entity) {
      return null;
    }

    const snapshotAt = new Date(entity.snapshotAt);
    const ageDays = Math.max(0, Math.floor((Date.now() - snapshotAt.getTime()) / (24 * 60 * 60 * 1000)));
    const source = toSource('local_snapshot_db', entity.sourceUrl);

    const facts = Array.isArray(entity.facts) ? entity.facts as KnowledgeFact[] : [];

    return {
      entityType,
      query: alias?.canonicalTerm || entity.canonicalTerm || query,
      normalizedQuery,
      status: 'fallback_verified',
      facts,
      sources: [source],
      rawText: entity.rawText,
      sourceUnavailable: false,
      snapshotVersion: snapshotAt.toISOString(),
      snapshotAgeDays: ageDays,
    };
  } catch (error: any) {
    const message = String(error?.message || '').toLowerCase();
    if (!message.includes('unknown') && !message.includes('does not exist') && !message.includes('table')) {
      console.warn('[poe2-knowledge] snapshot DB lookup failed', { entityType, query, error: message || 'unknown' });
    }
    return null;
  }
};

const buildProviderUrl = (provider: 'poe2db' | 'poe2wiki', query: string): string => {
  const slug = toSlug(query);
  return provider === 'poe2db'
    ? `https://poe2db.tw/us/${slug}`
    : `https://www.poe2wiki.net/wiki/${slug}`;
};

const buildProviderAttempt = (
  provider: 'poe2db' | 'poe2wiki',
  url: string,
  status: ProviderLookupStatus,
  error?: string,
): ProviderLookupAttempt => ({
  provider,
  status,
  source: toSource(provider, url),
  error,
});

const resolveViaProvider = async (
  provider: 'poe2db' | 'poe2wiki',
  entityType: KnowledgeEntityType,
  query: string,
  options: LookupOptions = {},
): Promise<LookupResult> => {
  const url = buildProviderUrl(provider, query);
  const timeoutMs = options.timeoutMs ?? getFetchTimeoutMs();
  const source = toSource(provider, url);

  if (isDeadlineExceeded(options.deadlineAtMs)) {
    return {
      entityType,
      query,
      normalizedQuery: normalizeToken(query),
      status: 'source_unavailable',
      facts: [],
      sources: [source],
      providerAttempts: [buildProviderAttempt(provider, url, 'source_unavailable', 'deadline_exceeded')],
      error: 'deadline_exceeded',
      sourceUnavailable: true,
    };
  }

  try {
    const response = await fetchWithTimeout(url, timeoutMs, options.deadlineAtMs);

    if (!response.ok) {
      const isNotFound = response.status === 404;
      const status: LookupStatus = isNotFound ? 'not_found' : 'source_unavailable';
      return {
        entityType,
        query,
        normalizedQuery: normalizeToken(query),
        status,
        facts: [],
        sources: [source],
        providerAttempts: [buildProviderAttempt(provider, url, isNotFound ? 'not_found' : 'source_unavailable', `http_${response.status}`)],
        error: `http_${response.status}`,
        sourceUnavailable: status === 'source_unavailable',
      };
    }

    const html = await response.text();
    const text = removeHtmlTags(html);
    if (!text || isLikelyMissingPage(text)) {
      return {
        entityType,
        query,
        normalizedQuery: normalizeToken(query),
        status: 'not_found',
        facts: [],
        sources: [source],
        rawText: text,
        providerAttempts: [buildProviderAttempt(provider, url, 'not_found', 'not_found')],
        error: 'not_found',
      };
    }

    const facts = extractFacts(entityType, query, text, source);
    const status: LookupStatus = facts.length > 0 ? 'verified' : 'unverified_external';

    return {
      entityType,
      query,
      normalizedQuery: normalizeToken(query),
      status,
      facts,
      sources: [source],
      rawText: text,
      providerAttempts: [buildProviderAttempt(provider, url, status === 'verified' ? 'verified' : 'unverified_external')],
      sourceUnavailable: false,
    };
  } catch (error: any) {
    const message = String(error?.message || error || 'fetch_error');
    const unavailable = message.includes('deadline_exceeded')
      || message.includes('abort')
      || message.includes('fetch')
      || message.includes('timeout');
    return {
      entityType,
      query,
      normalizedQuery: normalizeToken(query),
      status: unavailable ? 'source_unavailable' : 'error',
      facts: [],
      sources: [source],
      providerAttempts: [buildProviderAttempt(provider, url, unavailable ? 'source_unavailable' : 'error', message)],
      error: message,
      sourceUnavailable: unavailable,
    };
  }
};

const mergeUniqueSources = (sources: KnowledgeSource[]): KnowledgeSource[] => {
  const unique = new Map<string, KnowledgeSource>();

  for (const source of sources) {
    const key = `${source.provider}:${source.url}`;
    if (!unique.has(key)) {
      unique.set(key, source);
    }
  }

  return Array.from(unique.values());
};

const pickBestResult = (results: LookupResult[]): LookupResult => {
  const score: Record<LookupStatus, number> = {
    verified: 6,
    fallback_verified: 5,
    unverified_external: 4,
    not_found: 3,
    source_unavailable: 2,
    error: 1,
  };

  return results.slice().sort((a, b) => score[b.status] - score[a.status])[0];
};

const resolveOnlineProviders = async (
  entityType: KnowledgeEntityType,
  query: string,
  options: LookupOptions = {},
): Promise<LookupResult> => {
  const normalizedQuery = normalizeToken(query);

  const providerResults = await Promise.all(
    OFFICIAL_PROVIDERS.map((provider) => resolveViaProvider(provider, entityType, query, options)),
  );

  const mergedSources = mergeUniqueSources(providerResults.flatMap((result) => result.sources));
  const mergedFacts = providerResults.flatMap((result) => result.facts);
  const providerAttempts = providerResults.flatMap((result) => result.providerAttempts || []);

  const anyVerified = providerResults.some((result) => result.status === 'verified');
  if (anyVerified) {
    const best = pickBestResult(providerResults.filter((result) => result.status === 'verified'));
    return {
      ...best,
      facts: mergedFacts.length > 0 ? mergedFacts : best.facts,
      sources: mergedSources,
      providerAttempts,
      sourceUnavailable: false,
    };
  }

  const everyNotFound = providerResults.every((result) => result.status === 'not_found');
  const anySourceUnavailable = providerResults.some((result) => result.status === 'source_unavailable');
  const anyUnverified = providerResults.some((result) => result.status === 'unverified_external');

  let status: LookupStatus = 'error';
  if (everyNotFound) {
    status = 'not_found';
  } else if (anySourceUnavailable) {
    status = 'source_unavailable';
  } else if (anyUnverified) {
    status = 'unverified_external';
  }

  if (entityType === 'unique_item') {
    const snapshot = loadUniqueSnapshot();
    if (snapshot.has(normalizedQuery)) {
      const snapshotSource = toSource('local_snapshot', 'item_examples/_unique_item_examples_manifest.json');
      return {
        entityType,
        query,
        normalizedQuery,
        status: 'fallback_verified',
        facts: [{
          key: 'snapshot.unique_item_known',
          value: query,
          confidence: 'medium',
          source: snapshotSource,
          context: 'Verified unique snapshot fallback.',
        }],
        sources: mergeUniqueSources([snapshotSource, ...mergedSources]),
        providerAttempts,
        sourceUnavailable: anySourceUnavailable,
        error: status === 'source_unavailable' ? 'official_sources_unavailable' : undefined,
      };
    }
  }

  return {
    entityType,
    query,
    normalizedQuery,
    status,
    facts: mergedFacts,
    sources: mergedSources,
    providerAttempts,
    sourceUnavailable: anySourceUnavailable,
    error: status === 'not_found'
      ? 'not_found'
      : status === 'source_unavailable'
        ? 'official_sources_unavailable'
        : 'external_lookup_failed',
  };
};

const resolveWithLookupMode = async (
  entityType: KnowledgeEntityType,
  query: string,
  options: LookupOptions = {},
): Promise<LookupResult> => {
  const mode = inferLookupMode(options);
  const normalizedQuery = normalizeToken(query);

  if (mode === 'snapshot_first' || mode === 'snapshot_only') {
    const snapshotLookup = await resolveFromSnapshotDb(entityType, query);
    if (snapshotLookup) {
      return snapshotLookup;
    }
  }

  if (mode === 'snapshot_only') {
    if (entityType === 'unique_item') {
      const snapshot = loadUniqueSnapshot();
      if (snapshot.has(normalizedQuery)) {
        const snapshotSource = toSource('local_snapshot', 'item_examples/_unique_item_examples_manifest.json');
        return {
          entityType,
          query,
          normalizedQuery,
          status: 'fallback_verified',
          facts: [{
            key: 'snapshot.unique_item_known',
            value: query,
            confidence: 'medium',
            source: snapshotSource,
            context: 'Verified unique snapshot fallback.',
          }],
          sources: [snapshotSource],
          sourceUnavailable: false,
        };
      }
    }

    return {
      entityType,
      query,
      normalizedQuery,
      status: 'not_found',
      facts: [],
      sources: [],
      sourceUnavailable: false,
      error: 'snapshot_not_found',
    };
  }

  const onlineLookup = await resolveOnlineProviders(entityType, query, options);
  if (onlineLookup.status === 'verified') {
    return onlineLookup;
  }

  if (mode === 'online_first') {
    const snapshotLookup = await resolveFromSnapshotDb(entityType, query);
    if (snapshotLookup) {
      return snapshotLookup;
    }
  }

  return onlineLookup;
};

const resolveCached = async (
  entityType: KnowledgeEntityType,
  query: string,
  options: LookupOptions = {},
): Promise<LookupResult> => {
  const lookupMode = inferLookupMode(options);
  const key = makeCacheKeyWithMode(entityType, query, lookupMode);
  const cached = CACHE.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const result = await resolveWithLookupMode(entityType, query, options);
  const ttlMs = (result.status === 'source_unavailable' || result.status === 'error')
    ? TRANSIENT_ERROR_CACHE_TTL_MS
    : getCacheTtlMs();
  CACHE.set(key, {
    result,
    expiresAt: Date.now() + ttlMs,
  });
  return result;
};

export const hasOfficialVerifiedEvidence = (lookup: LookupResult | null | undefined): boolean => {
  if (!lookup || lookup.status !== 'verified') {
    return false;
  }

  return lookup.sources.some((source) => source.provider === 'poe2db' || source.provider === 'poe2wiki');
};

export const isSourceUnavailableLookup = (lookup: LookupResult | null | undefined): boolean =>
  Boolean(lookup && (lookup.status === 'source_unavailable' || lookup.sourceUnavailable));

export const resolveSkill = async (name: string, options: LookupOptions = {}): Promise<LookupResult> =>
  resolveCached('skill', name, options);

export const resolveAscendancyNode = async (name: string, options: LookupOptions = {}): Promise<LookupResult> =>
  resolveCached('ascendancy_node', name, options);

export const resolveUniqueItem = async (name: string, options: LookupOptions = {}): Promise<LookupResult> =>
  resolveCached('unique_item', name, options);

export const resolveMechanicClaim = async (
  claimType: string,
  subject: string,
  options: LookupOptions = {},
): Promise<LookupResult> => resolveCached('mechanic_claim', `${claimType} ${subject}`.trim(), options);

export const resolvePassiveNode = async (name: string, options: LookupOptions = {}): Promise<LookupResult> =>
  resolveCached('passive_node', name, options);

export const resolveSupportGem = async (name: string, options: LookupOptions = {}): Promise<LookupResult> =>
  resolveCached('support_gem', name, options);

export const __resetPoe2KnowledgeCache = (): void => {
  CACHE.clear();
  uniqueSnapshotCache = null;
};
