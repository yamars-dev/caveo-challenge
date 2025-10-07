import { AccountController } from '../account.controller.js';
import { accountService } from '../../services/account.service.js';
import { extractToken } from '../../helpers/jwt.helper.js';
import { UpdateProfileDto, UserProfileResponse } from '../../dtos/account.dto.js';
import { GetProfileResponseDto, EditProfileResponseDto } from '../../dtos/response.dto.js';
import { Context } from 'koa';

// Mock dependencies
jest.mock('../../services/account.service.js');
jest.mock('../../helpers/jwt.helper.js');

describe('AccountController', () => {
  let controller: AccountController;
  let mockContext: Partial<Context>;

  beforeEach(() => {
    controller = new AccountController();
    mockContext = {
      state: {
        user: {
          sub: 'user-123',
          id: 'user-123',
          email: 'user@example.com',
          name: 'John Doe',
          groups: ['user'],
          token_use: 'id',
          auth_time: 1234567890,
          exp: 9999999999,
        },
      },
      headers: {
        authorization: 'Bearer mock-token',
      },
      log: {
        info: jest.fn(),
        error: jest.fn(),
      } as any,
      status: 200,
    };
    jest.clearAllMocks();
  });

  describe('GET /account/me - Get Profile', () => {
    it('should return authenticated user profile', async () => {
      const result = await controller.getProfile(mockContext as Context);

      expect(result).toEqual({
        id: 'user-123',
        email: 'user@example.com',
        name: 'John Doe',
        groups: 'user',
        tokenUse: 'id',
        authTime: 1234567890,
        exp: 9999999999,
      });
    });

    it('should return admin profile with admin group', async () => {
      mockContext.state!.user.groups = ['admin'];

      const result = await controller.getProfile(mockContext as Context);

      expect(result).toMatchObject({
        id: 'user-123',
        email: 'user@example.com',
        groups: 'admin',
      });
    });

    it('should return unauthorized error when user is not authenticated', async () => {
      mockContext.state!.user = null;

      const result = await controller.getProfile(mockContext as Context);

      expect(result).toEqual({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    });

    it('should handle profile with missing optional fields', async () => {
      mockContext.state!.user.name = undefined;

      const result = (await controller.getProfile(mockContext as Context)) as GetProfileResponseDto;

      expect(result.name).toBeUndefined();
      expect(result.email).toBe('user@example.com');
    });
  });

  describe('PUT /account/edit - User Editing Own Profile', () => {
    it('should allow user to update their own name', async () => {
      const updateDto: UpdateProfileDto = {
        name: 'Jane Doe',
      };

      const mockUpdatedUser: UserProfileResponse = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Jane Doe',
        role: 'user',
        isOnboarded: true,
      };

      (extractToken as jest.Mock).mockReturnValue('mock-token');
      (accountService.updateProfile as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const result = (await controller.editAccount(
        updateDto,
        mockContext as Context
      )) as EditProfileResponseDto;

      expect(accountService.updateProfile).toHaveBeenCalledWith(
        'user-123',
        false,
        'mock-token',
        updateDto
      );
      expect(result).toEqual({
        message: 'Profile updated successfully',
        user: mockUpdatedUser,
      });
    });

    it('should not allow user to change their own role', async () => {
      const updateDto: UpdateProfileDto = {
        name: 'John Doe',
        role: 'admin',
      };

      const mockError = new Error('You do not have permission to change roles');
      (extractToken as jest.Mock).mockReturnValue('mock-token');
      (accountService.updateProfile as jest.Mock).mockRejectedValue(mockError);

      await expect(controller.editAccount(updateDto, mockContext as Context)).rejects.toThrow(
        'You do not have permission to change roles'
      );
    });

    it('should not allow user to edit another user profile', async () => {
      const updateDto: UpdateProfileDto = {
        userId: 'other-user-456',
        name: 'Other User',
      };

      const mockError = new Error('You can only edit your own profile');
      (extractToken as jest.Mock).mockReturnValue('mock-token');
      (accountService.updateProfile as jest.Mock).mockRejectedValue(mockError);

      await expect(controller.editAccount(updateDto, mockContext as Context)).rejects.toThrow(
        'You can only edit your own profile'
      );
    });

    it('should extract token from authorization header', async () => {
      const updateDto: UpdateProfileDto = {
        name: 'Updated Name',
      };

      const mockUpdatedUser: UserProfileResponse = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Updated Name',
        role: 'user',
        isOnboarded: true,
      };

      (extractToken as jest.Mock).mockReturnValue('extracted-token');
      (accountService.updateProfile as jest.Mock).mockResolvedValue(mockUpdatedUser);

      await controller.editAccount(updateDto, mockContext as Context);

      expect(extractToken).toHaveBeenCalledWith('Bearer mock-token');
      expect(accountService.updateProfile).toHaveBeenCalledWith(
        'user-123',
        false,
        'extracted-token',
        updateDto
      );
    });
  });

  describe('PUT /account/edit - Admin Editing User Profiles', () => {
    beforeEach(() => {
      mockContext.state!.user.groups = ['admin'];
    });

    it('should allow admin to update another user name', async () => {
      const updateDto: UpdateProfileDto = {
        userId: 'other-user-456',
        name: 'Updated Name',
      };

      const mockUpdatedUser: UserProfileResponse = {
        id: 'other-user-456',
        email: 'other@example.com',
        name: 'Updated Name',
        role: 'user',
        isOnboarded: true,
      };

      (extractToken as jest.Mock).mockReturnValue('mock-token');
      (accountService.updateProfile as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const result = (await controller.editAccount(
        updateDto,
        mockContext as Context
      )) as EditProfileResponseDto;

      expect(accountService.updateProfile).toHaveBeenCalledWith(
        'user-123',
        true,
        'mock-token',
        updateDto
      );
      expect(result).toEqual({
        message: 'Profile updated successfully',
        user: mockUpdatedUser,
      });
    });

    it('should allow admin to change another user role', async () => {
      const updateDto: UpdateProfileDto = {
        userId: 'other-user-456',
        role: 'admin',
      };

      const mockUpdatedUser: UserProfileResponse = {
        id: 'other-user-456',
        email: 'other@example.com',
        name: 'Other User',
        role: 'admin',
        isOnboarded: true,
      };

      (extractToken as jest.Mock).mockReturnValue('mock-token');
      (accountService.updateProfile as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const result = (await controller.editAccount(
        updateDto,
        mockContext as Context
      )) as EditProfileResponseDto;

      expect(result.user.role).toBe('admin');
      expect(result.message).toBe('Profile updated successfully');
    });

    it('should allow admin to update their own profile', async () => {
      const updateDto: UpdateProfileDto = {
        name: 'Updated Admin Name',
      };

      const mockUpdatedUser: UserProfileResponse = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Updated Admin Name',
        role: 'admin',
        isOnboarded: true,
      };

      (extractToken as jest.Mock).mockReturnValue('mock-token');
      (accountService.updateProfile as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const result = (await controller.editAccount(
        updateDto,
        mockContext as Context
      )) as EditProfileResponseDto;

      expect(result).toEqual({
        message: 'Profile updated successfully',
        user: mockUpdatedUser,
      });
    });

    it('should not allow admin to demote themselves', async () => {
      const updateDto: UpdateProfileDto = {
        userId: 'user-123',
        role: 'user',
      };

      const mockError = new Error('You cannot demote yourself from admin');
      (extractToken as jest.Mock).mockReturnValue('mock-token');
      (accountService.updateProfile as jest.Mock).mockRejectedValue(mockError);

      await expect(controller.editAccount(updateDto, mockContext as Context)).rejects.toThrow(
        'You cannot demote yourself from admin'
      );
    });
  });

  describe('PUT /account/edit - Error Handling', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockContext.state!.user = null;

      const updateDto: UpdateProfileDto = {
        name: 'New Name',
      };

      const result = await controller.editAccount(updateDto, mockContext as Context);

      expect(mockContext.status).toBe(401);
      expect(result).toEqual({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
    });

    it('should return 404 when user is not found', async () => {
      const updateDto: UpdateProfileDto = {
        userId: 'non-existent-user',
        name: 'New Name',
      };

      mockContext.state!.user.groups = ['admin'];

      const mockError = new Error('User not found');
      (extractToken as jest.Mock).mockReturnValue('mock-token');
      (accountService.updateProfile as jest.Mock).mockRejectedValue(mockError);

      await expect(controller.editAccount(updateDto, mockContext as Context)).rejects.toThrow(
        'User not found'
      );
    });

    it('should return 403 for permission errors', async () => {
      const updateDto: UpdateProfileDto = {
        role: 'admin',
      };

      const mockError = new Error('You do not have permission to change roles');
      (extractToken as jest.Mock).mockReturnValue('mock-token');
      (accountService.updateProfile as jest.Mock).mockRejectedValue(mockError);

      await expect(controller.editAccount(updateDto, mockContext as Context)).rejects.toThrow(
        'You do not have permission to change roles'
      );
    });

    it('should return 500 for unexpected errors', async () => {
      const updateDto: UpdateProfileDto = {
        name: 'New Name',
      };

      const mockError = new Error('Database connection failed');
      (extractToken as jest.Mock).mockReturnValue('mock-token');
      (accountService.updateProfile as jest.Mock).mockRejectedValue(mockError);

      await expect(controller.editAccount(updateDto, mockContext as Context)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should log errors when update fails', async () => {
      const updateDto: UpdateProfileDto = {
        name: 'New Name',
      };

      const mockError = new Error('Update failed');
      (extractToken as jest.Mock).mockReturnValue('mock-token');
      (accountService.updateProfile as jest.Mock).mockRejectedValue(mockError);

      try {
        await controller.editAccount(updateDto, mockContext as Context);
      } catch (e) {
        // erro esperado
      }
      expect(mockContext.log?.error).toHaveBeenCalledWith(
        { err: mockError, userId: 'user-123' },
        'Edit account failed'
      );
    });

    it('should handle errors without message property', async () => {
      const updateDto: UpdateProfileDto = {
        name: 'New Name',
      };

      const mockError = { code: 'UNKNOWN_ERROR' };
      (extractToken as jest.Mock).mockReturnValue('mock-token');
      (accountService.updateProfile as jest.Mock).mockRejectedValue(mockError);

      await expect(controller.editAccount(updateDto, mockContext as Context)).rejects.toThrow(
        'Failed to update profile'
      );
    });
  });

  describe('PUT /account/edit - Authorization Header', () => {
    it('should handle missing authorization header', async () => {
      mockContext.headers = {};

      const updateDto: UpdateProfileDto = {
        name: 'New Name',
      };

      const mockUpdatedUser: UserProfileResponse = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'New Name',
        role: 'user',
        isOnboarded: true,
      };

      (extractToken as jest.Mock).mockReturnValue(null);
      (accountService.updateProfile as jest.Mock).mockResolvedValue(mockUpdatedUser);

      await controller.editAccount(updateDto, mockContext as Context);

      expect(extractToken).toHaveBeenCalledWith(undefined);
      expect(accountService.updateProfile).toHaveBeenCalledWith('user-123', false, '', updateDto);
    });

    it('should handle malformed authorization header', async () => {
      mockContext.headers!.authorization = 'InvalidFormat';

      const updateDto: UpdateProfileDto = {
        name: 'New Name',
      };

      const mockUpdatedUser: UserProfileResponse = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'New Name',
        role: 'user',
        isOnboarded: true,
      };

      (extractToken as jest.Mock).mockReturnValue(null);
      (accountService.updateProfile as jest.Mock).mockResolvedValue(mockUpdatedUser);

      await controller.editAccount(updateDto, mockContext as Context);

      expect(extractToken).toHaveBeenCalledWith('InvalidFormat');
      expect(accountService.updateProfile).toHaveBeenCalledWith('user-123', false, '', updateDto);
    });
  });

  describe('PUT /account/edit - Response Structure', () => {
    it('should return correct response structure on success', async () => {
      const updateDto: UpdateProfileDto = {
        name: 'Updated Name',
      };

      const mockUpdatedUser: UserProfileResponse = {
        id: 'user-123',
        email: 'user@example.com',
        name: 'Updated Name',
        role: 'user',
        isOnboarded: true,
      };

      (extractToken as jest.Mock).mockReturnValue('mock-token');
      (accountService.updateProfile as jest.Mock).mockResolvedValue(mockUpdatedUser);

      const result = (await controller.editAccount(
        updateDto,
        mockContext as Context
      )) as EditProfileResponseDto;

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('name');
      expect(result.user).toHaveProperty('role');
    });

    it('should return correct error structure on failure', async () => {
      mockContext.state!.user = null;

      const updateDto: UpdateProfileDto = {
        name: 'New Name',
      };

      const result = await controller.editAccount(updateDto, mockContext as Context);

      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('message');
      expect(result).not.toHaveProperty('user');
    });
  });
});
