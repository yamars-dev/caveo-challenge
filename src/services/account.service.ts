import { AppDataSource } from '../entities/index.js';
import { UserEntity } from '../entities/user.entity.js';
import { cognitoService } from './cognito.service.js';
import { UpdateProfileDto, UserProfileResponse } from '../dtos/account.dto.js';
import { logger } from '../helpers/logger.js';

export class AccountService {
  async getAccountDetails(userId: string): Promise<UserProfileResponse> {
    const user = await AppDataSource.getRepository(UserEntity).findOne({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    return this.mapToResponse(user);
  }

  async updateProfile(
    currentUserId: string,
    isAdmin: boolean,
    accessToken: string,
    data: UpdateProfileDto
  ): Promise<UserProfileResponse> {
    const userRepo = AppDataSource.getRepository(UserEntity);

    if (!isAdmin && data.userId && data.userId !== currentUserId) {
      logger.warn(
        { currentUserId, requestedUserId: data.userId },
        'Unauthorized profile edit attempt'
      );
      throw new Error('You can only edit your own profile');
    }

    let targetUserId = currentUserId;
    if (isAdmin && data.userId) {
      targetUserId = data.userId;
    }

    const dbUser = await userRepo.findOne({ where: { id: targetUserId } });
    if (!dbUser) {
      throw new Error('User not found');
    }

    if (!isAdmin && data.role) {
      logger.warn({ currentUserId, requestedRole: data.role }, 'Unauthorized role change attempt');
      throw new Error('You do not have permission to change roles');
    }

    if (data.name) {
      dbUser.name = data.name;
      dbUser.isOnboarded = true;
    }

    if (isAdmin && data.role) {
      if (targetUserId === currentUserId && data.role === 'user') {
        throw new Error('You cannot demote yourself from admin');
      }
      dbUser.role = data.role;

      cognitoService
        .addToGroup(dbUser.email, data.role)
        .catch((error) =>
          logger.warn({ error, userId: dbUser.id, role: data.role }, 'Cognito group sync failed')
        );
    }

    await userRepo.save(dbUser);

    if (data.name && accessToken) {
      cognitoService
        .updateUserAttributes(accessToken, { name: data.name })
        .catch((error) =>
          logger.warn({ error, userId: dbUser.id }, 'Cognito attributes sync failed')
        );
    }

    logger.info({ userId: dbUser.id, changes: Object.keys(data) }, 'Profile updated');

    return this.mapToResponse(dbUser);
  }

  private mapToResponse(user: UserEntity): UserProfileResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'admin' | 'user',
      isOnboarded: user.isOnboarded,
    };
  }
}

export const accountService = new AccountService();
