import type { MechanicsValidationResult } from '@/lib/build-mechanics-validator';

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

type FactAutoCorrectOptions = {
  language?: string;
  maxSourceLinks?: number;
  forceUncertaintyNote?: boolean;
};

export type FactAutoCorrectResult<TBuild extends BuildLike> = {
  correctedBuild: TBuild;
  applied: boolean;
  sourceUrls: string[];
  externalLookupIssue: boolean;
};

const CONVERSION_SENTENCE_PATTERN =
  /\b(?:100\s*%|full(?:y)?|total)\b[\s\S]{0,80}\b(?:convert|conversion|converted)\b[\s\S]{0,80}\b(?:to|into)\s+fire\b/iu;
const FROSTBOLT_CONVERSION_PATTERN =
  /\bfrostbolt\b[\s\S]{0,80}\b(?:convert|conversion|converted)\b[\s\S]{0,80}\b(?:to|into)\s+fire\b/iu;

const isPortuguese = (language?: string): boolean =>
  String(language || '').toLowerCase().startsWith('pt');

const sentenceSplit = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+|\n+/g)
    .map((entry) => entry.trim())
    .filter(Boolean);

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const shouldRemoveLine = (line: string, claims: string[]): boolean => {
  if (!line) {
    return false;
  }

  if (CONVERSION_SENTENCE_PATTERN.test(line) || FROSTBOLT_CONVERSION_PATTERN.test(line)) {
    return true;
  }

  return claims.some((claim) => {
    const escaped = escapeRegExp(claim.trim());
    if (!escaped) {
      return false;
    }
    return new RegExp(escaped, 'iu').test(line);
  });
};

const stripConflictNarrative = (text: string, claims: string[]): string => {
  if (!text.trim()) {
    return '';
  }

  const kept = sentenceSplit(text).filter((line) => !shouldRemoveLine(line, claims));
  return kept.join(' ').trim();
};

const safeNarrativeFallback = (language?: string): string =>
  isPortuguese(language)
    ? 'Plano ajustado para evitar conversao ofensiva nao verificada, mantendo progressao segura e sustentavel no PoE2.'
    : 'Plan adjusted to avoid unverified offensive conversion, keeping safe and sustainable PoE2 progression.';

const safeStepFallback = (language?: string): string =>
  isPortuguese(language)
    ? 'Escale Frostbolt com dano de Gelo confirmado e priorize mitigacao defensiva verificavel.'
    : 'Scale Frostbolt with verified cold damage and prioritize verifiable defensive mitigation.';

const uncertaintyNote = (language?: string): string =>
  isPortuguese(language)
    ? 'Observacao: parte da validacao externa estava indisponivel; a build foi ajustada em melhor esforco.'
    : 'Note: part of external validation was unavailable; the build was adjusted in best-effort mode.';

const sourceHeader = (language?: string): string =>
  isPortuguese(language) ? 'Fontes verificadas:' : 'Verification sources:';

const compact = (value: unknown): string =>
  String(value || '')
    .trim()
    .replace(/\s+/g, ' ');

const collectSourceUrls = (
  validation: MechanicsValidationResult,
  maxSourceLinks = 3,
): string[] => {
  const urls = new Set<string>();

  for (const conflict of validation.criticalConflicts) {
    for (const source of conflict.sources) {
      if (source?.url) {
        urls.add(source.url);
      }
    }
  }

  for (const evidence of validation.evidence) {
    for (const source of evidence.sources) {
      if (source?.url) {
        urls.add(source.url);
      }
    }
  }

  for (const diagnostic of validation.enablerDiagnostics || []) {
    for (const source of diagnostic.sources) {
      if (source?.url) {
        urls.add(source.url);
      }
    }
  }

  return Array.from(urls).slice(0, Math.max(1, maxSourceLinks));
};

