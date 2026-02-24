import { http, HttpResponse } from 'msw';
import type { ProjectSummary, AuditLogEntry } from '@pluma/types';

const mockProjects: ProjectSummary[] = [
  {
    id: 'proj-1',
    key: 'acme',
    name: 'Acme Corp',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    environments: [
      { id: 'env-1', key: 'production', name: 'Production' },
      { id: 'env-2', key: 'staging', name: 'Staging' },
    ],
  },
  {
    id: 'proj-2',
    key: 'demo',
    name: 'Demo Project',
    createdAt: '2024-02-15T00:00:00.000Z',
    updatedAt: '2024-06-15T00:00:00.000Z',
    environments: [
      { id: 'env-3', key: 'production', name: 'Production' },
    ],
  },
];

const mockAuditEntries: AuditLogEntry[] = [
  {
    id: 'audit-1',
    action: 'create',
    entityType: 'flag',
    entityId: 'flag-1',
    entityKey: 'new-checkout-flow',
    projectId: 'proj-1',
    projectKey: 'acme',
    envId: null,
    envKey: null,
    flagId: 'flag-1',
    flagKey: 'new-checkout-flow',
    actorId: 'user-1',
    actorEmail: 'alice@example.com',
    details: null,
    createdAt: '2024-06-20T10:00:00.000Z',
  },
  {
    id: 'audit-2',
    action: 'enable',
    entityType: 'flagConfig',
    entityId: 'flagconfig-1',
    entityKey: 'new-checkout-flow',
    projectId: 'proj-1',
    projectKey: 'acme',
    envId: 'env-1',
    envKey: 'production',
    flagId: 'flag-1',
    flagKey: 'new-checkout-flow',
    actorId: 'user-2',
    actorEmail: 'bob@example.com',
    details: null,
    createdAt: '2024-06-20T11:30:00.000Z',
  },
  {
    id: 'audit-3',
    action: 'update',
    entityType: 'project',
    entityId: 'proj-1',
    entityKey: 'acme',
    projectId: 'proj-1',
    projectKey: 'acme',
    envId: null,
    envKey: null,
    flagId: null,
    flagKey: null,
    actorId: 'user-1',
    actorEmail: 'alice@example.com',
    details: { name: 'Acme Corp (updated)' },
    createdAt: '2024-06-21T09:15:00.000Z',
  },
];

export const handlers = [
  http.get('/api/v1/projects', () => {
    return HttpResponse.json(mockProjects);
  }),

  http.get('/api/v1/audit', () => {
    return HttpResponse.json({
      total: mockAuditEntries.length,
      page: 1,
      pageSize: 20,
      entries: mockAuditEntries,
    });
  }),
];
