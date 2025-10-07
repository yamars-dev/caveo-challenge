import { JsonController, Post, Body, HttpCode, Ctx } from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { Context } from 'koa';
import { SignInOrRegisterDto } from '../dtos/auth.dto.js';
import { UserProfileResponse } from '../dtos/account.dto.js';
import { AuthResponseDto } from '../dtos/response.dto.js';
import { authService } from '../services/auth.service.js';
import { logger, maskEmail } from '../helpers/logger.js';

@JsonController('/auth')
export class AuthController {
  @Post('/')
  @HttpCode(200)
  @OpenAPI({
    summary: 'Sign in or register user',
    description: 'Authenticate existing user or register new user.',
    tags: ['Authentication'],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['email', 'password'],
            properties: {
              email: { type: 'string', format: 'email', example: 'user@example.com' },
              password: { type: 'string', format: 'password', example: 'SecurePass123!' },
              name: { type: 'string', example: 'John Doe' },
            },
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Authentication successful',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string', example: 'Login successful' },
                user: { $ref: '#/components/schemas/UserProfileResponse' },
                tokens: {
                  type: 'object',
                  properties: {
                    AccessToken: { type: 'string' },
                    IdToken: { type: 'string' },
                    RefreshToken: { type: 'string' },
                    ExpiresIn: { type: 'number', example: 3600 },
                  },
                },
              },
            },
          },
        },
      },
      '400': { description: 'Invalid credentials or validation error' },
      '500': { description: 'Internal server error' },
    },
    security: [],
  })
  async signInOrRegister(
    @Body() data: SignInOrRegisterDto,
    @Ctx() ctx: Context
  ): Promise<AuthResponseDto> {
    const log = (ctx as any).log || logger;

  log.info({ email: maskEmail(data.email) }, 'Authentication attempt');

    try {
      const result = await authService.signInOrRegister(data.email, data.password, data.name);

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

      // Store RefreshToken in secure HttpOnly cookie
      ctx.cookies.set('refreshToken', result.tokens.RefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Only HTTPS in production
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      // Return only AccessToken and IdToken (not RefreshToken)
      return {
        message: result.isNewUser ? 'Registration successful' : 'Login successful',
        user: userResponse,
        tokens: {
          AccessToken: result.tokens.AccessToken,
          IdToken: result.tokens.IdToken,
          RefreshToken: result.tokens.RefreshToken, // Keep for now for compatibility
          ExpiresIn: result.tokens.ExpiresIn,
        },
      };
    } catch (error: any) {
      // Don't log the full error or data object (could contain password)
      log.error(
        {
          errorMessage: error.message,
          errorCode: error.code,
          email: maskEmail(data.email),
        },
        'Authentication failed'
      );
      throw error;
    }
  }
}
