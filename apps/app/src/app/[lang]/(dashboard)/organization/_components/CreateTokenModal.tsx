'use client';

import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Modal from '@/components/Modal';
import { createOrgToken, type CreatedToken } from '@/lib/api/tokens';
import { listProjects, type ProjectSummary } from '@/lib/api/projects';
import { listEnvironments, type EnvironmentSummary } from '@/lib/api/environments';

const SELECT_CLASS =
  'text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-ring w-full';

interface CreateTokenModalProps {
  labels: {
    createModalTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    projectLabel: string;
    projectPlaceholder: string;
    envLabel: string;
    envPlaceholder: string;
    loadingProjects: string;
    loadingEnvironments: string;
    noProjects: string;
    createBtn: string;
    createLoading: string;
    cancelBtn: string;
    nameRequired: string;
    projectRequired: string;
  };
  onClose: () => void;
  onCreated: (token: CreatedToken, projectName: string) => void;
}

export default function CreateTokenModal({ labels, onClose, onCreated }: CreateTokenModalProps) {
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedEnvId, setSelectedEnvId] = useState('');
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [environments, setEnvironments] = useState<EnvironmentSummary[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingEnvs, setIsLoadingEnvs] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const result = await listProjects();
      if (result.ok) {
        setProjects(result.projects);
        if (result.projects.length > 0) {
          setSelectedProjectId(result.projects[0].id);
        }
      } else {
        setCreateError(result.message);
      }
      setIsLoadingProjects(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      setEnvironments([]);
      setSelectedEnvId('');
      return;
    }
    setIsLoadingEnvs(true);
    setSelectedEnvId('');
    void (async () => {
      const result = await listEnvironments(selectedProjectId);
      if (result.ok) {
        setEnvironments(result.environments);
      } else {
        setEnvironments([]);
      }
      setIsLoadingEnvs(false);
    })();
  }, [selectedProjectId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    if (!newKeyName.trim()) {
      setCreateError(labels.nameRequired);
      return;
    }
    if (!selectedProjectId) {
      setCreateError(labels.projectRequired);
      return;
    }

    setIsCreating(true);
    const result = await createOrgToken(newKeyName, selectedProjectId, selectedEnvId || undefined);
    if (!result.ok) {
      setCreateError(result.message);
      setIsCreating(false);
      return;
    }

    const project = projects.find((p) => p.id === selectedProjectId);
    onCreated(result.token, project?.name ?? '');
  }

  return (
    <Modal titleId="create-api-key-modal" title={labels.createModalTitle} onClose={isCreating ? () => {} : onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="api-key-name" className="text-sm font-medium">
            {labels.nameLabel}
          </label>
          <Input
            id="api-key-name"
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder={labels.namePlaceholder}
            required
            disabled={isCreating}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="api-key-project" className="text-sm font-medium">
            {labels.projectLabel}
          </label>
          {isLoadingProjects ? (
            <p className="text-sm text-muted-foreground">{labels.loadingProjects}</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.noProjects}</p>
          ) : (
            <select
              id="api-key-project"
              className={SELECT_CLASS}
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              required
              disabled={isCreating}
            >
              <option value="" disabled>
                {labels.projectPlaceholder}
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="api-key-env" className="text-sm font-medium">
            {labels.envLabel}
          </label>
          {isLoadingEnvs ? (
            <p className="text-sm text-muted-foreground">{labels.loadingEnvironments}</p>
          ) : (
            <select
              id="api-key-env"
              className={SELECT_CLASS}
              value={selectedEnvId}
              onChange={(e) => setSelectedEnvId(e.target.value)}
              disabled={isCreating || !selectedProjectId}
            >
              <option value="">{labels.envPlaceholder}</option>
              {environments.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {createError && (
          <div
            role="alert"
            className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2"
          >
            <AlertCircle size={14} aria-hidden="true" />
            {createError}
          </div>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={isCreating}>
            {labels.cancelBtn}
          </Button>
          <Button type="submit" disabled={isCreating || isLoadingProjects || projects.length === 0}>
            {isCreating ? labels.createLoading : labels.createBtn}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
