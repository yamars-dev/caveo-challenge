import { AccountService } from '../account.service';
import { cognitoService } from '../cognito.service';
import { AppDataSource } from '../../entities';
import { UserEntity } from '../../entities/user.entity';

jest.mock('../cognito.service');
jest.mock('../../entities');

describe('AccountService', () => {
  let accountService: AccountService;
  let mockUserRepo: any;

  beforeEach(() => {
    accountService = new AccountService();
    
    mockUserRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockUserRepo);
    jest.clearAllMocks();
  });

  describe('getAccountDetails', () => {
    it('should return user details', async () => {
      const user = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        role: 'user',
        isOnboarded: true,
      };

      mockUserRepo.findOne.mockResolvedValue(user);

      const result = await accountService.getAccountDetails('user-123');

      expect(result).toEqual({
        id: 'user-123',
        email: 'user@example.com',
        name: 'Test User',
        role: 'user',
        isOnboarded: true,
      });

      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should throw error when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        accountService.getAccountDetails('nonexistent')
      ).rejects.toThrow('User not found');
    });
  });

  describe('updateProfile - User Permissions', () => {
    it('should allow user to edit own name', async () => {
      const currentUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Old Name',
        role: 'user',
        isOnboarded: false,
      };

      mockUserRepo.findOne.mockResolvedValue(currentUser);
      (cognitoService.updateUserAttributes as jest.Mock).mockResolvedValue(undefined);

      const updatedUser = {
        ...currentUser,
        name: 'New Name',
        isOnboarded: true,
      };

      mockUserRepo.save.mockResolvedValue(updatedUser);

      const result = await accountService.updateProfile({
        currentUserId: 'user-123',
        isAdmin: false,
        accessToken: 'access-token',
        data: { name: 'New Name' }
      });

      expect(result).toEqual({
        id: 'user-123',
        email: 'user@example.com',
        name: 'New Name',
        role: 'user',
        isOnboarded: true,
      });

      expect(cognitoService.updateUserAttributes).toHaveBeenCalledWith(
        'access-token',
        { name: 'New Name' }
      );
    });

    it('should set isOnboarded to true when updating name', async () => {
      const currentUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Old Name',
        role: 'user',
        isOnboarded: false,
      };

      mockUserRepo.findOne.mockResolvedValue(currentUser);
      (cognitoService.updateUserAttributes as jest.Mock).mockResolvedValue(undefined);

      const updatedUser = {
        ...currentUser,
        name: 'New Name',
        isOnboarded: true,
      };

      mockUserRepo.save.mockResolvedValue(updatedUser);

      const result = await accountService.updateProfile({
        currentUserId: 'user-123',
        isAdmin: false,
        accessToken: 'access-token',
        data: { name: 'New Name' }
      });

      expect(result.isOnboarded).toBe(true);
    });

    it('should block user from editing another user', async () => {
      const otherUser = {
        id: 'other-user',
        email: 'other@example.com',
        name: 'Other User',
        role: 'user',
        isOnboarded: true,
      };

      // Mock para retornar o outro usuário quando buscar por 'other-user'
      mockUserRepo.findOne.mockResolvedValue(otherUser);

      await expect(
        accountService.updateProfile({
          currentUserId: 'user-123',
          isAdmin: false,
          accessToken: 'access-token',
          data: { userId: 'other-user', name: 'Hacked Name' }
        })
      ).rejects.toThrow('You can only edit your own profile');
    });

    it('should block user from editing role', async () => {
      const currentUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'User',
        role: 'user',
        isOnboarded: true,
      };

      mockUserRepo.findOne.mockResolvedValue(currentUser);

      await expect(
        accountService.updateProfile({
          currentUserId: 'user-123',
          isAdmin: false,
          accessToken: 'access-token',
          data: { role: 'admin' }
        })
      ).rejects.toThrow('You do not have permission to change roles');
    });
  });

  describe('updateProfile - Admin Permissions', () => {
    it('should allow admin to edit any user name', async () => {
      const targetUser = {
        id: 'other-user',
        email: 'other@example.com',
        name: 'Old Name',
        role: 'user',
        isOnboarded: true,
      };

      mockUserRepo.findOne.mockResolvedValue(targetUser);
      (cognitoService.updateUserAttributes as jest.Mock).mockResolvedValue(undefined);

      const updatedUser = {
        ...targetUser,
        name: 'New Name',
      };

      mockUserRepo.save.mockResolvedValue(updatedUser);

      const result = await accountService.updateProfile({
        currentUserId: 'admin-123',
        isAdmin: true,
        accessToken: 'admin-access-token',
        data: { userId: 'other-user', name: 'New Name' }
      });

      expect(result.name).toBe('New Name');
      expect(cognitoService.updateUserAttributes).toHaveBeenCalledWith(
        'admin-access-token',
        { name: 'New Name' }
      );
    });

    it('should allow admin to edit any user role', async () => {
      const targetUser = {
        id: 'other-user',
        email: 'other@example.com',
        name: 'User',
        role: 'user',
        isOnboarded: true,
      };

      mockUserRepo.findOne.mockResolvedValue(targetUser);
      (cognitoService.addToGroup as jest.Mock).mockResolvedValue(undefined);

      const updatedUser = {
        ...targetUser,
        role: 'admin',
      };

      mockUserRepo.save.mockResolvedValue(updatedUser);

      const result = await accountService.updateProfile({
        currentUserId: 'admin-123',
        isAdmin: true,
        accessToken: 'admin-access-token',
        data: { userId: 'other-user', role: 'admin' }
      });

      expect(result.role).toBe('admin');
      expect(cognitoService.addToGroup).toHaveBeenCalledWith(
        'other@example.com',
        'admin'
      );
    });

    it('should allow admin to edit name and role simultaneously', async () => {
      const targetUser = {
        id: 'other-user',
        email: 'other@example.com',
        name: 'Old Name',
        role: 'user',
        isOnboarded: true,
      };

      mockUserRepo.findOne.mockResolvedValue(targetUser);
      (cognitoService.updateUserAttributes as jest.Mock).mockResolvedValue(undefined);
      (cognitoService.addToGroup as jest.Mock).mockResolvedValue(undefined);

      const updatedUser = {
        ...targetUser,
        name: 'New Name',
        role: 'admin',
      };

      mockUserRepo.save.mockResolvedValue(updatedUser);

      const result = await accountService.updateProfile({
        currentUserId: 'admin-123',
        isAdmin: true,
        accessToken: 'admin-access-token',
        data: { userId: 'other-user', name: 'New Name', role: 'admin' }
      });

      expect(result.name).toBe('New Name');
      expect(result.role).toBe('admin');
    });

    it('should block admin from demoting themselves from admin to user', async () => {
      const adminUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin',
        isOnboarded: true,
      };

      mockUserRepo.findOne.mockResolvedValue(adminUser);

      await expect(
        accountService.updateProfile({
          currentUserId: 'admin-123',
          isAdmin: true,
          accessToken: 'admin-access-token',
          data: { role: 'user' }
        })
      ).rejects.toThrow('You cannot demote yourself from admin');
    });
  });

  describe('updateProfile - Validations', () => {
    it('should throw error when target user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        accountService.updateProfile({
          currentUserId: 'admin-123',
          isAdmin: true,
          accessToken: 'admin-access-token',
          data: { userId: 'nonexistent', name: 'New Name' }
        })
      ).rejects.toThrow('User not found');
    });

    it('should not throw error when Cognito fails to update attributes', async () => {
      const currentUser = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Old Name',
        role: 'user',
        isOnboarded: true,
      };

      mockUserRepo.findOne.mockResolvedValue(currentUser);
      (cognitoService.updateUserAttributes as jest.Mock).mockRejectedValue(
        new Error('Cognito error')
      );
      mockUserRepo.save.mockResolvedValue({
        ...currentUser,
        name: 'New Name',
      });

      // The method should not throw error, only log
      const result = await accountService.updateProfile({
        currentUserId: 'user-123',
        isAdmin: false,
        accessToken: 'access-token',
        data: { name: 'New Name' }
      });

      expect(result.name).toBe('New Name');
      expect(cognitoService.updateUserAttributes).toHaveBeenCalled();
    });

    it('should not throw error when Cognito fails to add to group', async () => {
      const targetUser = {
        id: 'other-user',
        email: 'other@example.com',
        name: 'User',
        role: 'user',
        isOnboarded: true,
      };

      mockUserRepo.findOne.mockResolvedValue(targetUser);
      (cognitoService.addToGroup as jest.Mock).mockRejectedValue(
        new Error('Cognito group error')
      );
      mockUserRepo.save.mockResolvedValue({
        ...targetUser,
        role: 'admin',
      });

      // The method should not throw error, only log
      const result = await accountService.updateProfile({
        currentUserId: 'admin-123',
        isAdmin: true,
        accessToken: 'admin-access-token',
        data: { userId: 'other-user', role: 'admin' }
      });

      expect(result.role).toBe('admin');
      expect(cognitoService.addToGroup).toHaveBeenCalled();
    });
  });
});
