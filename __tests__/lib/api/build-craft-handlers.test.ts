import { NextRequest } from 'next/server';
import { craftBuild } from '@/lib/api/build-craft-handlers';

const craftBuildWithAIMock = jest.fn();
const normalizeBuildSessionContextMock = jest.fn();
const serializeBuildPayloadMock = jest.fn();
const tMock = jest.fn();

jest.mock('@/services/geminiService', () => ({
  craftBuildWithAI: (...args: unknown[]) => craftBuildWithAIMock(...args),
}));

jest.mock('@/lib/build-contract', () => ({
  normalizeBuildSessionContext: (...args: unknown[]) => normalizeBuildSessionContextMock(...args),
  serializeBuildPayload: (...args: unknown[]) => serializeBuildPayloadMock(...args),
}));

jest.mock('@/lib/i18n-server', () => ({
  getServerTranslator: () => ({ t: (...args: unknown[]) => tMock(...args) }),
}));

describe('lib/api/build-craft-handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    normalizeBuildSessionContextMock.mockImplementation((value: unknown) => value);
    serializeBuildPayloadMock.mockImplementation((value: unknown) => value);
    tMock.mockImplementation((key: string) => {
      if (key === 'api.geminiDomainMismatch') return 'Domain mismatch';
      if (key === 'api.geminiFactConflict') return 'Fact conflict';
      if (key === 'api.geminiModelUnavailable') return 'Model unavailable';
      if (key === 'generate.generateError') return 'Failed to craft build';
      if (key === 'api.internalError') return 'Internal error';
      return key;
    });
  });

  it('returns serialized build for canonical shape', async () => {
    const aiResult = { build_title: 'Arc Mapper' };
    craftBuildWithAIMock.mockResolvedValue(aiResult);
    serializeBuildPayloadMock.mockReturnValue({ ok: true, source: aiResult });

    const req = new NextRequest('http://localhost/api/build', {
      method: 'POST',
      body: JSON.stringify({
        members: [{ id: 'm1' }],
        context: { build_archetype: 'mapper', language: 'pt-BR' },
      }),
    });

    const res = await craftBuild(req, 'canonical');
    const json = await res.json();

    expect(craftBuildWithAIMock).toHaveBeenCalledWith(
      [{ id: 'm1' }],
      expect.objectContaining({ build_archetype: 'mapper', language: 'pt-BR' }),
    );
    expect(serializeBuildPayloadMock).toHaveBeenCalledWith(aiResult, 'canonical');
    expect(json).toEqual({ ok: true, source: aiResult });
  });

  it('uses party_members fallback and body-level context fallback', async () => {
    craftBuildWithAIMock.mockResolvedValue({ build_title: 'RF Bossing' });

    const req = new NextRequest('http://localhost/api/build', {
      method: 'POST',
      body: JSON.stringify({
        party_members: [{ id: 'legacy-member' }],
        requested_archetype: 'bossing',
      }),
    });

    await craftBuild(req, 'legacy');

    expect(craftBuildWithAIMock).toHaveBeenCalledWith(
      [{ id: 'legacy-member' }],
      expect.objectContaining({ requested_archetype: 'bossing' }),
    );
    expect(serializeBuildPayloadMock).toHaveBeenCalledWith(
      expect.objectContaining({ build_title: 'RF Bossing' }),
      'legacy',
    );
  });

  it('returns localized 422 for domain mismatch with details', async () => {
    craftBuildWithAIMock.mockRejectedValue({
      status: 422,
      code: 'gemini.domain_mismatch',
      details: ['recipe', 'chicken'],
    });

    const req = new NextRequest('http://localhost/api/build', {
      method: 'POST',
      body: JSON.stringify({ members: [] }),
    });
    const res = await craftBuild(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json).toEqual({
      error: 'Domain mismatch',
      code: 'gemini.domain_mismatch',
      details: ['recipe', 'chicken'],
    });
  });

  it('includes optional mismatch reason when provided by service', async () => {
    craftBuildWithAIMock.mockRejectedValue({
      status: 422,
      code: 'gemini.domain_mismatch',
      details: ['watchstone', 'sextant'],
      reason: 'poe1_drift',
    });

    const req = new NextRequest('http://localhost/api/build', {
      method: 'POST',
      body: JSON.stringify({ members: [] }),
    });
    const res = await craftBuild(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json).toEqual({
      error: 'Domain mismatch',
      code: 'gemini.domain_mismatch',
      details: ['watchstone', 'sextant'],
      reason: 'poe1_drift',
    });
  });

  it('filters members by normalized party_member_ids before calling AI', async () => {
    const normalizedContext = {
      party_member_ids: ['m2'],
      requested_archetype: 'mapper',
      language: 'en',
    };
    normalizeBuildSessionContextMock.mockReturnValue(normalizedContext);
    craftBuildWithAIMock.mockResolvedValue({ build_title: 'Filtered Build' });

    const req = new NextRequest('http://localhost/api/build', {
      method: 'POST',
      body: JSON.stringify({
        members: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }],
        context: { requested_archetype: 'mapper' },
      }),
    });

    await craftBuild(req, 'canonical');

    expect(craftBuildWithAIMock).toHaveBeenCalledWith(
      [{ id: 'm2' }],
      normalizedContext,
    );
  });

  it('falls back to generate error text when domain mismatch translation is missing', async () => {
    tMock.mockImplementation((key: string) => {
      if (key === 'api.geminiDomainMismatch') return 'api.geminiDomainMismatch';
      if (key === 'generate.generateError') return 'Fallback message';
      return key;
    });
    craftBuildWithAIMock.mockRejectedValue({ status: 422, code: 'gemini.domain_mismatch' });

    const req = new NextRequest('http://localhost/api/build', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await craftBuild(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error).toBe('Fallback message');
    expect(json.details).toEqual([]);
  });

  it('returns localized 422 for fact conflict with structured details', async () => {
    craftBuildWithAIMock.mockRejectedValue({
      status: 422,
      code: 'gemini.fact_conflict',
      details: [
        {
          claim: 'Convert Frostbolt damage to fire',
          expected: 'Explicit conversion enabler listed in build_items or gear_gems.',
          found: 'No explicit enabler found for offensive conversion claim.',
          subject: 'infernalist:frostbolt_conversion',
          sources: [],
        },
      ],
    });

    const req = new NextRequest('http://localhost/api/build', {
      method: 'POST',
      body: JSON.stringify({ members: [] }),
    });
    const res = await craftBuild(req);
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json).toEqual({
      error: 'Fact conflict',
      code: 'gemini.fact_conflict',
      details: [
        {
          claim: 'Convert Frostbolt damage to fire',
          expected: 'Explicit conversion enabler listed in build_items or gear_gems.',
          found: 'No explicit enabler found for offensive conversion claim.',
          subject: 'infernalist:frostbolt_conversion',
          sources: [],
        },
      ],
    });
  });

  it('returns 429 with Retry-After when quota exceeded includes retryAfterSeconds', async () => {
    craftBuildWithAIMock.mockRejectedValue({
      status: 429,
      code: 'gemini.quota_exceeded',
      retryAfterSeconds: 29.2,
    });

    const req = new NextRequest('http://localhost/api/build', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await craftBuild(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('30');
    expect(json).toEqual({
      error: 'Failed to craft build',
      code: 'gemini.quota_exceeded',
      retryAfterSeconds: 30,
    });
  });

  it('returns 429 without Retry-After when retryAfterSeconds is invalid', async () => {
    craftBuildWithAIMock.mockRejectedValue({
      status: 429,
      code: 'gemini.quota_exceeded',
      retryAfterSeconds: 'nope',
    });

    const req = new NextRequest('http://localhost/api/build', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await craftBuild(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeNull();
    expect(json.retryAfterSeconds).toBeNull();
  });

  it('returns 503 with localized message for unavailable model chain', async () => {
    craftBuildWithAIMock.mockRejectedValue({
      status: 503,
      code: 'gemini.model_unavailable',
      details: [{ model: 'gemini-3-flash', reason: 'model_not_found', status: 404 }],
    });

    const req = new NextRequest('http://localhost/api/build', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await craftBuild(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json).toEqual({
      error: 'Model unavailable',
      code: 'gemini.model_unavailable',
      details: [{ model: 'gemini-3-flash', reason: 'model_not_found', status: 404 }],
    });
  });

  it('returns 500 for unknown errors', async () => {
    craftBuildWithAIMock.mockRejectedValue(new Error('boom'));

    const req = new NextRequest('http://localhost/api/build', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await craftBuild(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json).toEqual({ error: 'Internal error' });
  });
});
