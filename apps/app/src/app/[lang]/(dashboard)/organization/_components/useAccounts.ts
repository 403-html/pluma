'use client';

import { useState, useEffect, useCallback } from 'react';
import type { UserRole } from '@pluma-flags/types';
import { listAccounts, patchAccount, type AccountUser } from '@/lib/api/accounts';

export interface UseAccountsResult {
  accounts: AccountUser[];
  isLoading: boolean;
  error: string | null;
  patchAccount: (id: string, data: { disabled?: boolean; role?: UserRole }) => Promise<{ ok: true; account: AccountUser } | { ok: false; message: string }>;
}

export function useAccounts(): UseAccountsResult {
  const [accounts, setAccounts] = useState<AccountUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await listAccounts();
    if (result.ok) {
      setAccounts(result.accounts);
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  const handlePatch = useCallback(
    async (id: string, data: { disabled?: boolean; role?: UserRole }) => {
      const result = await patchAccount(id, data);
      if (result.ok) {
        setAccounts((prev) =>
          prev.map((a) => (a.id === id ? result.account : a)),
        );
      }
      return result;
    },
    [],
  );

  return { accounts, isLoading, error, patchAccount: handlePatch };
}
