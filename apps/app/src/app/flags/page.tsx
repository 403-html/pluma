'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FlagListItem } from '@pluma/types';
import { flags } from '@/lib/api';
import { useAppContext } from '@/lib/context/AppContext';
import TopBar from '@/components/TopBar';

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

  const _startAddSubFlag = (parentFlag: FlagListItem) => {
    // TODO: sub-flag creation UI will be re-enabled once the API returns parentFlagId
    setFormParentId(parentFlag.flagId);
    setFormKey('');
    setFormName('');
    setFormDesc('');
    setShowForm(true);
  };

  // TODO: re-enable once GET /environments/:envId/flags returns parentFlagId
  // const flagKeyById = useMemo(
  //   () => new Map(flagList.map((f) => [f.flagId, f.key])),
  //   [flagList],
  // );

  // TODO: re-enable once GET /environments/:envId/flags returns parentFlagId
  // const topLevelFlags = useMemo(
  //   () => flagList.filter((f) => !f.parentFlagId),
  //   [flagList],
  // );

  if (!selectedProject || !selectedEnvironment) {
    return (
      <>
        <TopBar onCreateFlag={handleCreateFlagClick} />
        <div className="p-8">
          <p className="text-ink-muted">
            Select a project and environment to manage flags
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar onCreateFlag={handleCreateFlagClick} />
      <div className="p-8">
        {error && <div className="bg-red-900/20 border border-red-800/30 text-red-300 p-4 text-sm mb-6">{error}</div>}

        {showForm && (
          <form className="mb-8 p-6 bg-card border border-stroke" onSubmit={handleCreate}>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                className="px-3.5 py-2.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
                placeholder="Key (e.g., new-checkout-flow)"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                required
                autoFocus
              />
              <input
                type="text"
                className="px-3.5 py-2.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
                placeholder="Name (e.g., New Checkout Flow)"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
              />
              <input
                type="text"
                className="px-3.5 py-2.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
                placeholder="Description (optional)"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
              {/* TODO: parent flag selector — re-enable once API returns parentFlagId
              <select
                className="px-3.5 py-2.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
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
              */}
              <div className="col-span-2 flex gap-3 justify-end">
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
                  onClick={resetForm}
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-ink-muted">Loading flags...</p>
        ) : filteredFlags.length === 0 ? (
          <p className="text-ink-muted">
            {searchQuery
              ? 'No flags match your search'
              : 'No flags yet. Create one to get started.'}
          </p>
        ) : (
          <div className="space-y-4">
            {filteredFlags.map((flag) => (
              <div
                key={flag.flagId}
                className={`bg-card p-6 border-l-[3px] ${
                  flag.enabled ? 'border-l-accent' : 'border-l-ink-dim'
                  /* TODO: add ml-8 for child flags once API returns parentFlagId */}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-ink font-mono text-base font-semibold">{flag.key}</h3>
                    {/* TODO: show ↳ parent badge once API returns parentFlagId
                    {flag.parentFlagId && (
                      <p className="text-ink-muted text-xs font-mono mt-1">
                        {'\u21b3'}{' '}
                        {flagKeyById.get(flag.parentFlagId) ?? 'unknown parent'}
                      </p>
                    )}
                    */}
                    {editingId === flag.flagId ? (
                      <div className="mt-3 space-y-2">
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="Name"
                          autoFocus
                        />
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 bg-surface border border-stroke text-ink text-sm focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
                          value={formDesc}
                          onChange={(e) => setFormDesc(e.target.value)}
                          placeholder="Description"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="text-ink text-sm mt-2">{flag.name}</p>
                        {flag.description && (
                          <p className="text-ink-muted text-sm mt-1">{flag.description}</p>
                        )}
                      </>
                    )}
                  </div>
                  <label className="flex items-center gap-3 ml-6 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flag.enabled}
                      onChange={() => handleToggle(flag)}
                      className="sr-only peer"
                    />
                    <div className="relative w-12 h-6 bg-stroke peer-checked:bg-accent transition-colors">
                      <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-ink transition-transform peer-checked:translate-x-6" />
                    </div>
                    <span className="text-ink-muted text-sm select-none">
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </label>
                </div>
                <div className="flex gap-3">
                  {editingId === flag.flagId ? (
                    <>
                      <button
                        className="px-4 py-2 bg-card border border-stroke text-ink text-sm hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleEdit(flag.flagId)}
                        disabled={submitting}
                      >
                        Save
                      </button>
                      <button
                        className="px-4 py-2 bg-card border border-stroke text-ink text-sm hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
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
                        className="px-4 py-2 bg-card border border-stroke text-ink text-sm hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                        onClick={() => startEdit(flag)}
                      >
                        Edit
                      </button>
                      <button
                        className="px-4 py-2 border border-red-800/50 text-red-300 text-sm hover:bg-red-900/20 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                        onClick={() => handleDelete(flag.flagId)}
                      >
                        Delete
                      </button>
                      {/* TODO: re-enable "Add sub-flag" once API returns parentFlagId
                      {!flag.parentFlagId && (
                        <button
                          className="px-4 py-2 bg-card border border-stroke text-ink text-sm hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                          onClick={() => startAddSubFlag(flag)}
                        >
                          Add sub-flag
                        </button>
                      )}
                      */}
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
