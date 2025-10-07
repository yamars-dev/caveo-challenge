/**
 * Extract Bearer token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string or null if invalid format
 */
export function extractToken(authHeader?: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
