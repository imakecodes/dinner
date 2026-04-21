describe('scripts/validate-env', () => {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalProcessExit = process.exit;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    process.exit = jest.fn() as any;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    process.exit = originalProcessExit;
  });

  it('should validate environment variables successfully', async () => {
    // Mock das environment variables
    process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
    process.env.JWT_SECRET = 'a-very-long-secret-key-with-at-least-32-characters';
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.NODE_ENV = 'development';

    // Executar o script
    await import('@/scripts/validate-env');

    // Verificar logs de sucesso
    expect(console.log).toHaveBeenCalledWith('🔍 Validando environment variables...');
    expect(console.log).toHaveBeenCalledWith('✅ Environment variables válidas!');
    expect(console.log).toHaveBeenCalledWith('📊 Resumo:');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Ambiente: development'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('JWT Secret: Configurado'));
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('should warn about default JWT_SECRET in development', async () => {
    process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
    process.env.JWT_SECRET = 'fallback_secret_key_change_me';
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.NODE_ENV = 'development';

    await import('@/scripts/validate-env');

    expect(console.log).toHaveBeenCalledWith('✅ Environment variables válidas!');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('JWT Secret: ⚠️  USANDO VALOR PADRÃO!'));
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('should fail with default JWT_SECRET in production', async () => {
    process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
    process.env.JWT_SECRET = 'fallback_secret_key_change_me';
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.NODE_ENV = 'production';

    await import('@/scripts/validate-env');

    expect(console.error).toHaveBeenCalledWith(
      '❌ ERRO CRÍTICO: JWT_SECRET não pode ser o valor padrão em produção!'
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should warn about missing GEMINI_API_KEY in production', async () => {
    process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
    process.env.JWT_SECRET = 'custom-production-secret-with-more-than-32-chars';
    delete process.env.GEMINI_API_KEY;
    process.env.NODE_ENV = 'production';

    await import('@/scripts/validate-env');

    expect(console.warn).toHaveBeenCalledWith(
      '⚠️  AVISO: GEMINI_API_KEY não está definida. A geração de builds não funcionará.'
    );
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('should warn about missing SMTP_PASSWORD in production', async () => {
    process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
    process.env.JWT_SECRET = 'custom-production-secret-with-more-than-32-chars';
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    delete process.env.SMTP_PASSWORD;
    process.env.NODE_ENV = 'production';

    await import('@/scripts/validate-env');

    expect(console.warn).toHaveBeenCalledWith(
      '⚠️  AVISO: SMTP_PASSWORD não está definida. Emails não serão enviados.'
    );
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('should handle validation errors gracefully', async () => {
    // Missing required variables
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;
    delete process.env.GEMINI_API_KEY;

    await import('@/scripts/validate-env');

    expect(console.error).toHaveBeenCalledWith('❌ Falha na validação das environment variables:');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should show summary of configuration', async () => {
    process.env.DATABASE_URL = 'mysql://user:pass@localhost:3306/db';
    process.env.JWT_SECRET = 'custom-secret-123456789012345678901234567890';
    process.env.GEMINI_API_KEY = 'gemini-key-123';
    process.env.SMTP_PASSWORD = 'smtp-pass';
    process.env.NODE_ENV = 'production';

    await import('@/scripts/validate-env');

    // Verificar resumo
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Ambiente: production'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Database: Configurado'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('JWT Secret: Configurado'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Gemini API: Configurado'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('SMTP: Configurado'));
  });
});