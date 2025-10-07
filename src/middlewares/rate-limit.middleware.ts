import rateLimit from 'koa-ratelimit';
import { Context, Next } from 'koa';

/**
 * Global rate limiter - 100 requests per minute
 */
const rateLimitMap = new Map();
export const globalRateLimiter = rateLimit({
  driver: 'memory',
  db: rateLimitMap,
  duration: 60000, // 1 minute
  errorMessage: 'Rate limit exceeded. Please try again later.',
  id: (ctx) => ctx.ip,
  headers: {
    remaining: 'Rate-Limit-Remaining',
    reset: 'Rate-Limit-Reset',
    total: 'Rate-Limit-Total',
  },
  max: 100, // 100 requests per minute
  disableHeader: false,
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks - 5 attempts per 15 minutes
 */
const authRateLimitMap = new Map();
const authRateLimiter = rateLimit({
  driver: 'memory',
  db: authRateLimitMap,
  duration: 900000, // 15 minutes
  errorMessage: 'Too many authentication attempts. Please try again in 15 minutes.',
  id: (ctx) => {
    // Rate limit by IP + email combination to prevent distributed attacks
    const body = ctx.request.body as any;
    const email = body?.email || '';
    return `${ctx.ip}:${email}`;
  },
  headers: {
    remaining: 'Rate-Limit-Remaining',
    reset: 'Rate-Limit-Reset',
    total: 'Rate-Limit-Total',
  },
  max: 5, // Only 5 attempts per 15 minutes
  disableHeader: false,
});

/**
 * Conditional rate limiter middleware
 * Applies strict rate limiting to authentication endpoints
 */
export const authRateLimitMiddleware = async (ctx: Context, next: Next) => {
  if (ctx.path === '/api/auth' && ctx.method === 'POST') {
    return authRateLimiter(ctx, next);
  }
  await next();
};
