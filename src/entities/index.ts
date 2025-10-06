import { DataSource } from 'typeorm';
import Koa from 'koa';
import { UserEntity } from './user.entity.js';
import { getEnvironmentConfig } from '../config/environment.js';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST!,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  username: process.env.DB_USERNAME!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_DATABASE!,
  synchronize: process.env.NODE_ENV !== 'production',
  entities: [UserEntity],
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false,
  } : false,
});

export const connectDatabase = async (app: Koa): Promise<void> => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  app.context.db = AppDataSource;
};
