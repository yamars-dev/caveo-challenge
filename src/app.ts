import 'reflect-metadata';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import serve from 'koa-static';
import helmet from 'koa-helmet';
import rateLimit from 'koa-ratelimit';
import cors from '@koa/cors';
import { koaSwagger } from 'koa2-swagger-ui';
import { useKoaServer } from 'routing-controllers';
import { connectDatabase } from './entities/index.js';
import { UsersController } from './controllers/user.controller.js';
import { AuthController } from './controllers/auth.controller.js';
import { AccountController } from './controllers/account.controller.js';
import { Context } from 'koa';
import { authMiddleware } from './middlewares/auth.middleware.js';
import { logger } from './helpers/logger.js';
import { swaggerSpec } from './config/swagger.js';
import { initializeEnvironment } from './config/env-loader.js';
import { validateEnvironment } from './security/env-validation.js';

const app = new Koa();

// Validate environment variables
validateEnvironment();

// CORS configuration
app.use(
  cors({
    origin: (ctx) => {
      const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
      const origin = ctx.header.origin;
      return origin && allowedOrigins.includes(origin) ? origin : 'http://localhost:3000';
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
    maxAge: 86400, // 24 hours
  })
);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        connectSrc: ["'self'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Rate limiting
const rateLimitMap = new Map();
app.use(
  rateLimit({
    driver: 'memory',
    db: rateLimitMap,
    duration: 60000, // 1 minute
    errorMessage: 'Rate limit exceeded',
    id: (ctx) => ctx.ip,
    headers: {
      remaining: 'Rate-Limit-Remaining',
      reset: 'Rate-Limit-Reset',
      total: 'Rate-Limit-Total',
    },
    max: 100, // 100 requests per minute
    disableHeader: false,
  })
);

// Logging middleware
app.use(async (ctx, next) => {
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
    logger.info({ method, url, status: ctx.status, duration: ms }, 'Request completed');
  } catch (error) {
    const ms = Date.now() - start;
    logger.error({ method, url, error, duration: ms }, 'Request failed');
    throw error;
  }
});

app.use(async (ctx, next) => {
  (ctx as any).log = logger;
  await next();
});

app.use(bodyParser());
app.use(serve('public') as any);

app.use(
  koaSwagger({
    routePrefix: '/docs',
    swaggerOptions: {
      spec: swaggerSpec as any,
    },
  })
);

app.use(async (ctx, next) => {
  if (ctx.path === '/api-docs.json') {
    ctx.body = swaggerSpec;
    ctx.type = 'application/json';
    return;
  }
  await next();
});

// Health check endpoint
app.use(async (ctx, next) => {
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
});

useKoaServer(app, {
  routePrefix: '/api',
  controllers: [AuthController, UsersController, AccountController],
  authorizationChecker: async (action) => {
    const ctx: Context = action.context;
    return new Promise((resolve) => {
      authMiddleware(ctx, async () => {
        resolve(!!ctx.state.user);
      }).catch(() => resolve(false));
    });
  },

  defaultErrorHandler: false,
});

(async () => {
  try {
    // Load environment variables from config.yml
    await initializeEnvironment();

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
