import { extractClaimLedger } from '@/lib/claim-ledger';

describe('claim-ledger', () => {
  it('extracts claims from narrative and item fields', () => {
    const claims = extractClaimLedger({
      analysis_log: 'Infernalist Frostbolt conversion requires a support.',
      build_reasoning: 'Sacrosanctum is considered for defense.',
      build_steps: ['Use Frostbolt first', 'Then equip Sacrosanctum'],
      gear_gems: [{ name: 'Frostbolt' }],
      build_items: [{ name: 'Sacrosanctum' }],
    }, {
      knownTerms: ['Infernalist', 'Frostbolt', 'Sacrosanctum'],
    });

    expect(claims.some((claim) => claim.field === 'analysis_log')).toBe(true);
    expect(claims.some((claim) => claim.field === 'build_reasoning')).toBe(true);
    expect(claims.some((claim) => claim.field === 'build_steps')).toBe(true);
    expect(claims.some((claim) => claim.field === 'gear_gems' && claim.claimType === 'item_line')).toBe(true);
    expect(claims.some((claim) => claim.field === 'build_items' && claim.claimType === 'item_line')).toBe(true);
  });

  it('marks mechanic-like sentences as evidence-required', () => {
    const claims = extractClaimLedger({
      analysis_log: '100% cold damage converted to fire.',
      build_reasoning: '',
      build_steps: [],
      gear_gems: [],
      build_items: [],
    }, { knownTerms: [] });

    const mechanicClaim = claims.find((claim) => claim.field === 'analysis_log');
    expect(mechanicClaim?.claimType).toBe('mechanic');
    expect(mechanicClaim?.requiresEvidence).toBe(true);
  });
});
