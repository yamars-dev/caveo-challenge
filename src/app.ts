import 'reflect-metadata';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import serve from 'koa-static';
import { connectDatabase } from './entities/index.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import { logger } from './helpers/logger.js';
import { initializeEnvironment } from './config/env-loader.js';
import { validateEnvironment, sanitizeEnvForLogging } from './security/env-validation.js';
import { setupControllers } from './config/controllers.js';

// Middlewares
import { corsMiddleware } from './middlewares/cors.middleware.js';
import { securityMiddleware } from './middlewares/security.middleware.js';
import { globalRateLimiter, authRateLimitMiddleware } from './middlewares/rate-limit.middleware.js';
import { loggingMiddleware, loggerContextMiddleware } from './middlewares/logging.middleware.js';
import {
  swaggerUIMiddleware,
  apiDocsMiddleware,
  healthCheckMiddleware,
} from './middlewares/routes.middleware.js';
import { readinessMiddleware } from './middlewares/routes.middleware.js';

const app = new Koa();
app.use(errorHandler);

// Environment will be initialized and validated during startup sequence below

// Apply middlewares in order
app.use(corsMiddleware);
app.use(securityMiddleware);
app.use(globalRateLimiter);
app.use(authRateLimitMiddleware);
app.use(loggingMiddleware);
app.use(loggerContextMiddleware);
app.use(bodyParser());
app.use(serve('public') as any);
app.use(swaggerUIMiddleware);
app.use(apiDocsMiddleware);
app.use(healthCheckMiddleware);
app.use(readinessMiddleware);

// Setup API controllers
setupControllers(app);

/**
 * Start the application
 */
(async () => {
  try {
    // Load environment variables from config.yml
    await initializeEnvironment();

    // Validate env after loading (will throw on missing/invalid values)
    validateEnvironment();

    // Log a sanitized view of environment (no secrets)
    logger.info({ env: sanitizeEnvForLogging() }, 'Environment initialized');

    const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

    // Connect to database
    await connectDatabase(app);
    logger.info('Database connected');

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info('Available routes:');
      logger.info('   POST /api/auth (register or login)');
      logger.info('   GET  /api/account/me');
      logger.info('   PUT  /api/account/edit');
      logger.info(`   GET  /docs (Swagger UI)`);
      logger.info(`   GET  /api-docs.json (OpenAPI spec)`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
})();
