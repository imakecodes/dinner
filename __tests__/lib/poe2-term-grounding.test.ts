import {
  buildEvidencePackFromGrounding,
  buildGroundingInstruction,
  collectUserTermsForGrounding,
  groundUserTerms,
  hasGroundingLookupFailure,
} from '@/lib/poe2-term-grounding';
import type { LookupResult } from '@/lib/poe2-knowledge-types';

const resolveSkillMock = jest.fn();
const resolveAscendancyNodeMock = jest.fn();
const resolveUniqueItemMock = jest.fn();

jest.mock('@/lib/poe2-knowledge', () => ({
  resolveSkill: (...args: unknown[]) => resolveSkillMock(...args),
  resolveAscendancyNode: (...args: unknown[]) => resolveAscendancyNodeMock(...args),
  resolveUniqueItem: (...args: unknown[]) => resolveUniqueItemMock(...args),
}));

const lookup = (
  entityType: LookupResult['entityType'],
  query: string,
  status: LookupResult['status'],
): LookupResult => ({
  entityType,
  query,
  normalizedQuery: query.toLowerCase(),
  status,
  facts: [],
  sources: [{ provider: 'poe2db', url: `https://poe2db.tw/us/${query}`, fetchedAt: new Date().toISOString() }],
});

describe('poe2-term-grounding', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    resolveSkillMock.mockImplementation(async (term: string) => {
      if (term.toLowerCase() === 'frostbolt') return lookup('skill', term, 'verified');
      return lookup('skill', term, 'not_found');
    });

    resolveAscendancyNodeMock.mockImplementation(async (term: string) => {
      if (term.toLowerCase() === 'infernalist') return lookup('ascendancy_node', term, 'verified');
      return lookup('ascendancy_node', term, 'not_found');
    });

    resolveUniqueItemMock.mockImplementation(async (term: string) => {
      if (term.toLowerCase() === 'sacrosanctum') return lookup('unique_item', term, 'verified');
      return lookup('unique_item', term, 'not_found');
    });
  });

  it('grounds user terms and preserves canonical roles for verified terms', async () => {
    const terms = await groundUserTerms({
      requested_archetype: 'mapper',
      stash_gear_gems: ['Frostbolt'],
      build_notes: 'Infernalist, Frostbolt e Sacrosanctum',
    } as any, []);

    const infernalist = terms.find((term) => term.term.toLowerCase() === 'infernalist');
    const sacrosanctum = terms.find((term) => term.term.toLowerCase() === 'sacrosanctum');
    const mapper = terms.find((term) => term.term.toLowerCase() === 'mapper');

    expect(infernalist?.entityType).toBe('ascendancy_node');
    expect(infernalist?.status).toBe('verified');
    expect(sacrosanctum?.entityType).toBe('unique_item');
    expect(sacrosanctum?.status).toBe('verified');
    expect(mapper?.origin).toBe('internal_contract_term');
    expect(mapper?.status).toBe('internal');
    expect(mapper?.lookupStatus).toBe('internal');

    const instruction = buildGroundingInstruction(terms);
    expect(instruction).toContain('INTERNAL CONTRACT TERMS');
    expect(instruction).toContain('VERIFIED USER TERMS (OFFICIAL CANONICAL ANCHORS)');
    expect(instruction).toContain('Sacrosanctum => unique_item (verified)');
  });

  it('marks non-confirmed terms and reports lookup instability', async () => {
    resolveSkillMock.mockResolvedValueOnce(lookup('skill', 'UnknownTerm', 'error'));
    resolveAscendancyNodeMock.mockResolvedValueOnce(lookup('ascendancy_node', 'UnknownTerm', 'not_found'));
    resolveUniqueItemMock.mockResolvedValueOnce(lookup('unique_item', 'UnknownTerm', 'not_found'));

    const terms = await groundUserTerms({
      requested_archetype: 'mapper',
      build_notes: 'UnknownTerm',
    } as any, []);

    const unknown = terms.find((term) => term.term === 'UnknownTerm');
    expect(unknown?.status).toBe('not_confirmed');
    expect(unknown?.lookupStatus).toBe('error');
    expect(hasGroundingLookupFailure(terms)).toBe(true);
  });

  it('builds evidence pack with term and fact counters', async () => {
    const terms = await groundUserTerms({
      requested_archetype: 'mapper',
      stash_gear_gems: ['Frostbolt'],
      build_notes: 'Infernalist',
    } as any, []);

    const pack = buildEvidencePackFromGrounding(terms, Date.now() + 1000);

    expect(pack.metadata.termsTotal).toBeGreaterThan(0);
    expect(pack.metadata.termsVerified).toBeGreaterThan(0);
    expect(pack.terms.some((term) => term.origin === 'internal_contract_term')).toBe(true);
  });

  it('collects terms from context and members without duplicate normalization', () => {
    const terms = collectUserTermsForGrounding({
      requested_archetype: 'mapper',
      build_notes: 'Infernalist; infernalist',
    } as any, [{
      id: 'm1',
      name: 'Tester',
      kitchenId: 'k1',
      likes: ['Frostbolt'],
      dislikes: ['frostbolt'],
      restrictions: [],
    } as any]);

    expect(terms.filter((term) => term.toLowerCase() === 'infernalist')).toHaveLength(1);
    expect(terms.filter((term) => term.toLowerCase() === 'frostbolt')).toHaveLength(1);
  });
});
