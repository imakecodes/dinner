const createRunMock = jest.fn();
const updateRunMock = jest.fn();
const upsertEntityMock = jest.fn();
const createAliasMock = jest.fn();
const findEntityManyMock = jest.fn();
const findAliasManyMock = jest.fn();

const resolveSkillMock = jest.fn();
const resolveAscendancyNodeMock = jest.fn();
const resolveUniqueItemMock = jest.fn();
const resolveMechanicClaimMock = jest.fn();

jest.mock('@/lib/prisma', () => ({
  prisma: {
    poeSnapshotRun: {
      create: (...args: unknown[]) => createRunMock(...args),
      update: (...args: unknown[]) => updateRunMock(...args),
    },
    poeEntitySnapshot: {
      upsert: (...args: unknown[]) => upsertEntityMock(...args),
      findMany: (...args: unknown[]) => findEntityManyMock(...args),
    },
    poeAliasSnapshot: {
      create: (...args: unknown[]) => createAliasMock(...args),
      findMany: (...args: unknown[]) => findAliasManyMock(...args),
    },
  },
}));

jest.mock('@/lib/poe2-knowledge', () => ({
  resolveSkill: (...args: unknown[]) => resolveSkillMock(...args),
  resolveAscendancyNode: (...args: unknown[]) => resolveAscendancyNodeMock(...args),
  resolveUniqueItem: (...args: unknown[]) => resolveUniqueItemMock(...args),
  resolveMechanicClaim: (...args: unknown[]) => resolveMechanicClaimMock(...args),
}));

import { runWeeklyPoeSnapshot } from '@/lib/poe-snapshot-service';

describe('poe-snapshot-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createRunMock.mockResolvedValue({ id: 'run-1' });
    updateRunMock.mockResolvedValue({ id: 'run-1' });
    upsertEntityMock.mockResolvedValue({ id: 'entity-1' });
    createAliasMock.mockResolvedValue({ id: 'alias-1' });
    findEntityManyMock.mockResolvedValue([]);
    findAliasManyMock.mockResolvedValue([]);

    const verifiedLookup = {
      entityType: 'skill',
      query: 'Frostbolt',
      normalizedQuery: 'frostbolt',
      status: 'verified',
      facts: [],
      rawText: 'Frostbolt spell text',
      sources: [
        { provider: 'poe2db', url: 'https://poe2db.tw/us/Frostbolt', fetchedAt: new Date().toISOString() },
      ],
      sourceUnavailable: false,
    };

    resolveSkillMock.mockResolvedValue(verifiedLookup);
    resolveAscendancyNodeMock.mockResolvedValue({ ...verifiedLookup, entityType: 'ascendancy_node', query: 'Infernalist' });
    resolveUniqueItemMock.mockResolvedValue({ ...verifiedLookup, entityType: 'unique_item', query: 'The Everlasting Gaze' });
    resolveMechanicClaimMock.mockResolvedValue({ ...verifiedLookup, entityType: 'mechanic_claim', query: 'cold to fire conversion' });
  });

  it('creates run and persists snapshot entities/aliases', async () => {
    await runWeeklyPoeSnapshot();

    expect(createRunMock).toHaveBeenCalledTimes(1);
    expect(upsertEntityMock).toHaveBeenCalled();
    expect(createAliasMock).toHaveBeenCalled();
    expect(updateRunMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: expect.stringMatching(/SUCCESS|PARTIAL/) }),
    }));
  });

  it('keeps run finalization even when one lookup fails', async () => {
    createRunMock.mockResolvedValueOnce({ id: 'run-2' });
    resolveSkillMock.mockRejectedValueOnce(new Error('fatal')); // first iteration

    await runWeeklyPoeSnapshot();

    expect(updateRunMock).toHaveBeenCalled();
  });
});
