import { extractBuildMechanicClaims, MechanicClaim } from '@/lib/build-claim-extractor';
import {
  resolveAscendancyNode,
  resolveMechanicClaim,
  resolveSkill,
  resolveUniqueItem,
} from '@/lib/poe2-knowledge';
import { KnowledgeSource, LookupResult } from '@/lib/poe2-knowledge-types';

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

export type MechanicsValidationResult = {
  isValid: boolean;
  criticalConflicts: MechanicConflict[];
  warnings: string[];
  evidence: Array<{
    subject: string;
    status: string;
    sources: KnowledgeSource[];
  }>;
};

type ValidateOptions = {
  mode?: FactValidationMode;
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

const getEntryNames = (build: BuildLike): string[] => [
  ...(Array.isArray(build.gear_gems) ? build.gear_gems : []),
  ...(Array.isArray(build.build_items) ? build.build_items : []),
]
  .map((item) => normalize(item?.name))
  .filter(Boolean);

const ENABLER_PATTERNS: RegExp[] = [
  /\bsupport\b/i,
  /\bconversion\b/i,
  /\bcold to fire\b/i,
  /\bavatar of fire\b/i,
  /\bgain as extra\b/i,
  /\bconverted to\b/i,
];

const hasNamedEnablerToken = (entries: string[]): boolean =>
  entries.some((entry) => ENABLER_PATTERNS.some((pattern) => pattern.test(entry)));

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

const hasVerifiedStatus = (result: LookupResult | null | undefined): boolean =>
  Boolean(result && (result.status === 'verified' || result.status === 'fallback_verified'));

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

const collectUniqueEvidence = async (entries: string[]): Promise<LookupResult[]> => {
  const limited = entries.slice(0, 3);
  const results = await Promise.all(limited.map((name) => resolveUniqueItem(name)));
  return results.filter((result) => hasVerifiedStatus(result));
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
    };
  }

  const claims = extractBuildMechanicClaims(build);
  if (claims.length === 0) {
    return {
      isValid: true,
      criticalConflicts: [],
      warnings: [],
      evidence: [],
    };
  }

  const entryNames = getEntryNames(build);
  const namedEnabler = hasNamedEnablerToken(entryNames);
  const uniqueEvidence = await collectUniqueEvidence(entryNames);
  const hasUniqueEvidence = uniqueEvidence.length > 0;
  const hasExplicitEnabler = namedEnabler || hasUniqueEvidence;

  const criticalConflicts: MechanicConflict[] = [];
  const warnings: string[] = [];
  const evidence: MechanicsValidationResult['evidence'] = [];

  for (const claim of claims) {
    if (claim.type === 'defensive_damage_taken_as' && /\b(convert|conversion|converted)\b/i.test(claim.text)) {
      warnings.push('Potential conflation between defensive "damage taken as" and offensive damage conversion.');
      continue;
    }

    if (claim.type !== 'offensive_damage_conversion' && claim.type !== 'mechanic_dependency') {
      continue;
    }

    const claimLookup = await resolveMechanicClaim(claim.type, claim.text);
    const infernalistLookup = /\binfernalist\b/i.test(claim.text)
      ? await resolveAscendancyNode('Infernalist')
      : null;
    const skillToken = findSkillToken(claim, entryNames);
    const skillLookup = skillToken ? await resolveSkill(skillToken) : null;
    const sources = mergeSources(claimLookup, infernalistLookup, skillLookup, ...uniqueEvidence);

    evidence.push({
      subject: claim.subject,
      status: claimLookup.status,
      sources,
    });

    const hasVerifiedExternalEvidence = hasVerifiedStatus(claimLookup) || hasVerifiedStatus(skillLookup);

    const infernalistFrostboltMismatch =
      /\binfernalist\b/i.test(claim.text) &&
      /\bfrostbolt\b/i.test(claim.text) &&
      /(?:100\s*%|\bfull\b|\bfully\b|\btotal\b)/i.test(claim.text) &&
      /\b(convert|conversion|converted)\b/i.test(claim.text) &&
      /\bto\s+fire\b/i.test(claim.text) &&
      !hasExplicitEnabler;

    if (infernalistFrostboltMismatch) {
      const message: MechanicConflict = {
        claim: claim.text,
        expected: 'Infernalist + Frostbolt offensive conversion requires explicit PoE2 enabler and source-backed evidence.',
        found: 'Claim asserts full Frostbolt fire conversion without explicit enabler.',
        subject: 'infernalist:frostbolt_conversion',
        sources,
      };
      if (mode === 'strict') {
        criticalConflicts.push(message);
      } else {
        warnings.push(`${message.expected} Found: ${message.found}`);
      }
      continue;
    }

    if (!hasExplicitEnabler && claim.requiresExplicitEnabler) {
      const message: MechanicConflict = {
        claim: claim.text,
        expected: 'Explicit conversion enabler listed in build_items or gear_gems.',
        found: 'No explicit enabler found for offensive conversion claim.',
        subject: claim.subject,
        sources,
      };
      if (mode === 'strict') {
        criticalConflicts.push(message);
      } else {
        warnings.push(`${message.expected} Found: ${message.found}`);
      }
      continue;
    }

    if (!hasVerifiedExternalEvidence) {
      if (mode === 'strict') {
        criticalConflicts.push({
          claim: claim.text,
          expected: 'Critical mechanic claims must be externally verifiable (poe2db/poe2wiki).',
          found: `Lookup status: ${claimLookup.status}`,
          subject: claim.subject,
          sources,
        });
      } else {
        warnings.push(`Unverified critical claim: ${claim.text}`);
      }
    }
  }

  return {
    isValid: criticalConflicts.length === 0,
    criticalConflicts,
    warnings,
    evidence,
  };
}
