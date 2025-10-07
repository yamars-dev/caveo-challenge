/**
 * Environment Configuration Module
 *
 * This module handles environment-specific configurations for the Caveo API.
 * It supports both development (local .env) and production (AWS Secrets Manager) environments.
 */

import logger from '../helpers/logger.js';

export interface EnvironmentConfig {
  // Application
  nodeEnv: 'development' | 'production' | 'test';
  port: number;

  // Database
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };

  // AWS Services
  aws: {
    region: string;
    cognito: {
      userPoolId: string;
      clientId: string;
    };
  };
}

/**
 * Gets the current environment configuration
 * This function reads from process.env which is populated by env-loader
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  // Validate required environment variables
  const requiredVars = [
    'NODE_ENV',
    'PORT',
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
    'AWS_REGION',
    'COGNITO_USER_POOL_ID',
    'COGNITO_CLIENT_ID',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Additional sanity checks: ensure Cognito env vars are not left as placeholders
  const placeholderPattern = /\<.+\>|TODO|REPLACE_ME|<REPLACE>/i;
  if (
    placeholderPattern.test(process.env.COGNITO_CLIENT_ID || '') ||
    placeholderPattern.test(process.env.COGNITO_USER_POOL_ID || '')
  ) {
    throw new Error(
      'Cognito environment variables appear to be placeholders; please set real values for COGNITO_CLIENT_ID and COGNITO_USER_POOL_ID'
    );
  }

  return {
    nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    port: parseInt(process.env.PORT || '3000', 10),

    database: {
      host: process.env.DB_HOST!,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME!,
      password: process.env.DB_PASSWORD!,
      database: process.env.DB_DATABASE!,
    },

    aws: {
      region: process.env.AWS_REGION!,
      cognito: {
        userPoolId: process.env.COGNITO_USER_POOL_ID!,
        clientId: process.env.COGNITO_CLIENT_ID!,
      },
    },
  };
}

/**
 * Validates that all required environment variables are present
 */
export function validateEnvironment(): void {
  try {
    getEnvironmentConfig();
    logger.info({ config: getSafeConfig() }, 'Environment configuration is valid');
  } catch (error) {
    logger.error({ err: String(error) }, 'Environment configuration error');
    process.exit(1);
  }
}

/**
 * Gets a safe version of the config for logging (without sensitive data)
 */
export function getSafeConfig(): Partial<EnvironmentConfig> {
  const config = getEnvironmentConfig();

  return {
    nodeEnv: config.nodeEnv,
    port: config.port,
    database: {
      host: config.database.host,
      port: config.database.port,
      username: config.database.username,
      password: '***', // Hide password
      database: config.database.database,
    },
    aws: {
      region: config.aws.region,
      cognito: {
        userPoolId: config.aws.cognito.userPoolId,
        clientId: '***', // Hide client ID
      },
    },
  };
}
