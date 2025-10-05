import { Context, Next } from 'koa';
import { roleMiddleware } from '../role.middleware.js';

describe('roleMiddleware', () => {
  let mockContext: Partial<Context>;
  let mockNext: Next;

  beforeEach(() => {
    mockContext = {
      state: {},
      status: 200,
      body: null,
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('Access Control', () => {
    it('should allow access when user has required role', async () => {
      mockContext.state = {
        user: {
          groups: ['admin'],
        },
      };

      const middleware = roleMiddleware('admin');
      await middleware(mockContext as Context, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockContext.status).toBe(200);
    });

    it('should allow access when user has one of multiple required roles', async () => {
      mockContext.state = {
        user: {
          groups: ['user'],
        },
      };

      const middleware = roleMiddleware('admin', 'user');
      await middleware(mockContext as Context, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access when user lacks required role', async () => {
      mockContext.state = {
        user: {
          groups: ['user'],
        },
      };

      const middleware = roleMiddleware('admin');
      await middleware(mockContext as Context, mockNext);

      expect(mockContext.status).toBe(403);
      expect(mockContext.body).toEqual({
        error: 'Access denied',
        message: 'You do not have the required role(s) to access this resource.',
        requiredRoles: ['admin'],
        yourRoles: 'user',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user has no groups', async () => {
      mockContext.state = {
        user: {
          groups: [],
        },
      };

      const middleware = roleMiddleware('admin');
      await middleware(mockContext as Context, mockNext);

      expect(mockContext.status).toBe(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user state is missing', async () => {
      mockContext.state = {};

      const middleware = roleMiddleware('admin');
      await middleware(mockContext as Context, mockNext);

      expect(mockContext.status).toBe(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Multiple Roles', () => {
    it('should support checking multiple required roles', async () => {
      mockContext.state = {
        user: {
          groups: ['moderator'],
        },
      };

      const middleware = roleMiddleware('admin', 'moderator', 'superuser');
      await middleware(mockContext as Context, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should provide clear error message with all required roles', async () => {
      mockContext.state = {
        user: {
          groups: ['viewer'],
        },
      };

      const middleware = roleMiddleware('admin', 'moderator');
      await middleware(mockContext as Context, mockNext);

      expect(mockContext.status).toBe(403);
      expect(mockContext.body).toMatchObject({
        requiredRoles: ['admin', 'moderator'],
        yourRoles: 'viewer',
      });
    });
  });
});
