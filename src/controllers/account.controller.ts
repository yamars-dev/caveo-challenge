import {
  JsonController,
  Get,
  Put,
  Body,
  Ctx,
  Authorized,
  BadRequestError,
} from 'routing-controllers';
import { OpenAPI } from 'routing-controllers-openapi';
import { Context } from 'koa';
import { accountService } from '../services/account.service.js';
import { extractToken } from '../helpers/jwt.helper.js';
import { UpdateProfileDto, UserProfileResponse } from '../dtos/account.dto.js';
import {
  GetProfileResponseDto,
  EditProfileResponseDto,
  ErrorResponseDto,
} from '../dtos/response.dto.js';
import { logger } from '../helpers/logger.js';

@JsonController('/account')
export class AccountController {
  @Get('/me')
  @Authorized()
  @OpenAPI({
    summary: 'Get current user profile',
    description: 'Returns the authenticated user profile information',
    tags: ['Account'],
    security: [{ bearerAuth: [] }],
    responses: {
      '200': {
        description: 'User profile retrieved successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'abc-123' },
                email: { type: 'string', example: 'user@example.com' },
                name: { type: 'string', example: 'John Doe' },
                groups: { type: 'string', example: 'user' },
                tokenUse: { type: 'string', example: 'id' },
                authTime: { type: 'number' },
                exp: { type: 'number' },
              },
            },
          },
        },
      },
      '401': { description: 'Unauthorized - Invalid or missing token' },
    },
  })
  async getProfile(@Ctx() ctx: Context): Promise<GetProfileResponseDto | ErrorResponseDto> {
    const user = ctx.state.user;
    if (!user) {
      return {
        error: 'Unauthorized',
        message: 'User not authenticated',
      };
    }

    return {
      id: user.sub,
      email: user.email,
      name: user.name,
      groups: user.groups[0],
      tokenUse: user.token_use,
      authTime: user.auth_time,
      exp: user.exp,
    };
  }

  @Put('/edit')
  @Authorized()
  @OpenAPI({
    summary: 'Edit user profile',
    description:
      'Update user profile. Users can edit their own name. Admins can edit name and role of any user.',
    tags: ['Account'],
    security: [{ bearerAuth: [] }],
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Jane Doe' },
              role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
              userId: {
                type: 'string',
                example: 'abc-123',
                description: 'Target user ID (admin only)',
              },
            },
          },
        },
      },
    },
    responses: {
      '200': {
        description: 'Profile updated successfully',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string', example: 'Profile updated successfully' },
                user: { $ref: '#/components/schemas/UserProfileResponse' },
              },
            },
          },
        },
      },
      '401': { description: 'Unauthorized - Invalid or missing token' },
      '403': { description: 'Forbidden - Insufficient permissions' },
      '404': { description: 'User not found' },
      '500': { description: 'Internal server error' },
    },
  })
  async editAccount(
    @Body() data: UpdateProfileDto,
    @Ctx() ctx: Context
  ): Promise<EditProfileResponseDto | ErrorResponseDto> {
    const user = ctx.state.user;
    const rawLog = (ctx as any).log || logger;
    const log =
      typeof rawLog.info === 'function' && typeof rawLog.error === 'function' ? rawLog : logger;

    if (!user) {
      ctx.status = 401;
      return {
        error: 'Unauthorized',
        message: 'User not authenticated',
      };
    }

    try {
      const authHeader = ctx.headers['authorization'];
      const accessToken = extractToken(authHeader) || '';

      const isAdmin = user.groups?.includes('admin');
      const updatedUser: UserProfileResponse = await accountService.updateProfile(
        user.id,
        isAdmin,
        accessToken,
        data
      );

      return {
        message: 'Profile updated successfully',
        user: updatedUser,
      };
    } catch (error: any) {
      log.error({ err: error, userId: user.id }, 'Edit account failed');
      throw new BadRequestError(error.message || 'Failed to update profile');
    }
  }
}
