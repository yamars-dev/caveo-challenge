import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { logger } from './logger.js';

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

interface RDSCredentials {
  username: string;
  password: string;
  engine: string;
  host: string;
  port: number;
  dbname: string;
}

interface AppEnvironment {
  NODE_ENV: string;
  PORT: string;
  DB_HOST: string;
  DB_PORT: string;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  COGNITO_USER_POOL_ID: string;
  COGNITO_CLIENT_ID: string;
  AWS_REGION: string;
  LOG_LEVEL: string;
}

export async function getSecret<T = any>(secretName: string): Promise<T> {
  try {
    const command = new GetSecretValueCommand({
      SecretId: secretName,
    });

    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error(`Secret ${secretName} has no string value`);
    }

    return JSON.parse(response.SecretString);
  } catch (error) {
    logger.error({ err: error, secretName }, 'Failed to retrieve secret');
    throw error;
  }
}

export async function getRDSCredentials(): Promise<RDSCredentials> {
  const secretName = process.env.RDS_SECRET_NAME || 'caveo/rds/credentials';
  return getSecret<RDSCredentials>(secretName);
}

export async function getAppEnvironment(): Promise<AppEnvironment> {
  const secretName = process.env.APP_ENV_SECRET_NAME || 'caveo/app/environment';
  return getSecret<AppEnvironment>(secretName);
}

export async function loadSecretsToEnv(): Promise<void> {
  try {
    const appEnv = await getAppEnvironment();

    Object.entries(appEnv).forEach(([key, value]) => {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    });

    logger.info('Environment variables loaded from Secrets Manager');
  } catch (error) {
    logger.error({ err: error }, 'Failed to load secrets to environment');
    throw error;
  }
}
