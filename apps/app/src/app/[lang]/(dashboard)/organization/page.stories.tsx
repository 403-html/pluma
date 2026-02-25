import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Key } from 'lucide-react';
import TokenTable from './_components/TokenTable';
import TokenRevealBanner from '@/components/TokenRevealBanner';
import EmptyState from '@/components/EmptyState';
import { LocaleProvider } from '@/i18n/LocaleContext';

// ── shared mock data ──────────────────────────────────────────────────────────

const MOCK_TOKENS = [
  {
    id: 'tok-1',
    name: 'Production SDK',
    projectName: 'My App',
    tokenPrefix: 'pluma_sdk_fd3a',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'tok-2',
    name: 'Staging',
    projectName: 'My App',
    tokenPrefix: 'pluma_sdk_ab12',
    createdAt: '2026-02-01T08:30:00Z',
  },
  {
    id: 'tok-3',
    name: 'CI Pipeline',
    projectName: 'Internal Tools',
    tokenPrefix: 'pluma_sdk_cc99',
    createdAt: '2026-02-20T14:45:00Z',
  },
];

const TABLE_LABELS = {
  colName: 'Name',
  colProject: 'Project',
  colKey: 'Key Preview',
  colCreated: 'Created',
  colActions: 'Actions',
  revokeBtn: 'Revoke',
  confirmRevoke: 'Revoke this API key?',
  confirmRevokeBtn: 'Confirm',
  cancelBtn: 'Cancel',
};

const REVEAL_TOKEN = {
  id: 'tok-new',
  name: 'Production SDK',
  token: 'pluma_sdk_fd3a2c1b88e940a7f6d3c4e5b1a2c3d4',
};

// ── stories ───────────────────────────────────────────────────────────────────

const meta = {
  title: 'Pages/Organization',
  decorators: [
    (Story: React.ComponentType) => (
      <LocaleProvider locale="en">
        <div className="p-8" style={{ minHeight: '100vh' }}>
          <Story />
        </div>
      </LocaleProvider>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Token list with three rows */
export const WithTokens: Story = {
  render: () => {
    const [pendingId, setPendingId] = useState<string | null>(null);
    return (
      <TokenTable
        tokens={MOCK_TOKENS}
        locale="en"
        labels={TABLE_LABELS}
        pendingRevokeId={pendingId}
        isRevoking={false}
        onRevoke={(id) => setPendingId(id)}
        onConfirmRevoke={() => setPendingId(null)}
        onCancelRevoke={() => setPendingId(null)}
      />
    );
  },
};

/** Inline revoke confirmation visible for one row */
export const RevokeConfirmation: Story = {
  render: () => (
    <TokenTable
      tokens={MOCK_TOKENS}
      locale="en"
      labels={TABLE_LABELS}
      pendingRevokeId="tok-2"
      isRevoking={false}
      onRevoke={() => {}}
      onConfirmRevoke={() => {}}
      onCancelRevoke={() => {}}
    />
  ),
};

/** One-time token reveal banner after creation */
export const TokenReveal: Story = {
  render: () => {
    const [visible, setVisible] = useState(true);
    return visible ? (
      <TokenRevealBanner
        token={REVEAL_TOKEN}
        projectName="My App"
        onDismiss={() => setVisible(false)}
        dismissLabel="Dismiss"
        title="API key created — copy it now"
        desc="This is the only time the full key will be shown. Store it somewhere safe."
        keyLabel="Key {name} for {project}"
      />
    ) : (
      <p className="text-sm text-muted-foreground">Banner dismissed.</p>
    );
  },
};

/** Empty state — no keys yet */
export const Empty: Story = {
  render: () => (
    <EmptyState icon={Key} message="No API keys yet. Create your first key to get started." />
  ),
};

