import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import logger from 'koa-logger';
import serve from 'koa-static';

const app = new Koa();
const router = new Router();

router.get('/', ctx => {
  ctx.body = 'Hello, Koa!';
});

app.use(logger());
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());
app.use(serve('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
