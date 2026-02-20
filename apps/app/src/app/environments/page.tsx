'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Environment } from '@pluma/types';
import { environments, ApiError } from '@/lib/api';
import { useAppContext } from '@/lib/context/AppContext';

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

  const loadEnvironments = useCallback(async () => {
    if (!selectedProject) return;

    try {
      setLoading(true);
      setError('');
      const data = await environments.list(selectedProject.id);
      setEnvList(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load environments');
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedProject) {
      loadEnvironments();
    } else {
      setEnvList([]);
      setLoading(false);
    }
  }, [selectedProject, loadEnvironments]);

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
      await loadEnvironments();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create environment');
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
      await loadEnvironments();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update environment');
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
      await loadEnvironments();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete environment');
    }
  };

  const startEdit = (env: Environment) => {
    setEditingId(env.id);
    setFormName(env.name);
  };

  if (!selectedProject) {
    return (
      <div className="p-8">
        <p className="text-ink-muted">Select a project to manage environments</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-ink-muted">Loading environments...</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold text-ink">Environments</h1>
        {!showForm && (
          <button
            className="px-6 py-2.5 bg-accent text-surface font-semibold hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            onClick={() => setShowForm(true)}
            type="button"
          >
            New Environment
          </button>
        )}
      </div>

      {error && <div className="bg-red-900/20 border border-red-800/30 text-red-300 p-4 text-sm mb-6">{error}</div>}

      {showForm && (
        <form className="mb-6 p-6 bg-card border border-stroke" onSubmit={handleCreate}>
          <div className="flex gap-3">
            <input
              type="text"
              className="flex-1 px-3.5 py-2.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
              placeholder="Key (e.g., production)"
              value={formKey}
              onChange={(e) => setFormKey(e.target.value)}
              required
              autoFocus
            />
            <input
              type="text"
              className="flex-1 px-3.5 py-2.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
              placeholder="Name (e.g., Production)"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
            />
            <button
              type="submit"
              className="px-6 py-2.5 bg-accent text-surface font-semibold text-sm hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              Create
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-card border border-stroke text-ink text-sm hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
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
        <p className="text-ink-muted">
          No environments yet. Create one to get started.
        </p>
      ) : (
        <table className="w-full border-collapse bg-card">
          <thead>
            <tr>
              <th className="text-left p-4 text-ink-muted text-xs font-semibold uppercase tracking-wider border-b border-stroke">Key</th>
              <th className="text-left p-4 text-ink-muted text-xs font-semibold uppercase tracking-wider border-b border-stroke">Name</th>
              <th className="text-left p-4 text-ink-muted text-xs font-semibold uppercase tracking-wider border-b border-stroke">Created</th>
              <th className="text-right p-4 text-ink-muted text-xs font-semibold uppercase tracking-wider border-b border-stroke">Actions</th>
            </tr>
          </thead>
          <tbody>
            {envList.map((env) => (
              <tr key={env.id}>
                <td className="p-4 text-ink text-sm font-mono border-b border-stroke">{env.key}</td>
                <td className="p-4 text-ink text-sm border-b border-stroke">
                  {editingId === env.id ? (
                    <input
                      type="text"
                      className="px-3 py-1.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    env.name
                  )}
                </td>
                <td className="p-4 text-ink-muted text-sm border-b border-stroke">
                  {new Date(env.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4 text-sm border-b border-stroke text-right space-x-3">
                  {editingId === env.id ? (
                    <>
                      <button
                        className="px-4 py-2 bg-card border border-stroke text-ink text-sm hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleEdit(env.id)}
                        disabled={submitting}
                      >
                        Save
                      </button>
                      <button
                        className="px-4 py-2 bg-card border border-stroke text-ink text-sm hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
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
                        className="px-4 py-2 bg-card border border-stroke text-ink text-sm hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                        onClick={() => startEdit(env)}
                      >
                        Edit
                      </button>
                      <button
                        className="px-4 py-2 border border-red-800/50 text-red-300 text-sm hover:bg-red-900/20 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
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
