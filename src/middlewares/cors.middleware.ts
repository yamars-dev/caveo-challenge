import cors from '@koa/cors';

/**
 * CORS middleware configuration
 * Allows cross-origin requests from specified origins
 */
export const corsMiddleware = cors({
  origin: (ctx) => {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
    const origin = ctx.header.origin;

    if (process.env.NODE_ENV === 'production') {
      // In production, only allow configured origins
      return origin && allowedOrigins.includes(origin) ? origin : '';
    }

    // In development, accept localhost
    return origin && allowedOrigins.includes(origin) ? origin : 'http://localhost:3000';
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
  maxAge: 86400, // 24 hours
});
