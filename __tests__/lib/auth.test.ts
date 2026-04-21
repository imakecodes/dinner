const signMock = jest.fn();
const jwtVerifyMock = jest.fn();
const loggerErrorMock = jest.fn();
const processExitMock = jest.spyOn(process, 'exit').mockImplementation(() => {
  throw new Error('process.exit called');
});

jest.mock('jose', () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: signMock,
  })),
  jwtVerify: jwtVerifyMock,
}));

jest.mock('@/lib/secure-logger', () => ({
  logger: {
    error: loggerErrorMock,
  },
}));

describe('lib/auth', () => {
  const originalEnv = process.env;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'custom-jwt-secret-with-at-least-32-characters-here';
  });

  afterEach(() => {
    process.env = originalEnv;
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  afterAll(() => {
    processExitMock.mockRestore();
  });

  it('signToken builds JWT and returns signed token', async () => {
    signMock.mockResolvedValue('signed-token');
    const { signToken } = await import('@/lib/auth');

    const token = await signToken({ userId: 'u1' });

    expect(token).toBe('signed-token');
    expect(signMock).toHaveBeenCalledWith(expect.anything());
  });

  it('verifyToken returns payload when jwtVerify succeeds', async () => {
    jwtVerifyMock.mockResolvedValue({ payload: { userId: 'u1', kitchenId: 'k1' } });
    const { verifyToken } = await import('@/lib/auth');

    const payload = await verifyToken('valid-token');

    expect(jwtVerifyMock).toHaveBeenCalledWith('valid-token', expect.anything(), {
      algorithms: ['HS256'],
    });
    expect(payload).toEqual({ userId: 'u1', kitchenId: 'k1' });
  });

  it('verifyToken returns null when jwtVerify throws', async () => {
    jwtVerifyMock.mockRejectedValue(new Error('invalid'));
    const { verifyToken } = await import('@/lib/auth');

    const payload = await verifyToken('bad-token');

    expect(payload).toBeNull();
  });

  it('uses JWT_SECRET when present', async () => {
    signMock.mockResolvedValue('signed-token-with-custom-secret');

    const { signToken } = await import('@/lib/auth');
    const token = await signToken({ userId: 'u2' });

    expect(token).toBe('signed-token-with-custom-secret');
    expect(signMock).toHaveBeenCalled();
  });

  describe('production validation', () => {
    it('should exit process when JWT_SECRET is default in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'fallback_secret_key_change_me';

      try {
        await import('@/lib/auth');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('process.exit called');
        expect(loggerErrorMock).toHaveBeenCalledWith('JWT_SECRET não pode ser o valor padrão em produção!');
        expect(loggerErrorMock).toHaveBeenCalledWith('Defina a variável de ambiente JWT_SECRET com um valor seguro.');
        expect(loggerErrorMock).toHaveBeenCalledWith('A aplicação será encerrada por motivos de segurança.');
      }
    });

    it('should not exit when JWT_SECRET is custom in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'custom-secret-with-more-than-32-characters-for-production';

      // Should not throw
      await import('@/lib/auth');
      expect(loggerErrorMock).not.toHaveBeenCalled();
    });

    it('should not validate JWT_SECRET in development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.JWT_SECRET = 'fallback_secret_key_change_me';

      // Should not throw in development
      await import('@/lib/auth');
      expect(loggerErrorMock).not.toHaveBeenCalled();
    });

    it('should not validate JWT_SECRET in test', async () => {
      process.env.NODE_ENV = 'test';
      process.env.JWT_SECRET = 'fallback_secret_key_change_me';

      // Should not throw in test
      await import('@/lib/auth');
      expect(loggerErrorMock).not.toHaveBeenCalled();
    });
  });
});
