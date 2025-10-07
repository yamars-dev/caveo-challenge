import jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const REGION = process.env.AWS_REGION || 'us-east-1';
const JWKS_URL = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`;
const JWKS_URI = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;

const jwksClient = new JwksClient({
  jwksUri: JWKS_URI,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
});

function getSigningKey(header: jwt.JwtHeader): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!header.kid) {
      return reject(new Error('Missing kid in token header'));
    }

    jwksClient.getSigningKey(header.kid, (err, key) => {
      if (err) {
        return reject(err);
      }
      const signingKey = key?.getPublicKey();
      if (!signingKey) {
        return reject(new Error('Unable to get signing key'));
      }
      resolve(signingKey);
    });
  });
}

export async function verifyJWT(token: string): Promise<jwt.JwtPayload> {
  return new Promise((resolve, reject) => {
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded || !decoded.header) {
      return reject(new Error('Invalid token format'));
    }

    getSigningKey(decoded.header)
      .then((signingKey) => {
        jwt.verify(
          token,
          signingKey,
          {
            algorithms: ['RS256'],
            issuer: JWKS_URL,
          },
          (err, payload) => {
            if (err) {
              return reject(err);
            }
            if (!payload || typeof payload === 'string') {
              return reject(new Error('Invalid token payload'));
            }
            resolve(payload);
          }
        );
      })
      .catch(reject);
  });
}

/**
 * Decode JWT token WITHOUT verification
 * ⚠️ WARNING: This function does NOT validate the token signature!
 * Use verifyJWT() for security-critical operations.
 * This is only for debugging or extracting claims from already-verified tokens.
 *
 * @param token - JWT token string
 * @returns Decoded payload
 */
export function decodeJWT(token: string): any {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(Buffer.from(payload, 'base64').toString());
  } catch {
    throw new Error('Invalid JWT format');
  }
}

/**
 * Extract Bearer token from Authorization header
 * @param authHeader - Authorization header value (e.g., "Bearer abc123")
 * @returns Token string or null if invalid format
 */
export function extractToken(authHeader?: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
