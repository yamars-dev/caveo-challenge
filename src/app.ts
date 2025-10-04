import 'reflect-metadata';
import 'dotenv/config';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import logger from 'koa-logger';
import serve from 'koa-static';
import { useKoaServer } from 'routing-controllers';
import { connectDatabase } from './entities/index.js';
import { UsersController } from './controllers/user.controller.js';
import { AuthController } from './controllers/auth.controller.js';
const app = new Koa();
app.use(bodyParser());

useKoaServer(app, {
  routePrefix: '/api',
  controllers: [AuthController],
});

connectDatabase(app)
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
  });

app.use(logger());
app.use(bodyParser());
app.use(serve('public') as any);

useKoaServer(app, {
  controllers: [UsersController],
  routePrefix: '/api',
  defaultErrorHandler: false,
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;


(async () => {
  try {
    await connectDatabase(app);
    console.log('✅ Database connected');

    app.listen(PORT, () => {
      console.log(` Server running on http://localhost:${PORT}`);
      console.log(` Routes:`);
      console.log(`   POST /api/auth (register or login - no email confirmation needed)`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();