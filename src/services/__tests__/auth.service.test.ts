import { AuthService } from '../auth.service.js';
import { cognitoService } from '../cognito.service.js';
import { AppDataSource } from '../../entities/index.js';
import { UserEntity } from '../../entities/user.entity.js';

jest.mock('../cognito.service');
jest.mock('../../entities');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepo: any;

  beforeEach(() => {
    authService = new AuthService();
    
    mockUserRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockUserRepo);
    jest.clearAllMocks();
  });

  describe('signInOrRegister - Login', () => {
    it('should login when user exists', async () => {
      const existingUser = {
        id: 'user-123',
        email: 'existing@example.com',
        name: 'Existing User',
        role: 'user',
        isOnboarded: true,
      };

      const mockTokens = {
        AccessToken: 'access-token',
        IdToken: 'id-token',
        RefreshToken: 'refresh-token',
        ExpiresIn: 3600,
      };

      mockUserRepo.findOne.mockResolvedValue(existingUser);
      (cognitoService.signIn as jest.Mock).mockResolvedValue(mockTokens);

      const result = await authService.signInOrRegister(
        'existing@example.com',
        'Password123!'
      );

      expect(result).toEqual({
        user: existingUser,
        tokens: mockTokens,
        isNewUser: false,
      });

      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'existing@example.com' },
      });
      expect(cognitoService.signIn).toHaveBeenCalledWith(
        'existing@example.com',
        'Password123!'
      );
    });

    it('should return isNewUser=false for login', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test',
        role: 'user',
        isOnboarded: false,
      });

      (cognitoService.signIn as jest.Mock).mockResolvedValue({
        AccessToken: 'token',
        IdToken: 'token',
        RefreshToken: 'token',
        ExpiresIn: 3600,
      });

      const result = await authService.signInOrRegister(
        'test@example.com',
        'Password123!'
      );

      expect(result.isNewUser).toBe(false);
    });

    it('should throw error when incorrect password', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      });

      (cognitoService.signIn as jest.Mock).mockRejectedValue(
        new Error('Invalid email or password')
      );

      await expect(
        authService.signInOrRegister('test@example.com', 'WrongPassword')
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('signInOrRegister - Registration', () => {
    it('should register new user when does not exist', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const userSub = 'new-user-123';
      const mockTokens = {
        AccessToken: 'access-token',
        IdToken: 'id-token',
        RefreshToken: 'refresh-token',
        ExpiresIn: 3600,
      };

      const newUser = {
        id: userSub,
        email: 'new@example.com',
        name: 'New User',
        role: 'user',
        isOnboarded: false,
      };

      (cognitoService.signUp as jest.Mock).mockResolvedValue(userSub);
      (cognitoService.addToGroup as jest.Mock).mockResolvedValue(undefined);
      (cognitoService.signIn as jest.Mock).mockResolvedValue(mockTokens);
      mockUserRepo.create.mockReturnValue(newUser);
      mockUserRepo.save.mockResolvedValue(newUser);

      const result = await authService.signInOrRegister(
        'new@example.com',
        'Password123!',
        'New User'
      );

      expect(result).toEqual({
        user: newUser,
        tokens: mockTokens,
        isNewUser: true,
      });
    });

    it('should create user in database', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      (cognitoService.signUp as jest.Mock).mockResolvedValue('user-123');
      (cognitoService.addToGroup as jest.Mock).mockResolvedValue(undefined);
      (cognitoService.signIn as jest.Mock).mockResolvedValue({
        AccessToken: 'token',
        IdToken: 'token',
        RefreshToken: 'token',
        ExpiresIn: 3600,
      });

      const newUser = {
        id: 'user-123',
        email: 'new@example.com',
        name: 'New User',
        role: 'user',
        isOnboarded: false,
      };

      mockUserRepo.create.mockReturnValue(newUser);
      mockUserRepo.save.mockResolvedValue(newUser);

      await authService.signInOrRegister(
        'new@example.com',
        'Password123!',
        'New User'
      );

      expect(mockUserRepo.create).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'new@example.com',
        name: 'New User',
        role: 'user',
        isOnboarded: false,
      });

      expect(mockUserRepo.save).toHaveBeenCalledWith(newUser);
    });

    it('should add user to "user" group', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      (cognitoService.signUp as jest.Mock).mockResolvedValue('user-123');
      (cognitoService.addToGroup as jest.Mock).mockResolvedValue(undefined);
      (cognitoService.signIn as jest.Mock).mockResolvedValue({
        AccessToken: 'token',
        IdToken: 'token',
        RefreshToken: 'token',
        ExpiresIn: 3600,
      });

      mockUserRepo.create.mockReturnValue({});
      mockUserRepo.save.mockResolvedValue({});

      await authService.signInOrRegister(
        'new@example.com',
        'Password123!',
        'New User'
      );

      expect(cognitoService.addToGroup).toHaveBeenCalledWith(
        'new@example.com',
        'user'
      );
    });

    it('should return isNewUser=true for registration', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      (cognitoService.signUp as jest.Mock).mockResolvedValue('user-123');
      (cognitoService.addToGroup as jest.Mock).mockResolvedValue(undefined);
      (cognitoService.signIn as jest.Mock).mockResolvedValue({
        AccessToken: 'token',
        IdToken: 'token',
        RefreshToken: 'token',
        ExpiresIn: 3600,
      });

      mockUserRepo.create.mockReturnValue({});
      mockUserRepo.save.mockResolvedValue({});

      const result = await authService.signInOrRegister(
        'new@example.com',
        'Password123!',
        'New User'
      );

      expect(result.isNewUser).toBe(true);
    });

    it('should set isOnboarded to false', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      (cognitoService.signUp as jest.Mock).mockResolvedValue('user-123');
      (cognitoService.addToGroup as jest.Mock).mockResolvedValue(undefined);
      (cognitoService.signIn as jest.Mock).mockResolvedValue({
        AccessToken: 'token',
        IdToken: 'token',
        RefreshToken: 'token',
        ExpiresIn: 3600,
      });

      const newUser = {
        id: 'user-123',
        email: 'new@example.com',
        name: 'New User',
        role: 'user',
        isOnboarded: false,
      };

      mockUserRepo.create.mockReturnValue(newUser);
      mockUserRepo.save.mockResolvedValue(newUser);

      const result = await authService.signInOrRegister(
        'new@example.com',
        'Password123!',
        'New User'
      );

      expect(result.user.isOnboarded).toBe(false);
    });

    it('should auto-login after registration', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);
      (cognitoService.signUp as jest.Mock).mockResolvedValue('user-123');
      (cognitoService.addToGroup as jest.Mock).mockResolvedValue(undefined);
      (cognitoService.signIn as jest.Mock).mockResolvedValue({
        AccessToken: 'token',
        IdToken: 'token',
        RefreshToken: 'token',
        ExpiresIn: 3600,
      });

      mockUserRepo.create.mockReturnValue({});
      mockUserRepo.save.mockResolvedValue({});

      await authService.signInOrRegister(
        'new@example.com',
        'Password123!',
        'New User'
      );

      expect(cognitoService.signIn).toHaveBeenCalledWith(
        'new@example.com',
        'Password123!'
      );
    });

    it('should throw error when name not provided on registration', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        authService.signInOrRegister('new@example.com', 'Password123!')
      ).rejects.toThrow('Name is required for registration');
    });
  });
});
