import { AppDataSource } from '../entities';
import { UserEntity } from '../entities/user.entity';
import { cognitoService } from './cognito.service';
import { UpdateProfileDto, UserProfileResponse } from '../dtos/account.dto';

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

    let targetUserId = currentUserId; 

    if (isAdmin && data.userId) {
      targetUserId = data.userId;
    }

    const dbUser = await userRepo.findOne({ where: { id: targetUserId } });

    if (!dbUser) {
      throw new Error('User not found');
    }

    if (!isAdmin) {
      if (targetUserId !== currentUserId) {
        throw new Error('You can only edit your own profile');
      }

      if (data.role) {
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
        console.error('Failed to update Cognito group:', error.message);
      }
    }

    await userRepo.save(dbUser);

    if (data.name && accessToken) {
      try {
        await cognitoService.updateUserAttributes(accessToken, {
          name: data.name,
        });
      } catch (error: any) {
        console.error('Failed to update Cognito attributes:', error.message);
      }
    }

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