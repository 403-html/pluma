import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EditEnvironmentModal } from './EditEnvironmentModal';
import { LocaleProvider } from '@/i18n/LocaleContext';
import type { EnvironmentSummary } from '@/lib/api/environments';

const meta = {
  title: 'Environments/EditEnvironmentModal',
  component: EditEnvironmentModal,
  decorators: [
    (Story) => (
      <LocaleProvider locale="en">
        <Story />
      </LocaleProvider>
    ),
  ],
} satisfies Meta<typeof EditEnvironmentModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockEnvironment: EnvironmentSummary = {
  id: 'env-1',
  key: 'production',
  name: 'Production',
  projectId: 'project-1',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  flagStats: {
    total: 10,
    enabled: 7,
  },
};

function DefaultStory() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div>
      <button
        type="button"
        className="btn-primary"
        onClick={() => setIsOpen(true)}
      >
        Open Edit Environment Modal
      </button>
      {isOpen && (
        <EditEnvironmentModal
          env={mockEnvironment}
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            alert('Environment updated successfully!');
            setIsOpen(false);
          }}
          onError={(message) => {
            alert(`Error: ${message}`);
          }}
        />
      )}
    </div>
  );
}

export const Default: Story = {
  render: () => <DefaultStory />,
};

function StagingEnvironmentStory() {
  const [isOpen, setIsOpen] = useState(true);
  const stagingEnv: EnvironmentSummary = {
    ...mockEnvironment,
    id: 'env-2',
    key: 'staging',
    name: 'Staging',
    flagStats: {
      total: 15,
      enabled: 3,
    },
  };

  return (
    <div>
      <button
        type="button"
        className="btn-primary"
        onClick={() => setIsOpen(true)}
      >
        Open Modal
      </button>
      {isOpen && (
        <EditEnvironmentModal
          env={stagingEnv}
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            alert('Environment updated!');
            setIsOpen(false);
          }}
          onError={(message) => alert(`Error: ${message}`)}
        />
      )}
    </div>
  );
}

export const StagingEnvironment: Story = {
  render: () => <StagingEnvironmentStory />,
};

function NoFlagsStory() {
  const [isOpen, setIsOpen] = useState(true);
  const emptyEnv: EnvironmentSummary = {
    ...mockEnvironment,
    id: 'env-3',
    key: 'development',
    name: 'Development',
    flagStats: {
      total: 0,
      enabled: 0,
    },
  };

  return (
    <div>
      <button
        type="button"
        className="btn-primary"
        onClick={() => setIsOpen(true)}
      >
        Open Modal
      </button>
      {isOpen && (
        <EditEnvironmentModal
          env={emptyEnv}
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            alert('Environment updated!');
            setIsOpen(false);
          }}
          onError={(message) => alert(`Error: ${message}`)}
        />
      )}
    </div>
  );
}

export const NoFlags: Story = {
  render: () => <NoFlagsStory />,
};
