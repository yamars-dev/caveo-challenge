import cors from '@koa/cors';

/**
 * CORS middleware configuration
 * Allows cross-origin requests from specified origins
 */
export const corsMiddleware = cors({
  origin: (ctx) => {
    // Parse configured origins, trim whitespace and ignore empty entries
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    const origin = ctx.header.origin;

    // In production, be strict: only return the origin when it's explicitly allowed.
    // Returning `null` tells the CORS middleware to deny the request origin.
    if (process.env.NODE_ENV === 'production') {
      if (!origin) return '';
      if (allowedOrigins.includes('*')) return origin; // wildcard
      return allowedOrigins.includes(origin) ? origin : '';
    }

    // Development: allow localhost fallback so local UI works without extra config.
    if (!origin) return 'http://localhost:3000';
    if (allowedOrigins.includes('*')) return origin;
    return allowedOrigins.includes(origin) ? origin : 'http://localhost:3000';
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
  maxAge: 86400, // 24 hours
});
