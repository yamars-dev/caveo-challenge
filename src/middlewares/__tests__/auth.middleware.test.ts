import { Context, Next } from 'koa';
import { authMiddleware } from '../auth.middleware.js';
import { verifyJWT, extractToken } from '../../helpers/jwt.helper.js';

jest.mock('../../helpers/jwt.helper.js');

describe('authMiddleware', () => {
  let mockContext: Partial<Context>;
  let mockNext: Next;

  beforeEach(() => {
    mockContext = {
      headers: {},
      state: {},
      status: 200,
      body: null,
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('Authorization Header Validation', () => {
    it('should return 401 when authorization header is missing', async () => {
      await authMiddleware(mockContext as Context, mockNext);

      expect(mockContext.status).toBe(401);
      expect(mockContext.body).toEqual({ message: 'Authorization header missing' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when token cannot be extracted', async () => {
      mockContext.headers = { authorization: 'Invalid' };
      (extractToken as jest.Mock).mockReturnValue(null);

      await authMiddleware(mockContext as Context, mockNext);

      expect(mockContext.status).toBe(401);
      expect(mockContext.body).toEqual({ message: 'Token missing' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Token Verification', () => {
    it('should verify valid ID token and set user state', async () => {
      const mockToken = 'valid-id-token';
      const mockDecoded = {
        sub: 'user-123',
        email: 'user@example.com',
        name: 'John Doe',
        'cognito:groups': ['user'],
        email_verified: true,
        token_use: 'id',
        auth_time: 1234567890,
        exp: 9999999999,
      };

      mockContext.headers = { authorization: 'Bearer valid-id-token' };
      (extractToken as jest.Mock).mockReturnValue(mockToken);
      (verifyJWT as jest.Mock).mockResolvedValue(mockDecoded);

      await authMiddleware(mockContext as Context, mockNext);

      expect(extractToken).toHaveBeenCalledWith('Bearer valid-id-token');
      expect(verifyJWT).toHaveBeenCalledWith(mockToken);
      expect(mockContext.state?.user).toEqual({
        id: 'user-123',
        email: 'user@example.com',
        name: 'John Doe',
        groups: ['user'],
        emailVerified: true,
        tokenUse: 'id',
        authTime: 1234567890,
        exp: 9999999999,
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject access token and require ID token', async () => {
      const mockToken = 'access-token';
      const mockDecoded = {
        sub: 'user-123',
        token_use: 'access',
      };

      mockContext.headers = { authorization: 'Bearer access-token' };
      (extractToken as jest.Mock).mockReturnValue(mockToken);
      (verifyJWT as jest.Mock).mockResolvedValue(mockDecoded);

      await authMiddleware(mockContext as Context, mockNext);

      expect(mockContext.status).toBe(401);
      expect(mockContext.body).toEqual({
        error: 'Unauthorized',
        message: 'Please use ID Token instead of Access Token',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle user without groups', async () => {
      const mockToken = 'valid-token';
      const mockDecoded = {
        sub: 'user-456',
        email: 'user2@example.com',
        name: 'Jane Doe',
        email_verified: false,
        token_use: 'id',
        auth_time: 1234567890,
        exp: 9999999999,
      };

      mockContext.headers = { authorization: 'Bearer valid-token' };
      (extractToken as jest.Mock).mockReturnValue(mockToken);
      (verifyJWT as jest.Mock).mockResolvedValue(mockDecoded);

      await authMiddleware(mockContext as Context, mockNext);

      expect(mockContext.state?.user?.groups).toEqual([]);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for expired token', async () => {
      const mockToken = 'expired-token';
      const tokenExpiredError = new Error('Token expired');
      tokenExpiredError.name = 'TokenExpiredError';

      mockContext.headers = { authorization: 'Bearer expired-token' };
      (extractToken as jest.Mock).mockReturnValue(mockToken);
      (verifyJWT as jest.Mock).mockRejectedValue(tokenExpiredError);

      await authMiddleware(mockContext as Context, mockNext);

      expect(mockContext.status).toBe(401);
      expect(mockContext.body).toEqual({
        error: 'Unauthorized',
        message: 'Token expired',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token format', async () => {
      const mockToken = 'invalid-token';
      const jwtError = new Error('Invalid token');
      jwtError.name = 'JsonWebTokenError';

      mockContext.headers = { authorization: 'Bearer invalid-token' };
      (extractToken as jest.Mock).mockReturnValue(mockToken);
      (verifyJWT as jest.Mock).mockRejectedValue(jwtError);

      await authMiddleware(mockContext as Context, mockNext);

      expect(mockContext.status).toBe(401);
      expect(mockContext.body).toEqual({
        error: 'Unauthorized',
        message: 'Invalid token format',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for other verification errors', async () => {
      const mockToken = 'bad-token';
      const genericError = new Error('Verification failed');

      mockContext.headers = { authorization: 'Bearer bad-token' };
      (extractToken as jest.Mock).mockReturnValue(mockToken);
      (verifyJWT as jest.Mock).mockRejectedValue(genericError);

      await authMiddleware(mockContext as Context, mockNext);

      expect(mockContext.status).toBe(401);
      expect(mockContext.body).toEqual({
        error: 'Unauthorized',
        message: 'Verification failed',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
