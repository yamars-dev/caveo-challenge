/**
 * Environment Configuration Module
 *
 * This module handles environment-specific configurations for the Caveo API.
 * It supports both development (local .env) and production (AWS Secrets Manager) environments.
 */

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
  // Use structured logger instead of console to avoid leaking sensitive info
  // Logger is dynamically imported to avoid circular dependencies during bootstrap
  const { default: logger } = require('../helpers/logger.js');
  logger.info('Environment configuration is valid', { config: getSafeConfig() });
  } catch (error) {
  const { default: logger } = require('../helpers/logger.js');
  logger.error('Environment configuration error', { err: String(error) });
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
