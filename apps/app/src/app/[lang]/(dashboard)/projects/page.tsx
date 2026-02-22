'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocale } from '@/i18n/LocaleContext';
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  type ProjectSummary,
} from '@/lib/api/projects';
import { MAX_PROJECT_KEY_LENGTH } from '@pluma/types';
import Modal from '@/components/Modal';

type ModalState =
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'edit'; project: ProjectSummary };

/**
 * Slugify a string for use as a project key.
 * Lowercase, replace non-alphanumeric with hyphens, collapse multiple hyphens, trim.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-')          // Collapse multiple hyphens
    .replace(/^-+|-+$/g, '');     // Trim leading/trailing hyphens
}

/**
 * Make a key unique by appending -2, -3, etc. if it already exists.
 * Ensures the result doesn't exceed MAX_PROJECT_KEY_LENGTH.
 */
function makeKeyUnique(baseKey: string, existingKeys: string[]): string {
  // Truncate base key if needed to leave room for suffix
  const maxBaseLength = MAX_PROJECT_KEY_LENGTH - 3; // Reserve 3 chars for "-99"
  let truncatedBase = baseKey;
  
  if (baseKey.length > maxBaseLength) {
    truncatedBase = baseKey.substring(0, maxBaseLength);
    // Remove trailing hyphen if truncation created one
    truncatedBase = truncatedBase.replace(/-+$/, '');
  }
  
  if (!existingKeys.includes(truncatedBase)) {
    return truncatedBase;
  }
  
  for (let i = 2; i <= 99; i++) {
    const suffix = `-${i}`;
    const candidate = truncatedBase + suffix;
    
    // Ensure candidate doesn't exceed max length
    if (candidate.length > MAX_PROJECT_KEY_LENGTH) {
      // Further truncate base to fit the suffix
      const adjustedBase = truncatedBase.substring(0, MAX_PROJECT_KEY_LENGTH - suffix.length);
      const adjustedCandidate = adjustedBase.replace(/-+$/, '') + suffix;
      
      if (!existingKeys.includes(adjustedCandidate)) {
        return adjustedCandidate;
      }
    } else {
      if (!existingKeys.includes(candidate)) {
        return candidate;
      }
    }
  }
  
  // Fallback: return a truncated key with -99
  const fallbackSuffix = '-99';
  const fallbackBase = truncatedBase.substring(0, MAX_PROJECT_KEY_LENGTH - fallbackSuffix.length);
  return fallbackBase.replace(/-+$/, '') + fallbackSuffix;
}

/**
 * Validate a project key.
 */
function isValidProjectKey(key: string): boolean {
  if (!key || key.length === 0) {
    return false;
  }
  if (key.length > MAX_PROJECT_KEY_LENGTH) {
    return false;
  }
  // Must match slug pattern: lowercase alphanumeric with hyphens, no leading/trailing hyphens
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key);
}

