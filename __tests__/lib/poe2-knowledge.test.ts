import {
  __resetPoe2KnowledgeCache,
  resolveSkill,
  resolveUniqueItem,
} from '@/lib/poe2-knowledge';

describe('poe2-knowledge', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    __resetPoe2KnowledgeCache();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('falls back from poe2db to poe2wiki when primary provider fails', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('poe2db failed'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://www.poe2wiki.net/wiki/Frostbolt',
        text: async () => '<html><body>Frostbolt deals cold damage in Path of Exile 2.</body></html>',
      });

    const result = await resolveSkill('Frostbolt');

    expect(result.status).toBe('verified');
    expect(result.sources.some((source) => source.provider === 'poe2wiki')).toBe(true);
  });

  it('uses cache for repeated queries within TTL', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      url: 'https://poe2db.tw/us/Frostbolt',
      text: async () => '<html><body>Frostbolt cold damage.</body></html>',
    });

    const first = await resolveSkill('Frostbolt');
    const second = await resolveSkill('Frostbolt');

    expect(first.status).toBe('verified');
    expect(second.status).toBe('verified');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses verified unique snapshot fallback when external lookup is unavailable', async () => {
    fetchMock.mockRejectedValue(new Error('network blocked'));

    const result = await resolveUniqueItem('The Everlasting Gaze');

    expect(result.status).toBe('fallback_verified');
    expect(result.sources[0].provider).toBe('local_snapshot');
  });

  it('returns not_found when both official providers respond with 404-like payloads', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        url: 'https://poe2db.tw/us/UnknownTerm',
        text: async () => '<html><body>not found</body></html>',
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        url: 'https://www.poe2wiki.net/wiki/UnknownTerm',
        text: async () => '<html><body>not found</body></html>',
      });

    const result = await resolveSkill('UnknownTerm');

    expect(result.status).toBe('not_found');
  });

  it('returns source_unavailable when official providers are unreachable', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('network timeout 1'))
      .mockRejectedValueOnce(new Error('network timeout 2'));

    const result = await resolveSkill('Frostbolt');

    expect(result.status).toBe('source_unavailable');
    expect(result.sourceUnavailable).toBe(true);
  });
});
