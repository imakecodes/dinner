import { NextRequest, NextResponse } from 'next/server';

// Mock do rate limiter
const mockWithRateLimit = jest.fn();

jest.mock('@/lib/rate-limiter', () => ({
  withRateLimit: mockWithRateLimit,
}));

describe('security middleware', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalConsoleLog = console.log;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockWithRateLimit.mockReturnValue(null);
    console.log = jest.fn();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    console.log = originalConsoleLog;
  });

  it('should apply security headers to non-excluded paths', async () => {
    const { middleware } = await import('@/middleware');
    
    const request = new NextRequest('http://localhost/api/test');
    const response = middleware(request);
    
    // Verificar headers de segurança
    expect(response.headers.get('Content-Security-Policy')).toBeDefined();
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(response.headers.get('Permissions-Policy')).toBeDefined();
    expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    
    // HSTS não deve ser aplicado em desenvolvimento
    expect(response.headers.get('Strict-Transport-Security')).toBeNull();
  });

  it('should not apply security headers to excluded paths', async () => {
    const { middleware } = await import('@/middleware');
    
    const request = new NextRequest('http://localhost/api/healthz');
    const response = middleware(request);
    
    // Headers de segurança não devem ser aplicados
    expect(response.headers.get('Content-Security-Policy')).toBeNull();
    expect(response.headers.get('X-Content-Type-Options')).toBeNull();
    expect(response.headers.get('X-Frame-Options')).toBeNull();
  });

  it('should apply HSTS header in production', async () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    
    const { middleware } = await import('@/middleware');
    
    const request = new NextRequest('http://localhost/api/test');
    const response = middleware(request);
    
    expect(response.headers.get('Strict-Transport-Security')).toBe(
      'max-age=31536000; includeSubDomains; preload'
    );
  });

  it('should apply rate limiting to auth endpoints in production', async () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    
    const { middleware } = await import('@/middleware');
    
    const request = new NextRequest('http://localhost/api/auth/login');
    
    // Configurar mock para retornar resposta de rate limit
    const rateLimitResponse = new Response('Rate limited', { status: 429 });
    mockWithRateLimit.mockReturnValue(rateLimitResponse);
    
    const response = middleware(request);
    
    expect(mockWithRateLimit).toHaveBeenCalledWith(request);
    expect(response.status).toBe(429);
  });

  it('should apply rate limiting to recipe endpoint in production', async () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    
    const { middleware } = await import('@/middleware');
    
    const request = new NextRequest('http://localhost/api/recipe');
    
    // Configurar mock para retornar resposta de rate limit
    const rateLimitResponse = new Response('Rate limited', { status: 429 });
    mockWithRateLimit.mockReturnValue(rateLimitResponse);
    
    const response = middleware(request);
    
    expect(mockWithRateLimit).toHaveBeenCalledWith(request);
    expect(response.status).toBe(429);
  });

  it('should not apply rate limiting in development', async () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    
    const { middleware } = await import('@/middleware');
    
    const request = new NextRequest('http://localhost/api/auth/login');
    const response = middleware(request);
    
    expect(mockWithRateLimit).not.toHaveBeenCalled();
    expect(response.status).not.toBe(429);
  });

  it('should not apply rate limiting to non-critical endpoints', async () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    
    const { middleware } = await import('@/middleware');
    
    const request = new NextRequest('http://localhost/api/non-critical');
    const response = middleware(request);
    
    expect(mockWithRateLimit).not.toHaveBeenCalled();
  });

  it('should log security middleware activity in development', async () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    
    const { middleware } = await import('@/middleware');
    
    const request = new NextRequest('http://localhost/api/test');
    middleware(request);
    
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('[Security Middleware]')
    );
  });

  it('should not log security middleware activity in production', async () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    
    const { middleware } = await import('@/middleware');
    
    const request = new NextRequest('http://localhost/api/test');
    middleware(request);
    
    expect(console.log).not.toHaveBeenCalled();
  });

  describe('excluded paths', () => {
    it('should exclude /api/healthz', async () => {
      const { middleware } = await import('@/middleware');
      
      const request = new NextRequest('http://localhost/api/healthz');
      const response = middleware(request);
      
      expect(response.headers.get('Content-Security-Policy')).toBeNull();
    });

    it('should exclude /_next/static paths', async () => {
      const { middleware } = await import('@/middleware');
      
      const request = new NextRequest('http://localhost/_next/static/file.js');
      const response = middleware(request);
      
      expect(response.headers.get('Content-Security-Policy')).toBeNull();
    });

    it('should exclude /_next/image paths', async () => {
      const { middleware } = await import('@/middleware');
      
      const request = new NextRequest('http://localhost/_next/image?url=test.jpg');
      const response = middleware(request);
      
      expect(response.headers.get('Content-Security-Policy')).toBeNull();
    });

    it('should exclude /favicon.ico', async () => {
      const { middleware } = await import('@/middleware');
      
      const request = new NextRequest('http://localhost/favicon.ico');
      const response = middleware(request);
      
      expect(response.headers.get('Content-Security-Policy')).toBeNull();
    });
  });

  describe('config matcher', () => {
    it('should have correct matcher configuration', async () => {
      const { config } = await import('@/middleware');
      
      expect(config).toBeDefined();
      expect(config.matcher).toBeDefined();
      expect(Array.isArray(config.matcher)).toBe(true);
      
      // Verificar que o matcher exclui paths específicos
      const matcher = config.matcher[0];
      expect(matcher).toContain('_next/static');
      expect(matcher).toContain('_next/image');
      expect(matcher).toContain('favicon.ico');
    });
  });
});