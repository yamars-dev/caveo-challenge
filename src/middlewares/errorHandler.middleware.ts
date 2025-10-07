import { Context, Next } from 'koa';
import { HttpError } from 'routing-controllers';

export async function errorHandler(ctx: Context, next: Next) {
  try {
    await next();
  } catch (err: any) {
    if (err instanceof HttpError) {
      ctx.status = err.httpCode || 400;
      ctx.body = {
        error: err.name || 'Error',
        message: err.message,
      };
    } else {
      ctx.status = 500;
      ctx.body = {
        error: 'InternalServerError',
        message: err.message || 'Internal server error',
      };
    }
    ctx.app.emit('error', err, ctx);
  }
}
