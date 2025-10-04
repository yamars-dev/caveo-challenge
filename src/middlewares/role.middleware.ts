import { Context, Next } from 'koa';

export const roleMiddleware = (...requiredRoles: string[]) => {
    return async (ctx: Context, next: Next) => {
        const userGroups = ctx.state.user?.['cognito:groups'] || [];

        const hasRole = requiredRoles.some(role => userGroups.includes(role));

        if (!hasRole) {
            ctx.status = 403;
            ctx.body = {
                error: 'Access denied',
                message: 'You do not have the required role(s) to access this resource.',
                requiredRoles,
                yourRoles: userGroups
            };
            return;
        }

        await next();
    };
};