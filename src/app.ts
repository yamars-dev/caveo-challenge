import 'reflect-metadata';
import 'dotenv/config';
import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import logger from 'koa-logger';
import serve from 'koa-static';
import { connectDatabase } from './entities/index.js';

const app = new Koa();
const router = new Router() as any;

connectDatabase(app).then(() => {
  console.log('Database connected successfully');
}).catch((error) => {
  console.error('Database connection failed:', error);
});

router.get('/', async (ctx: any) => {
  ctx.body = 'Hello, Koa!';
});

app.use(logger());
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());
app.use(serve('public') as any);


const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
