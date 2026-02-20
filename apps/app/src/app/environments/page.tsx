'use client';

import { useState, useEffect } from 'react';
import type { Environment } from '@pluma/types';
import { environments } from '@/lib/api';
import { useAppContext } from '@/lib/context/AppContext';
import styles from '../projects/page.module.css';

export default function EnvironmentsPage() {
  const { selectedProject } = useAppContext();
  const [envList, setEnvList] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState('');
  const [formName, setFormName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedProject) {
      loadEnvironments();
    } else {
      setEnvList([]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject]);

  const loadEnvironments = async () => {
    if (!selectedProject) return;

    try {
      setLoading(true);
      setError('');
      const data = await environments.list(selectedProject.id);
      setEnvList(data);
    } catch {
      setError('Failed to load environments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    setSubmitting(true);
    setError('');

    try {
      await environments.create(selectedProject.id, formKey, formName);
      setFormKey('');
      setFormName('');
      setShowForm(false);
      loadEnvironments();
    } catch {
      setError('Failed to create environment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id: string) => {
    setSubmitting(true);
    setError('');

    try {
      await environments.update(id, { name: formName });
      setEditingId(null);
      setFormName('');
      loadEnvironments();
    } catch {
      setError('Failed to update environment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm('Delete this environment? All flag configurations will be lost.')
    ) {
      return;
    }

    try {
      await environments.delete(id);
      loadEnvironments();
    } catch {
      setError('Failed to delete environment');
    }
  };

  const startEdit = (env: Environment) => {
    setEditingId(env.id);
    setFormName(env.name);
  };

  if (!selectedProject) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Select a project to manage environments</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Loading environments...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Environments</h1>
        {!showForm && (
          <button
            className={styles.createButton}
            onClick={() => setShowForm(true)}
            type="button"
          >
            New Environment
          </button>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {showForm && (
        <form className={styles.form} onSubmit={handleCreate}>
          <div className={styles.formRow}>
            <input
              type="text"
              className={styles.input}
              placeholder="Key (e.g., production)"
              value={formKey}
              onChange={(e) => setFormKey(e.target.value)}
              required
              autoFocus
            />
            <input
              type="text"
              className={styles.input}
              placeholder="Name (e.g., Production)"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
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
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {envList.length === 0 ? (
        <p className={styles.empty}>
          No environments yet. Create one to get started.
        </p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Key</th>
              <th>Name</th>
              <th>Created</th>
              <th className={styles.actionsHeader}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {envList.map((env) => (
              <tr key={env.id}>
                <td className={styles.keyCell}>{env.key}</td>
                <td>
                  {editingId === env.id ? (
                    <input
                      type="text"
                      className={styles.inlineInput}
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    env.name
                  )}
                </td>
                <td className={styles.dateCell}>
                  {new Date(env.createdAt).toLocaleDateString()}
                </td>
                <td className={styles.actions}>
                  {editingId === env.id ? (
                    <>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleEdit(env.id)}
                        disabled={submitting}
                      >
                        Save
                      </button>
                      <button
                        className={styles.actionButton}
                        onClick={() => {
                          setEditingId(null);
                          setFormName('');
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className={styles.actionButton}
                        onClick={() => startEdit(env)}
                      >
                        Edit
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(env.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
