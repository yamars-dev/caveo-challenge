import { JsonController, Get, Post, Put, Delete, Body, Param, Ctx } from 'routing-controllers';
import { UserEntity } from '../entities/user.entity.js';
import { Context } from 'koa';

@JsonController('/users')
export class UsersController {
  
  @Get('/')
  async getAll(@Ctx() ctx: Context) {
    const userRepository = ctx.db.getRepository(UserEntity);
    return await userRepository.find();
  }

}
