import { Context, Next } from 'koa';
import { verifyJWT, extractToken } from '../helpers/jwt.helper.js';


const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const REGION = process.env.AWS_REGION || 'us-east-1';
const JWKS_URL = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/jwks.json`;


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

        if (decoded.token_use === 'access') {
            ctx.status = 401;
            ctx.body = { 
                error: 'Unauthorized', 
                message: 'Please use ID Token instead of Access Token' 
            };
            return;
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
            message: error.message || 'Invalid token' 
        };
    }
}

