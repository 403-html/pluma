'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FlagListItem } from '@pluma/types';
import { flags, ApiError } from '@/lib/api';
import { useAppContext } from '@/lib/context/AppContext';
import TopBar from '@/components/TopBar';
import FlagCreateForm from '@/components/FlagCreateForm';
import FlagCard from '@/components/FlagCard';

export default function FlagsPage() {
  const { selectedProject, selectedEnvironment, searchQuery } = useAppContext();
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
      setLoading(true); setError('');
      setFlagList(await flags.list(selectedEnvironment.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load flags');
    } finally { setLoading(false); }
  }, [selectedEnvironment]);

  useEffect(() => {
    if (selectedEnvironment) { loadFlags(); }
    else { setFlagList([]); setLoading(false); }
  }, [selectedEnvironment, loadFlags]);

  const filteredFlags = useMemo(() => {
    if (!searchQuery) return flagList;
    const q = searchQuery.toLowerCase();
    return flagList.filter((f) => f.key.toLowerCase().includes(q) || f.name.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q));
  }, [flagList, searchQuery]);

  const resetForm = useCallback(() => { setFormKey(''); setFormName(''); setFormDesc(''); setFormParentId(''); setShowForm(false); }, []);
  const handleCreateFlagClick = useCallback(() => { setFormKey(''); setFormName(''); setFormDesc(''); setFormParentId(''); setShowForm(true); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setSubmitting(true); setError('');
    try {
      await flags.create(selectedProject.id, formKey, formName, formDesc || undefined, formParentId || undefined);
      resetForm(); await loadFlags();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create flag');
    } finally { setSubmitting(false); }
  };

  const handleEdit = async (id: string) => {
    setSubmitting(true); setError('');
    try {
      await flags.update(id, { name: formName, description: formDesc });
      setEditingId(null); setFormName(''); setFormDesc('');
      await loadFlags();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update flag');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this flag? This action cannot be undone.')) return;
    try { await flags.delete(id); await loadFlags(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Failed to delete flag'); }
  };

  const handleToggle = async (flag: FlagListItem) => {
    if (!selectedEnvironment) return;
    try { await flags.updateConfig(selectedEnvironment.id, flag.flagId, { enabled: !flag.enabled }); await loadFlags(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Failed to toggle flag'); }
  };

  if (!selectedProject || !selectedEnvironment) {
    return <><TopBar onCreateFlag={handleCreateFlagClick} /><div className="p-5"><p className="text-ink-muted text-sm">Select a project and environment to manage flags</p></div></>;
  }

  return (
    <>
      <TopBar onCreateFlag={handleCreateFlagClick} />
      <div className="p-5">
        {error && <div className="bg-red-900/20 border border-red-800/30 text-red-300 p-3 text-xs mb-4">{error}</div>}
        {showForm && <FlagCreateForm formKey={formKey} formName={formName} formDesc={formDesc} submitting={submitting} onFormKey={setFormKey} onFormName={setFormName} onFormDesc={setFormDesc} onSubmit={handleCreate} onCancel={resetForm} />}
        {loading ? <p className="text-ink-muted text-sm">Loading flags...</p>
          : filteredFlags.length === 0 ? <p className="text-ink-muted text-sm">{searchQuery ? 'No flags match your search' : 'No flags yet. Create one to get started.'}</p>
          : <div className="space-y-2">{filteredFlags.map((flag) => (
            <FlagCard key={flag.flagId} flag={flag} editingId={editingId} formName={formName} formDesc={formDesc} submitting={submitting}
              onFormName={setFormName} onFormDesc={setFormDesc}
              onStartEdit={(f) => { setEditingId(f.flagId); setFormName(f.name); setFormDesc(f.description || ''); }}
              onSaveEdit={handleEdit} onCancelEdit={() => { setEditingId(null); setFormName(''); setFormDesc(''); }}
              onDelete={handleDelete} onToggle={handleToggle}
            />
          ))}</div>
        }
      </div>
    </>
  );
}

