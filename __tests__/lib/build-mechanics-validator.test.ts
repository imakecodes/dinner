import { validateBuildMechanics } from '@/lib/build-mechanics-validator';
import type { LookupResult } from '@/lib/poe2-knowledge-types';

const resolveSkillMock = jest.fn();
const resolveAscendancyNodeMock = jest.fn();
const resolveUniqueItemMock = jest.fn();
const resolveMechanicClaimMock = jest.fn();
const hasOfficialVerifiedEvidenceMock = jest.fn();

jest.mock('@/lib/poe2-knowledge', () => ({
  resolveSkill: (...args: unknown[]) => resolveSkillMock(...args),
  resolveAscendancyNode: (...args: unknown[]) => resolveAscendancyNodeMock(...args),
  resolveUniqueItem: (...args: unknown[]) => resolveUniqueItemMock(...args),
  resolveMechanicClaim: (...args: unknown[]) => resolveMechanicClaimMock(...args),
  hasOfficialVerifiedEvidence: (...args: unknown[]) => hasOfficialVerifiedEvidenceMock(...args),
}));

const makeLookup = (
  query: string,
  status: LookupResult['status'],
  entityType: LookupResult['entityType'],
  rawText = '',
): LookupResult => ({
  entityType,
  query,
  normalizedQuery: query.toLowerCase(),
  status,
  facts: [],
  sources: [{ provider: 'poe2db', url: `https://poe2db.tw/us/${query}`, fetchedAt: new Date().toISOString() }],
  rawText,
});

