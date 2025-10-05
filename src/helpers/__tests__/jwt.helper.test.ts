import jwt from 'jsonwebtoken';
import { verifyJWT, decodeJWT, extractToken } from '../jwt.helper.js';

jest.mock('jsonwebtoken');
jest.mock('jwks-rsa');

describe('JWT Helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyJWT', () => {
    it('should reject token with invalid format', async () => {
      (jwt.decode as jest.Mock).mockReturnValue(null);

      await expect(verifyJWT('invalid-token')).rejects.toThrow('Invalid token format');
    });

    it('should reject token without header', async () => {
      (jwt.decode as jest.Mock).mockReturnValue({});

      await expect(verifyJWT('token-without-header')).rejects.toThrow('Invalid token format');
    });
  });

  describe('decodeJWT', () => {
    it('should decode valid JWT token', () => {
      const payload = { sub: 'user-123', email: 'test@example.com' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${encodedPayload}.signature`;

      const result = decodeJWT(token);

      expect(result).toEqual(payload);
    });

    it('should throw error for invalid JWT format', () => {
      const invalidToken = 'invalid-token';

      expect(() => decodeJWT(invalidToken)).toThrow('Invalid JWT format');
    });

    it('should throw error for malformed base64', () => {
      const token = 'header.invalid-base64!@#.signature';

      expect(() => decodeJWT(token)).toThrow('Invalid JWT format');
    });
  });

  describe('extractToken', () => {
    it('should extract token from Bearer authorization header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      const authHeader = `Bearer ${token}`;

      const result = extractToken(authHeader);

      expect(result).toBe(token);
    });

    it('should return null for missing authorization header', () => {
      const result = extractToken(undefined);

      expect(result).toBeNull();
    });

    it('should return null for non-Bearer authorization header', () => {
      const result = extractToken('Basic dXNlcjpwYXNz');

      expect(result).toBeNull();
    });

    it('should return null for malformed Bearer header', () => {
      const result = extractToken('Bearer');

      expect(result).toBeNull();
    });

    it('should handle empty string', () => {
      const result = extractToken('');

      expect(result).toBeNull();
    });
  });
});
