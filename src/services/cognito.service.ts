import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  ConfirmSignUpCommand,
  AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

export class CognitoService {
  async signUp(email: string, password: string, name: string) {
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
  }
  async signIn(email: string, password: string) {
    const command = new InitiateAuthCommand({
      ClientId: CLIENT_ID,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const response = await client.send(command);
    return response.AuthenticationResult!;
  }

  async confirm(email: string, code: string) {
    const command = new ConfirmSignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
    });

    await client.send(command);
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
