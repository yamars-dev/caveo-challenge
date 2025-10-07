import 'reflect-metadata';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import pinoHttp from 'pino-http';
import serve from 'koa-static';
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

const app = new Koa();

app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/health' || req.url === '/favicon.ico',
    },
  }) as any
);

app.use(async (ctx, next) => {
  (ctx as any).log = (ctx.request as any).log || logger;
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