const hasExternalLookupIssue = (validation: MechanicsValidationResult): boolean => {
  if (validation.hadExternalLookupFailure) {
    return true;
  }

  if (validation.evidence.some((entry) => entry.status === 'error' || entry.status === 'unverified_external')) {
    return true;
  }

  if (validation.evidence.some((entry) => entry.status === 'source_unavailable')) {
    return true;
  }

  return (validation.enablerDiagnostics || []).some((diag) =>
    diag.status === 'unverified_external' || diag.status === 'source_unavailable');
};

const removeInvalidEnablers = (
  entries: BuildEntryLike[] | null | undefined,
  invalidNames: Set<string>,
): BuildEntryLike[] => {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.filter((entry) => {
    const name = compact(entry?.name);
    return name && !invalidNames.has(name.toLowerCase());
  });
};

const appendAnalysisSections = (
  baseAnalysis: string,
  sourceUrls: string[],
  language?: string,
  includeUncertainty?: boolean,
): string => {
  const sections: string[] = [];

  if (baseAnalysis.trim()) {
    sections.push(baseAnalysis.trim());
  }

  if (includeUncertainty) {
    sections.push(uncertaintyNote(language));
  }

  if (sourceUrls.length > 0) {
    const lines = [sourceHeader(language), ...sourceUrls.map((url) => `- ${url}`)];
    sections.push(lines.join('\n'));
  }

  return sections.join('\n\n').trim();
};

export function autoCorrectBuildFactConflicts<TBuild extends BuildLike>(
  build: TBuild,
  validation: MechanicsValidationResult,
  options: FactAutoCorrectOptions = {},
): FactAutoCorrectResult<TBuild> {
  const language = options.language;
  const maxSourceLinks = options.maxSourceLinks ?? 3;
  const claims = validation.criticalConflicts.map((conflict) => compact(conflict.claim)).filter(Boolean);
  const sourceUrls = collectSourceUrls(validation, maxSourceLinks);
  const externalLookupIssue = hasExternalLookupIssue(validation);

  const prunableDiagnostics = (validation.enablerDiagnostics || []).filter((diag) =>
    diag.status === 'incompatible' || diag.status === 'not_found' || diag.status === 'unverified_external' || diag.status === 'source_unavailable');
  const invalidEnablerNames = new Set(
    prunableDiagnostics.map((diag) => compact(diag.name).toLowerCase()).filter(Boolean),
  );

  const nextAnalysisBase = stripConflictNarrative(compact(build.analysis_log), claims);
  const nextReasoningBase = stripConflictNarrative(compact(build.build_reasoning), claims);
  const keptSteps = (Array.isArray(build.build_steps) ? build.build_steps : [])
    .map((step) => compact(step))
    .filter((step) => step && !shouldRemoveLine(step, claims));

  const nextGear = removeInvalidEnablers(build.gear_gems, invalidEnablerNames);
  const nextItems = removeInvalidEnablers(build.build_items, invalidEnablerNames);

  const nextAnalysis = appendAnalysisSections(
    nextAnalysisBase || safeNarrativeFallback(language),
    sourceUrls,
    language,
    options.forceUncertaintyNote || externalLookupIssue,
  );

  const nextReasoning = nextReasoningBase || safeNarrativeFallback(language);
  const nextSteps = keptSteps.length > 0 ? keptSteps : [safeStepFallback(language)];

  const correctedBuild = {
    ...build,
    analysis_log: nextAnalysis,
    build_reasoning: nextReasoning,
    build_steps: nextSteps,
    gear_gems: nextGear,
    build_items: nextItems,
  };

  const applied =
    correctedBuild.analysis_log !== build.analysis_log ||
    correctedBuild.build_reasoning !== build.build_reasoning ||
    JSON.stringify(correctedBuild.build_steps || []) !== JSON.stringify(build.build_steps || []) ||
    JSON.stringify(correctedBuild.gear_gems || []) !== JSON.stringify(build.gear_gems || []) ||
    JSON.stringify(correctedBuild.build_items || []) !== JSON.stringify(build.build_items || []);

  return {
    correctedBuild: correctedBuild as TBuild,
    applied,
    sourceUrls,
    externalLookupIssue,
  };
}
