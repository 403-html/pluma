'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { listOrgTokens, revokeOrgToken, type SdkToken, type CreatedToken } from '@/lib/api/tokens';
import { useLocale } from '@/i18n/LocaleContext';

export interface OrgTokensState {
  tokens: SdkToken[];
  isLoadingTokens: boolean;
  loadError: string | null;
  createdToken: CreatedToken | null;
  createdProjectName: string;
  pendingRevokeId: string | null;
  revokeError: string | null;
  isRevoking: boolean;
  fetchTokens: () => Promise<void>;
  setCreatedToken: (token: CreatedToken | null) => void;
  setCreatedProjectName: (name: string) => void;
  setPendingRevokeId: (id: string | null) => void;
  handleRevoke: (id: string) => Promise<void>;
}

export function useOrgTokens(revokeErrorMsg: string): OrgTokensState {
  const { t } = useLocale();
  const [tokens, setTokens] = useState<SdkToken[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<CreatedToken | null>(null);
  const [createdProjectName, setCreatedProjectName] = useState('');
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const fetchTokens = useCallback(async () => {
    setIsLoadingTokens(true);
    setLoadError(null);
    const result = await listOrgTokens();
    if (result.ok) {
      setTokens(result.tokens);
    } else {
      setLoadError(result.message);
    }
    setIsLoadingTokens(false);
  }, []);

  useEffect(() => {
    void fetchTokens();
  }, [fetchTokens]);

  async function handleRevoke(id: string) {
    setIsRevoking(true);
    setRevokeError(null);
    const result = await revokeOrgToken(id);
    if (!result.ok) {
      const msg = result.message ?? revokeErrorMsg;
      setRevokeError(msg);
      toast.error(msg);
      setPendingRevokeId(null);
      setIsRevoking(false);
      return;
    }
    toast.success(t.organization.toastRevokeSuccess);
    setTokens((prev) => prev.filter((tk) => tk.id !== id));
    setPendingRevokeId(null);
    if (createdToken?.id === id) {
      setCreatedToken(null);
    }
    setIsRevoking(false);
  }

  return {
    tokens,
    isLoadingTokens,
    loadError,
    createdToken,
    createdProjectName,
    pendingRevokeId,
    revokeError,
    isRevoking,
    fetchTokens,
    setCreatedToken,
    setCreatedProjectName,
    setPendingRevokeId,
    handleRevoke,
  };
}
