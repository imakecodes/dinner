import { extractBuildMechanicClaims, MechanicClaim } from '@/lib/build-claim-extractor';
import { extractClaimLedger } from '@/lib/claim-ledger';
import type {
  ClaimRecord,
  ClaimVerificationResult,
  EvidencePack,
  GroundedUserTerm,
} from '@/lib/fact-verification-types';
import {
  hasOfficialVerifiedEvidence,
  resolveAscendancyNode,
  resolveMechanicClaim,
  resolveSkill,
  resolveUniqueItem,
} from '@/lib/poe2-knowledge';
import { KnowledgeSource, LookupOptions, LookupResult, LookupStatus } from '@/lib/poe2-knowledge-types';

type BuildEntryLike = {
  name?: string | number | null;
  quantity?: string | number | null;
  unit?: string | number | null;
};

type BuildLike = {
  analysis_log?: string | null;
  build_reasoning?: string | null;
  build_steps?: string[] | null;
  gear_gems?: BuildEntryLike[] | null;
  build_items?: BuildEntryLike[] | null;
};

export type FactValidationMode = 'off' | 'warn' | 'strict';

export type MechanicConflict = {
  claim: string;
  expected: string;
  found: string;
  subject: string;
  sources: KnowledgeSource[];
};

export type EnablerDiagnosticStatus =
  | 'verified'
  | 'fallback_verified'
  | 'not_found'
  | 'unverified_external'
  | 'source_unavailable'
  | 'incompatible';

export type EnablerDiagnostic = {
  name: string;
  status: EnablerDiagnosticStatus;
  reason: string;
  skill: string;
  sources: KnowledgeSource[];
};

export type MechanicsValidationResult = {
  isValid: boolean;
  criticalConflicts: MechanicConflict[];
  warnings: string[];
  evidence: Array<{
    subject: string;
    status: string;
    sources: KnowledgeSource[];
  }>;
  enablerDiagnostics: EnablerDiagnostic[];
  claimResults: ClaimVerificationResult[];
  claimsTotal: number;
  claimsVerified: number;
  claimsBlocked: number;
  hadExternalLookupFailure: boolean;
  hasSourceUnavailableBlocking: boolean;
  hasCriticalUnverifiedTerms: boolean;
  criticalUnverifiedTerms: Array<{
    term: string;
    source: string;
    criticality: string;
    reason: string;
  }>;
};

type ValidateOptions = {
  mode?: FactValidationMode;
  evidencePack?: EvidencePack | null;
  deadlineAtMs?: number;
};

const normalize = (value: unknown): string =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

const inferMode = (mode?: FactValidationMode): FactValidationMode => {
  if (mode) {
    return mode;
  }

  const fromEnv = normalize(process.env.POE_FACT_VALIDATION_MODE || '').toLowerCase();
  if (fromEnv === 'off' || fromEnv === 'warn' || fromEnv === 'strict') {
    return fromEnv;
  }
  return 'strict';
};

const getEntryNames = (entries: BuildEntryLike[] | null | undefined): string[] => (Array.isArray(entries) ? entries : [])
  .map((item) => normalize(item?.name))
  .filter(Boolean);

const LOOKUP_SCORE: Record<LookupStatus, number> = {
  verified: 6,
  fallback_verified: 5,
  source_unavailable: 4,
  unverified_external: 3,
  not_found: 2,
  error: 1,
};

const ENABLER_CANDIDATE_PATTERNS: RegExp[] = [
  /\bsupport\b/i,
  /\bconvert(?:ed|ion)?\b/i,
  /\bcold to fire\b/i,
  /\bavatar of fire\b/i,
  /\battunement\b/i,
  /\bgain as extra\b/i,
];

const mergeSources = (...results: Array<LookupResult | null | undefined>): KnowledgeSource[] => {
  const unique = new Map<string, KnowledgeSource>();

  for (const result of results) {
    if (!result) {
      continue;
    }
    for (const source of result.sources) {
      const key = `${source.provider}:${source.url}`;
      if (!unique.has(key)) {
        unique.set(key, source);
      }
    }
  }

  return Array.from(unique.values());
};

