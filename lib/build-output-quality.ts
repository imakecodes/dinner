type BuildEntryLike = {
  name?: string | number | null;
  quantity?: string | number | null;
  unit?: string | number | null;
};

type BuildWithEntries = {
  analysis_log?: string | null;
  gear_gems?: BuildEntryLike[] | null;
  build_items?: BuildEntryLike[] | null;
};

export const ITEM_UNCERTAINTY_NOTE =
  'Item line conflict not fully verifiable as PoE2; using best-effort interpretation with budget fallback.';

const AMBIGUOUS_ITEM_PATTERN = /(\/|\?|(?:^|\s)or(?:\s|$)|\beither\b|\bone of\b)/iu;
const UNCERTAINTY_LOG_PATTERN =
  /\b(uncertain|uncertainty|not fully verifiable|best[- ]effort|fallback|incerteza|incerto)\b/iu;

const hasAmbiguousToken = (value: unknown): boolean => {
  const text = String(value || '').trim();
  if (!text) {
    return false;
  }
  return AMBIGUOUS_ITEM_PATTERN.test(text);
};

const hasEntryConflict = (entry: BuildEntryLike): boolean =>
  hasAmbiguousToken(entry?.name) ||
  hasAmbiguousToken(entry?.quantity) ||
  hasAmbiguousToken(entry?.unit);

const hasItemConflict = (build: BuildWithEntries): boolean => {
  const entries = [
    ...(Array.isArray(build.gear_gems) ? build.gear_gems : []),
    ...(Array.isArray(build.build_items) ? build.build_items : []),
  ];

  return entries.some((entry) => hasEntryConflict(entry));
};

export function annotateItemUncertainty<T extends BuildWithEntries>(build: T): T {
  if (!hasItemConflict(build)) {
    return build;
  }

  const analysisLog = String(build.analysis_log || '').trim();
  if (UNCERTAINTY_LOG_PATTERN.test(analysisLog)) {
    return build;
  }

  const nextAnalysisLog = analysisLog
    ? `${analysisLog}\n${ITEM_UNCERTAINTY_NOTE}`
    : ITEM_UNCERTAINTY_NOTE;

  return {
    ...build,
    analysis_log: nextAnalysisLog,
  };
}
