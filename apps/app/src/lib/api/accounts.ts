import type { UserRole } from '@pluma-flags/types';
import { parseErrorMessage } from './utils';

export type AccountUser = {
  id: string;
  email: string;
  role: UserRole;
  disabled: boolean;
  createdAt: string;
};

/**
 * Fetches all user accounts (operator/admin only).
 * Calls GET /api/v1/accounts with session credentials.
 */
export async function listAccounts(): Promise<
  { ok: true; accounts: AccountUser[] } | { ok: false; message: string }
> {
  try {
    const response = await fetch('/api/v1/accounts', {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to load accounts');
      return { ok: false, message };
    }
    const accounts: AccountUser[] = await response.json();
    return { ok: true, accounts };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}

/**
 * Updates a user account's disabled status or role (operator/admin only).
 * Calls PATCH /api/v1/accounts/:id with session credentials.
 */
export async function patchAccount(
  id: string,
  data: { disabled?: boolean; role?: UserRole },
): Promise<{ ok: true; account: AccountUser } | { ok: false; message: string }> {
  try {
    const response = await fetch(`/api/v1/accounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to update account');
      return { ok: false, message };
    }
    const account: AccountUser = await response.json();
    return { ok: true, account };
  } catch {
    return { ok: false, message: 'Unable to reach the server. Check your connection.' };
  }
}
