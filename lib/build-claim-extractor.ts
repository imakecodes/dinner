type BuildEntryLike = {
  name?: string | number | null;
};

type BuildLike = {
  analysis_log?: string | null;
  build_reasoning?: string | null;
  build_steps?: string[] | null;
  gear_gems?: BuildEntryLike[] | null;
  build_items?: BuildEntryLike[] | null;
};

export type MechanicClaimType =
  | 'offensive_damage_conversion'
  | 'defensive_damage_taken_as'
  | 'skill_ascendancy_synergy'
  | 'mechanic_dependency';

export type MechanicClaimSeverity = 'critical' | 'warning';

export type MechanicClaim = {
  type: MechanicClaimType;
  severity: MechanicClaimSeverity;
  text: string;
  subject: string;
  fromDamageType?: string;
  toDamageType?: string;
  percentage?: number | null;
  requiresExplicitEnabler?: boolean;
};

const ASCENDANCY_TOKENS = ['infernalist', 'invoker', 'deadeye', 'stormweaver', 'warbringer', 'chronomancer'];
const DAMAGE_TYPES = ['physical', 'fire', 'cold', 'lightning', 'chaos'];

const normalize = (value: unknown): string =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

const splitSentences = (text: string): string[] =>
  text
    .split(/[\n.!?]+/g)
    .map((part) => normalize(part))
    .filter(Boolean);

const lower = (value: string): string => value.toLowerCase();

const extractPercentage = (sentence: string): number | null => {
  const match = sentence.match(/(\d{1,3})\s*%/i);
  if (!match) {
    return null;
  }
  const numeric = Number(match[1]);
  return Number.isFinite(numeric) ? numeric : null;
};

const detectDamageTypes = (sentence: string): { fromDamageType?: string; toDamageType?: string } => {
  const normalized = lower(sentence);
  let fromDamageType: string | undefined;
  let toDamageType: string | undefined;

  const conversionMatch = normalized.match(
    /\b(physical|fire|cold|lightning|chaos)\b[\s\S]{0,24}\b(?:to|into)\b[\s\S]{0,12}\b(physical|fire|cold|lightning|chaos)\b/i,
  );

  if (conversionMatch) {
    fromDamageType = conversionMatch[1];
    toDamageType = conversionMatch[2];
  } else {
    for (const type of DAMAGE_TYPES) {
      if (normalized.includes(`${type} damage`) && !fromDamageType) {
        fromDamageType = type;
      } else if (normalized.includes(type) && fromDamageType && !toDamageType && type !== fromDamageType) {
        toDamageType = type;
      }
    }
  }

  return { fromDamageType, toDamageType };
};

const collectNarrative = (build: BuildLike): string => [
  normalize(build.analysis_log),
  normalize(build.build_reasoning),
  ...(Array.isArray(build.build_steps) ? build.build_steps.map((step) => normalize(step)) : []),
].filter(Boolean).join('\n');

const extractSkillCandidates = (build: BuildLike): string[] => {
  const names = [
    ...(Array.isArray(build.gear_gems) ? build.gear_gems : []),
    ...(Array.isArray(build.build_items) ? build.build_items : []),
  ]
    .map((item) => normalize(item?.name))
    .filter(Boolean);

  return names;
};

const hasAscendancyToken = (sentence: string): string | null => {
  const normalized = lower(sentence);
  for (const token of ASCENDANCY_TOKENS) {
    if (normalized.includes(token)) {
      return token;
    }
  }
  return null;
};

const sentenceHasOffensiveConversion = (sentence: string): boolean => {
  const normalized = lower(sentence);
  return (
    /\b(convert|conversion|converted)\b/.test(normalized) &&
    /\bdamage\b/.test(normalized) &&
    /\b(to|into)\b/.test(normalized)
  ) || /\b(100%|fully|full|total)\b[\s\S]{0,24}\b(convert|conversion|converted)\b/.test(normalized);
};

const sentenceHasTakenAs = (sentence: string): boolean =>
  /\bdamage taken as\b/i.test(sentence) || /\btaken as\b/i.test(sentence);

export function extractBuildMechanicClaims(build: BuildLike): MechanicClaim[] {
  const narrative = collectNarrative(build);
  if (!narrative) {
    return [];
  }

  const skillCandidates = extractSkillCandidates(build).map((value) => lower(value));
  const claims: MechanicClaim[] = [];

  for (const sentence of splitSentences(narrative)) {
    const normalizedSentence = lower(sentence);
    const percentage = extractPercentage(sentence);
    const { fromDamageType, toDamageType } = detectDamageTypes(sentence);

    if (sentenceHasOffensiveConversion(sentence)) {
      claims.push({
        type: 'offensive_damage_conversion',
        severity: 'critical',
        text: sentence,
        subject: 'offensive_damage_conversion',
        fromDamageType,
        toDamageType,
        percentage,
        requiresExplicitEnabler: true,
      });
    }

    if (sentenceHasTakenAs(sentence)) {
      claims.push({
        type: 'defensive_damage_taken_as',
        severity: 'warning',
        text: sentence,
        subject: 'damage_taken_as',
        fromDamageType,
        toDamageType,
        percentage,
        requiresExplicitEnabler: false,
      });
    }

    const ascendancy = hasAscendancyToken(sentence);
    if (ascendancy) {
      const matchedSkill = skillCandidates.find((skill) => normalizedSentence.includes(skill));
      if (matchedSkill) {
        claims.push({
          type: 'skill_ascendancy_synergy',
          severity: 'warning',
          text: sentence,
          subject: `${ascendancy}:${matchedSkill}`,
          requiresExplicitEnabler: false,
        });
      }
    }
  }

  if (claims.some((claim) => claim.requiresExplicitEnabler)) {
    claims.push({
      type: 'mechanic_dependency',
      severity: 'critical',
      text: 'Offensive conversion claim requires explicit enabler in build_items or gear_gems.',
      subject: 'offensive_conversion_dependency',
      requiresExplicitEnabler: true,
    });
  }

  return claims;
}
