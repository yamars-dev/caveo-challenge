import { JsonController, Get, Put, Body, Ctx, Authorized } from 'routing-controllers';
import { Context } from 'koa';
import { accountService } from '../services/account.service.js';
import { extractToken } from '../helpers/jwt.helper.js';
import { UpdateProfileDto, UserProfileResponse } from '../dtos/account.dto.js';
import { logger } from '../helpers/logger.js';


@JsonController('/account')
export class AccountController {
  @Get('/me')
  @Authorized()
  async getProfile(@Ctx() ctx: Context) {
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
  async editAccount(@Body() data: UpdateProfileDto, @Ctx() ctx: Context) {
    const user = ctx.state.user;
    const log = (ctx as any).log || logger;
    
    if (!user) {
      ctx.status = 401;
      return {
        error: 'Unauthorized',
        message: 'User not authenticated',
      };
    }

    try {
      const isAdmin = user.groups?.includes('admin');
      const authHeader = ctx.headers['authorization'];
      const accessToken = extractToken(authHeader) || '';

      const updatedUser: UserProfileResponse = await accountService.updateProfile({
        currentUserId: user.id,
        isAdmin,
        accessToken,
        data,
      });

      return {
        message: 'Profile updated successfully',
        user: updatedUser,
      };
    } catch (error: any) {
      log.error({ err: error, userId: user.id }, 'Edit account failed');
      
      if (
        error.message.includes('permission') ||
        error.message.includes('only edit your own') ||
        error.message.includes('cannot demote yourself')
      ) {
        ctx.status = 403;
        return {
          error: 'Forbidden',
          message: error.message,
        };
      }

      if (error.message === 'User not found') {
        ctx.status = 404;
        return { error: 'User not found' };
      }

      ctx.status = 500;
      return {
        error: 'Internal server error',
        message: error.message || 'Failed to update profile',
      };
    }
  }
}
