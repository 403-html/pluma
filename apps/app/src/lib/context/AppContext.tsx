'use client';

import type { Project, Environment } from '@pluma/types';
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';

type AppContextType = {
  selectedProject: Project | null;
  selectedEnvironment: Environment | null;
  searchQuery: string;
  setSelectedProject: Dispatch<SetStateAction<Project | null>>;
  setSelectedEnvironment: Dispatch<SetStateAction<Environment | null>>;
  setSearchQuery: Dispatch<SetStateAction<string>>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedEnvironment, setSelectedEnvironment] =
    useState<Environment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <AppContext.Provider
      value={{
        selectedProject,
        selectedEnvironment,
        searchQuery,
        setSelectedProject,
        setSelectedEnvironment,
        setSearchQuery,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