describe('build-mechanics-validator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hasOfficialVerifiedEvidenceMock.mockImplementation((lookup: LookupResult | null | undefined) =>
      Boolean(lookup?.status === 'verified' && lookup.sources.some((source) => source.provider === 'poe2db' || source.provider === 'poe2wiki')));

    resolveSkillMock.mockImplementation(async (query: string) => {
      const key = String(query || '').toLowerCase();

      if (key.includes('frostbolt')) {
        return makeLookup('Frostbolt', 'verified', 'skill', 'Frostbolt is a Spell Projectile that deals cold damage.');
      }

      if (key.includes('fire attunement') || key.includes('cold attunement')) {
        return makeLookup(query, 'verified', 'skill', 'Support Gem. Supports Attacks.');
      }

      if (key.includes('sacrosanctum')) {
        return makeLookup(query, 'not_found', 'skill');
      }

      if (key.includes('support')) {
        return makeLookup(query, 'not_found', 'skill');
      }

      return makeLookup(query, 'not_found', 'skill');
    });

    resolveAscendancyNodeMock.mockImplementation(async (query: string) => {
      if (String(query).toLowerCase().includes('infernalist')) {
        return makeLookup(query, 'verified', 'ascendancy_node', 'Infernalist ascendancy details.');
      }
      return makeLookup(query, 'not_found', 'ascendancy_node');
    });

    resolveUniqueItemMock.mockImplementation(async (query: string) => {
      const key = String(query).toLowerCase();
      if (key.includes('unique enabler') || key.includes('sacrosanctum')) {
        return makeLookup(query, 'verified', 'unique_item', 'Unique item that enables conversion.');
      }
      return makeLookup(query, 'not_found', 'unique_item');
    });

    resolveMechanicClaimMock.mockImplementation(async (claimType: string, subject: string) => {
      if (String(claimType).toLowerCase() === 'offensive_damage_conversion') {
        return makeLookup(subject, 'verified', 'mechanic_claim', 'Conversion mechanics reference.');
      }
      return makeLookup(subject, 'unverified_external', 'mechanic_claim');
    });
  });

  it('flags infernalist + frostbolt full fire conversion without verified enabler as critical conflict', async () => {
    const result = await validateBuildMechanics({
      build_reasoning: 'Infernalist Frostbolt with 100% cold damage converted to fire.',
      gear_gems: [{ name: 'Frostbolt' }],
      build_items: [],
      build_steps: [],
    }, { mode: 'strict' });

    expect(result.isValid).toBe(false);
    expect(result.criticalConflicts.length).toBeGreaterThan(0);
    expect(result.criticalConflicts.some((conflict) => conflict.subject.includes('offensive_damage_conversion') || conflict.subject.includes('infernalist'))).toBe(true);
    expect(result.enablerDiagnostics).toHaveLength(0);
  });

  it('passes when verified compatible enabler exists and claim lookup is verified', async () => {
    const result = await validateBuildMechanics({
      build_reasoning: 'Infernalist Frostbolt with 100% cold damage converted to fire.',
      gear_gems: [{ name: 'Frostbolt' }],
      build_items: [{ name: 'Unique Enabler' }],
      build_steps: [],
    }, { mode: 'strict' });

    expect(result.isValid).toBe(true);
    expect(result.criticalConflicts).toHaveLength(0);
    expect(result.enablerDiagnostics.some((diag) => diag.status === 'verified')).toBe(true);
  });

  it('flags incompatible attack-only support enabler for Frostbolt spell conversion', async () => {
    const result = await validateBuildMechanics({
      build_reasoning: 'Infernalist Frostbolt with 100% cold damage converted to fire.',
      gear_gems: [{ name: 'Frostbolt' }, { name: 'Fire Attunement Support' }],
      build_items: [],
      build_steps: [],
    }, { mode: 'strict' });

    expect(result.isValid).toBe(false);
    expect(result.enablerDiagnostics.some((diag) => diag.name.includes('Fire Attunement') && diag.status === 'incompatible')).toBe(true);
  });

  it('downgrades unverifiable claim to warning in warn mode', async () => {
    resolveMechanicClaimMock.mockImplementation(async (claimType: string, subject: string) =>
      makeLookup(`${claimType}:${subject}`, 'unverified_external', 'mechanic_claim'));

    const result = await validateBuildMechanics({
      build_reasoning: '100% cold damage converted to fire.',
      gear_gems: [{ name: 'Frostbolt' }],
      build_items: [{ name: 'unknown setup' }],
      build_steps: [],
    }, { mode: 'warn' });

    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('blocks canonical role mismatch when unique item is asserted as ascendancy', async () => {
    const result = await validateBuildMechanics({
      build_reasoning: 'Sacrosanctum is the best ascendancy for Frostbolt.',
      gear_gems: [{ name: 'Frostbolt' }],
      build_items: [{ name: 'Sacrosanctum' }],
      build_steps: [],
    }, {
      mode: 'strict',
      evidencePack: {
        generatedAt: new Date().toISOString(),
        deadlineAtMs: Date.now() + 1000,
        terms: [{
          term: 'Sacrosanctum',
          normalizedTerm: 'sacrosanctum',
          origin: 'poe_game_term',
          source: 'context.build_notes',
          criticality: 'high',
          entityType: 'unique_item',
          status: 'verified',
          lookupStatus: 'verified',
          sources: [{ provider: 'poe2db', url: 'https://poe2db.tw/us/Sacrosanctum', fetchedAt: new Date().toISOString() }],
          facts: [],
          lookup: makeLookup('Sacrosanctum', 'verified', 'unique_item', 'Unique Body Armour'),
          reason: 'Verified.',
        }],
        lookups: [],
        facts: [],
        sourceUnavailable: false,
        metadata: {
          termsTotal: 1,
          termsVerified: 1,
          termsUnverified: 0,
        },
      },
    });

    expect(result.isValid).toBe(false);
    expect(result.criticalConflicts.some((conflict) =>
      conflict.expected.includes('canonical PoE2 role'))).toBe(true);
  });

  it('marks blocking when official sources are unavailable for required claims', async () => {
    resolveSkillMock.mockImplementation(async () =>
      makeLookup('Unavailable Term', 'source_unavailable', 'skill'));

    const result = await validateBuildMechanics({
      build_reasoning: 'Unavailable Term is mandatory.',
      gear_gems: [{ name: 'Unavailable Term' }],
      build_items: [],
      build_steps: [],
    }, { mode: 'strict' });

    expect(result.hasSourceUnavailableBlocking).toBe(true);
    expect(result.hadExternalLookupFailure).toBe(true);
  });

  it('does not mark source-unavailable blocking when claim still has verified official evidence', async () => {
    resolveSkillMock.mockImplementation(async (query: string) => {
      if (String(query).toLowerCase().includes('frostbolt')) {
        return makeLookup('Frostbolt', 'verified', 'skill', 'Frostbolt is a Spell Projectile that deals cold damage.');
      }
      return makeLookup(String(query), 'source_unavailable', 'skill');
    });

    const result = await validateBuildMechanics({
      analysis_log: 'Frostbolt setup with unavailable side term.',
      build_reasoning: '',
      gear_gems: [{ name: 'Frostbolt' }],
      build_items: [],
      build_steps: [],
    }, { mode: 'strict' });

    expect(result.hadExternalLookupFailure).toBe(false);
    expect(result.hasSourceUnavailableBlocking).toBe(false);
  });

  it('blocks when critical user terms are not verified in strict mode', async () => {
    const result = await validateBuildMechanics({
      build_reasoning: 'Use unknown setup from notes.',
      gear_gems: [{ name: 'Frostbolt' }],
      build_items: [],
      build_steps: [],
    }, {
      mode: 'strict',
      evidencePack: {
        generatedAt: new Date().toISOString(),
        deadlineAtMs: Date.now() + 1000,
        terms: [{
          term: 'Unknown Setup',
          normalizedTerm: 'unknown setup',
          origin: 'poe_game_term',
          source: 'context.build_notes',
          criticality: 'high',
          entityType: 'unknown',
          status: 'not_confirmed',
          lookupStatus: 'not_found',
          sources: [],
          facts: [],
          lookup: null,
          reason: 'Not confirmed in official sources.',
        }],
        lookups: [],
        facts: [],
        sourceUnavailable: false,
        metadata: {
          termsTotal: 1,
          termsVerified: 0,
          termsUnverified: 1,
        },
      },
    });

    expect(result.hasCriticalUnverifiedTerms).toBe(true);
    expect(result.criticalUnverifiedTerms).toHaveLength(1);
    expect(result.isValid).toBe(false);
    expect(result.claimResults.some((claim) => claim.reason === 'critical_term_unverified')).toBe(true);
  });
});
