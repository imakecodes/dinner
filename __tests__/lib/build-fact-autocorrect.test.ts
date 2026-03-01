import { autoCorrectBuildFactConflicts } from '@/lib/build-fact-autocorrect';
import type { MechanicsValidationResult } from '@/lib/build-mechanics-validator';

const makeValidation = (overrides: Partial<MechanicsValidationResult> = {}): MechanicsValidationResult => ({
  isValid: false,
  criticalConflicts: [
    {
      claim: 'Infernalist Frostbolt 100% converted to fire.',
      expected: 'Verified compatible conversion enabler listed in build_items or gear_gems.',
      found: 'Enabler diagnostics: Fire Attunement:incompatible',
      subject: 'infernalist:frostbolt_conversion',
      sources: [{ provider: 'poe2db', url: 'https://poe2db.tw/us/Frostbolt', fetchedAt: new Date().toISOString() }],
    },
  ],
  warnings: [],
  evidence: [
    {
      subject: 'infernalist:frostbolt_conversion',
      status: 'verified',
      sources: [{ provider: 'poe2wiki', url: 'https://www.poe2wiki.net/wiki/Frostbolt', fetchedAt: new Date().toISOString() }],
    },
  ],
  enablerDiagnostics: [
    {
      name: 'Fire Attunement',
      status: 'incompatible',
      reason: 'Attack-only support.',
      skill: 'Frostbolt',
      sources: [{ provider: 'poe2db', url: 'https://poe2db.tw/us/Fire_Attunement', fetchedAt: new Date().toISOString() }],
    },
  ],
  hadExternalLookupFailure: false,
  claimResults: [],
  claimsTotal: 0,
  claimsVerified: 0,
  claimsBlocked: 0,
  hasSourceUnavailableBlocking: false,
  ...overrides,
});

describe('build-fact-autocorrect', () => {
  it('rewrites conflict narrative, prunes invalid enablers, and appends source links', () => {
    const result = autoCorrectBuildFactConflicts({
      analysis_log: 'Infernalist Frostbolt 100% converted to fire.',
      build_reasoning: 'Infernalist Frostbolt 100% converted to fire for mapping.',
      build_steps: ['Convert Frostbolt fully to fire with Fire Attunement'],
      gear_gems: [{ name: 'Frostbolt' }, { name: 'Fire Attunement' }],
      build_items: [{ name: 'Fire Attunement' }],
    }, makeValidation(), { language: 'en' });

    expect(result.correctedBuild.analysis_log).toContain('Verification sources:');
    expect(result.correctedBuild.analysis_log).toContain('https://poe2db.tw/us/Frostbolt');
    expect(result.correctedBuild.build_reasoning?.toLowerCase()).not.toContain('converted to fire');
    expect(result.correctedBuild.gear_gems?.some((entry) => entry.name === 'Fire Attunement')).toBe(false);
    expect(result.correctedBuild.build_items?.some((entry) => entry.name === 'Fire Attunement')).toBe(false);
  });

  it('adds Portuguese uncertainty note when forced or external lookup failed', () => {
    const validation = makeValidation({
      evidence: [
        {
          subject: 'infernalist:frostbolt_conversion',
          status: 'unverified_external',
          sources: [],
        },
      ],
      enablerDiagnostics: [
        {
          name: 'Unknown Support',
          status: 'unverified_external',
          reason: 'external failure',
          skill: 'Frostbolt',
          sources: [],
        },
      ],
      hadExternalLookupFailure: true,
    });

    const result = autoCorrectBuildFactConflicts({
      analysis_log: 'Plano inicial.',
      build_reasoning: 'Plano inicial.',
      build_steps: ['Passo inicial.'],
      gear_gems: [{ name: 'Frostbolt' }],
      build_items: [{ name: 'Unknown Support' }],
    }, validation, { language: 'pt-BR', forceUncertaintyNote: true });

    expect(result.correctedBuild.analysis_log).toContain('Observacao: parte da validacao externa estava indisponivel');
    expect(result.externalLookupIssue).toBe(true);
  });
});