const selectBestLookup = (results: LookupResult[]): LookupResult =>
  results
    .slice()
    .sort((a, b) => LOOKUP_SCORE[b.status] - LOOKUP_SCORE[a.status])[0];

const supportsAttacksOnly = (text: string): boolean =>
  /\bsupports?\s+attacks?\b/i.test(text) || /\bsupports?\s+attack\s+skills?\b/i.test(text);

const supportsSpellsOnly = (text: string): boolean =>
  /\bsupports?\s+spells?\b/i.test(text) || /\bsupports?\s+spell\s+skills?\b/i.test(text);

const skillIsSpell = (text: string): boolean => /\bspell\b/i.test(text);
const skillIsAttack = (text: string): boolean => /\battack\b/i.test(text);

const toLower = (value: unknown): string => String(value || '').toLowerCase();

const isIncompatibleEnabler = (skillLookup: LookupResult | null, enablerLookups: LookupResult[]): boolean => {
  if (!skillLookup) {
    return false;
  }

  const skillText = toLower(skillLookup.rawText);
  if (!skillText) {
    return false;
  }

  const enablerText = enablerLookups
    .map((lookup) => toLower(lookup.rawText))
    .filter(Boolean)
    .join(' ');

  if (!enablerText) {
    return false;
  }

  if (skillIsSpell(skillText) && supportsAttacksOnly(enablerText)) {
    return true;
  }

  if (skillIsAttack(skillText) && supportsSpellsOnly(enablerText)) {
    return true;
  }

  return false;
};

const findSkillToken = (claim: MechanicClaim, entries: string[]): string | null => {
  const loweredClaim = claim.text.toLowerCase();
  const matchedEntry = entries.find((entry) => loweredClaim.includes(entry.toLowerCase()));
  if (matchedEntry) {
    return matchedEntry;
  }

  if (/\bfrostbolt\b/i.test(claim.text)) {
    return 'Frostbolt';
  }

  return null;
};

const collectEnablerCandidates = (
  gemNames: string[],
  itemNames: string[],
  skillToken: string | null,
): string[] => {
  const candidates = [
    ...itemNames,
    ...gemNames.filter((name) => ENABLER_CANDIDATE_PATTERNS.some((pattern) => pattern.test(name))),
  ];

  const skillTokenKey = normalize(skillToken || '').toLowerCase();
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const candidate of candidates) {
    const normalizedCandidate = normalize(candidate).toLowerCase();
    if (!normalizedCandidate || normalizedCandidate === skillTokenKey || seen.has(normalizedCandidate)) {
      continue;
    }
    seen.add(normalizedCandidate);
    deduped.push(candidate);
  }

  return deduped;
};

const toLookupOptions = (options: ValidateOptions): LookupOptions => ({
  deadlineAtMs: options.deadlineAtMs,
});

const buildEnablerDiagnosticFromLookup = (
  name: string,
  skillToken: string | null,
  lookups: LookupResult[],
  bestLookup: LookupResult,
): EnablerDiagnostic => {
  const skillLabel = skillToken || 'unknown';
  const sources = mergeSources(...lookups);

  if (bestLookup.status === 'verified' || bestLookup.status === 'fallback_verified') {
    return {
      name,
      status: bestLookup.status,
      reason: bestLookup.status === 'verified'
        ? 'Officially verified enabler.'
        : 'Fallback verified enabler (non-official snapshot).',
      skill: skillLabel,
      sources,
    };
  }

  if (bestLookup.status === 'not_found') {
    return {
      name,
      status: 'not_found',
      reason: 'Enabler was not found in official sources.',
      skill: skillLabel,
      sources,
    };
  }

  if (bestLookup.status === 'source_unavailable' || bestLookup.status === 'error') {
    return {
      name,
      status: 'source_unavailable',
      reason: 'Official sources were unavailable for this enabler lookup.',
      skill: skillLabel,
      sources,
    };
  }

  return {
    name,
    status: 'unverified_external',
    reason: 'Enabler exists externally but without deterministic canonical evidence.',
    skill: skillLabel,
    sources,
  };
};

