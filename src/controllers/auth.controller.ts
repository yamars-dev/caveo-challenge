import { JsonController, Post, Body, HttpCode, Ctx } from 'routing-controllers';
import { Context } from 'koa';
import { SignInOrRegisterDto } from '../dtos/auth.dto';
import { UserProfileResponse } from '../dtos/account.dto';
import { authService } from '../services/auth.service';
import { logger } from '../helpers/logger.js';


@JsonController('/auth')
export class AuthController {
 
    @Post('/')
    @HttpCode(200)
    async signInOrRegister(@Body() data: SignInOrRegisterDto, @Ctx() ctx: Context) {
        const log = (ctx as any).log || logger;
        
        log.info({ email: data.email }, 'Authentication attempt');

        try {
            const result = await authService.signInOrRegister(
                data.email,
                data.password,
                data.name
            );

            const userResponse: UserProfileResponse = {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
                role: result.user.role as 'admin' | 'user',
                isOnboarded: result.user.isOnboarded,
            };

            log.info(
                { userId: result.user.id, isNewUser: result.isNewUser },
                'Authentication successful'
            );

            return {
                message: result.isNewUser ? 'Registration successful' : 'Login successful',
                user: userResponse,
                tokens: result.tokens,
            };
        } catch (error: any) {
            log.error({ err: error, email: data.email }, 'Authentication failed');
            throw error;
        }
    }
}