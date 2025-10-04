import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
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
      console.error('SignUp Error:', error);

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

  async signIn(email: string, password: string): Promise<{ AccessToken: string; IdToken: string; RefreshToken: string; ExpiresIn: number }> {
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

      return {
        AccessToken: authResult?.AccessToken!,
        IdToken: authResult?.IdToken!,
        RefreshToken: authResult?.RefreshToken!,
        ExpiresIn: authResult?.ExpiresIn!,
      };
    } catch (error: any) {
      console.error('SignIn Error:', error);

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
}

export const cognitoService = new CognitoService();
