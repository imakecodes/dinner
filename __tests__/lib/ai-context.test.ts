jest.mock('fs/promises', () => ({
  readFile: jest.fn()
}));

describe('ai-context helper', () => {
  let readFileMock: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.AI_CONTEXT_FILE_PATH;
    readFileMock = require('fs/promises').readFile as jest.Mock;
  });

  it('returns configured local context content when available', async () => {
    readFileMock.mockResolvedValue('  local context  ');

    const { getLocalAiContext } = require('@/lib/ai-context');
    const result = await getLocalAiContext();

    expect(result).toBe('local context');
    expect(readFileMock).toHaveBeenCalledWith(
      expect.stringMatching(/\.ai[\\/]ai-context\.local\.md$/),
      'utf8'
    );
  });

  it('falls back to template when local file is missing and no explicit path is set', async () => {
    readFileMock.mockImplementation((filePath: string) => {
      if (/ai-context\.local\.md$/.test(filePath)) {
        return Promise.reject(Object.assign(new Error('Missing local context'), { code: 'ENOENT' }));
      }
      if (/ai-context\.template\.md$/.test(filePath)) {
        return Promise.resolve('template context');
      }
      return Promise.reject(new Error(`Unexpected path: ${filePath}`));
    });

    const { getLocalAiContext } = require('@/lib/ai-context');
    const result = await getLocalAiContext();

    expect(result).toBe('template context');
  });

  it('falls back to template when AI_CONTEXT_FILE_PATH points to a missing file', async () => {
    process.env.AI_CONTEXT_FILE_PATH = 'config/custom-context.md';
    readFileMock.mockImplementation((filePath: string) => {
      if (/config[\\/]custom-context\.md$/.test(filePath)) {
        return Promise.reject(Object.assign(new Error('Missing custom context'), { code: 'ENOENT' }));
      }
      if (/ai-context\.template\.md$/.test(filePath)) {
        return Promise.resolve('template fallback');
      }
      return Promise.reject(new Error(`Unexpected path: ${filePath}`));
    });

    const { getLocalAiContext } = require('@/lib/ai-context');
    const result = await getLocalAiContext();

    expect(result).toBe('template fallback');
  });

  it('uses AI_CONTEXT_FILE_PATH content when provided and available', async () => {
    process.env.AI_CONTEXT_FILE_PATH = 'config/custom-context.md';
    readFileMock.mockImplementation((filePath: string) => {
      if (/config[\\/]custom-context\.md$/.test(filePath)) {
        return Promise.resolve('custom context');
      }
      return Promise.reject(new Error(`Unexpected path: ${filePath}`));
    });

    const { getLocalAiContext } = require('@/lib/ai-context');
    const result = await getLocalAiContext();

    expect(result).toBe('custom context');
  });

  it('returns empty string and warns when configured context read fails with non-ENOENT error', async () => {
    process.env.AI_CONTEXT_FILE_PATH = 'config/custom-context.md';
    const readError = Object.assign(new Error('Permission denied'), { code: 'EACCES' });
    readFileMock.mockImplementation((filePath: string) => {
      if (/config[\\/]custom-context\.md$/.test(filePath)) {
        return Promise.reject(readError);
      }
      if (/ai-context\.template\.md$/.test(filePath)) {
        return Promise.reject(Object.assign(new Error('Template missing'), { code: 'ENOENT' }));
      }
      return Promise.reject(new Error(`Unexpected path: ${filePath}`));
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { getLocalAiContext } = require('@/lib/ai-context');
    const result = await getLocalAiContext();

    expect(result).toBe('');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[AI Context] Failed to read local context file'),
      readError
    );
    warnSpy.mockRestore();
  });
});
