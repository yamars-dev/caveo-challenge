import { AppDataSource } from '../entities/index.js';
import { UserEntity } from '../entities/user.entity.js';
import { cognitoService } from './cognito.service.js';

export class AuthService {
  async signInOrRegister(email: string, password: string, name?: string) {
    const userRepo = AppDataSource.getRepository(UserEntity);
    const user = await userRepo.findOne({ where: { email } });

    if (user) {
      const tokens = await cognitoService.signIn(email, password);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isOnboarded: user.isOnboarded,
        },
        tokens: {
          AccessToken: tokens.AccessToken,
          IdToken: tokens.IdToken,
          RefreshToken: tokens.RefreshToken,
          ExpiresIn: tokens.ExpiresIn,
        },
        isNewUser: false,
      };
    }

    if (!name) {
      throw new Error('Name is required for registration');
    }

    const userSub = await cognitoService.signUp(email, password, name);

    const newUser = userRepo.create({
      id: userSub,
      email,
      name,
      role: 'user',
      isOnboarded: false,
    });
    await userRepo.save(newUser);

    await cognitoService.addToGroup(email, 'user');

    const tokens = await cognitoService.signIn(email, password);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isOnboarded: newUser.isOnboarded,
      },
      tokens: {
        AccessToken: tokens.AccessToken,
        IdToken: tokens.IdToken,
        RefreshToken: tokens.RefreshToken,
        ExpiresIn: tokens.ExpiresIn,
      },
      isNewUser: true,
    };
  }
}

export const authService = new AuthService();
