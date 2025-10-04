import { JsonController, Get, Put, Body, Ctx, Authorized } from 'routing-controllers';
import { Context } from 'koa';
import { UsersController } from './user.controller';

interface UpdateProfileDto {
  name?: string;
  email?: string;
}

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

}
