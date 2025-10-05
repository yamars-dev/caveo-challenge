import 'reflect-metadata';
import 'dotenv/config';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import pinoHttp from 'pino-http';
import serve from 'koa-static';
import { useKoaServer } from 'routing-controllers';
import { connectDatabase } from './entities/index.js';
import { UsersController } from './controllers/user.controller.js';
import { AuthController } from './controllers/auth.controller.js';
import { AccountController } from './controllers/account.controller.js';
import { Context } from 'koa';
import { authMiddleware } from './middlewares/auth.middleware.js';
import { logger } from './helpers/logger.js';


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

connectDatabase(app)
  .then(() => {
    logger.info('Database connected successfully');
  })
  .catch((error) => {
    logger.error({ err: error }, 'Database connection failed');
  });





const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;


(async () => {
  try {
    await connectDatabase(app);
    logger.info('Database connected');

    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info('Available routes:');
      logger.info('   POST /api/auth (register or login)');
      logger.info('   GET  /api/account/me');
      logger.info('   PUT  /api/account/edit');
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
})();

