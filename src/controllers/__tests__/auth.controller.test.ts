import { AuthController } from '../auth.controller.js';
import { authService } from '../../services/auth.service.js';
import { SignInOrRegisterDto } from '../../dtos/auth.dto.js';
import { AuthResponseDto } from '../../dtos/response.dto.js';
import { Context } from 'koa';


// Mock dependencies
jest.mock('../../services/auth.service.js');

describe('AuthController', () => {
  let controller: AuthController;
  let mockContext: Partial<Context>;

  beforeEach(() => {
    controller = new AuthController();
    mockContext = {
      log: {
        info: jest.fn(),
        error: jest.fn(),
      } as any,
      status: 200,
      cookies: {
        set: jest.fn(),
        get: jest.fn(),
      } as any,
    };
    jest.clearAllMocks();
  });

  describe('POST /auth - Sign In', () => {
    const signInDto: SignInOrRegisterDto = {
      email: 'user@example.com',
      password: 'password123',
      name: 'John Doe',
    };

    it('should return success message and tokens for existing user', async () => {
      const mockServiceResponse = {
        message: 'Login successful',
        user: {
          id: 'user-123',
          email: 'user@example.com',
          name: 'John Doe',
          role: 'user' as const,
          isOnboarded: true,
        },
        tokens: {
          AccessToken: 'mock-access-token',
          IdToken: 'mock-id-token',
          RefreshToken: 'mock-refresh-token',
          ExpiresIn: 3600,
        },
        isNewUser: false,
      };

      (authService.signInOrRegister as jest.Mock).mockResolvedValue(mockServiceResponse);

      const result = await controller.signInOrRegister(signInDto, mockContext as Context);

      expect(authService.signInOrRegister).toHaveBeenCalledWith(
        signInDto.email,
        signInDto.password,
        signInDto.name
      );
      expect(result.message).toBe('Login successful');
      expect(result.user).toEqual(mockServiceResponse.user);
      expect(result.tokens).toEqual(mockServiceResponse.tokens);
      expect(mockContext.log?.info).toHaveBeenCalledWith(
        { email: signInDto.email },
        'Authentication attempt'
      );
      expect(mockContext.log?.info).toHaveBeenCalledWith(
        { userId: 'user-123', isNewUser: false },
        'Authentication successful'
      );
    });

    it('should handle authentication with minimal user data', async () => {
      const mockServiceResponse = {
        message: 'Login successful',
        user: {
          id: 'user-456',
          email: 'user2@example.com',
          name: '',
          role: 'user' as const,
          isOnboarded: false,
        },
        tokens: {
          AccessToken: 'mock-access-token',
          IdToken: 'mock-id-token',
          RefreshToken: 'mock-refresh-token',
          ExpiresIn: 3600,
        },
        isNewUser: false,
      };

      (authService.signInOrRegister as jest.Mock).mockResolvedValue(mockServiceResponse);

      const result = await controller.signInOrRegister(signInDto, mockContext as Context);

      expect(result.user.name).toBe('');
      expect(result.user.isOnboarded).toBe(false);
    });
  });

  describe('POST /auth - Registration', () => {
    const registerDto: SignInOrRegisterDto = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
    };

    it('should return registration message for new user', async () => {
      const mockServiceResponse = {
        message: 'Registration successful',
        user: {
          id: 'new-user-123',
          email: 'newuser@example.com',
          name: 'New User',
          role: 'user' as const,
          isOnboarded: false,
        },
        tokens: {
          AccessToken: 'mock-access-token',
          IdToken: 'mock-id-token',
          RefreshToken: 'mock-refresh-token',
          ExpiresIn: 3600,
        },
        isNewUser: true,
      };

      (authService.signInOrRegister as jest.Mock).mockResolvedValue(mockServiceResponse);

      const result = await controller.signInOrRegister(registerDto, mockContext as Context);

      expect(authService.signInOrRegister).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.password,
        registerDto.name
      );
      expect(result.message).toBe('Registration successful');
      expect(result.user.isOnboarded).toBe(false);
      expect(result.user.id).toBe('new-user-123');
      expect(result.tokens.AccessToken).toBeDefined();
      expect(result.tokens.IdToken).toBeDefined();
      expect(result.tokens.RefreshToken).toBeDefined();
    });

    it('should log registration success', async () => {
      const mockServiceResponse = {
        message: 'Registration successful',
        user: {
          id: 'new-user-123',
          email: 'newuser@example.com',
          name: 'New User',
          role: 'user' as const,
          isOnboarded: false,
        },
        tokens: {
          AccessToken: 'mock-access-token',
          IdToken: 'mock-id-token',
          RefreshToken: 'mock-refresh-token',
          ExpiresIn: 3600,
        },
        isNewUser: true,
      };

      (authService.signInOrRegister as jest.Mock).mockResolvedValue(mockServiceResponse);

      await controller.signInOrRegister(registerDto, mockContext as Context);

      expect(mockContext.log?.info).toHaveBeenCalledWith(
        { userId: 'new-user-123', isNewUser: true },
        'Authentication successful'
      );
    });
  });

  describe('POST /auth - Error Handling', () => {
    const signInDto: SignInOrRegisterDto = {
      email: 'user@example.com',
      password: 'wrongpassword',
      name: 'John Doe',
    };

    it('should handle service errors and log them', async () => {
      const mockError = new Error('Invalid credentials');
      (authService.signInOrRegister as jest.Mock).mockRejectedValue(mockError);

      await expect(controller.signInOrRegister(signInDto, mockContext as Context)).rejects.toThrow(
        'Invalid credentials'
      );

      expect(mockContext.log?.error).toHaveBeenCalledWith(
        {
          errorMessage: mockError.message,
          errorCode: undefined,
          email: signInDto.email,
        },
        'Authentication failed'
      );
      expect(mockContext.log?.info).toHaveBeenCalledWith(
        { email: signInDto.email },
        'Authentication attempt'
      );
    });

    it('should handle different error types', async () => {
      const mockError = new Error('UserNotFoundException');
      (authService.signInOrRegister as jest.Mock).mockRejectedValue(mockError);

      await expect(controller.signInOrRegister(signInDto, mockContext as Context)).rejects.toThrow(
        'UserNotFoundException'
      );

      expect(mockContext.log?.error).toHaveBeenCalled();
    });

    it('should log authentication attempt even when it fails', async () => {
      const mockError = new Error('Authentication failed');
      (authService.signInOrRegister as jest.Mock).mockRejectedValue(mockError);

      try {
        await controller.signInOrRegister(signInDto, mockContext as Context);
      } catch {
        // Expected to throw
      }

      expect(mockContext.log?.info).toHaveBeenCalledWith(
        { email: signInDto.email },
        'Authentication attempt'
      );
      expect(mockContext.log?.error).toHaveBeenCalled();
    });
  });

  describe('POST /auth - Response Structure', () => {
    const signInDto: SignInOrRegisterDto = {
      email: 'user@example.com',
      password: 'password123',
      name: 'John Doe',
    };

    it('should return correct response structure with all required fields', async () => {
      const mockAuthResponse: AuthResponseDto = {
        message: 'Login successful.',
        user: {
          id: 'user-123',
          email: 'user@example.com',
          name: 'John Doe',
          role: 'admin' as const,
          isOnboarded: true,
        },
        tokens: {
          AccessToken: 'mock-access-token',
          IdToken: 'mock-id-token',
          RefreshToken: 'mock-refresh-token',
          ExpiresIn: 3600,
        },
      };

      (authService.signInOrRegister as jest.Mock).mockResolvedValue(mockAuthResponse);

      const result = await controller.signInOrRegister(signInDto, mockContext as Context);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('name');
      expect(result.user).toHaveProperty('role');
      expect(result.user).toHaveProperty('isOnboarded');
      expect(result.tokens).toHaveProperty('AccessToken');
      expect(result.tokens).toHaveProperty('IdToken');
      expect(result.tokens).toHaveProperty('RefreshToken');
      expect(result.tokens).toHaveProperty('ExpiresIn');
      expect(result.user.role).toBe('admin');
    });
  });
});
