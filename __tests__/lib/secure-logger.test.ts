describe('lib/secure-logger', () => {
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;
  const originalConsoleDebug = console.debug;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    // Mock console methods
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
    console.debug = jest.fn();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    console.debug = originalConsoleDebug;
  });

  describe('redactSensitiveInfo', () => {
    it('should redact JWT tokens', async () => {
      const { redactSensitiveInfo } = await import('@/lib/secure-logger');
      
      const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const redacted = redactSensitiveInfo(`Token: ${jwt}`);
      
      expect(redacted).toBe('Token: [REDACTED]');
    });

    it('should redact Google API keys', async () => {
      const { redactSensitiveInfo } = await import('@/lib/secure-logger');
      
      const apiKey = 'AIzaSyD_abcdefghijklmnopqrstuvwxyz1234567890';
      const redacted = redactSensitiveInfo(`API Key: ${apiKey}`);
      
      expect(redacted).toBe('API Key: [REDACTED]');
    });

    it('should redact OpenAI keys', async () => {
      const { redactSensitiveInfo } = await import('@/lib/secure-logger');
      
      const apiKey = 'sk-abcdefghijklmnopqrstuvwxyz123456789012345678901234';
      const redacted = redactSensitiveInfo(`OpenAI Key: ${apiKey}`);
      
      expect(redacted).toBe('OpenAI Key: [REDACTED]');
    });

    it('should redact Gemini keys', async () => {
      const { redactSensitiveInfo } = await import('@/lib/secure-logger');
      
      const apiKey = 'GEMINI_ABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890';
      const redacted = redactSensitiveInfo(`Gemini Key: ${apiKey}`);
      
      expect(redacted).toBe('Gemini Key: [REDACTED]');
    });

    it('should redact passwords in logs', async () => {
      const { redactSensitiveInfo } = await import('@/lib/secure-logger');
      
      const log = 'password: "super_secret_password123"';
      const redacted = redactSensitiveInfo(log);
      
      expect(redacted).toContain('[REDACTED]');
      expect(redacted).not.toContain('super_secret_password123');
    });

    it('should redact database URLs with credentials', async () => {
      const { redactSensitiveInfo } = await import('@/lib/secure-logger');
      
      const dbUrl = 'mysql://username:password@localhost:3306/database';
      const redacted = redactSensitiveInfo(`Database: ${dbUrl}`);
      
      expect(redacted).toBe('Database: mysql://[REDACTED]@localhost:3306/database');
    });

    it('should redact emails preserving domain', async () => {
      const { redactSensitiveInfo } = await import('@/lib/secure-logger');
      
      const email = 'user@example.com';
      const redacted = redactSensitiveInfo(`Email: ${email}`);
      
      expect(redacted).toBe('Email: ***@example.com');
    });

    it('should redact phone numbers', async () => {
      const { redactSensitiveInfo } = await import('@/lib/secure-logger');
      
      const phone = '+55 (11) 99999-9999';
      const redacted = redactSensitiveInfo(`Phone: ${phone}`);
      
      expect(redacted).toContain('[REDACTED_PHONE:');
      expect(redacted).toContain('9999');
    });

    it('should handle null or undefined input', async () => {
      const { redactSensitiveInfo } = await import('@/lib/secure-logger');
      
      expect(redactSensitiveInfo(null as any)).toBe('');
      expect(redactSensitiveInfo(undefined as any)).toBe('');
      expect(redactSensitiveInfo('')).toBe('');
    });
  });

  describe('SecureLogger class', () => {
    it('should create logger with context', async () => {
      const { SecureLogger } = await import('@/lib/secure-logger');
      
      const logger = new SecureLogger('TestModule');
      logger.info('Test message');
      
      expect(console.log).toHaveBeenCalled();
      const logMessage = (console.log as jest.Mock).mock.calls[0][0];
      expect(logMessage).toContain('[TestModule]');
      expect(logMessage).toContain('[INFO]');
    });

    it('should log info messages', async () => {
      const { SecureLogger } = await import('@/lib/secure-logger');
      
      const logger = new SecureLogger('Test');
      logger.info('Information message', { key: 'value' });
      
      expect(console.log).toHaveBeenCalled();
    });

    it('should log warn messages', async () => {
      const { SecureLogger } = await import('@/lib/secure-logger');
      
      const logger = new SecureLogger('Test');
      logger.warn('Warning message');
      
      expect(console.warn).toHaveBeenCalled();
    });

    it('should log error messages', async () => {
      const { SecureLogger } = await import('@/lib/secure-logger');
      
      const logger = new SecureLogger('Test');
      logger.error('Error message');
      
      expect(console.error).toHaveBeenCalled();
    });

    it('should log debug messages only in development', async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      
      try {
        // Test in development
        process.env.NODE_ENV = 'development';
        jest.resetModules();
        
        const { SecureLogger } = await import('@/lib/secure-logger');
        const logger = new SecureLogger('Test');
        logger.debug('Debug message');
        
        expect(console.debug).toHaveBeenCalled();
        
        // Test in production
        jest.clearAllMocks();
        process.env.NODE_ENV = 'production';
        jest.resetModules();
        
        const { SecureLogger: SecureLoggerProd } = await import('@/lib/secure-logger');
        const loggerProd = new SecureLoggerProd('Test');
        loggerProd.debug('Debug message');
        
        expect(console.debug).not.toHaveBeenCalled();
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    it('should redact sensitive data in logged objects', async () => {
      const { SecureLogger } = await import('@/lib/secure-logger');
      
      const logger = new SecureLogger('Test');
      const sensitiveData = {
        password: 'secret123',
        apiKey: 'AIzaSyD_test_key',
        email: 'user@example.com',
        safeField: 'not sensitive',
      };
      
      logger.info('Testing redaction', sensitiveData);
      
      expect(console.log).toHaveBeenCalled();
      const logMessage = (console.log as jest.Mock).mock.calls[0][0];
      
      // Should redact sensitive fields
      expect(logMessage).toContain('[REDACTED_PASSWORD:');
      expect(logMessage).toContain('[REDACTED]'); // API key
      expect(logMessage).toContain('***@example.com'); // Email
      expect(logMessage).toContain('not sensitive'); // Safe field should remain
      expect(logMessage).not.toContain('secret123');
      expect(logMessage).not.toContain('AIzaSyD_test_key');
    });

    it('should handle nested objects with sensitive data', async () => {
      const { SecureLogger } = await import('@/lib/secure-logger');
      
      const logger = new SecureLogger('Test');
      const nestedData = {
        user: {
          name: 'John',
          credentials: {
            password: 'secret',
            token: 'eyJhbGciOiJ...',
          },
        },
        config: {
          databaseUrl: 'mysql://user:pass@localhost/db',
        },
      };
      
      logger.info('Nested data', nestedData);
      
      expect(console.log).toHaveBeenCalled();
      const logMessage = (console.log as jest.Mock).mock.calls[0][0];
      
      // Should redact nested sensitive data
      expect(logMessage).toContain('[REDACTED_PASSWORD:');
      expect(logMessage).toContain('[REDACTED_TOKEN:');
      expect(logMessage).toContain('mysql://[REDACTED]@localhost/db');
    });
  });