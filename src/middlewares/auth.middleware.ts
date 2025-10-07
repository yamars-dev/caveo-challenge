import { Context, Next } from 'koa';
import { verifyJWT, extractToken } from '../helpers/jwt.helper.js';

export const authMiddleware = async (ctx: Context, next: Next) => {
  try {
    const authHeader = ctx.headers['authorization'];
    if (!authHeader) {
      ctx.status = 401;
      ctx.body = { message: 'Authorization header missing' };
      return;
    }

    const token = extractToken(authHeader);

    if (!token) {
      ctx.status = 401;
      ctx.body = { message: 'Token missing' };
      return;
    }

    const decoded = await verifyJWT(token);

    const isEditAccount = ctx.method === 'PUT' && ctx.path === '/account/edit';

    if (isEditAccount) {
      if (decoded.token_use !== 'access') {
        ctx.status = 401;
        ctx.body = {
          error: 'Unauthorized',
          message: 'Please use Access Token for this endpoint',
        };
      }
    } else {
      if (decoded.token_use !== 'id') {
        ctx.status = 401;
        ctx.body = {
          error: 'Unauthorized',
          message: 'Please use ID Token instead of Access Token',
        };
      }
    }

    ctx.state.user = {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name,
      groups: decoded['cognito:groups'] || [],
      emailVerified: decoded.email_verified,
      tokenUse: decoded.token_use,
      authTime: decoded.auth_time,
      exp: decoded.exp,
    };

    await next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      ctx.status = 401;
      ctx.body = { error: 'Unauthorized', message: 'Token expired' };
      return;
    }

    if (error.name === 'JsonWebTokenError') {
      ctx.status = 401;
      ctx.body = { error: 'Unauthorized', message: 'Invalid token format' };
      return;
    }

    ctx.status = 401;
    ctx.body = {
      error: 'Unauthorized',
      message: error.message || 'Invalid token',
    };
  }
};
