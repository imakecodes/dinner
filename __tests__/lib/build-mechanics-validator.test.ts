import { validateBuildMechanics } from '@/lib/build-mechanics-validator';
import type { LookupResult } from '@/lib/poe2-knowledge-types';

const resolveSkillMock = jest.fn();
const resolveAscendancyNodeMock = jest.fn();
const resolveUniqueItemMock = jest.fn();
const resolveMechanicClaimMock = jest.fn();

jest.mock('@/lib/poe2-knowledge', () => ({
  resolveSkill: (...args: unknown[]) => resolveSkillMock(...args),
  resolveAscendancyNode: (...args: unknown[]) => resolveAscendancyNodeMock(...args),
  resolveUniqueItem: (...args: unknown[]) => resolveUniqueItemMock(...args),
  resolveMechanicClaim: (...args: unknown[]) => resolveMechanicClaimMock(...args),
}));

const verifiedLookup = (query: string): LookupResult => ({
  entityType: 'mechanic_claim',
  query,
  normalizedQuery: query.toLowerCase(),
  status: 'verified',
  facts: [],
  sources: [{ provider: 'poe2db', url: `https://poe2db.tw/us/${query}`, fetchedAt: new Date().toISOString() }],
});

const unverifiedLookup = (query: string): LookupResult => ({
  entityType: 'mechanic_claim',
  query,
  normalizedQuery: query.toLowerCase(),
  status: 'unverified_external',
  facts: [],
  sources: [{ provider: 'poe2wiki', url: `https://www.poe2wiki.net/wiki/${query}`, fetchedAt: new Date().toISOString() }],
});

describe('build-mechanics-validator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveSkillMock.mockResolvedValue(verifiedLookup('Frostbolt'));
    resolveAscendancyNodeMock.mockResolvedValue(verifiedLookup('Infernalist'));
    resolveUniqueItemMock.mockResolvedValue(unverifiedLookup('none'));
    resolveMechanicClaimMock.mockResolvedValue(unverifiedLookup('claim'));
  });

  it('flags infernalist + frostbolt full fire conversion without enabler as critical conflict', async () => {
    const result = await validateBuildMechanics({
      build_reasoning: 'Infernalist Frostbolt with 100% cold damage converted to fire.',
      gear_gems: [{ name: 'Frostbolt' }],
      build_items: [],
      build_steps: [],
    }, { mode: 'strict' });

    expect(result.isValid).toBe(false);
    expect(result.criticalConflicts.length).toBeGreaterThan(0);
    expect(result.criticalConflicts[0].subject).toContain('infernalist');
  });

  it('passes when explicit enabler is present and lookup is verified', async () => {
    resolveMechanicClaimMock.mockResolvedValue(verifiedLookup('conversion_claim'));
    resolveUniqueItemMock.mockResolvedValue(verifiedLookup('Unique_Enabler'));

    const result = await validateBuildMechanics({
      build_reasoning: 'Infernalist Frostbolt with 100% cold damage converted to fire.',
      gear_gems: [{ name: 'Frostbolt Support' }],
      build_items: [{ name: 'Unique Enabler' }],
      build_steps: [],
    }, { mode: 'strict' });

    expect(result.isValid).toBe(true);
    expect(result.criticalConflicts).toHaveLength(0);
  });

  it('downgrades unverifiable claim to warning in warn mode', async () => {
    const result = await validateBuildMechanics({
      build_reasoning: '100% cold damage converted to fire.',
      gear_gems: [{ name: 'Frostbolt' }],
      build_items: [{ name: 'unknown setup' }],
      build_steps: [],
    }, { mode: 'warn' });

    expect(result.isValid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
