import {
  resolveAscendancyNode,
  resolveSkill,
  resolveUniqueItem,
} from '@/lib/poe2-knowledge';
import type {
  EvidenceFact,
  EvidencePack,
  GroundedTermSource,
  GroundedUserTerm,
  GroundingCriticality,
  GroundingFailureDetail,
  TermOriginType,
} from '@/lib/fact-verification-types';
import {
  type KnowledgeEntityType,
  type KnowledgeSource,
  type LookupOptions,
  type LookupResult,
  type LookupStatus,
} from '@/lib/poe2-knowledge-types';
import type { BuildSessionContext, KitchenMember, SessionContext } from '@/types';

type GroundingCandidate = {
  term: string;
  normalizedTerm: string;
  source: GroundedTermSource;
  origin: TermOriginType;
  criticality: GroundingCriticality;
};

type GroundingOptions = LookupOptions;
type RankedLookupResult = { lookup: LookupResult; queryIndex: number };

const MAX_TERM_LENGTH = 96;

const LOOKUP_SCORE: Record<LookupStatus, number> = {
  verified: 6,
  fallback_verified: 5,
  unverified_external: 4,
  not_found: 3,
  source_unavailable: 2,
  error: 1,
};

const INTERNAL_CONTRACT_TERMS = new Set([
  'league starter',
  'league_starter',
  'mapper',
  'bossing',
  'hybrid',
  'cheap',
  'medium',
  'expensive',
  'mirror of kalandra',
  'mirror_of_kalandra',
  'quick',
  'plenty',
  'main',
  'appetizer',
  'dessert',
  'snack',
  'easy',
  'intermediate',
  'advanced',
  'ascendant',
  'chef',
]);

const SOURCE_PRIORITY: Record<GroundingCriticality, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const toCanonicalTerm = (value: unknown): string =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

const normalizeKey = (value: string): string =>
  toCanonicalTerm(value).toLowerCase();

