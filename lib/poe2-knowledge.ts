import { existsSync, readFileSync } from 'fs';
import path from 'path';
import {
  KnowledgeEntityType,
  KnowledgeFact,
  KnowledgeSource,
  LookupResult,
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
const MAX_PROVIDER_ATTEMPTS = 2;

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

const toSource = (provider: 'poe2db' | 'poe2wiki' | 'local_snapshot', url: string): KnowledgeSource => ({
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
    normalized.includes('not found')
  );
};

const ensureAllowedDomain = (url: string): void => {
  const parsed = new URL(url);
  if (!ALLOWED_HOSTNAMES.has(parsed.hostname)) {
    throw new Error(`Blocked non-whitelisted knowledge domain: ${parsed.hostname}`);
  }
};

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
    if (/\bcold damage\b/iu.test(rawText)) {
      facts.push({ key: 'damage_type', value: 'cold', confidence: 'high', source });
    }
    if (/\bfire damage\b/iu.test(rawText)) {
      facts.push({ key: 'damage_type', value: 'fire', confidence: 'medium', source });
    }
  }

  if (/\bdamage taken as\b/iu.test(rawText)) {
    facts.push({
      key: 'damage_taken_as',
      value: 'present',
      confidence: 'medium',
      source,
    });
  }

  if (/\b(convert|conversion|converted)\b/iu.test(rawText)) {
    facts.push({
      key: 'conversion_reference',
      value: 'present',
      confidence: 'medium',
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

const resolveViaProvider = async (
  provider: 'poe2db' | 'poe2wiki',
  entityType: KnowledgeEntityType,
  query: string,
): Promise<LookupResult | null> => {
  const slug = toSlug(query);
  const url = provider === 'poe2db'
    ? `https://poe2db.tw/us/${slug}`
    : `https://www.poe2wiki.net/wiki/${slug}`;

  const timeoutMs = getFetchTimeoutMs();
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= MAX_PROVIDER_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, timeoutMs);
      if (!response.ok) {
        lastError = `${provider} responded ${response.status}`;
        continue;
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
          sources: [toSource(provider, url)],
          rawText: text,
          error: 'not_found',
        };
      }

      const source = toSource(provider, url);
      const facts = extractFacts(entityType, query, text, source);
      return {
        entityType,
        query,
        normalizedQuery: normalizeToken(query),
        status: facts.length > 0 ? 'verified' : 'unverified_external',
        facts,
        sources: [source],
        rawText: text,
      };
    } catch (error: any) {
      lastError = String(error?.message || error || 'fetch_error');
    }
  }

  return {
    entityType,
    query,
    normalizedQuery: normalizeToken(query),
    status: 'error',
    facts: [],
    sources: [toSource(provider, url)],
    error: lastError || 'provider_failed',
  };
};

const resolveWithProviders = async (
  entityType: KnowledgeEntityType,
  query: string,
): Promise<LookupResult> => {
  const normalizedQuery = normalizeToken(query);
  const providerOrder: Array<'poe2db' | 'poe2wiki'> = ['poe2db', 'poe2wiki'];
  const attempts: LookupResult[] = [];

  for (const provider of providerOrder) {
    const result = await resolveViaProvider(provider, entityType, query);
    if (!result) {
      continue;
    }
    attempts.push(result);
    if (result.status === 'verified') {
      return result;
    }
  }

  if (entityType === 'unique_item') {
    const snapshot = loadUniqueSnapshot();
    if (snapshot.has(normalizedQuery)) {
      const source = toSource('local_snapshot', 'item_examples/_unique_item_examples_manifest.json');
      return {
        entityType,
        query,
        normalizedQuery,
        status: 'fallback_verified',
        facts: [{
          key: 'snapshot.unique_item_known',
          value: query,
          confidence: 'medium',
          source,
          context: 'Verified unique snapshot fallback.',
        }],
        sources: [source],
      };
    }
  }

  const mergedSources = attempts.flatMap((value) => value.sources);
  const mergedFacts = attempts.flatMap((value) => value.facts);
  const hasError = attempts.some((value) => value.status === 'error');

  return {
    entityType,
    query,
    normalizedQuery,
    status: hasError ? 'unverified_external' : 'not_found',
    facts: mergedFacts,
    sources: mergedSources,
    error: hasError ? 'external_lookup_failed' : 'not_found',
  };
};

const resolveCached = async (
  entityType: KnowledgeEntityType,
  query: string,
): Promise<LookupResult> => {
  const key = makeCacheKey(entityType, query);
  const cached = CACHE.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const result = await resolveWithProviders(entityType, query);
  CACHE.set(key, {
    result,
    expiresAt: Date.now() + getCacheTtlMs(),
  });
  return result;
};

export const resolveSkill = async (name: string): Promise<LookupResult> =>
  resolveCached('skill', name);

export const resolveAscendancyNode = async (name: string): Promise<LookupResult> =>
  resolveCached('ascendancy_node', name);

export const resolveUniqueItem = async (name: string): Promise<LookupResult> =>
  resolveCached('unique_item', name);

export const resolveMechanicClaim = async (
  claimType: string,
  subject: string,
): Promise<LookupResult> => resolveCached('mechanic_claim', `${claimType} ${subject}`.trim());

export const __resetPoe2KnowledgeCache = (): void => {
  CACHE.clear();
  uniqueSnapshotCache = null;
};