export default function ProjectsPage() {
  const { t } = useLocale();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Memoize existing keys to avoid unnecessary re-renders
  const existingKeys = useMemo(() => projects.map(p => p.key), [projects]);

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await listProjects();
    if (result.ok) {
      setProjects(result.projects);
    } else {
      setError(result.message);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  async function handleDelete(id: string) {
    const result = await deleteProject(id);
    setDeletingId(null);
    if (result.ok) {
      await loadProjects();
    } else {
      setError(result.message);
    }
  }

  if (isLoading) {
    return (
      <main className="projects-page">
        <div className="projects-page-header">
          <h1 className="projects-page-title">{t.projects.title}</h1>
        </div>
        <p>{t.common.loading}</p>
      </main>
    );
  }

  if (error && projects.length === 0) {
    return (
      <main className="projects-page">
        <div className="projects-page-header">
          <h1 className="projects-page-title">{t.projects.title}</h1>
        </div>
        <div className="form-error">{error}</div>
      </main>
    );
  }

  return (
    <main className="projects-page">
      <div className="projects-page-header">
        <h1 className="projects-page-title">{t.projects.title}</h1>
        <button
          type="button"
          className="btn-primary"
          onClick={() => { setError(null); setModalState({ type: 'add' }); }}
        >
          {t.projects.newProject}
        </button>
      </div>

      {error && <div className="form-error projects-error">{error}</div>}

      {projects.length === 0 ? (
        <div className="projects-empty">{t.projects.emptyState}</div>
      ) : (
        <table className="projects-table">
          <thead>
            <tr>
              <th>{t.projects.colName}</th>
              <th>{t.projects.colKey}</th>
              <th>{t.projects.colEnvironments}</th>
              <th>{t.projects.colFlags}</th>
              <th>{t.projects.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>{project.name}</td>
                <td>
                  <span className="project-key-badge">{project.key}</span>
                </td>
                <td>
                  {project.environments.length > 0
                    ? project.environments.slice(0, 256).map((env) => env.name).join(', ')
                    : t.projects.noEnvironments}
                </td>
                <td>
                  {project.flagStats.enabled}/{project.flagStats.total} on
                </td>
                <td>
                  {deletingId === project.id ? (
                    <div className="delete-confirm-actions">
                      <span className="delete-confirm-text">{t.projects.confirmDelete}</span>
                      <button
                        type="button"
                        className="btn-sm btn-sm--danger"
                        onClick={() => handleDelete(project.id)}
                      >
                        {t.projects.confirmDeleteBtn}
                      </button>
                      <button
                        type="button"
                        className="btn-sm btn-sm--edit"
                        onClick={() => setDeletingId(null)}
                      >
                        {t.projects.cancelBtn}
                      </button>
                    </div>
                  ) : (
                    <div className="project-actions">
                      <button
                        type="button"
                        className="btn-sm btn-sm--edit"
                        onClick={() => { setError(null); setModalState({ type: 'edit', project }); }}
                      >
                        {t.projects.editBtn}
                      </button>
                      <button
                        type="button"
                        className="btn-sm btn-sm--danger"
                        onClick={() => setDeletingId(project.id)}
                      >
                        {t.projects.deleteBtn}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modalState.type === 'add' && (
        <AddProjectModal
          existingKeys={existingKeys}
          onClose={() => setModalState({ type: 'none' })}
          onSuccess={() => {
            setModalState({ type: 'none' });
            loadProjects();
          }}
          onError={setError}
        />
      )}

      {modalState.type === 'edit' && (
        <EditProjectModal
          project={modalState.project}
          onClose={() => setModalState({ type: 'none' })}
          onSuccess={() => {
            setModalState({ type: 'none' });
            loadProjects();
          }}
          onError={setError}
        />
      )}
    </main>
  );
}

function AddProjectModal({
  existingKeys,
  onClose,
  onSuccess,
  onError,
}: {
  existingKeys: string[];
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [isKeyCustomized, setIsKeyCustomized] = useState(false);
  const [isKeyEditing, setIsKeyEditing] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const keyInputRef = useRef<HTMLInputElement>(null);

  // Auto-generate key from name when name changes (if key hasn't been customized)
  useEffect(() => {
    if (!isKeyCustomized && name) {
      const slugified = slugify(name);
      const uniqueKey = makeKeyUnique(slugified, existingKeys);
      setKey(uniqueKey);
    } else if (!isKeyCustomized && !name) {
      setKey('');
    }
  }, [name, isKeyCustomized, existingKeys]);

  // Focus the input when entering edit mode
  useEffect(() => {
    if (isKeyEditing && keyInputRef.current) {
      keyInputRef.current.focus();
    }
  }, [isKeyEditing]);

  function handleEditKey() {
    setIsKeyEditing(true);
    setKeyError(null);
  }

  function handleKeyBlur() {
    const trimmedKey = key.trim();
    
    // Validate the key
    if (!trimmedKey) {
      setKeyError(t.projects.keyRequired);
      return;
    }
    
    if (trimmedKey.length > MAX_PROJECT_KEY_LENGTH) {
      setKeyError(t.projects.keyTooLong);
      return;
    }
    
    if (!isValidProjectKey(trimmedKey)) {
      setKeyError(t.projects.keyInvalid);
      return;
    }
    
    // Valid: exit edit mode
    setKey(trimmedKey);
    setKeyError(null);
    setIsKeyEditing(false);
    setIsKeyCustomized(true);
  }

  function handleKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Trim the value immediately to prevent leading/trailing spaces
    setKey(e.target.value.trim());
    setKeyError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Final validation before submit
    if (!isValidProjectKey(key)) {
      setKeyError(t.projects.keyInvalid);
      return;
    }
    
    // Check for duplicate keys
    if (existingKeys.includes(key)) {
      setKeyError(t.projects.keyDuplicate);
      return;
    }
    
    setIsSubmitting(true);

    const result = await createProject(key, name);

    if (result.ok) {
      onSuccess();
    } else {
      onError(result.message);
      setIsSubmitting(false);
    }
  }

  return (
    <Modal titleId="add-project-modal-title" title={t.projects.modalAddTitle} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="project-name" className="form-label">
            {t.projects.nameLabel}
          </label>
          <input
            id="project-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.projects.namePlaceholder}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group form-group--spaced">
          <label htmlFor="project-key" className="form-label">
            {t.projects.keyLabel}
          </label>
          
          {isKeyEditing ? (
            <div className="project-key-input-wrapper">
              <input
                ref={keyInputRef}
                id="project-key"
                type="text"
                className="form-input"
                value={key}
                onChange={handleKeyChange}
                onBlur={handleKeyBlur}
                disabled={isSubmitting}
              />
              {keyError && <div className="project-key-error">{keyError}</div>}
            </div>
          ) : (
            <div className="project-key-preview">
              {key ? (
                <code className="project-key-preview-text">{key}</code>
              ) : (
                <span className="project-key-preview-text" aria-label="placeholder">
                  {t.projects.keyPlaceholder}
                </span>
              )}
              <button
                type="button"
                className="project-key-edit-btn"
                onClick={handleEditKey}
                disabled={isSubmitting}
                aria-label={t.projects.keyEditBtnLabel}
                title={t.projects.keyEditBtnLabel}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M11.333 2.00004C11.5081 1.82494 11.716 1.68605 11.9447 1.59129C12.1735 1.49653 12.4187 1.44775 12.6663 1.44775C12.914 1.44775 13.1592 1.49653 13.3879 1.59129C13.6167 1.68605 13.8246 1.82494 13.9997 2.00004C14.1748 2.17513 14.3137 2.383 14.4084 2.61178C14.5032 2.84055 14.552 3.08575 14.552 3.33337C14.552 3.58099 14.5032 3.82619 14.4084 4.05497C14.3137 4.28374 14.1748 4.49161 13.9997 4.66671L5.33301 13.3334L1.66634 14.3334L2.66634 10.6667L11.333 2.00004Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
          
          {!isKeyEditing && !isKeyCustomized && key && (
            <p className="form-helper-text">{t.projects.keyAutoHint}</p>
          )}
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-sm btn-sm--edit"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t.projects.cancelBtn}
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {t.projects.createBtn}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function EditProjectModal({
  project,
  onClose,
  onSuccess,
  onError,
}: {
  project: ProjectSummary;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState(project.name);
  const [key, setKey] = useState(project.key);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await updateProject(project.id, { key, name });

    if (result.ok) {
      onSuccess();
    } else {
      onError(result.message);
      setIsSubmitting(false);
    }
  }

  return (
    <Modal titleId="edit-project-modal-title" title={t.projects.modalEditTitle} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="project-name-edit" className="form-label">
            {t.projects.nameLabel}
          </label>
          <input
            id="project-name-edit"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.projects.namePlaceholder}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group form-group--spaced">
          <label htmlFor="project-key-edit" className="form-label">
            {t.projects.keyLabel}
          </label>
          <input
            id="project-key-edit"
            type="text"
            className="form-input"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={t.projects.keyPlaceholder}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-sm btn-sm--edit"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {t.projects.cancelBtn}
          </button>
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {t.projects.saveBtn}
          </button>
        </div>
      </form>
    </Modal>
  );
}
