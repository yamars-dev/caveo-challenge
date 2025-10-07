import { decodeJWT, extractToken } from '../utils.js';

describe('Utils', () => {
  describe('decodeJWT', () => {
    it('should decode valid JWT token', () => {
      const payload = { sub: 'user-123', email: 'test@example.com', name: 'Test User' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${encodedPayload}.signature`;

      const result = decodeJWT(token);

      expect(result).toEqual(payload);
      expect(result.sub).toBe('user-123');
      expect(result.email).toBe('test@example.com');
    });

    it('should decode JWT with special characters', () => {
      const payload = { name: 'John Smith', email: 'john@example.com' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const token = `header.${encodedPayload}.signature`;

      const result = decodeJWT(token);

      expect(result.name).toBe('John Smith');
    });

    it('should throw error for invalid JWT format with less than 3 parts', () => {
      const invalidToken = 'header.payload';

      expect(() => decodeJWT(invalidToken)).toThrow('Invalid JWT format');
    });

    it('should throw error for completely invalid token', () => {
      const invalidToken = 'not-a-jwt-token';

      expect(() => decodeJWT(invalidToken)).toThrow('Invalid JWT format');
    });

    it('should throw error for token with invalid base64 encoding', () => {
      const token = 'header.@@@invalid-base64@@@.signature';

      expect(() => decodeJWT(token)).toThrow('Invalid JWT format');
    });

    it('should throw error for token with non-JSON payload', () => {
      const nonJsonPayload = Buffer.from('not a json string').toString('base64');
      const token = `header.${nonJsonPayload}.signature`;

      expect(() => decodeJWT(token)).toThrow('Invalid JWT format');
    });
  });

  describe('extractToken', () => {
    it('should extract token from Bearer authorization header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.signature';
      const authHeader = `Bearer ${token}`;

      const result = extractToken(authHeader);

      expect(result).toBe(token);
    });

    it('should extract long token from Bearer header', () => {
      const token = 'a'.repeat(500);
      const authHeader = `Bearer ${token}`;

      const result = extractToken(authHeader);

      expect(result).toBe(token);
      expect(result?.length).toBe(500);
    });

    it('should return null for undefined authorization header', () => {
      const result = extractToken(undefined);

      expect(result).toBeNull();
    });

    it('should return null for empty authorization header', () => {
      const result = extractToken('');

      expect(result).toBeNull();
    });

    it('should return null for Basic authentication', () => {
      const result = extractToken('Basic dXNlcjpwYXNzd29yZA==');

      expect(result).toBeNull();
    });

    it('should return null for lowercase bearer', () => {
      const result = extractToken('bearer token123');

      expect(result).toBeNull();
    });

    it('should return empty string for Bearer without token', () => {
      const result = extractToken('Bearer ');

      expect(result).toBe('');
    });

    it('should handle Bearer with only spaces', () => {
      const result = extractToken('Bearer    ');

      expect(result).toBe('   ');
    });

    it('should handle malformed header without space', () => {
      const result = extractToken('Bearertoken123');

      expect(result).toBeNull();
    });
  });
});
