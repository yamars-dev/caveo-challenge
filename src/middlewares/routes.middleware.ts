import { Context, Next } from 'koa';
import { koaSwagger } from 'koa2-swagger-ui';
import { swaggerSpec } from '../config/swagger.js';
import { AppDataSource } from '../entities/index.js';

/**
 * Swagger UI middleware
 * Serves interactive API documentation at /docs
 */
export const swaggerUIMiddleware = koaSwagger({
  routePrefix: '/docs',
  swaggerOptions: {
    spec: swaggerSpec as any,
  },
});

/**
 * OpenAPI JSON spec endpoint
 * Serves raw OpenAPI specification at /api-docs.json
 */
export const apiDocsMiddleware = async (ctx: Context, next: Next) => {
  if (ctx.path === '/api-docs.json') {
    ctx.body = swaggerSpec;
    ctx.type = 'application/json';
    return;
  }
  await next();
};

/**
 * Health check endpoint
 * Returns server status, timestamp and uptime at /health
 */
export const healthCheckMiddleware = async (ctx: Context, next: Next) => {
  if (ctx.path === '/health') {
    ctx.body = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
    ctx.status = 200;
    return;
  }
  await next();
};

/**
 * Readiness endpoint
 * Returns 200 when application dependencies are ready (DB initialized), 503 otherwise
 */
export const readinessMiddleware = async (ctx: Context, next: Next) => {
  if (ctx.path === '/ready') {
    const dbReady = AppDataSource.isInitialized;

    ctx.body = {
      status: dbReady ? 'ok' : 'unavailable',
      db: dbReady ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };

    ctx.status = dbReady ? 200 : 503;
    return;
  }

  await next();
};