const buildIncompatibleEnablerDiagnostic = (
  base: EnablerDiagnostic,
): EnablerDiagnostic => ({
  ...base,
  status: 'incompatible',
  reason: 'Enabler is incompatible with primary skill tags (attack/spell mismatch).',
});

const resolveEnablerDiagnostic = async (
  enablerName: string,
  skillToken: string | null,
  skillLookup: LookupResult | null,
  options: ValidateOptions,
): Promise<EnablerDiagnostic> => {
  const lookupOptions = toLookupOptions(options);
  const lookups = await Promise.all([
    resolveSkill(enablerName, lookupOptions),
    resolveUniqueItem(enablerName, lookupOptions),
    resolveMechanicClaim('conversion_enabler', enablerName, lookupOptions),
  ]);
  const bestLookup = selectBestLookup(lookups);
  const base = buildEnablerDiagnosticFromLookup(enablerName, skillToken, lookups, bestLookup);

  if ((base.status === 'verified' || base.status === 'fallback_verified') && isIncompatibleEnabler(skillLookup, lookups)) {
    return buildIncompatibleEnablerDiagnostic(base);
  }

  return base;
};

const hasVerifiedCompatibleEnabler = (diagnostics: EnablerDiagnostic[]): boolean =>
  diagnostics.some((diag) => diag.status === 'verified');

const hasExternalLookupFailureForDiagnostics = (diagnostics: EnablerDiagnostic[]): boolean =>
  diagnostics.some((diag) => diag.status === 'source_unavailable' || diag.status === 'unverified_external');

const normalizeKey = (value: string): string => normalize(value).toLowerCase();
const normalizeText = (value: unknown): string => normalize(value).toLowerCase();
const ASCENDANCY_ROLE_PATTERN = /\bascendanc\w*\b|\bsubclass\b|\bclass\b/;

const toCanonicalRole = (entityType: GroundedUserTerm['entityType']): string => {
  if (entityType === 'unique_item') return 'unique_item';
  if (entityType === 'ascendancy_node') return 'ascendancy_node';
  if (entityType === 'skill') return 'skill';
  return 'unknown';
};

const hasCanonicalRoleMismatch = (claim: ClaimRecord, groundedTerm: GroundedUserTerm): string | null => {
  const text = claim.text.toLowerCase();
  const canonicalRole = toCanonicalRole(groundedTerm.entityType);

  if (canonicalRole === 'unique_item' && ASCENDANCY_ROLE_PATTERN.test(text)) {
    return `${groundedTerm.term} is a unique item, not an ascendancy/class mechanic.`;
  }

  if (canonicalRole === 'ascendancy_node' && /\b(unique|item|armou?r|weapon)\b/.test(text)) {
    return `${groundedTerm.term} is an ascendancy node, not an item.`;
  }

  if (canonicalRole === 'skill' && ASCENDANCY_ROLE_PATTERN.test(text)) {
    return `${groundedTerm.term} is a skill, not an ascendancy/class.`;
  }

  return null;
};

const buildKnownTerms = (build: BuildLike, evidencePack?: EvidencePack | null): string[] => {
  const known = new Set<string>();

  for (const term of evidencePack?.terms || []) {
    if (term.origin === 'poe_game_term') {
      known.add(term.term);
    }
  }

  for (const name of getEntryNames(build.gear_gems)) {
    known.add(name);
  }

  for (const name of getEntryNames(build.build_items)) {
    known.add(name);
  }

  return Array.from(known);
};

