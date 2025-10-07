import { UsersController } from '../user.controller.js';
import { Context } from 'koa';

describe('UsersController', () => {
  let controller: UsersController;
  let mockContext: Partial<Context>;

  beforeEach(() => {
    controller = new UsersController();
    mockContext = {
      db: {
        getRepository: jest.fn().mockReturnValue({
          find: jest.fn().mockResolvedValue([
            { id: '1', email: 'user1@test.com', name: 'User 1', role: 'user' },
            { id: '2', email: 'user2@test.com', name: 'User 2', role: 'admin' },
          ]),
        }),
      } as any,
    };
  });

  describe('GET /users', () => {
    it('should return all users when called with admin role', async () => {
      const result = await controller.getAll(mockContext as Context);

      expect(mockContext.db?.getRepository).toHaveBeenCalled();
      expect(result).toEqual([
        { id: '1', email: 'user1@test.com', name: 'User 1', role: 'user' },
        { id: '2', email: 'user2@test.com', name: 'User 2', role: 'admin' },
      ]);
    });
  });
});
