import { AppDataSource } from '../entities';
import { UserEntity } from '../entities/user.entity';
import { cognitoService } from './cognito.service';
import { UpdateProfileDto, UserProfileResponse } from '../dtos/account.dto';
import { logger } from '../helpers/logger.js';

interface UpdateProfileParams {
  currentUserId: string;
  isAdmin: boolean;
  accessToken: string;
  data: UpdateProfileDto;
}

export class AccountService {

  async getAccountDetails(userId: string): Promise<UserProfileResponse> {
    const userRepo = AppDataSource.getRepository(UserEntity);
    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'admin' | 'user',
      isOnboarded: user.isOnboarded,
    };
  }


  async updateProfile(params: UpdateProfileParams): Promise<UserProfileResponse> {
    const { currentUserId, isAdmin, accessToken, data } = params;
    const userRepo = AppDataSource.getRepository(UserEntity);

    logger.info(
      { currentUserId, isAdmin, targetUserId: data.userId, requestedChanges: Object.keys(data) },
      'Profile update attempt'
    );

    // Usuários não-admin não podem editar outros usuários
    if (!isAdmin && data.userId && data.userId !== currentUserId) {
      logger.warn({ currentUserId, requestedUserId: data.userId }, 'Unauthorized profile edit attempt');
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

    if (!isAdmin) {
      if (data.role) {
        logger.warn({ currentUserId, requestedRole: data.role }, 'Unauthorized role change attempt');
        throw new Error('You do not have permission to change roles');
      }
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

      try {
        await cognitoService.addToGroup(dbUser.email, data.role);
      } catch (error: any) {
        logger.error({ err: error, userId: dbUser.id, role: data.role }, 'Failed to update Cognito group');
      }
    }

    await userRepo.save(dbUser);

    if (data.name && accessToken) {
      try {
        await cognitoService.updateUserAttributes(accessToken, {
          name: data.name,
        });
      } catch (error: any) {
        logger.error({ err: error, userId: dbUser.id }, 'Failed to update Cognito attributes');
      }
    }

    logger.info(
      { userId: dbUser.id, updatedFields: Object.keys(data), isOnboarded: dbUser.isOnboarded },
      'Profile updated successfully'
    );

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as 'admin' | 'user',
      isOnboarded: dbUser.isOnboarded,
    };
  }

}

export const accountService = new AccountService();