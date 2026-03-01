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
      .mockRejectedValueOnce(new Error('poe2db retry failed'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        url: 'https://www.poe2wiki.net/wiki/Frostbolt',
        text: async () => '<html><body>Frostbolt deals cold damage in Path of Exile 2.</body></html>',
      });

    const result = await resolveSkill('Frostbolt');

    expect(result.status).toBe('verified');
    expect(result.sources[0].provider).toBe('poe2wiki');
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
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('uses verified unique snapshot fallback when external lookup is unavailable', async () => {
    fetchMock.mockRejectedValue(new Error('network blocked'));

    const result = await resolveUniqueItem('The Everlasting Gaze');

    expect(result.status).toBe('fallback_verified');
    expect(result.sources[0].provider).toBe('local_snapshot');
  });
});
