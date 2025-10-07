import { logger } from '../helpers/logger.js';

interface RequiredEnvVars {
  [key: string]: {
    required: boolean;
    validation?: (value: string) => boolean;
    description: string;
  };
}

const REQUIRED_ENV_VARS: RequiredEnvVars = {
  NODE_ENV: {
    required: true,
    validation: (value) => ['development', 'production', 'test'].includes(value),
    description: 'Application environment',
  },
  COGNITO_USER_POOL_ID: {
    required: true,
    validation: (value) => /^[\w-]+_[\w]+$/.test(value),
    description: 'AWS Cognito User Pool ID',
  },
  COGNITO_CLIENT_ID: {
    required: true,
    validation: (value) => value.length > 10,
    description: 'AWS Cognito Client ID',
  },
  AWS_REGION: {
    required: true,
    validation: (value) => /^[a-z]{2}-[a-z]+-\d{1}$/.test(value),
    description: 'AWS Region',
  },
  DB_HOST: {
    required: true,
    description: 'Database host',
  },
  DB_USERNAME: {
    required: true,
    description: 'Database username',
  },
  DB_PASSWORD: {
    required: true,
    description: 'Database password',
  },
  JWT_SECRET: {
    required: false,
    validation: (value) => value.length >= 32,
    description: 'JWT Secret (minimum 32 characters)',
  },
};

export function validateEnvironment(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  Object.entries(REQUIRED_ENV_VARS).forEach(([key, config]) => {
    const value = process.env[key];

    if (config.required && !value) {
      errors.push(`Missing required environment variable: ${key} - ${config.description}`);
      return;
    }

    if (value && config.validation && !config.validation(value)) {
      errors.push(`Invalid value for environment variable: ${key} - ${config.description}`);
    }

    if (!config.required && !value) {
      warnings.push(`Optional environment variable not set: ${key} - ${config.description}`);
    }
  });

  // Log warnings
  warnings.forEach((warning) => {
    logger.warn(warning);
  });

  // Throw errors if any
  if (errors.length > 0) {
    logger.error({ errors }, 'Environment validation failed');
    throw new Error(`Environment validation failed:\n${errors.join('\n')}`);
  }

  logger.info('Environment variables validated successfully');
}

export function sanitizeEnvForLogging() {
  const sanitized = { ...process.env };

  // Remove sensitive variables from logs
  const sensitiveKeys = ['DB_PASSWORD', 'JWT_SECRET', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN'];

  sensitiveKeys.forEach((key) => {
    if (sanitized[key]) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
}
