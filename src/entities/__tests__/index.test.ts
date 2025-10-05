import Koa from 'koa';

jest.mock('typeorm', () => ({
  DataSource: jest.fn().mockImplementation(() => ({
    isInitialized: false,
    initialize: jest.fn().mockResolvedValue(undefined),
  })),
  Entity: () => () => {},
  PrimaryGeneratedColumn: () => () => {},
  Column: () => () => {},
  CreateDateColumn: () => () => {},
  UpdateDateColumn: () => () => {},
  DeleteDateColumn: () => () => {},
}));

import { AppDataSource, connectDatabase } from '../index.js';

describe('Database Connection', () => {
  let mockApp: Koa;
  let mockInitialize: jest.Mock;

  beforeEach(() => {
    mockApp = new Koa();
    mockInitialize = jest.fn().mockResolvedValue(undefined);
    
    Object.defineProperty(AppDataSource, 'isInitialized', {
      value: false,
      writable: true,
      configurable: true,
    });
    
    Object.defineProperty(AppDataSource, 'initialize', {
      value: mockInitialize,
      writable: true,
      configurable: true,
    });
    
    jest.clearAllMocks();
  });

  describe('AppDataSource', () => {
    it('should be defined', () => {
      expect(AppDataSource).toBeDefined();
    });
  });

  describe('connectDatabase', () => {
    it('should initialize database when not initialized', async () => {
      Object.defineProperty(AppDataSource, 'isInitialized', {
        value: false,
        configurable: true,
      });

      await connectDatabase(mockApp);

      expect(mockInitialize).toHaveBeenCalled();
      expect(mockApp.context.db).toBe(AppDataSource);
    });

    it('should not initialize database when already initialized', async () => {
      Object.defineProperty(AppDataSource, 'isInitialized', {
        value: true,
        configurable: true,
      });

      await connectDatabase(mockApp);

      expect(mockInitialize).not.toHaveBeenCalled();
      expect(mockApp.context.db).toBe(AppDataSource);
    });

    it('should attach DataSource to app context', async () => {
      Object.defineProperty(AppDataSource, 'isInitialized', {
        value: false,
        configurable: true,
      });

      await connectDatabase(mockApp);

      expect(mockApp.context).toHaveProperty('db');
      expect(mockApp.context.db).toBe(AppDataSource);
    });

    it('should throw error when initialization fails', async () => {
      const mockError = new Error('Connection failed');
      mockInitialize.mockRejectedValue(mockError);

      Object.defineProperty(AppDataSource, 'isInitialized', {
        value: false,
        configurable: true,
      });

      await expect(connectDatabase(mockApp)).rejects.toThrow('Connection failed');
    });

    it('should handle multiple connection attempts', async () => {
      Object.defineProperty(AppDataSource, 'isInitialized', {
        value: false,
        configurable: true,
      });

      await connectDatabase(mockApp);
      
      Object.defineProperty(AppDataSource, 'isInitialized', {
        value: true,
        configurable: true,
      });
      
      await connectDatabase(mockApp);

      expect(mockInitialize).toHaveBeenCalledTimes(1);
    });
  });
});
