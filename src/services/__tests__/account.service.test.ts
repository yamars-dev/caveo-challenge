import { AccountService } from '../account.service.js';
import { AppDataSource } from '../../entities/index.js';
import { UserEntity } from '../../entities/user.entity.js';
import { cognitoService } from '../cognito.service.js';

// Mock AppDataSource
jest.mock('../../entities/index.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

// Mock cognitoService
jest.mock('../cognito.service.js', () => ({
  cognitoService: {
    updateUserAttributes: jest.fn(),
  },
}));

describe('AccountService', () => {
  let accountService: AccountService;
  let mockUserRepository: any;

  beforeEach(() => {
    accountService = new AccountService();

    mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockUserRepository);
    jest.clearAllMocks();
  });

  describe('getAccountDetails', () => {
    it('should return user profile successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        isOnboarded: true,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await accountService.getAccountDetails('user-123');

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        isOnboarded: true,
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(accountService.getAccountDetails('nonexistent')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user name successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Old Name',
        role: 'user',
        isOnboarded: false,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      (cognitoService.updateUserAttributes as jest.Mock).mockResolvedValue(undefined);

      const result = await accountService.updateProfile('user-123', false, 'mock-token', {
        name: 'New Name',
      });

      expect(mockUser.name).toBe('New Name');
      expect(mockUser.isOnboarded).toBe(true);
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
      expect(cognitoService.updateUserAttributes).toHaveBeenCalledWith('mock-token', {
        name: 'New Name',
      });
      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'New Name',
        role: 'user',
        isOnboarded: true,
      });
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(
        accountService.updateProfile('nonexistent', false, 'mock-token', { name: 'New Name' })
      ).rejects.toThrow('User not found');
    });

    it('should update profile without access token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Old Name',
        role: 'user',
        isOnboarded: false,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      const result = await accountService.updateProfile('user-123', false, '', {
        name: 'New Name',
      });

      expect(mockUser.name).toBe('New Name');
      expect(mockUser.isOnboarded).toBe(true);
      expect(cognitoService.updateUserAttributes).not.toHaveBeenCalled();
      expect(result.name).toBe('New Name');
    });

    it('should handle cognito update failure gracefully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Old Name',
        role: 'user',
        isOnboarded: false,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      (cognitoService.updateUserAttributes as jest.Mock).mockRejectedValue(
        new Error('Cognito error')
      );

      const result = await accountService.updateProfile('user-123', false, 'mock-token', {
        name: 'New Name',
      });

      // Should still update database even if Cognito fails
      expect(result.name).toBe('New Name');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });
  });
});
