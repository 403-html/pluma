import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../app';
import type { FastifyInstance } from 'fastify';
import {
  USER_ID, SESSION_TOKEN, AUTH_COOKIE,
  mockUser, mockSession,
} from './fixtures';

const { prismaMock, bcryptMock } = vi.hoisted(() => ({
  prismaMock: {
    session: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    passwordHistory: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  bcryptMock: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

vi.mock('@pluma/db', () => ({ prisma: prismaMock }));
vi.mock('bcryptjs', () => ({
  compare: bcryptMock.compare,
  hash: bcryptMock.hash,
}));

describe('Password History - Pruning Route Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * This test validates the complete pruning scenario:
   * 1. User has 4 existing password history entries
   * 2. User changes password (5th time total)
   * 3. System inserts old password to history (now 5 entries)
   * 4. Pruning condition triggers: historyCount (5) >= MAX_PASSWORD_HISTORY (5)
   * 5. System deletes oldest entry
   * 6. Final state: 4 history entries + 1 current = 5 total unique passwords tracked
   */
  it('should prune oldest entry when history reaches MAX_PASSWORD_HISTORY', async () => {
    prismaMock.session.findUnique.mockResolvedValue(mockSession);
    prismaMock.user.findUnique.mockResolvedValue({ 
      ...mockUser, 
      passwordHash: 'current_password_hash' 
    });

    // Old password verification passes
    bcryptMock.compare.mockResolvedValueOnce(true);
    // New password doesn't match current
    bcryptMock.compare.mockResolvedValueOnce(false);

    // Simulate 4 existing password history entries (the maximum before pruning)
    const existingHistory = [
      { id: 'hist1', userId: USER_ID, passwordHash: 'hash1', createdAt: new Date('2025-01-20') },
      { id: 'hist2', userId: USER_ID, passwordHash: 'hash2', createdAt: new Date('2025-01-15') },
      { id: 'hist3', userId: USER_ID, passwordHash: 'hash3', createdAt: new Date('2025-01-10') },
      { id: 'hist4', userId: USER_ID, passwordHash: 'hash4', createdAt: new Date('2025-01-05') },
    ];
    prismaMock.passwordHistory.findMany.mockResolvedValue(existingHistory);

    // None of the historical passwords match the new password
    bcryptMock.compare
      .mockResolvedValueOnce(false) // hist1
      .mockResolvedValueOnce(false) // hist2
      .mockResolvedValueOnce(false) // hist3
      .mockResolvedValueOnce(false); // hist4

    bcryptMock.hash.mockResolvedValue('new_password_hash_5');

    // Mock the transaction — reuse prismaMock as tx, setting implementations with closures
    let updateCalled = false;
    let historyCalled = false;
    let pruneCalled = false;
    let historyCountReturned = 0;
    let oldestEntriesReturned: { id: string }[] = [];

    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => Promise<unknown> | unknown) => {
        const tx = prismaMock;
        tx.user.updateMany.mockImplementation(async (params: { where: { id: string; passwordHash: string }; data: { passwordHash: string } }) => {
          updateCalled = true;
          expect(params.where.id).toBe(USER_ID);
          expect(params.data.passwordHash).toBe('new_password_hash_5');
          return { count: 1 };
        });
        tx.passwordHistory.create.mockImplementation(async (params: { data: { userId: string; passwordHash: string } }) => {
          historyCalled = true;
          expect(params.data.userId).toBe(USER_ID);
          expect(params.data.passwordHash).toBe('current_password_hash');
          return { id: 'hist5', userId: USER_ID, passwordHash: 'current_password_hash', createdAt: new Date() };
        });
        tx.passwordHistory.count.mockImplementation(async () => {
          historyCountReturned = 5;
          return 5;
        });
        tx.passwordHistory.findMany.mockImplementation(async (params: { orderBy: { createdAt: string }; take: number; select: { id: boolean } }) => {
          expect(params.orderBy.createdAt).toBe('asc');
          expect(params.take).toBe(1); // Should delete exactly 1 entry (5 - 4 = 1)
          oldestEntriesReturned = [{ id: 'hist4' }];
          return oldestEntriesReturned;
        });
        tx.passwordHistory.deleteMany.mockImplementation(async (params: { where: { id: { in: string[] } } }) => {
          pruneCalled = true;
          expect(params.where.id.in).toEqual(['hist4']);
          return { count: 1 };
        });
        return callback(tx);
      },
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/change-password',
      headers: { cookie: AUTH_COOKIE },
      payload: { 
        oldPassword: 'currentpassword', 
        newPassword: 'completelynewpassword123' 
      },
    });

    // Verify successful password change
    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.payload);
    expect(payload).toEqual({ message: 'Password updated' });

    // Verify transaction was called
    expect(prismaMock.$transaction).toHaveBeenCalled();

    // Verify all transaction steps were executed
    expect(updateCalled).toBe(true);
    expect(historyCalled).toBe(true);
    expect(pruneCalled).toBe(true);

    // Verify pruning logic
    expect(historyCountReturned).toBe(5);
    expect(oldestEntriesReturned).toHaveLength(1);
    expect(oldestEntriesReturned[0].id).toBe('hist4'); // Oldest entry deleted

    // Final state: 4 entries in history + 1 current password = 5 unique passwords tracked
  });

  /**
   * This test validates that pruning doesn't occur prematurely:
   * 1. User has 3 existing password history entries
   * 2. User changes password (4th time total)
   * 3. System inserts old password to history (now 4 entries)
   * 4. Pruning condition: historyCount (4) >= MAX_PASSWORD_HISTORY (5)? NO
   * 5. No pruning occurs
   * 6. Final state: 4 history entries (correct)
   */
  it('should NOT prune when history is below MAX_PASSWORD_HISTORY', async () => {
    prismaMock.session.findUnique.mockResolvedValue(mockSession);
    prismaMock.user.findUnique.mockResolvedValue({ 
      ...mockUser, 
      passwordHash: 'current_password_hash' 
    });

    // Old password verification passes, new password doesn't match current
    bcryptMock.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    // Simulate 3 existing password history entries
    const existingHistory = [
      { id: 'hist1', userId: USER_ID, passwordHash: 'hash1', createdAt: new Date('2025-01-15') },
      { id: 'hist2', userId: USER_ID, passwordHash: 'hash2', createdAt: new Date('2025-01-10') },
      { id: 'hist3', userId: USER_ID, passwordHash: 'hash3', createdAt: new Date('2025-01-05') },
    ];
    prismaMock.passwordHistory.findMany.mockResolvedValue(existingHistory);

    // None of the historical passwords match
    bcryptMock.compare
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);

    bcryptMock.hash.mockResolvedValue('new_password_hash_4');

    let pruneCheckPerformed = false;
    let deleteManyCalled = false;

    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => Promise<unknown> | unknown) => {
        const tx = prismaMock;
        tx.user.updateMany.mockResolvedValue({ count: 1 });
        tx.passwordHistory.create.mockResolvedValue({ 
          id: 'hist4', 
          userId: USER_ID, 
          passwordHash: 'current_password_hash', 
          createdAt: new Date() 
        });
        tx.passwordHistory.count.mockImplementation(async () => {
          pruneCheckPerformed = true;
          // After insert, count returns 4 (3 existing + 1 just inserted)
          return 4;
        });
        tx.passwordHistory.findMany.mockResolvedValue([]); // Should NOT be called
        tx.passwordHistory.deleteMany.mockImplementation(async () => {
          deleteManyCalled = true;
          return { count: 0 };
        });
        return callback(tx);
      },
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/change-password',
      headers: { cookie: AUTH_COOKIE },
      payload: { 
        oldPassword: 'currentpassword', 
        newPassword: 'newpassword123' 
      },
    });

    expect(response.statusCode).toBe(200);
    expect(pruneCheckPerformed).toBe(true);
    expect(deleteManyCalled).toBe(false); // Pruning should NOT have occurred
    expect(prismaMock.passwordHistory.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'asc' } }),
    );

    // Final state: 4 history entries + 1 current = 5 unique passwords tracked
  });

  /**
   * Validates the boundary condition where pruning occurs with multiple excess entries
   * This would happen if somehow the system accumulated more than 5 entries
   * (edge case, but the code should handle it correctly)
   */
  it('should delete multiple entries if history somehow exceeds MAX_PASSWORD_HISTORY', async () => {
    prismaMock.session.findUnique.mockResolvedValue(mockSession);
    prismaMock.user.findUnique.mockResolvedValue({ 
      ...mockUser, 
      passwordHash: 'current_hash' 
    });

    bcryptMock.compare.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const existingHistory = [
      { id: 'h1', userId: USER_ID, passwordHash: 'hash1', createdAt: new Date('2025-01-20') },
      { id: 'h2', userId: USER_ID, passwordHash: 'hash2', createdAt: new Date('2025-01-15') },
      { id: 'h3', userId: USER_ID, passwordHash: 'hash3', createdAt: new Date('2025-01-10') },
      { id: 'h4', userId: USER_ID, passwordHash: 'hash4', createdAt: new Date('2025-01-05') },
    ];
    prismaMock.passwordHistory.findMany.mockResolvedValue(existingHistory);

    bcryptMock.compare
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false);

    bcryptMock.hash.mockResolvedValue('new_hash');

    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof prismaMock) => Promise<unknown> | unknown) => {
        const tx = prismaMock;
        tx.user.updateMany.mockResolvedValue({ count: 1 });
        tx.passwordHistory.create.mockResolvedValue({ 
          id: 'h5', 
          userId: USER_ID, 
          passwordHash: 'current_hash', 
          createdAt: new Date() 
        });
        tx.passwordHistory.count.mockResolvedValue(6); // Somehow 6 entries exist
        tx.passwordHistory.findMany.mockImplementation(async (params: { take: number; select: { id: boolean } }) => {
          expect(params.take).toBe(2); // Should delete 6 - 4 = 2 entries
          return [{ id: 'h1' }, { id: 'h2' }];
        });
        tx.passwordHistory.deleteMany.mockImplementation(async (params: { where: { id: { in: string[] } } }) => {
          expect(params.where.id.in).toEqual(['h1', 'h2']);
          return { count: 2 };
        });
        return callback(tx);
      },
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/change-password',
      headers: { cookie: AUTH_COOKIE },
      payload: { 
        oldPassword: 'currentpass', 
        newPassword: 'newpass123' 
      },
    });

    expect(response.statusCode).toBe(200);
  });
});
