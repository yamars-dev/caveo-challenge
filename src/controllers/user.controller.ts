import { JsonController, Get, Post, Put, Delete, Body, Param, Ctx, UseBefore } from 'routing-controllers';
import { UserEntity } from '../entities/user.entity.js';
import { Context } from 'koa';
import { authMiddleware } from '../middlewares/auth.middleware';
import { roleMiddleware } from '../middlewares/role.middleware';

@JsonController('/users')
@UseBefore(authMiddleware, roleMiddleware('admin')) 

export class UsersController {
    @Get('/')
    async getAll(@Ctx() ctx: Context) {
        const userRepository = ctx.db.getRepository(UserEntity);
        return await userRepository.find();
    }
}
