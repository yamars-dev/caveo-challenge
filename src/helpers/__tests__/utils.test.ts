import { extractToken } from '../utils.js';

describe('Utils', () => {
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
