'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import type { Project } from '@pluma/types';
import { projects, ApiError } from '@/lib/api';
import ProjectCreateForm from '@/components/ProjectCreateForm';
import ProjectTable from '@/components/ProjectTable';

export default function ProjectsPage() {
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState('');
  const [formName, setFormName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await projects.list();
      setProjectList(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await projects.create(formKey, formName);
      setFormKey(''); setFormName(''); setShowForm(false);
      await loadProjects();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create project');
    } finally { setSubmitting(false); }
  };

  const handleEdit = async (id: string) => {
    setSubmitting(true); setError('');
    try {
      await projects.update(id, { name: formName });
      setEditingId(null); setFormName('');
      await loadProjects();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update project');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this project? All associated data will be removed.')) return;
    try {
      await projects.delete(id);
      await loadProjects();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete project');
    }
  };

  if (loading) return <div className="p-5"><p className="text-ink-muted text-sm">Loading projects...</p></div>;

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-ink">Projects</h1>
        {!showForm && (
          <button className="px-4 py-1.5 bg-accent text-surface text-sm font-semibold hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2" onClick={() => setShowForm(true)} type="button">
            New Project
          </button>
        )}
      </div>
      {error && <div className="bg-red-900/20 border border-red-800/30 text-red-300 p-3 text-xs mb-4">{error}</div>}
      {showForm && (
        <ProjectCreateForm
          formKey={formKey} formName={formName} submitting={submitting}
          onFormKey={setFormKey} onFormName={setFormName}
          onSubmit={handleCreate} onCancel={() => { setShowForm(false); setFormKey(''); setFormName(''); }}
        />
      )}
      {projectList.length === 0 ? (
        <p className="text-ink-muted text-sm">No projects yet. Create one to get started.</p>
      ) : (
        <ProjectTable
          projects={projectList} editingId={editingId} formName={formName} submitting={submitting}
          onFormName={setFormName}
          onStartEdit={(p) => { setEditingId(p.id); setFormName(p.name); }}
          onSaveEdit={handleEdit}
          onCancelEdit={() => { setEditingId(null); setFormName(''); }}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

