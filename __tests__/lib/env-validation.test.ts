import { z } from 'zod';

// Mock do logger
const loggerInfoMock = jest.fn();
const loggerDebugMock = jest.fn();
const loggerErrorMock = jest.fn();

jest.mock('@/lib/secure-logger', () => ({
  logger: {
    info: loggerInfoMock,
    debug: loggerDebugMock,
    error: loggerErrorMock,
  },
}));

describe('lib/env-validation', () => {
  const originalEnv = process.env;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('getValidatedEnv', () => {
    it('should validate environment variables successfully', async () => {
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
      process.env.JWT_SECRET = 'a-very-long-secret-key-with-at-least-32-characters';
      process.env.GEMINI_API_KEY = 'test-gemini-key';
      process.env.NODE_ENV = 'development';

      const { getValidatedEnv } = await import('@/lib/env-validation');
      const env = getValidatedEnv();

      expect(env.DATABASE_URL).toBe('mysql://user:pass@localhost:3306/db');
      expect(env.JWT_SECRET).toBe('a-very-long-secret-key-with-at-least-32-characters');
      expect(env.GEMINI_API_KEY).toBe('test-gemini-key');
      expect(env.NODE_ENV).toBe('development');
      expect(env.APP_PORT).toBe(3000);
    });

    it('should throw error when required variables are missing', async () => {
      delete process.env.DATABASE_URL;
      delete process.env.JWT_SECRET;
      delete process.env.GEMINI_API_KEY;

      const { getValidatedEnv } = await import('@/lib/env-validation');

      expect(() => getValidatedEnv()).toThrow(z.ZodError);
      expect(loggerErrorMock).toHaveBeenCalled();
    });

    it('should use default values when optional variables are not set', async () => {
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
      process.env.JWT_SECRET = 'a-very-long-secret-key-with-at-least-32-characters';
      process.env.GEMINI_API_KEY = 'test-gemini-key';

      const { getValidatedEnv } = await import('@/lib/env-validation');
      const env = getValidatedEnv();

      expect(env.NODE_ENV).toBe('development');
      expect(env.SMTP_HOST).toBe('smtp.resend.com');
      expect(env.SMTP_PORT).toBe(465);
      expect(env.GEMINI_MODEL_PRIMARY).toBe('gemini-3-pro-preview');
    });

    it('should cache validated config', async () => {
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
      process.env.JWT_SECRET = 'a-very-long-secret-key-with-at-least-32-characters';
      process.env.GEMINI_API_KEY = 'test-gemini-key';

      const { getValidatedEnv } = await import('@/lib/env-validation');
      
      // First call
      const env1 = getValidatedEnv();
      // Second call should return cached
      const env2 = getValidatedEnv();

      expect(env1).toBe(env2);
    });
  });

  describe('validateProductionConfig', () => {
    it('should not throw when JWT_SECRET is custom in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
      process.env.JWT_SECRET = 'custom-production-secret-with-more-than-32-chars';
      process.env.GEMINI_API_KEY = 'test-gemini-key';

      const { validateProductionConfig, getValidatedEnv } = await import('@/lib/env-validation');
      
      // Primeiro precisamos validar o env
      getValidatedEnv();
      
      // Não deve lançar erro
      expect(() => validateProductionConfig()).not.toThrow();
    });

    it('should throw when JWT_SECRET is default in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
      process.env.JWT_SECRET = 'fallback_secret_key_change_me';
      process.env.GEMINI_API_KEY = 'test-gemini-key';

      const { validateProductionConfig, getValidatedEnv } = await import('@/lib/env-validation');
      
      // Primeiro precisamos validar o env
      getValidatedEnv();
      
      // Deve lançar erro
      expect(() => validateProductionConfig()).toThrow(
        'Configuração de produção inválida: JWT_SECRET não pode ser o valor padrão em produção'
      );
    });

    it('should not validate in non-production environments', async () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
      process.env.JWT_SECRET = 'fallback_secret_key_change_me';
      process.env.GEMINI_API_KEY = 'test-gemini-key';

      const { validateProductionConfig, getValidatedEnv } = await import('@/lib/env-validation');
      
      // Primeiro precisamos validar o env
      getValidatedEnv();
      
      // Não deve lançar erro em desenvolvimento
      expect(() => validateProductionConfig()).not.toThrow();
    });
  });

  describe('initializeEnvValidation', () => {
    it('should initialize and log success in development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
      process.env.JWT_SECRET = 'a-very-long-secret-key-with-at-least-32-characters';
      process.env.GEMINI_API_KEY = 'test-gemini-key';

      const { initializeEnvValidation } = await import('@/lib/env-validation');
      const env = initializeEnvValidation();

      expect(env.NODE_ENV).toBe('development');
      expect(loggerInfoMock).toHaveBeenCalledWith('Validando environment variables...');
      expect(loggerInfoMock).toHaveBeenCalledWith('Environment variables validadas com sucesso');
      expect(loggerDebugMock).toHaveBeenCalled();
    });

    it('should initialize and validate production config', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
      process.env.JWT_SECRET = 'custom-production-secret-with-more-than-32-chars';
      process.env.GEMINI_API_KEY = 'test-gemini-key';

      const { initializeEnvValidation } = await import('@/lib/env-validation');
      const env = initializeEnvValidation();

      expect(env.NODE_ENV).toBe('production');
      expect(loggerInfoMock).toHaveBeenCalledWith('Validando environment variables...');
      expect(loggerInfoMock).toHaveBeenCalledWith('Environment variables de produção validadas com sucesso');
    });

    it('should throw when production validation fails', async () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
      process.env.JWT_SECRET = 'fallback_secret_key_change_me';
      process.env.GEMINI_API_KEY = 'test-gemini-key';

      const { initializeEnvValidation } = await import('@/lib/env-validation');

      expect(() => initializeEnvValidation()).toThrow(
        'Configuração de produção inválida: JWT_SECRET não pode ser o valor padrão em produção'
      );
    });
  });

  describe('env export', () => {
    it('should export validated env', async () => {
      process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
      process.env.JWT_SECRET = 'a-very-long-secret-key-with-at-least-32-characters';
      process.env.GEMINI_API_KEY = 'test-gemini-key';

      const { env } = await import('@/lib/env-validation');

      expect(env.DATABASE_URL).toBe('mysql://user:pass@localhost:3306/db');
      expect(env.JWT_SECRET).toBe('a-very-long-secret-key-with-at-least-32-characters');
      expect(env.GEMINI_API_KEY).toBe('test-gemini-key');
    });
  });
});