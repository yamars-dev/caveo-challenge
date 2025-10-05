import { logger } from '../logger.js';

describe('Logger', () => {
  it('should be defined', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
  });

  it('should have required log methods', () => {
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('error');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('debug');
    expect(logger).toHaveProperty('trace');
    expect(logger).toHaveProperty('fatal');
  });

  it('should log info messages without throwing', () => {
    expect(() => {
      logger.info('Test info message');
    }).not.toThrow();
  });

  it('should log error messages without throwing', () => {
    expect(() => {
      logger.error('Test error message');
    }).not.toThrow();
  });

  it('should log with object context without throwing', () => {
    expect(() => {
      logger.info({ userId: '123', action: 'login' }, 'User logged in');
    }).not.toThrow();
  });

  it('should handle error objects without throwing', () => {
    expect(() => {
      const error = new Error('Test error');
      logger.error({ err: error }, 'An error occurred');
    }).not.toThrow();
  });

  it('should support child loggers', () => {
    const childLogger = logger.child({ component: 'auth' });
    expect(childLogger).toBeDefined();
    expect(typeof childLogger.info).toBe('function');
  });
});
