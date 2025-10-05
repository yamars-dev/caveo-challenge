import { mockClient } from 'aws-sdk-client-mock';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  AdminAddUserToGroupCommand,
  UpdateUserAttributesCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { CognitoService } from '../cognito.service';

const cognitoMock = mockClient(CognitoIdentityProviderClient);

describe('CognitoService', () => {
  let cognitoService: CognitoService;

  beforeEach(() => {
    cognitoMock.reset();
    cognitoService = new CognitoService();
  });

  describe('signUp', () => {
    it('should create user in Cognito successfully', async () => {
      const userSub = 'abc-123-def';
      cognitoMock.on(SignUpCommand).resolves({
        UserSub: userSub,
      });

      const result = await cognitoService.signUp(
        'test@example.com',
        'Password123!',
        'Test User'
      );

      expect(result).toBe(userSub);
      expect(cognitoMock.calls()).toHaveLength(1);
    });

    it('should send correct attributes on signup', async () => {
      cognitoMock.on(SignUpCommand).resolves({ UserSub: 'abc-123' });

      await cognitoService.signUp('test@example.com', 'Password123!', 'Test User');

      const calls = cognitoMock.calls();
      const signUpCall = calls[0].args[0] as any;

      expect(signUpCall.input.Username).toBe('test@example.com');
      expect(signUpCall.input.Password).toBe('Password123!');
      expect(signUpCall.input.UserAttributes).toEqual([
        { Name: 'email', Value: 'test@example.com' },
        { Name: 'name', Value: 'Test User' },
      ]);
    });

    it('should throw error when email already exists', async () => {
      cognitoMock.on(SignUpCommand).rejects({
        name: 'UsernameExistsException',
        message: 'User already exists',
      });

      await expect(
        cognitoService.signUp('existing@example.com', 'Password123!', 'Test')
      ).rejects.toThrow('Email already registered');
    });

    it('should throw error when password does not meet requirements', async () => {
      cognitoMock.on(SignUpCommand).rejects({
        name: 'InvalidPasswordException',
        message: 'Password does not meet requirements',
      });

      await expect(
        cognitoService.signUp('test@example.com', 'weak', 'Test')
      ).rejects.toThrow('Password does not meet requirements');
    });

    it('should throw error when invalid parameters', async () => {
      cognitoMock.on(SignUpCommand).rejects({
        name: 'InvalidParameterException',
        message: 'Invalid parameter',
      });

      await expect(
        cognitoService.signUp('invalid-email', 'Password123!', 'Test')
      ).rejects.toThrow('Invalid email or password format');
    });
  });

  describe('signIn', () => {
    it('should authenticate user with valid credentials', async () => {
      const mockTokens = {
        AccessToken: 'mock-access-token',
        IdToken: 'mock-id-token',
        RefreshToken: 'mock-refresh-token',
        ExpiresIn: 3600,
      };

      cognitoMock.on(InitiateAuthCommand).resolves({
        AuthenticationResult: mockTokens,
      });

      const result = await cognitoService.signIn('test@example.com', 'Password123!');

      expect(result).toEqual(mockTokens);
    });

    it('should use USER_PASSWORD_AUTH flow', async () => {
      cognitoMock.on(InitiateAuthCommand).resolves({
        AuthenticationResult: {
          AccessToken: 'token',
          IdToken: 'token',
          RefreshToken: 'token',
          ExpiresIn: 3600,
        },
      });

      await cognitoService.signIn('test@example.com', 'Password123!');

      const calls = cognitoMock.calls();
      const authCall = calls[0].args[0] as any;

      expect(authCall.input.AuthFlow).toBe('USER_PASSWORD_AUTH');
      expect(authCall.input.AuthParameters).toEqual({
        USERNAME: 'test@example.com',
        PASSWORD: 'Password123!',
      });
    });

    it('should throw error when user not found', async () => {
      cognitoMock.on(InitiateAuthCommand).rejects({
        name: 'UserNotFoundException',
        message: 'User not found',
      });

      await expect(
        cognitoService.signIn('notfound@example.com', 'Password123!')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error when invalid credentials', async () => {
      cognitoMock.on(InitiateAuthCommand).rejects({
        name: 'NotAuthorizedException',
        message: 'Incorrect username or password',
      });

      await expect(
        cognitoService.signIn('test@example.com', 'WrongPassword')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error when user is disabled', async () => {
      cognitoMock.on(InitiateAuthCommand).rejects({
        name: 'UserDisabledException',
        message: 'User is disabled',
      });

      await expect(
        cognitoService.signIn('disabled@example.com', 'Password123!')
      ).rejects.toThrow('User account is disabled');
    });

    it('should throw error after too many attempts', async () => {
      cognitoMock.on(InitiateAuthCommand).rejects({
        name: 'TooManyRequestsException',
        message: 'Too many requests',
      });

      await expect(
        cognitoService.signIn('test@example.com', 'Password123!')
      ).rejects.toThrow('Too many login attempts. Please try again later');
    });
  });

  describe('addToGroup', () => {
    it('should add user to admin group', async () => {
      cognitoMock.on(AdminAddUserToGroupCommand).resolves({});

      await cognitoService.addToGroup('test@example.com', 'admin');

      const calls = cognitoMock.calls();
      const addToGroupCall = calls[0].args[0] as any;

      expect(addToGroupCall.input.Username).toBe('test@example.com');
      expect(addToGroupCall.input.GroupName).toBe('admin');
    });

    it('should add user to user group', async () => {
      cognitoMock.on(AdminAddUserToGroupCommand).resolves({});

      await cognitoService.addToGroup('test@example.com', 'user');

      const calls = cognitoMock.calls();
      const addToGroupCall = calls[0].args[0] as any;

      expect(addToGroupCall.input.GroupName).toBe('user');
    });
  });

  describe('updateUserAttributes', () => {
    it('should update name attribute with Access Token', async () => {
      cognitoMock.on(UpdateUserAttributesCommand).resolves({});

      await cognitoService.updateUserAttributes('mock-access-token', {
        name: 'New Name',
      });

      const calls = cognitoMock.calls();
      const updateCall = calls[0].args[0] as any;

      expect(updateCall.input.AccessToken).toBe('mock-access-token');
      expect(updateCall.input.UserAttributes).toEqual([
        { Name: 'name', Value: 'New Name' },
      ]);
    });

    it('should do nothing when no attributes provided', async () => {
      await cognitoService.updateUserAttributes('mock-token', {});

      expect(cognitoMock.calls()).toHaveLength(0);
    });

    it('should throw error when invalid token', async () => {
      cognitoMock.on(UpdateUserAttributesCommand).rejects({
        name: 'NotAuthorizedException',
        message: 'Invalid access token',
      });

      await expect(
        cognitoService.updateUserAttributes('invalid-token', { name: 'Test' })
      ).rejects.toThrow('Invalid or expired access token');
    });

    it('should return without calling when no attributes', async () => {
      const result = await cognitoService.updateUserAttributes('token', {});
      
      expect(result).toBeUndefined();
      expect(cognitoMock.calls()).toHaveLength(0);
    });
  });

  describe('adminUpdateUserAttributes', () => {
    it('should update attributes as admin', async () => {
      cognitoMock.on(AdminUpdateUserAttributesCommand).resolves({});

      await cognitoService.adminUpdateUserAttributes('test@example.com', {
        name: 'Admin Updated Name',
      });

      const calls = cognitoMock.calls();
      const updateCall = calls[0].args[0] as any;

      expect(updateCall.input.Username).toBe('test@example.com');
      expect(updateCall.input.UserAttributes).toEqual([
        { Name: 'name', Value: 'Admin Updated Name' },
      ]);
    });

    it('should do nothing when no attributes provided', async () => {
      await cognitoService.adminUpdateUserAttributes('test@example.com', {});

      expect(cognitoMock.calls()).toHaveLength(0);
    });

    it('should throw error when user not found', async () => {
      cognitoMock.on(AdminUpdateUserAttributesCommand).rejects({
        name: 'UserNotFoundException',
        message: 'User not found',
      });

      await expect(
        cognitoService.adminUpdateUserAttributes('notfound@example.com', {
          name: 'Test',
        })
      ).rejects.toThrow('User not found');
    });
  });
});
