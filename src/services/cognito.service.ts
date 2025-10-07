import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  AdminAddUserToGroupCommand,
  UpdateUserAttributesCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { logger } from '../helpers/logger.js';

/**
 * AWS Cognito client with timeout and retry configuration
 * Prevents hanging requests and improves reliability
 */
const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
  requestHandler: {
    requestTimeout: 10000, // 10 seconds timeout
  },
  maxAttempts: 3, // Retry up to 3 times on network errors
});

const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

export class CognitoService {
  async signUp(email: string, password: string, name: string) {
    try {
      const command = new SignUpCommand({
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'name', Value: name },
        ],
      });

      const response = await client.send(command);

      return response.UserSub;
    } catch (error: any) {
      logger.error({ err: error, email }, 'SignUp failed');

      if (error.name === 'UsernameExistsException') {
        throw new Error('Email already registered');
      }

      if (error.name === 'InvalidPasswordException') {
        throw new Error('Password does not meet requirements');
      }

      if (error.name === 'InvalidParameterException') {
        throw new Error('Invalid email or password format');
      }

      throw new Error(error.message || 'Registration failed');
    }
  }

  async signIn(
    email: string,
    password: string
  ): Promise<{ AccessToken: string; IdToken: string; RefreshToken: string; ExpiresIn: number }> {
    try {
      const command = new InitiateAuthCommand({
        ClientId: CLIENT_ID,
        AuthFlow: 'USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      });

      const response = await client.send(command);
      const authResult = response.AuthenticationResult;

      if (!authResult) {
        throw new Error('Authentication failed - no result');
      }

      return {
        AccessToken: authResult.AccessToken!,
        IdToken: authResult.IdToken!,
        RefreshToken: authResult.RefreshToken!,
        ExpiresIn: authResult.ExpiresIn!,
      };
    } catch (error: any) {
      logger.error({ err: error, email }, 'SignIn failed');

      if (error.name === 'UserNotFoundException') {
        throw new Error('Invalid email or password');
      }

      if (error.name === 'NotAuthorizedException') {
        throw new Error('Invalid email or password');
      }

      if (error.name === 'UserDisabledException') {
        throw new Error('User account is disabled');
      }

      if (error.name === 'TooManyRequestsException') {
        throw new Error('Too many login attempts. Please try again later');
      }

      throw new Error(error.message || 'Authentication failed');
    }
  }

  async addToGroup(email: string, groupName: 'admin' | 'user') {
    const command = new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      GroupName: groupName,
    });

    await client.send(command);
  }

  async updateUserAttributes(accessToken: string, attributes: { name?: string }) {
    try {
      const userAttributes = [];

      if (attributes.name) {
        userAttributes.push({ Name: 'name', Value: attributes.name });
      }

      if (userAttributes.length === 0) {
        return;
      }

      const command = new UpdateUserAttributesCommand({
        AccessToken: accessToken,
        UserAttributes: userAttributes,
      });

      await client.send(command);
    } catch (error: any) {
      logger.error({ err: error, accessToken: '[REDACTED]' }, 'UpdateUserAttributes failed');

      if (error.name === 'InvalidParameterException') {
        throw new Error('Invalid attribute value');
      }

      if (error.name === 'NotAuthorizedException') {
        throw new Error('Invalid or expired access token');
      }

      throw new Error(error.message || 'Failed to update user attributes');
    }
  }

  async adminUpdateUserAttributes(username: string, attributes: { name?: string }) {
    try {
      const userAttributes = [];

      if (attributes.name) {
        userAttributes.push({ Name: 'name', Value: attributes.name });
      }

      if (userAttributes.length === 0) {
        return;
      }

      const command = new AdminUpdateUserAttributesCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        UserAttributes: userAttributes,
      });

      await client.send(command);
    } catch (error: any) {
      logger.error({ err: error, username }, 'AdminUpdateUserAttributes failed');

      if (error.name === 'UserNotFoundException') {
        throw new Error('User not found');
      }

      if (error.name === 'InvalidParameterException') {
        throw new Error('Invalid attribute value');
      }

      throw new Error(error.message || 'Failed to update user attributes');
    }
  }
}

export const cognitoService = new CognitoService();
