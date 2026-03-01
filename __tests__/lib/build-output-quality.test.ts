import { annotateItemUncertainty, ITEM_UNCERTAINTY_NOTE } from '@/lib/build-output-quality';

describe('build-output-quality', () => {
  it('keeps output unchanged when no ambiguous item lines exist', () => {
    const build = {
      analysis_log: 'Clear PoE2 setup.',
      gear_gems: [{ name: 'Lightning Arrow', quantity: '1', unit: 'socket' }],
      build_items: [{ name: 'Divine Orb', quantity: '2', unit: 'x' }],
    };

    expect(annotateItemUncertainty(build)).toEqual(build);
  });

  it('appends uncertainty note when ambiguous item lines are present', () => {
    const build = {
      analysis_log: 'PoE2 build validated.',
      build_items: [{ name: 'Item A / Item B', quantity: '1', unit: 'x' }],
    };

    const result = annotateItemUncertainty(build);
    expect(result.analysis_log).toContain('PoE2 build validated.');
    expect(result.analysis_log).toContain(ITEM_UNCERTAINTY_NOTE);
  });

  it('does not duplicate uncertainty note when analysis log already mentions uncertainty', () => {
    const build = {
      analysis_log: 'Uncertainty noted: best-effort fallback applied.',
      build_items: [{ name: 'Item A or Item B', quantity: '1', unit: 'x' }],
    };

    expect(annotateItemUncertainty(build)).toEqual(build);
  });
});
