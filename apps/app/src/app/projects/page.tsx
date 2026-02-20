'use client';

import { useState, useEffect } from 'react';
import type { Project } from '@pluma/types';
import { projects } from '@/lib/api';
import styles from './page.module.css';

export default function ProjectsPage() {
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState('');
  const [formName, setFormName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await projects.list();
      setProjectList(data);
    } catch {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await projects.create(formKey, formName);
      setFormKey('');
      setFormName('');
      setShowForm(false);
      loadProjects();
    } catch {
      setError('Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (id: string) => {
    setSubmitting(true);
    setError('');

    try {
      await projects.update(id, { name: formName });
      setEditingId(null);
      setFormName('');
      loadProjects();
    } catch {
      setError('Failed to update project');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this project? All associated data will be removed.')) {
      return;
    }

    try {
      await projects.delete(id);
      loadProjects();
    } catch {
      setError('Failed to delete project');
    }
  };

  const startEdit = (project: Project) => {
    setEditingId(project.id);
    setFormName(project.name);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Loading projects...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Projects</h1>
        {!showForm && (
          <button
            className={styles.createButton}
            onClick={() => setShowForm(true)}
            type="button"
          >
            New Project
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
              placeholder="Key (e.g., my-app)"
              value={formKey}
              onChange={(e) => setFormKey(e.target.value)}
              required
              autoFocus
            />
            <input
              type="text"
              className={styles.input}
              placeholder="Name (e.g., My App)"
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

      {projectList.length === 0 ? (
        <p className={styles.empty}>
          No projects yet. Create one to get started.
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
            {projectList.map((project) => (
              <tr key={project.id}>
                <td className={styles.keyCell}>{project.key}</td>
                <td>
                  {editingId === project.id ? (
                    <input
                      type="text"
                      className={styles.inlineInput}
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      autoFocus
                    />
                  ) : (
                    project.name
                  )}
                </td>
                <td className={styles.dateCell}>
                  {new Date(project.createdAt).toLocaleDateString()}
                </td>
                <td className={styles.actions}>
                  {editingId === project.id ? (
                    <>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleEdit(project.id)}
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
                        onClick={() => startEdit(project)}
                      >
                        Edit
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDelete(project.id)}
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
