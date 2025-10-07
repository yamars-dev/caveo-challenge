import { Context, Next } from 'koa';
import { logger } from '../helpers/logger.js';
import { wrapLogger } from '../helpers/safe-logger.js';

/**
 * Request logging middleware
 * Logs all requests with timing information
 */
export const loggingMiddleware = async (ctx: Context, next: Next) => {
  const start = Date.now();
  const { method, url } = ctx.request;

  // Skip logging for health check and favicon
  if (url === '/health' || url === '/favicon.ico') {
    await next();
    return;
  }

  try {
    await next();
    const ms = Date.now() - start;

    // Sanitize URL to prevent logging sensitive data
    const sanitizedUrl = url
      .replace(/([?&]token=)[^&]+/g, '$1[REDACTED]')
      .replace(/([?&]password=)[^&]+/g, '$1[REDACTED]')
      .replace(/([?&]api_key=)[^&]+/g, '$1[REDACTED]')
      .replace(/([?&]secret=)[^&]+/g, '$1[REDACTED]')
      .replace(/([?&]key=)[^&]+/g, '$1[REDACTED]');

    logger.info(
      {
        method,
        url: sanitizedUrl,
        status: ctx.status,
        duration: ms,
        userAgent: ctx.headers['user-agent']?.substring(0, 100), // Limit length
      },
      'Request completed'
    );
  } catch (error) {
    const ms = Date.now() - start;

    // Don't log full URL in errors (might contain sensitive data)
    const sanitizedUrl = url
      .replace(/([?&]token=)[^&]+/g, '$1[REDACTED]')
      .replace(/([?&]password=)[^&]+/g, '$1[REDACTED]')
      .replace(/([?&]api_key=)[^&]+/g, '$1[REDACTED]');

    logger.error(
      {
        method,
        url: sanitizedUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: ms,
      },
      'Request failed'
    );
    throw error;
  }
};

/**
 * Attach logger to context
 * Makes logger available in controllers as ctx.log
 */
export const loggerContextMiddleware = async (ctx: Context, next: Next) => {
  // Inject a wrapped logger so any logger usage (including test mocks)
  // will go through the sanitization pipeline.
  (ctx as any).log = wrapLogger(logger);
  await next();
};
