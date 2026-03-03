'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { fetchCurrentUser, type AuthUserResponse } from '@/lib/api/auth';

interface CurrentUserContextValue {
  currentUser: AuthUserResponse | null;
  isLoading: boolean;
}

const CurrentUserContext = createContext<CurrentUserContextValue>({
  currentUser: null,
  isLoading: true,
});

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetchCurrentUser().then((user) => {
      setCurrentUser(user);
      setIsLoading(false);
    });
  }, []);

  return (
    <CurrentUserContext.Provider value={{ currentUser, isLoading }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  return useContext(CurrentUserContext);
}
