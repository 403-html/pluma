import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { AddEnvironmentModal } from './AddEnvironmentModal';
import { LocaleProvider } from '@/i18n/LocaleContext';

const meta = {
  title: 'Environments/AddEnvironmentModal',
  component: AddEnvironmentModal,
  decorators: [
    (Story) => (
      <LocaleProvider locale="en">
        <Story />
      </LocaleProvider>
    ),
  ],
} satisfies Meta<typeof AddEnvironmentModal>;

export default meta;
type Story = StoryObj<typeof meta>;

function DefaultStory() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div>
      <button
        type="button"
        className="btn-primary"
        onClick={() => setIsOpen(true)}
      >
        Open Add Environment Modal
      </button>
      {isOpen && (
        <AddEnvironmentModal
          projectId="demo-project-id"
          existingKeys={['production', 'staging']}
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            alert('Environment created successfully!');
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

function WithExistingEnvironmentsStory() {
  const [isOpen, setIsOpen] = useState(true);

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
        <AddEnvironmentModal
          projectId="demo-project-id"
          existingKeys={['production', 'staging', 'development', 'qa', 'uat']}
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            alert('Environment created!');
            setIsOpen(false);
          }}
          onError={(message) => alert(`Error: ${message}`)}
        />
      )}
    </div>
  );
}

export const WithExistingEnvironments: Story = {
  render: () => <WithExistingEnvironmentsStory />,
};

function EmptyProjectStory() {
  const [isOpen, setIsOpen] = useState(true);

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
        <AddEnvironmentModal
          projectId="demo-project-id"
          existingKeys={[]}
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            alert('First environment created!');
            setIsOpen(false);
          }}
          onError={(message) => alert(`Error: ${message}`)}
        />
      )}
    </div>
  );
}

export const EmptyProject: Story = {
  render: () => <EmptyProjectStory />,
};