const statusToReason = (status: LookupStatus): string => {
  if (status === 'verified') return 'officially_verified';
  if (status === 'fallback_verified') return 'fallback_verified_non_official';
  if (status === 'not_found') return 'not_found_in_official_sources';
  if (status === 'source_unavailable') return 'official_sources_unavailable';
  if (status === 'unverified_external') return 'external_content_without_canonical_fact';
  return 'lookup_error';
};

export async function validateBuildMechanics(
  build: BuildLike,
  options: ValidateOptions = {},
): Promise<MechanicsValidationResult> {
  const mode = inferMode(options.mode);
  if (mode === 'off') {
    return {
      isValid: true,
      criticalConflicts: [],
      warnings: [],
      evidence: [],
      enablerDiagnostics: [],
      claimResults: [],
      claimsTotal: 0,
      claimsVerified: 0,
      claimsBlocked: 0,
      hadExternalLookupFailure: false,
      hasSourceUnavailableBlocking: false,
      hasCriticalUnverifiedTerms: false,
      criticalUnverifiedTerms: [],
    };
  }

  const criticalConflicts: MechanicConflict[] = [];
  const warnings: string[] = [];
  const evidence: MechanicsValidationResult['evidence'] = [];
  const enablerDiagnostics: EnablerDiagnostic[] = [];
  const claimResults: ClaimVerificationResult[] = [];
  let hadExternalLookupFailure = false;
  let hasSourceUnavailableBlocking = false;
  const criticalUnverifiedTerms: MechanicsValidationResult['criticalUnverifiedTerms'] = [];

  const lookupOptions = toLookupOptions(options);
  const termLookupCache = new Map<string, Promise<LookupResult>>();
  const groundedTermMap = new Map<string, GroundedUserTerm>();
  const narrativeText = [
    normalizeText(build.analysis_log),
    normalizeText(build.build_reasoning),
    ...((Array.isArray(build.build_steps) ? build.build_steps : []).map((step) => normalizeText(step))),
  ].join('\n');

  for (const groundedTerm of options.evidencePack?.terms || []) {
    if (groundedTerm.status === 'verified') {
      groundedTermMap.set(normalizeKey(groundedTerm.term), groundedTerm);
    }
    if (groundedTerm.lookup) {
      termLookupCache.set(normalizeKey(groundedTerm.term), Promise.resolve(groundedTerm.lookup));
    }
    if (groundedTerm.lookupStatus === 'source_unavailable' || groundedTerm.lookupStatus === 'error') {
      hadExternalLookupFailure = true;
      hasSourceUnavailableBlocking = true;
    }
    if (
      groundedTerm.origin === 'poe_game_term' &&
      groundedTerm.status !== 'verified' &&
      (groundedTerm.source === 'context.build_notes' ||
        groundedTerm.source === 'context.stash_gear_gems' ||
        groundedTerm.source === 'member.restrictions')
    ) {
      criticalUnverifiedTerms.push({
        term: groundedTerm.term,
        source: groundedTerm.source,
        criticality: groundedTerm.criticality,
        reason: groundedTerm.reason,
      });
    }
  }

  if (mode === 'strict' && criticalUnverifiedTerms.length > 0) {
    for (const unresolved of criticalUnverifiedTerms) {
      criticalConflicts.push({
        claim: unresolved.term,
        expected: 'Critical user terms must be verified against canonical PoE2 sources before interpretation.',
        found: `Unverified term from ${unresolved.source} (${unresolved.criticality}): ${unresolved.reason}`,
        subject: `grounding:${unresolved.source}:${unresolved.term.toLowerCase()}`,
        sources: [],
      });
      claimResults.push({
        claimId: `grounding:${unresolved.source}:${unresolved.term.toLowerCase()}`,
        status: 'blocked',
        reason: 'critical_term_unverified',
        evidenceUrls: [],
        missingTerms: [unresolved.term],
      });
    }
  }

  for (const groundedTerm of groundedTermMap.values()) {
    const termNeedle = normalizeText(groundedTerm.term);
    if (!termNeedle || !narrativeText.includes(termNeedle)) {
      continue;
    }

    if (groundedTerm.entityType === 'unique_item' && ASCENDANCY_ROLE_PATTERN.test(narrativeText)) {
      criticalConflicts.push({
        claim: groundedTerm.term,
        expected: 'Claim must keep verified term in its canonical PoE2 role.',
        found: `${groundedTerm.term} is a unique item, not an ascendancy/class mechanic.`,
        subject: `canonical_role:${groundedTerm.term.toLowerCase()}`,
        sources: groundedTerm.sources,
      });
      claimResults.push({
        claimId: `canonical_role:${groundedTerm.term.toLowerCase()}`,
        status: 'blocked',
        reason: 'canonical_role_mismatch',
        evidenceUrls: groundedTerm.sources.map((source) => source.url),
        missingTerms: [],
      });
    }
  }

  for (const term of options.evidencePack?.terms || []) {
    if (term.status !== 'verified' || term.entityType !== 'unique_item') {
      continue;
    }
    const termNeedle = normalizeText(term.term);
    if (!termNeedle || !narrativeText.includes(termNeedle)) {
      continue;
    }
    if (!ASCENDANCY_ROLE_PATTERN.test(narrativeText)) {
      continue;
    }

    const subject = `canonical_role:${term.term.toLowerCase()}`;
    if (criticalConflicts.some((conflict) => conflict.subject === subject)) {
      continue;
    }

    criticalConflicts.push({
      claim: term.term,
      expected: 'Claim must keep verified term in its canonical PoE2 role.',
      found: `${term.term} is a unique item, not an ascendancy/class mechanic.`,
      subject,
      sources: term.sources,
    });
    claimResults.push({
      claimId: subject,
      status: 'blocked',
      reason: 'canonical_role_mismatch',
      evidenceUrls: term.sources.map((source) => source.url),
      missingTerms: [],
    });
  }

  const resolveTermLookup = async (term: string): Promise<LookupResult> => {
    const key = normalizeKey(term);
    if (!termLookupCache.has(key)) {
      termLookupCache.set(key, Promise.all([
        resolveSkill(term, lookupOptions),
        resolveAscendancyNode(term, lookupOptions),
        resolveUniqueItem(term, lookupOptions),
      ]).then((results) => selectBestLookup(results)));
    }

    return termLookupCache.get(key)!;
  };

  const knownTerms = buildKnownTerms(build, options.evidencePack);
  const claimLedger = extractClaimLedger(build, { knownTerms });

  for (const claim of claimLedger) {
    if (!claim.requiresEvidence) {
      claimResults.push({
        claimId: claim.id,
        status: 'verified',
        reason: 'non_factual_or_low_risk_claim',
        evidenceUrls: [],
        missingTerms: [],
      });
      continue;
    }

    const linkedTerms = claim.linkedTerms.length > 0 ? claim.linkedTerms : [claim.text];
    const lookups = await Promise.all(linkedTerms.map((term) => resolveTermLookup(term)));
    const linkedSources = mergeSources(...lookups);
    const verifiedLookups = lookups.filter((lookup) => hasOfficialVerifiedEvidence(lookup));

    const sourceUnavailable = lookups.some((lookup) => lookup.status === 'source_unavailable' || lookup.status === 'error');
    if (sourceUnavailable) {
      hadExternalLookupFailure = true;
    }

    evidence.push({
      subject: claim.id,
      status: verifiedLookups.length > 0 ? 'verified' : lookups.map((lookup) => lookup.status).join(','),
      sources: linkedSources,
    });

    const roleMismatch = linkedTerms
      .map((term) => groundedTermMap.get(normalizeKey(term)))
      .filter((value): value is GroundedUserTerm => Boolean(value))
      .map((groundedTerm) => hasCanonicalRoleMismatch(claim, groundedTerm))
      .find(Boolean);

    if (roleMismatch) {
      const conflict: MechanicConflict = {
        claim: claim.text,
        expected: 'Claim must keep verified term in its canonical PoE2 role.',
        found: roleMismatch,
        subject: claim.id,
        sources: linkedSources,
      };

      if (mode === 'strict') {
        criticalConflicts.push(conflict);
        claimResults.push({
          claimId: claim.id,
          status: 'blocked',
          reason: roleMismatch,
          evidenceUrls: linkedSources.map((source) => source.url),
          missingTerms: [],
        });
      } else {
        warnings.push(`${conflict.expected} Found: ${conflict.found}`);
        claimResults.push({
          claimId: claim.id,
          status: 'unverified',
          reason: roleMismatch,
          evidenceUrls: linkedSources.map((source) => source.url),
          missingTerms: [],
        });
      }
      continue;
    }

    if (verifiedLookups.length === 0) {
      const statuses = lookups.map((lookup) => lookup.status);
      const sourceUnavailableReason = sourceUnavailable
        ? 'Official sources were unavailable within budget for one or more linked terms.'
        : `Linked term statuses: ${statuses.join(', ')}`;

      const conflict: MechanicConflict = {
        claim: claim.text,
        expected: 'Every factual claim must include at least one officially verified PoE2 entity.',
        found: sourceUnavailableReason,
        subject: claim.id,
        sources: linkedSources,
      };

      if (mode === 'strict') {
        criticalConflicts.push(conflict);
        if (sourceUnavailable) {
          hasSourceUnavailableBlocking = true;
        }
        claimResults.push({
          claimId: claim.id,
          status: 'blocked',
          reason: sourceUnavailable ? 'official_sources_unavailable' : statuses.map(statusToReason).join(','),
          evidenceUrls: linkedSources.map((source) => source.url),
          missingTerms: linkedTerms,
        });
      } else {
        warnings.push(`${conflict.expected} Found: ${conflict.found}`);
        claimResults.push({
          claimId: claim.id,
          status: 'unverified',
          reason: statuses.map(statusToReason).join(','),
          evidenceUrls: linkedSources.map((source) => source.url),
          missingTerms: linkedTerms,
        });
      }
      continue;
    }

    claimResults.push({
      claimId: claim.id,
      status: 'verified',
      reason: 'has_official_linked_evidence',
      evidenceUrls: verifiedLookups.flatMap((lookup) => lookup.sources.map((source) => source.url)),
      missingTerms: [],
    });
  }

  const claims = extractBuildMechanicClaims(build);
  const gemNames = getEntryNames(build.gear_gems);
  const itemNames = getEntryNames(build.build_items);
  const entryNames = [...gemNames, ...itemNames];
  const enablerDiagnosticCache = new Map<string, Promise<EnablerDiagnostic>>();

  for (const claim of claims) {
    if (claim.type === 'defensive_damage_taken_as' && /\b(convert|conversion|converted)\b/i.test(claim.text)) {
      warnings.push('Potential conflation between defensive "damage taken as" and offensive damage conversion.');
      continue;
    }

    if (claim.type !== 'offensive_damage_conversion' && claim.type !== 'mechanic_dependency') {
      continue;
    }

    const claimLookup = await resolveMechanicClaim(claim.type, claim.text, lookupOptions);
    const infernalistLookup = /\binfernalist\b/i.test(claim.text)
      ? await resolveAscendancyNode('Infernalist', lookupOptions)
      : null;
    const skillToken = findSkillToken(claim, entryNames);
    const skillLookup = skillToken ? await resolveSkill(skillToken, lookupOptions) : null;
    const enablerCandidates = collectEnablerCandidates(gemNames, itemNames, skillToken);
    const diagnostics = claim.requiresExplicitEnabler
      ? await Promise.all(enablerCandidates.map((enablerName) => {
        const cacheKey = `${normalize(skillToken || 'unknown').toLowerCase()}::${normalize(enablerName).toLowerCase()}`;
        if (!enablerDiagnosticCache.has(cacheKey)) {
          enablerDiagnosticCache.set(cacheKey, resolveEnablerDiagnostic(enablerName, skillToken, skillLookup, options));
        }
        return enablerDiagnosticCache.get(cacheKey)!;
      }))
      : [];

    for (const diagnostic of diagnostics) {
      const key = `${diagnostic.skill.toLowerCase()}::${diagnostic.name.toLowerCase()}`;
      const alreadyAdded = enablerDiagnostics.some((existing) =>
        `${existing.skill.toLowerCase()}::${existing.name.toLowerCase()}` === key);
      if (!alreadyAdded) {
        enablerDiagnostics.push(diagnostic);
      }
    }

    if (
      claimLookup.status === 'error' ||
      claimLookup.status === 'unverified_external' ||
      claimLookup.status === 'source_unavailable'
    ) {
      hadExternalLookupFailure = true;
    }
    if (claimLookup.status === 'source_unavailable') {
      hasSourceUnavailableBlocking = true;
    }
    if (hasExternalLookupFailureForDiagnostics(diagnostics)) {
      hadExternalLookupFailure = true;
    }
    if (diagnostics.some((diag) => diag.status === 'source_unavailable')) {
      // Only becomes blocking when claim cannot be validated without this unavailable source.
    }

    const sources = mergeSources(claimLookup, infernalistLookup, skillLookup, ...diagnostics.map((diag) => ({
      entityType: 'mechanic_claim',
      query: diag.name,
      normalizedQuery: diag.name.toLowerCase(),
      status: 'verified',
      facts: [],
      sources: diag.sources,
    } as LookupResult)));

    evidence.push({
      subject: claim.subject,
      status: claimLookup.status,
      sources,
    });

    const verifiedCompatibleEnabler = hasVerifiedCompatibleEnabler(diagnostics);

    if (claim.requiresExplicitEnabler && !verifiedCompatibleEnabler) {
      const message: MechanicConflict = {
        claim: claim.text,
        expected: 'Verified compatible conversion enabler listed in build_items or gear_gems.',
        found: diagnostics.length === 0
          ? 'No conversion enabler candidate found in build_items/gear_gems.'
          : `Enabler diagnostics: ${diagnostics.map((diag) => `${diag.name}:${diag.status}`).join(', ')}`,
        subject: claim.subject,
        sources,
      };
      if (mode === 'strict') {
        criticalConflicts.push(message);
        if (
          claimLookup.status === 'source_unavailable' ||
          diagnostics.some((diag) => diag.status === 'source_unavailable')
        ) {
          hasSourceUnavailableBlocking = true;
        }
      } else {
        warnings.push(`${message.expected} Found: ${message.found}`);
      }
      continue;
    }

    if (claim.type === 'mechanic_dependency') {
      continue;
    }

    if (!hasOfficialVerifiedEvidence(claimLookup)) {
      if (mode === 'strict') {
        criticalConflicts.push({
          claim: claim.text,
          expected: 'Critical mechanic claims must be verifiable in official sources (poe2db.tw / poe2wiki.net).',
          found: `Lookup status: ${claimLookup.status}`,
          subject: claim.subject,
          sources,
        });
        if (claimLookup.status === 'source_unavailable') {
          hasSourceUnavailableBlocking = true;
        }
      } else {
        warnings.push(`Unverified critical claim: ${claim.text}`);
      }
    }
  }

  const claimsTotal = claimResults.length;
  const claimsVerified = claimResults.filter((result) => result.status === 'verified').length;
  const claimsBlocked = claimResults.filter((result) => result.status === 'blocked').length;

  return {
    isValid: criticalConflicts.length === 0,
    criticalConflicts,
    warnings,
    evidence,
    enablerDiagnostics,
    claimResults,
    claimsTotal,
    claimsVerified,
    claimsBlocked,
    hadExternalLookupFailure,
    hasSourceUnavailableBlocking,
    hasCriticalUnverifiedTerms: criticalUnverifiedTerms.length > 0,
    criticalUnverifiedTerms,
  };
}
