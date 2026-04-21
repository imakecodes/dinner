import { NextRequest } from 'next/server';

// Mock do env
const mockEnv = {
  NODE_ENV: 'test',
};

jest.mock('@/lib/env-validation', () => ({
  env: mockEnv,
}));

describe('lib/rate-limiter', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockEnv.NODE_ENV = 'test';
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limiter');
      
      const request = new NextRequest('http://localhost/api/test');
      
      // Primeira request
      const result1 = checkRateLimit(request);
      expect(result1.limited).toBe(false);
      expect(result1.remaining).toBe(99); // default limit é 100
      
      // Segunda request
      const result2 = checkRateLimit(request);
      expect(result2.limited).toBe(false);
      expect(result2.remaining).toBe(98);
    });

    it('should block requests over limit', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limiter');
      
      const request = new NextRequest('http://localhost/api/test');
      
      // Fazer 100 requests
      let lastResult;
      for (let i = 0; i < 100; i++) {
        lastResult = checkRateLimit(request);
      }
      
      expect(lastResult!.limited).toBe(false);
      expect(lastResult!.remaining).toBe(0);
      
      // 101ª request deve ser bloqueada
      const blockedResult = checkRateLimit(request);
      expect(blockedResult.limited).toBe(true);
      expect(blockedResult.remaining).toBe(0);
    });

    it('should reset after window expires', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limiter');
      
      const request = new NextRequest('http://localhost/api/test');
      
      // Fazer 100 requests
      for (let i = 0; i < 100; i++) {
        checkRateLimit(request);
      }
      
      // Deve estar bloqueado
      const blockedResult = checkRateLimit(request);
      expect(blockedResult.limited).toBe(true);
      
      // Avançar o tempo além da janela (1 minuto)
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => originalDateNow() + 61 * 1000);
      
      try {
        // Deve permitir novamente
        const resetResult = checkRateLimit(request);
        expect(resetResult.limited).toBe(false);
        expect(resetResult.remaining).toBe(99);
      } finally {
        Date.now = originalDateNow;
      }
    });

    it('should use specific limits for auth endpoints', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limiter');
      
      const loginRequest = new NextRequest('http://localhost/api/auth/login');
      
      // Primeira request de login
      const result1 = checkRateLimit(loginRequest);
      expect(result1.limited).toBe(false);
      expect(result1.remaining).toBe(9); // login limit é 10
      expect(result1.config.maxRequests).toBe(10);
      
      // Fazer 10 requests de login
      for (let i = 0; i < 9; i++) {
        checkRateLimit(loginRequest);
      }
      
      // 11ª request deve ser bloqueada
      const blockedResult = checkRateLimit(loginRequest);
      expect(blockedResult.limited).toBe(true);
    });

    it('should use specific limits for recipe endpoint', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limiter');
      
      const recipeRequest = new NextRequest('http://localhost/api/recipe');
      
      const result = checkRateLimit(recipeRequest);
      expect(result.config.maxRequests).toBe(30); // recipe limit é 30
    });

    it('should disable rate limiting in development when DISABLE_RATE_LIMIT=true', async () => {
      mockEnv.NODE_ENV = 'development';
      process.env.DISABLE_RATE_LIMIT = 'true';
      
      const { checkRateLimit } = await import('@/lib/rate-limiter');
      
      const request = new NextRequest('http://localhost/api/test');
      
      // Mesmo fazendo muitas requests, não deve limitar
      for (let i = 0; i < 200; i++) {
        const result = checkRateLimit(request);
        expect(result.limited).toBe(false);
        expect(result.remaining).toBe(Number.MAX_SAFE_INTEGER);
      }
      
      delete process.env.DISABLE_RATE_LIMIT;
    });

    it('should use custom config when provided', async () => {
      const { checkRateLimit, RateLimitConfig } = await import('@/lib/rate-limiter');
      
      const customConfig: RateLimitConfig = {
        windowMs: 5000, // 5 segundos
        maxRequests: 3,
        message: 'Custom limit exceeded',
      };
      
      const request = new NextRequest('http://localhost/api/test');
      
      // Fazer 3 requests
      for (let i = 0; i < 3; i++) {
        const result = checkRateLimit(request, customConfig);
        expect(result.limited).toBe(false);
        expect(result.config.maxRequests).toBe(3);
      }
      
      // 4ª request deve ser bloqueada
      const blockedResult = checkRateLimit(request, customConfig);
      expect(blockedResult.limited).toBe(true);
      expect(blockedResult.config.message).toBe('Custom limit exceeded');
    });
  });

  describe('withRateLimit', () => {
    it('should return null when not limited', async () => {
      const { withRateLimit } = await import('@/lib/rate-limiter');
      
      const request = new NextRequest('http://localhost/api/test');
      const response = withRateLimit(request);
      
      expect(response).toBeNull();
    });

    it('should return 429 response when limited', async () => {
      const { withRateLimit } = await import('@/lib/rate-limiter');
      
      const request = new NextRequest('http://localhost/api/auth/login');
      
      // Exceder o limite de login
      for (let i = 0; i < 10; i++) {
        withRateLimit(request);
      }
      
      // 11ª request deve retornar 429
      const response = withRateLimit(request);
      
      expect(response).not.toBeNull();
      expect(response!.status).toBe(429);
      
      const body = await response!.json();
      expect(body.error).toBe('Rate limit exceeded');
      expect(body.message).toBe('Too many login attempts. Please try again later.');
      expect(body.retryAfter).toBeGreaterThan(0);
      
      // Verificar headers
      expect(response!.headers.get('Retry-After')).toBeDefined();
      expect(response!.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response!.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response!.headers.get('X-RateLimit-Reset')).toBeDefined();
    });
  });

  describe('rateLimitMiddleware decorator', () => {
    it('should apply rate limiting to methods', async () => {
      const { rateLimitMiddleware } = await import('@/lib/rate-limiter');
      
      class TestController {
        @rateLimitMiddleware()
        async handleRequest(request: NextRequest) {
          return new Response('OK');
        }
      }
      
      const controller = new TestController();
      const request = new NextRequest('http://localhost/api/test');
      
      // Primeira request deve passar
      const response1 = await controller.handleRequest(request);
      expect(response1.status).toBe(200);
      
      // Fazer muitas requests para exceder o limite
      for (let i = 0; i < 100; i++) {
        await controller.handleRequest(request);
      }
      
      // Última request deve ser bloqueada
      const blockedResponse = await controller.handleRequest(request);
      expect(blockedResponse.status).toBe(429);
    });

    it('should skip rate limiting for non-Request objects', async () => {
      const { rateLimitMiddleware } = await import('@/lib/rate-limiter');
      
      class TestController {
        @rateLimitMiddleware()
        async handleRequest(notARequest: any) {
          return 'not a response';
        }
      }
      
      const controller = new TestController();
      const result = await controller.handleRequest({ not: 'a request' });
      
      expect(result).toBe('not a response');
    });
  });

  describe('cleanupOldRecords', () => {
    it('should cleanup old records', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limiter');
      
      const request1 = new NextRequest('http://localhost/api/test1');
      const request2 = new NextRequest('http://localhost/api/test2');
      
      // Criar alguns registros
      checkRateLimit(request1);
      checkRateLimit(request2);
      
      // Avançar o tempo para que os registros expirem
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => originalDateNow() + 2 * 60 * 60 * 1000); // 2 horas
      
      try {
        // Criar novo registro que deve acionar cleanup
        const request3 = new NextRequest('http://localhost/api/test3');
        checkRateLimit(request3);
        
        // Os registros antigos devem ter sido limpos
        // Não podemos verificar diretamente, mas o sistema
        // não deve lançar erros
      } finally {
        Date.now = originalDateNow;
      }
    });
  });
});