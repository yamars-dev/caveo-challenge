import { DataSource } from 'typeorm';

declare module 'koa' {
  interface DefaultContext {
    db: DataSource;
  }
}
