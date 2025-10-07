import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { config as dotenvConfig } from 'dotenv';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { logger } from '../helpers/logger.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '../../config.yml');

interface Config {
  mode: 'development' | 'production';
  secrets_manager: {
    enabled: boolean;
    region: string;
    secrets: {
      rds: string;
      app: string;
    };
  };
  fallback_to_env: boolean;
}

let configCache: Config | null = null;

function loadConfig(): Config {
  if (configCache) return configCache;

  try {
    const fileContents = readFileSync(configPath, 'utf8');
    configCache = parse(fileContents);
    return configCache!;
  } catch (error) {
    logger.warn({ err: error }, 'Failed to load config.yml, using defaults');
    return {
      mode: 'development',
      secrets_manager: {
        enabled: false,
        region: 'us-east-1',
        secrets: {
          rds: 'caveo/rds/credentials',
          app: 'caveo/app/environment',
        },
      },
      fallback_to_env: true,
    };
  }
}

async function loadFromSecretsManager(config: Config): Promise<void> {
  const client = new SecretsManagerClient({ region: config.secrets_manager.region });

  try {
    logger.info('Loading environment from AWS Secrets Manager');

    const command = new GetSecretValueCommand({
      SecretId: config.secrets_manager.secrets.app,
    });

    const response = await client.send(command);

    if (response.SecretString) {
      const secrets = JSON.parse(response.SecretString);

      Object.entries(secrets).forEach(([key, value]) => {
        process.env[key] = String(value);
      });

      logger.info('Environment loaded from Secrets Manager');
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to load from Secrets Manager');

    if (config.fallback_to_env) {
      logger.warn('Falling back to .env file');
      dotenvConfig();
    } else {
      throw error;
    }
  }
}

export async function initializeEnvironment(): Promise<void> {
  const config = loadConfig();
  const nodeEnv = process.env.NODE_ENV || config.mode;
  const useSecretsManager = nodeEnv === 'production' || config.secrets_manager.enabled;

  try {
    if (useSecretsManager) {
      await loadFromSecretsManager(config);
    } else {
      logger.info('Loading environment from .env file');
      dotenvConfig();
      logger.info('Environment loaded from .env file');
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize environment');
    throw error;
  }
}
