import { Context } from 'koa';
import { useKoaServer } from 'routing-controllers';
import { AuthController } from '../controllers/auth.controller.js';
import { UsersController } from '../controllers/user.controller.js';
import { AccountController } from '../controllers/account.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

/**
 * Configure routing-controllers with Koa
 * Sets up API routes with prefix /api and authorization
 */
export const setupControllers = (app: any) => {
  return useKoaServer(app, {
    routePrefix: '/api',
    controllers: [AuthController, UsersController, AccountController],

    /**
     * Authorization checker for @Authorized() decorator
     * Validates JWT token and checks if user is authenticated
     */
    authorizationChecker: async (action) => {
      const ctx: Context = action.context;
      return new Promise((resolve) => {
        authMiddleware(ctx, async () => {
          resolve(!!ctx.state.user);
        }).catch(() => resolve(false));
      });
    },

    /**
     * Disable default error handler
     * Let our custom error handling middleware handle errors
     */
    defaultErrorHandler: false,
  });
};
