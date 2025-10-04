import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import Koa from 'koa';
import { UserEntity } from './user.entity';

config();

const { DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME } = process.env;

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: DB_HOST,
  port: DB_PORT ? parseInt(DB_PORT) : 5432,
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_NAME,
  synchronize: true,
  entities: [UserEntity],
  ssl: {
    rejectUnauthorized: false,
  },
});

export const connectDatabase = async (app: Koa): Promise<void> => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  app.context.db = AppDataSource;
};