const splitTermsFromText = (value: unknown): string[] => {
  const raw = toCanonicalTerm(value);
  if (!raw) {
    return [];
  }

  const fragments = raw
    .split(/[\n,;|]+/g)
    .flatMap((chunk) => chunk.split(/\s(?:and|or|e|ou)\s/giu))
    .map((chunk) =>
      chunk
        .trim()
        .replace(/^[-*]\s*/, '')
        .replace(/^["'`]+/, '')
        .replace(/["'`]+$/, ''),
    )
    .filter(Boolean)
    .filter((chunk) => chunk.length <= MAX_TERM_LENGTH);

  if (fragments.length > 1) {
    return fragments;
  }

  if (fragments.length === 1) {
    const single = fragments[0];
    const wordCount = single.split(/\s+/g).filter(Boolean).length;
    if (wordCount <= 3) {
      return [single];
    }
  }

  const tokens = raw
    .split(/\s+/g)
    .map((token) => token.trim().replace(/[^\p{L}\p{N}'_-]/gu, ''))
    .filter(Boolean);

  if (tokens.length <= 3 && raw.length <= MAX_TERM_LENGTH) {
    return [raw];
  }

  // For long free text, avoid treating the whole sentence as a single game term.
  const grams = new Set<string>();
  const maxGramSize = Math.min(3, tokens.length);
  for (let size = maxGramSize; size >= 1; size -= 1) {
    for (let index = 0; index + size <= tokens.length; index += 1) {
      const gram = tokens.slice(index, index + size).join(' ').trim();
      if (!gram || gram.length > MAX_TERM_LENGTH) {
        continue;
      }
      grams.add(gram);
      if (grams.size >= 24) {
        return Array.from(grams);
      }
    }
  }

  return Array.from(grams);
};

const uniqueSources = (sources: KnowledgeSource[]): KnowledgeSource[] => {
  const unique = new Map<string, KnowledgeSource>();

  for (const source of sources) {
    const key = `${source.provider}:${source.url}`;
    if (!unique.has(key)) {
      unique.set(key, source);
    }
  }

  return Array.from(unique.values());
};

const selectBestRankedLookup = (results: RankedLookupResult[]): LookupResult => {
  const sorted = results
    .slice()
    .sort((a, b) => {
      const statusDelta = LOOKUP_SCORE[b.lookup.status] - LOOKUP_SCORE[a.lookup.status];
      if (statusDelta !== 0) {
        return statusDelta;
      }
      // Prefer the earliest query variant (original term first).
      return a.queryIndex - b.queryIndex;
    });
  return sorted[0].lookup;
};

const toGroundingStatus = (lookupStatus: LookupStatus): GroundedUserTerm['status'] => {
  if (lookupStatus === 'verified') {
    return 'verified';
  }
  if (lookupStatus === 'fallback_verified') {
    return 'fallback_verified';
  }
  return 'not_confirmed';
};

const isInternalContractTerm = (term: string): boolean =>
  INTERNAL_CONTRACT_TERMS.has(normalizeKey(term));

const classifyTermOrigin = (term: string): TermOriginType =>
  isInternalContractTerm(term) ? 'internal_contract_term' : 'poe_game_term';

const buildGroundingReason = (bestResult: LookupResult, allResults: LookupResult[]): string => {
  if (bestResult.status === 'verified') {
    return `Verified as ${bestResult.entityType} in official sources.`;
  }
  if (bestResult.status === 'fallback_verified') {
    return `Fallback-verified as ${bestResult.entityType} from local snapshot evidence.`;
  }
  if (allResults.some((result) => result.status === 'source_unavailable')) {
    return 'Official sources unavailable within budget. Retry is required for strict factual output.';
  }
  if (allResults.some((result) => result.status === 'error')) {
    return 'External lookup failed unexpectedly. Retry is required for strict factual output.';
  }
  if (allResults.some((result) => result.status === 'unverified_external')) {
    return 'Term exists externally but without deterministic canonical evidence.';
  }

  return 'Not confirmed in official sources.';
};

const buildLookupQueries = (term: string): string[] => {
  const canonical = toCanonicalTerm(term);
  if (!canonical) {
    return [];
  }

  const tokens = canonical.split(/\s+/g).filter(Boolean);
  const variants: string[] = [canonical];

  // Prefix fallback for composite item names:
  // "Sacrosanctum Corvus Mantle" -> "Sacrosanctum Corvus" -> "Sacrosanctum".
  if (tokens.length > 1) {
    for (let length = tokens.length - 1; length >= 1; length -= 1) {
      variants.push(tokens.slice(0, length).join(' '));
    }
  }

  return Array.from(new Set(variants.map((value) => toCanonicalTerm(value)).filter(Boolean)));
};

const mergeCandidate = (
  map: Map<string, GroundingCandidate>,
  term: string,
  source: GroundedTermSource,
  criticality: GroundingCriticality,
): void => {
  const canonical = toCanonicalTerm(term);
  const normalized = normalizeKey(canonical);
  if (!normalized) {
    return;
  }

  const next: GroundingCandidate = {
    term: canonical,
    normalizedTerm: normalized,
    source,
    origin: classifyTermOrigin(canonical),
    criticality,
  };

  const current = map.get(normalized);
  if (!current) {
    map.set(normalized, next);
    return;
  }

  if (SOURCE_PRIORITY[next.criticality] > SOURCE_PRIORITY[current.criticality]) {
    map.set(normalized, next);
  }
};

const collectFromValue = (
  map: Map<string, GroundingCandidate>,
  value: unknown,
  source: GroundedTermSource,
  criticality: GroundingCriticality,
): void => {
  for (const term of splitTermsFromText(value)) {
    mergeCandidate(map, term, source, criticality);
  }
};

const collectCandidates = (
  context: BuildSessionContext | SessionContext,
  partyMembers: KitchenMember[],
): GroundingCandidate[] => {
  const map = new Map<string, GroundingCandidate>();
  const requestedType = 'requested_type' in context
    ? (context as SessionContext).requested_type
    : undefined;
  const observation = 'observation' in context
    ? (context as SessionContext).observation
    : undefined;
  const pantryIngredients = 'pantry_ingredients' in context
    ? (context as SessionContext).pantry_ingredients
    : undefined;

  collectFromValue(map, context.requested_archetype, 'context.requested_archetype', 'low');
  collectFromValue(map, requestedType, 'context.requested_type', 'low');
  collectFromValue(map, context.build_notes, 'context.build_notes', 'high');
  collectFromValue(map, observation, 'context.observation', 'medium');

  if (Array.isArray(context.stash_gear_gems)) {
    for (const term of context.stash_gear_gems) {
      collectFromValue(map, term, 'context.stash_gear_gems', 'high');
    }
  }

  if (Array.isArray(pantryIngredients)) {
    for (const term of pantryIngredients) {
      collectFromValue(map, term, 'context.pantry_ingredients', 'high');
    }
  }

  for (const member of partyMembers) {
    for (const term of member.likes || []) {
      collectFromValue(map, term, 'member.likes', 'medium');
    }
    for (const term of member.dislikes || []) {
      collectFromValue(map, term, 'member.dislikes', 'medium');
    }
    for (const term of member.restrictions || []) {
      collectFromValue(map, term, 'member.restrictions', 'high');
    }
  }

  return Array.from(map.values());
};

const buildInternalGroundedTerm = (candidate: GroundingCandidate): GroundedUserTerm => ({
  term: candidate.term,
  normalizedTerm: candidate.normalizedTerm,
  origin: candidate.origin,
  source: candidate.source,
  criticality: candidate.criticality,
  entityType: 'internal_contract',
  status: 'internal',
  lookupStatus: 'internal',
  sources: [],
  facts: [],
  lookup: null,
  reason: 'Internal product contract term. External PoE lookup is intentionally skipped.',
});

const resolveGameCandidate = async (
  candidate: GroundingCandidate,
  options: GroundingOptions,
): Promise<GroundedUserTerm> => {
  const queries = buildLookupQueries(candidate.term);
  const rankedLookups: RankedLookupResult[] = [];

  for (let index = 0; index < queries.length; index += 1) {
    const query = queries[index];
    const [skillLookup, ascendancyLookup, uniqueLookup] = await Promise.all([
      resolveSkill(query, options),
      resolveAscendancyNode(query, options),
      resolveUniqueItem(query, options),
    ]);

    rankedLookups.push(
      { lookup: skillLookup, queryIndex: index },
      { lookup: ascendancyLookup, queryIndex: index },
      { lookup: uniqueLookup, queryIndex: index },
    );
  }

  const lookups = rankedLookups.map((entry) => entry.lookup);
  const bestResult = selectBestRankedLookup(rankedLookups);
  const lookupStatus = bestResult.status;

  return {
    term: candidate.term,
    normalizedTerm: candidate.normalizedTerm,
    origin: candidate.origin,
    source: candidate.source,
    criticality: candidate.criticality,
    entityType: (bestResult.entityType || 'unknown') as KnowledgeEntityType | 'unknown',
    status: toGroundingStatus(lookupStatus),
    lookupStatus,
    sources: uniqueSources(lookups.flatMap((lookup) => lookup.sources)),
    facts: bestResult.facts || [],
    lookup: bestResult,
    reason: buildGroundingReason(bestResult, lookups),
  };
};

export const collectUserTermsForGrounding = (
  context: BuildSessionContext | SessionContext,
  partyMembers: KitchenMember[],
): string[] => collectCandidates(context, partyMembers).map((candidate) => candidate.term);

export async function groundUserTerms(
  context: BuildSessionContext | SessionContext,
  partyMembers: KitchenMember[],
  options: GroundingOptions = {},
): Promise<GroundedUserTerm[]> {
  const candidates = collectCandidates(context, partyMembers);
  if (candidates.length === 0) {
    return [];
  }

  return Promise.all(candidates.map(async (candidate) => {
    if (candidate.origin === 'internal_contract_term') {
      return buildInternalGroundedTerm(candidate);
    }
    return resolveGameCandidate(candidate, options);
  }));
}

const formatSources = (sources: KnowledgeSource[]): string => {
  const sourceUrls = uniqueSources(sources)
    .slice(0, 3)
    .map((source) => source.url);

  return sourceUrls.length > 0 ? sourceUrls.join(', ') : 'none';
};

export const buildGroundingInstruction = (terms: GroundedUserTerm[]): string => {
  if (!Array.isArray(terms) || terms.length === 0) {
    return '';
  }

  const internal = terms.filter((term) => term.origin === 'internal_contract_term');
  const verified = terms.filter((term) => term.status === 'verified');
  const uncertain = terms.filter((term) =>
    term.origin === 'poe_game_term' && term.status !== 'verified');

  const internalLines = internal.length > 0
    ? internal.map((term) => `- ${term.term} => internal_contract_term (${term.reason})`)
    : ['- none'];

  const verifiedLines = verified.length > 0
    ? verified.map((term) =>
      `- ${term.term} => ${term.entityType} (${term.status}). Sources: ${formatSources(term.sources)}`)
    : ['- none'];

  const uncertainLines = uncertain.length > 0
    ? uncertain.map((term) =>
      `- ${term.term} => not_confirmed (${term.lookupStatus}). Reason: ${term.reason}`)
    : ['- none'];

  return `

INTERNAL CONTRACT TERMS (NO EXTERNAL LOOKUP):
${internalLines.join('\n')}

VERIFIED USER TERMS (OFFICIAL CANONICAL ANCHORS):
${verifiedLines.join('\n')}

NON-CONFIRMED USER TERMS:
${uncertainLines.join('\n')}

GROUNDING RULES:
- Use only official verified terms as canonical game facts.
- Keep verified terms in canonical PoE2 role (skill, ascendancy node, unique item).
- For non-confirmed game terms, explicitly mark uncertainty and do not invent mechanics.
- Internal contract terms are product preferences, not external game entities.
`;
};

export const buildEvidencePackFromGrounding = (
  terms: GroundedUserTerm[],
  deadlineAtMs: number,
): EvidencePack => {
  const lookups = terms
    .map((term) => term.lookup)
    .filter((lookup): lookup is LookupResult => Boolean(lookup));

  const facts: EvidenceFact[] = [];
  for (const lookup of lookups) {
    for (const fact of lookup.facts || []) {
      facts.push({
        term: lookup.query,
        entityType: lookup.entityType,
        key: fact.key,
        value: fact.value,
        confidence: fact.confidence,
        sourceUrl: fact.source.url,
        provider: fact.source.provider,
        fetchedAt: fact.source.fetchedAt,
      });
    }
  }

  const sourceUnavailable = terms.some((term) =>
    term.lookupStatus === 'source_unavailable' ||
    term.lookupStatus === 'error' ||
    Boolean(term.lookup?.sourceUnavailable));

  return {
    generatedAt: new Date().toISOString(),
    deadlineAtMs,
    terms,
    lookups,
    facts,
    sourceUnavailable,
    metadata: {
      termsTotal: terms.length,
      termsVerified: terms.filter((term) => term.status === 'verified').length,
      termsUnverified: terms.filter((term) => term.origin === 'poe_game_term' && term.status !== 'verified').length,
    },
  };
};

export const buildGroundingFailureDetails = (
  terms: GroundedUserTerm[],
): GroundingFailureDetail[] =>
  terms
    .filter((term) =>
      term.origin === 'poe_game_term' &&
      (term.status !== 'verified' || Boolean(term.lookup?.sourceUnavailable)))
    .map((term) => ({
      term: term.term,
      lookupStatus: term.lookupStatus,
      reason: term.reason,
      sources: term.sources.map((source) => source.url),
      code: term.lookup?.sourceUnavailable
        ? 'source_unavailable'
        : term.lookupStatus === 'source_unavailable'
        ? 'source_unavailable'
        : term.lookupStatus === 'unverified_external' || term.lookupStatus === 'fallback_verified'
          ? 'unverified_external'
        : term.lookupStatus === 'not_found'
            ? 'not_found'
            : 'error',
    }));

export const hasGroundingLookupFailure = (terms: GroundedUserTerm[]): boolean =>
  terms.some((term) =>
    term.lookupStatus === 'source_unavailable' ||
    term.lookupStatus === 'error' ||
    Boolean(term.lookup?.sourceUnavailable));

export const hasGroundingUnverifiedFacts = (terms: GroundedUserTerm[]): boolean =>
  terms.some((term) => term.origin === 'poe_game_term' && term.status !== 'verified');
