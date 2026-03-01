import type { ClaimField, ClaimRecord } from '@/lib/fact-verification-types';

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

type ClaimLedgerOptions = {
  knownTerms?: string[];
};

const normalize = (value: unknown): string =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

const splitSentences = (text: string): string[] =>
  text
    .split(/[\n.!?]+/g)
    .map((entry) => normalize(entry))
    .filter(Boolean);

const normalizeKey = (value: string): string => normalize(value).toLowerCase();

const sentenceHasMechanicSignal = (text: string): boolean =>
  /\b(convert|conversion|converted|damage taken as|supports?\s+attacks?|supports?\s+spells?)\b/iu.test(text);

const sentenceHasRoleSignal = (text: string): boolean =>
  /\b(ascendancy|class|subclass|unique|support|skill|gem)\b/iu.test(text);

const detectClaimType = (field: ClaimField, text: string): ClaimRecord['claimType'] => {
  if (field === 'gear_gems' || field === 'build_items') {
    return 'item_line';
  }
  if (sentenceHasMechanicSignal(text)) {
    return 'mechanic';
  }
  if (sentenceHasRoleSignal(text)) {
    return 'term_role';
  }
  return 'generic_fact';
};

const detectLinkedTerms = (text: string, knownTerms: string[]): string[] => {
  const normalizedText = normalizeKey(text);
  if (!normalizedText) {
    return [];
  }

  const linked = new Set<string>();
  for (const term of knownTerms) {
    const normalizedTerm = normalizeKey(term);
    if (!normalizedTerm) {
      continue;
    }
    if (normalizedText.includes(normalizedTerm)) {
      linked.add(term);
    }
  }

  return Array.from(linked);
};

const toNarrativeClaims = (
  field: Extract<ClaimField, 'analysis_log' | 'build_reasoning' | 'build_steps'>,
  rawText: string,
  knownTerms: string[],
): ClaimRecord[] => {
  const lines = splitSentences(rawText);
  return lines.map((line, index) => {
    const claimType = detectClaimType(field, line);
    const linkedTerms = detectLinkedTerms(line, knownTerms);
    const requiresEvidence = claimType !== 'generic_fact' || linkedTerms.length > 0;

    return {
      id: `${field}:${index + 1}`,
      field,
      text: line,
      claimType,
      linkedTerms,
      requiresEvidence,
    };
  });
};

const toEntryClaims = (
  field: Extract<ClaimField, 'gear_gems' | 'build_items'>,
  entries: BuildEntryLike[],
  knownTerms: string[],
): ClaimRecord[] =>
  entries
    .map((entry) => normalize(entry?.name))
    .filter(Boolean)
    .map((name, index) => {
      const linkedTerms = detectLinkedTerms(name, knownTerms);
      return {
        id: `${field}:${index + 1}`,
        field,
        text: name,
        claimType: 'item_line' as const,
        linkedTerms: linkedTerms.length > 0 ? linkedTerms : [name],
        requiresEvidence: true,
      };
    });

export const extractClaimLedger = (
  build: BuildLike,
  options: ClaimLedgerOptions = {},
): ClaimRecord[] => {
  const knownTerms = Array.from(new Set((options.knownTerms || []).map((value) => normalize(value)).filter(Boolean)));

  return [
    ...toNarrativeClaims('analysis_log', normalize(build.analysis_log), knownTerms),
    ...toNarrativeClaims('build_reasoning', normalize(build.build_reasoning), knownTerms),
    ...toNarrativeClaims('build_steps', (Array.isArray(build.build_steps) ? build.build_steps : []).join('\n'), knownTerms),
    ...toEntryClaims('gear_gems', Array.isArray(build.gear_gems) ? build.gear_gems : [], knownTerms),
    ...toEntryClaims('build_items', Array.isArray(build.build_items) ? build.build_items : [], knownTerms),
  ].filter((claim) => claim.text);
};
