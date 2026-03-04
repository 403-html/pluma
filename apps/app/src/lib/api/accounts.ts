import type { UserRole } from '@pluma-flags/types';
import { parseErrorMessage } from './utils';

export type AccountUser = {
  id: string;
  email: string;
  role: UserRole;
  disabled: boolean;
  createdAt: string;
};

export type AccountsPage = {
  total: number;
  page: number;
  pageSize: number;
  accounts: AccountUser[];
};

/**
 * Fetches a page of user accounts (operator/admin only).
 * Calls GET /api/v1/accounts?page=N with session credentials.
 */
export async function listAccounts(page = 1): Promise<
  { ok: true } & AccountsPage | { ok: false; message: string }
> {
  try {
    const response = await fetch(`/api/v1/accounts?page=${page}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      const message = await parseErrorMessage(response, 'Failed to load accounts');
      return { ok: false, message };
    }
    const data: AccountsPage = await response.json();
    return { ok: true, ...data };
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
