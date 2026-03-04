'use client';

import { useState, useEffect, useCallback } from 'react';
import type { UserRole } from '@pluma-flags/types';
import { listAccounts, patchAccount, type AccountUser } from '@/lib/api/accounts';

export interface UseAccountsResult {
  accounts: AccountUser[];
  isLoading: boolean;
  error: string | null;
  page: number;
  total: number;
  pageSize: number;
  setPage: (page: number) => void;
  patchAccount: (id: string, data: { disabled?: boolean; role?: UserRole }) => Promise<{ ok: true; account: AccountUser } | { ok: false; message: string }>;
}

export function useAccounts(): UseAccountsResult {
  const [accounts, setAccounts] = useState<AccountUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  const fetchAccounts = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    setError(null);
    const result = await listAccounts(targetPage);
    if (result.ok) {
      setAccounts(result.accounts);
      setTotal(result.total);
      setPageSize(result.pageSize);
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void fetchAccounts(page);
  }, [fetchAccounts, page]);

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

  return { accounts, isLoading, error, page, total, pageSize, setPage, patchAccount: handlePatch };
}
