import { readinessMiddleware } from '../routes.middleware.js';
import { AppDataSource } from '../../entities/index.js';

describe('readinessMiddleware', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns 200 and connected when DB is initialized', async () => {
    // Simulate DB initialized
    (AppDataSource as any).isInitialized = true;

    const ctx: any = { path: '/ready' };
    const next = jest.fn();

    await readinessMiddleware(ctx, next as any);

    expect(ctx.status).toBe(200);
    expect(ctx.body).toBeDefined();
    expect(ctx.body.status).toBe('ok');
    expect(ctx.body.db).toBe('connected');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 503 and disconnected when DB is not initialized', async () => {
    (AppDataSource as any).isInitialized = false;

    const ctx: any = { path: '/ready' };
    const next = jest.fn();

    await readinessMiddleware(ctx, next as any);

    expect(ctx.status).toBe(503);
    expect(ctx.body).toBeDefined();
    expect(ctx.body.status).toBe('unavailable');
    expect(ctx.body.db).toBe('disconnected');
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next for non-/ready paths', async () => {
    const ctx: any = { path: '/health' };
    const next = jest.fn();

    await readinessMiddleware(ctx, next as any);

    expect(next).toHaveBeenCalled();
  });
});
