import { JsonController, Get, Ctx, UseBefore } from 'routing-controllers';
import { UserEntity } from '../entities/user.entity.js';
import { Context } from 'koa';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { roleMiddleware } from '../middlewares/role.middleware.js';

@JsonController('/users')
@UseBefore(authMiddleware)
export class UsersController {
  @Get('/')
  @UseBefore(roleMiddleware('admin'))
  async getAll(@Ctx() ctx: Context) {
    const userRepository = ctx.db.getRepository(UserEntity);
    return await userRepository.find();
  }
}
