import { extractBuildMechanicClaims } from '@/lib/build-claim-extractor';

describe('build-claim-extractor', () => {
  it('extracts offensive conversion claim as critical', () => {
    const claims = extractBuildMechanicClaims({
      build_reasoning: 'Infernalist Frostbolt with 100% cold damage converted to fire for mapping.',
      build_steps: [],
      gear_gems: [{ name: 'Frostbolt' }],
      build_items: [],
    });

    expect(claims.some((claim) => claim.type === 'offensive_damage_conversion' && claim.severity === 'critical')).toBe(true);
  });

  it('separates defensive taken as from offensive conversion', () => {
    const claims = extractBuildMechanicClaims({
      analysis_log: 'Use damage taken as fire for defense.',
      build_reasoning: 'No offensive conversion claim.',
      build_steps: [],
      gear_gems: [],
      build_items: [],
    });

    expect(claims.some((claim) => claim.type === 'defensive_damage_taken_as')).toBe(true);
    expect(claims.some((claim) => claim.type === 'offensive_damage_conversion')).toBe(false);
  });
});
