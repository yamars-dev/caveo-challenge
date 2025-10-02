
import Koa from 'koa';
import * as Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import logger from 'koa-logger';
import serve from 'koa-static';


const app = new Koa();
const router = new (Router as any)();


router.get('/', async (ctx: Router.IRouterContext, next: () => Promise<any>) => {
  ctx.body = 'Hello, Koa!';
  await next();
});


app.use(logger());
app.use(bodyParser({}));
app.use(router.routes());
app.use(router.allowedMethods());
import { Middleware } from 'koa';
app.use(serve('public') as Middleware);


const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
