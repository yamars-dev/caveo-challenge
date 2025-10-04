import 'reflect-metadata';
import 'dotenv/config';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import logger from 'koa-logger';
import serve from 'koa-static';
import { useKoaServer } from 'routing-controllers';
import { connectDatabase } from './entities/index.js';
import { UsersController } from './controllers/user.controller.js';

const app = new Koa();

connectDatabase(app).then(() => {
  console.log('Database connected successfully');
}).catch((error) => {
  console.error('Database connection failed:', error);
});

app.use(logger());
app.use(bodyParser());
app.use(serve('public') as any);

useKoaServer(app, {
  controllers: [ UsersController],
  routePrefix: '/api',
  defaultErrorHandler: false,
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
