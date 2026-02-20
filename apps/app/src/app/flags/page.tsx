'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FlagListItem } from '@pluma/types';
import { flags } from '@/lib/api';
import { useAppContext } from '@/lib/context/AppContext';
import TopBar from '@/components/TopBar';
import styles from './page.module.css';

export default function FlagsPage() {
  const { selectedProject, selectedEnvironment, searchQuery } =
    useAppContext();
  const [flagList, setFlagList] = useState<FlagListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formParentId, setFormParentId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadFlags = useCallback(async () => {
    if (!selectedEnvironment) return;
    try {
      setLoading(true);
      setError('');
      const data = await flags.list(selectedEnvironment.id);
      setFlagList(data);
    } catch {
      setError('Failed to load flags');
    } finally {
      setLoading(false);
    }
  }, [selectedEnvironment]);

  useEffect(() => {
    if (selectedEnvironment) {
      loadFlags();
    } else {
      setFlagList([]);
      setLoading(false);
    }
  }, [selectedEnvironment, loadFlags]);

  const filteredFlags = useMemo(() => {
    if (!searchQuery) return flagList;
    const q = searchQuery.toLowerCase();
    return flagList.filter(
      (flag) =>
        flag.key.toLowerCase().includes(q) ||
        flag.name.toLowerCase().includes(q) ||
        flag.description?.toLowerCase().includes(q),
    );
  }, [flagList, searchQuery]);

  const resetForm = useCallback(() => {
    setFormKey('');
    setFormName('');
    setFormDesc('');
    setFormParentId('');
    setShowForm(false);
  }, []);

  const handleCreateFlagClick = useCallback(() => {
    setFormKey('');
    setFormName('');
    setFormDesc('');
    setFormParentId('');
    setShowForm(true);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    setSubmitting(true);
    setError('');

    try {
      await flags.create(
        selectedProject.id,
        formKey,
        formName,
        formDesc || undefined,
        formParentId || undefined,
      );
      resetForm();
      await loadFlags();
    } catch {
      setError('Failed to create flag');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id: string) => {
    setSubmitting(true);
    setError('');
    try {
      await flags.update(id, { name: formName, description: formDesc });
      setEditingId(null);
      setFormName('');
      setFormDesc('');
      await loadFlags();
    } catch {
      setError('Failed to update flag');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this flag? This action cannot be undone.')) {
      return;
    }
    try {
      await flags.delete(id);
      await loadFlags();
    } catch {
      setError('Failed to delete flag');
    }
  };

  const handleToggle = async (flag: FlagListItem) => {
    if (!selectedEnvironment) return;
    try {
      await flags.updateConfig(selectedEnvironment.id, flag.flagId, {
        enabled: !flag.enabled,
      });
      await loadFlags();
    } catch {
      setError('Failed to toggle flag');
    }
  };

  const startEdit = (flag: FlagListItem) => {
    setEditingId(flag.flagId);
    setFormName(flag.name);
    setFormDesc(flag.description || '');
  };

  const startAddSubFlag = (parentFlag: FlagListItem) => {
    setFormParentId(parentFlag.flagId);
    setFormKey('');
    setFormName('');
    setFormDesc('');
    setShowForm(true);
  };

  // Lookup map: flagId → key, for showing parent key in sub-flag badge
  const flagKeyById = useMemo(
    () => new Map(flagList.map((f) => [f.flagId, f.key])),
    [flagList],
  );

  // Only top-level flags are offered as parent choices
  const topLevelFlags = useMemo(
    () => flagList.filter((f) => !f.parentFlagId),
    [flagList],
  );

  if (!selectedProject || !selectedEnvironment) {
    return (
      <>
        <TopBar onCreateFlag={handleCreateFlagClick} />
        <div className={styles.container}>
          <p className={styles.empty}>
            Select a project and environment to manage flags
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar onCreateFlag={handleCreateFlagClick} />
      <div className={styles.container}>
        {error && <div className={styles.error}>{error}</div>}

        {showForm && (
          <form className={styles.form} onSubmit={handleCreate}>
            <div className={styles.formGrid}>
              <input
                type="text"
                className={styles.input}
                placeholder="Key (e.g., new-checkout-flow)"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                required
                autoFocus
              />
              <input
                type="text"
                className={styles.input}
                placeholder="Name (e.g., New Checkout Flow)"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
              <input
                type="text"
                className={styles.input}
                placeholder="Description (optional)"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
              <select
                className={styles.input}
                value={formParentId}
                onChange={(e) => setFormParentId(e.target.value)}
                aria-label="Parent flag"
              >
                <option value="">No parent (top-level)</option>
                {topLevelFlags.map((f) => (
                  <option key={f.flagId} value={f.flagId}>
                    {'\u21b3'} {f.key}
                  </option>
                ))}
              </select>
              <div className={styles.formActions}>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={submitting}
                >
                  Create
                </button>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={resetForm}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <p className={styles.loading}>Loading flags...</p>
        ) : filteredFlags.length === 0 ? (
          <p className={styles.empty}>
            {searchQuery
              ? 'No flags match your search'
              : 'No flags yet. Create one to get started.'}
          </p>
        ) : (
          <div className={styles.flagsGrid}>
            {filteredFlags.map((flag) => (
              <div
                key={flag.flagId}
                className={`${styles.flagCard} ${
                  flag.enabled ? styles.flagCardActive : ''
                } ${flag.parentFlagId ? styles.flagCardChild : ''}`}
              >
                <div className={styles.flagHeader}>
                  <div className={styles.flagInfo}>
                    <h3 className={styles.flagKey}>{flag.key}</h3>
                    {flag.parentFlagId && (
                      <p className={styles.parentBadge}>
                        {'\u21b3'}{' '}
                        {flagKeyById.get(flag.parentFlagId) ?? 'unknown parent'}
                      </p>
                    )}
                    {editingId === flag.flagId ? (
                      <div className={styles.editForm}>
                        <input
                          type="text"
                          className={styles.inlineInput}
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="Name"
                          autoFocus
                        />
                        <input
                          type="text"
                          className={styles.inlineInput}
                          value={formDesc}
                          onChange={(e) => setFormDesc(e.target.value)}
                          placeholder="Description"
                        />
                      </div>
                    ) : (
                      <>
                        <p className={styles.flagName}>{flag.name}</p>
                        {flag.description && (
                          <p className={styles.flagDesc}>{flag.description}</p>
                        )}
                      </>
                    )}
                  </div>
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={flag.enabled}
                      onChange={() => handleToggle(flag)}
                      className={styles.toggleInput}
                    />
                    <span className={styles.toggleSlider} />
                    <span className={styles.toggleLabel}>
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>
                <div className={styles.flagActions}>
                  {editingId === flag.flagId ? (
                    <>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleEdit(flag.flagId)}
                        disabled={submitting}
                      >
                        Save
                      </button>
                      <button
                        className={styles.actionButton}
                        onClick={() => {
                          setEditingId(null);
                          setFormName('');
                          setFormDesc('');
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className={styles.actionButton}
                        onClick={() => startEdit(flag)}
                      >
                        Edit
                      </button>
                      {!flag.parentFlagId && (
                        <button
                          className={styles.actionButton}
                          onClick={() => startAddSubFlag(flag)}
                        >
                          Add sub-flag
                        </button>
                      )}
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(flag.flagId)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
