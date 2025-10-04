import { Context, Next } from 'koa';
import jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';


const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const REGION = process.env.AWS_REGION || 'us-east-1';
const JWKS_URL = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;

const client = new JwksClient({
    jwksUri: JWKS_URL,
    cache: true,
    cacheMaxAge: 600000, // 10 minutes
});

function getKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
    client.getSigningKey(header.kid!, (err, key) => {
        if (err) {
            return callback(err);
        }
        const signingKey = key?.getPublicKey();
        callback(null, signingKey);
    });
}
export const authMiddleware = async (ctx: Context, next: Next) => {

    try {
        const authHeader = ctx.headers['authorization'];
        if (!authHeader) {
            ctx.status = 401;
            ctx.body = { message: 'Authorization header missing' };
            return;
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            ctx.status = 401;
            ctx.body = { message: 'Token missing' };
            return;
        }

        const decoded = await new Promise<jwt.JwtPayload>((resolve, reject) => {
            jwt.verify(token, getKey, { algorithms: ['RS256'], issuer: JWKS_URL }, (err, decoded) => {
                if (err) {
                    return reject(err);
                }
                resolve(decoded as jwt.JwtPayload);
            });
        });

        ctx.state.user = decoded;
        await next();
    } catch (error) {
        ctx.status = 401;
        ctx.body = { message: 'Invalid token', error: (error as Error).message };

    }
}

