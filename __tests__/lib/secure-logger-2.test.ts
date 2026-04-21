describe('lib/secure-logger additional tests', () => {
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

  describe('static methods', () => {
    it('should provide static info method', async () => {
      const { SecureLogger } = await import('@/lib/secure-logger');
      
      SecureLogger.info('StaticTest', 'Static info message');
      
      expect(console.log).toHaveBeenCalled();
      const logMessage = (console.log as jest.Mock).mock.calls[0][0];
      expect(logMessage).toContain('[StaticTest]');
      expect(logMessage).toContain('[INFO]');
    });

    it('should provide static warn method', async () => {
      const { SecureLogger } = await import('@/lib/secure-logger');
      
      SecureLogger.warn('StaticTest', 'Static warn message');
      
      expect(console.warn).toHaveBeenCalled();
    });

    it('should provide static error method', async () => {
      const { SecureLogger } = await import('@/lib/secure-logger');
      
      SecureLogger.error('StaticTest', 'Static error message');
      
      expect(console.error).toHaveBeenCalled();
    });

    it('should provide static debug method', async () => {
      const { SecureLogger } = await import('@/lib/secure-logger');
      
      SecureLogger.debug('StaticTest', 'Static debug message');
      
      expect(console.debug).toHaveBeenCalled();
    });
  });

  describe('helper functions', () => {
    it('should log errors with logError helper', async () => {
      const { logError } = await import('@/lib/secure-logger');
      
      const error = new Error('Test error');
      logError(error, 'ErrorTest');
      
      expect(console.error).toHaveBeenCalled();
      const logMessage = (console.error as jest.Mock).mock.calls[0][0];
      expect(logMessage).toContain('[ErrorTest]');
      expect(logMessage).toContain('Test error');
    });

    it('should log non-Error objects with logError helper', async () => {
      const { logError } = await import('@/lib/secure-logger');
      
      const error = { message: 'Custom error', code: 500 };
      logError(error, 'CustomErrorTest');
      
      expect(console.error).toHaveBeenCalled();
      const logMessage = (console.error as jest.Mock).mock.calls[0][0];
      expect(logMessage).toContain('[CustomErrorTest]');
      expect(logMessage).toContain('Erro não padrão');
    });

    it('should log requests with requestLogger', async () => {
      const { requestLogger } = await import('@/lib/secure-logger');
      
      const request = new Request('http://localhost/api/test?param=value', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'TestAgent',
          'content-type': 'application/json',
        },
      });
      
      requestLogger(request);
      
      expect(console.debug).toHaveBeenCalled();
    });

    it('should log responses with responseLogger', async () => {
      const { responseLogger } = await import('@/lib/secure-logger');
      
      const response = new Response('OK', {
        status: 200,
        statusText: 'OK',
        headers: {
          'content-type': 'application/json',
          'content-length': '2',
        },
      });
      
      responseLogger(response, 150);
      
      expect(console.debug).toHaveBeenCalled();
    });
  });

  describe('default logger export', () => {
    it('should export default logger instance', async () => {
      const { logger } = await import('@/lib/secure-logger');
      
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should use POE2_Genie as default context', async () => {
      const { logger } = await import('@/lib/secure-logger');
      
      logger.info('Test message');
      
      expect(console.log).toHaveBeenCalled();
      const logMessage = (console.log as jest.Mock).mock.calls[0][0];
      expect(logMessage).toContain('[POE2_Genie]');
    });
  });
});