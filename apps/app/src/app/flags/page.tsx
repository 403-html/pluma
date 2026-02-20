'use client';

import { useState, useEffect, useMemo } from 'react';
import type { FlagWithConfig } from '@/lib/api';
import { flags } from '@/lib/api';
import { useAppContext } from '@/lib/context/AppContext';
import TopBar from '@/components/TopBar';
import styles from './page.module.css';

export default function FlagsPage() {
  const { selectedProject, selectedEnvironment, searchQuery } =
    useAppContext();
  const [flagList, setFlagList] = useState<FlagWithConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedEnvironment) {
      loadFlags();
    } else {
      setFlagList([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEnvironment]);

  const loadFlags = async () => {
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
  };

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    setSubmitting(true);
    setError('');

    try {
      await flags.create(selectedProject.id, formKey, formName, formDesc);
      setFormKey('');
      setFormName('');
      setFormDesc('');
      setShowForm(false);
      loadFlags();
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
      loadFlags();
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
      loadFlags();
    } catch {
      setError('Failed to delete flag');
    }
  };

  const handleToggle = async (flag: FlagWithConfig) => {
    if (!selectedEnvironment) return;

    try {
      await flags.updateConfig(selectedEnvironment.id, flag.id, {
        enabled: !flag.config.enabled,
      });
      loadFlags();
    } catch {
      setError('Failed to toggle flag');
    }
  };

  const startEdit = (flag: FlagWithConfig) => {
    setEditingId(flag.id);
    setFormName(flag.name);
    setFormDesc(flag.description || '');
  };

  if (!selectedProject || !selectedEnvironment) {
    return (
      <>
        <TopBar onCreateFlag={() => setShowForm(true)} />
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
      <TopBar onCreateFlag={() => setShowForm(true)} />
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
                  onClick={() => {
                    setShowForm(false);
                    setFormKey('');
                    setFormName('');
                    setFormDesc('');
                  }}
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
                key={flag.id}
                className={`${styles.flagCard} ${
                  flag.config.enabled ? styles.flagCardActive : ''
                }`}
              >
                <div className={styles.flagHeader}>
                  <div className={styles.flagInfo}>
                    <h3 className={styles.flagKey}>{flag.key}</h3>
                    {editingId === flag.id ? (
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
                      checked={flag.config.enabled}
                      onChange={() => handleToggle(flag)}
                      className={styles.toggleInput}
                    />
                    <span className={styles.toggleSlider} />
                    <span className={styles.toggleLabel}>
                      {flag.config.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>
                <div className={styles.flagActions}>
                  {editingId === flag.id ? (
                    <>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleEdit(flag.id)}
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
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(flag.id)}
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
