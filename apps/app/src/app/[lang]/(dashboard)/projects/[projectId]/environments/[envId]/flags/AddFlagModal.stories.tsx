import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { AddFlagModal } from './AddFlagModal';
import { LocaleProvider } from '@/i18n/LocaleContext';

const meta = {
  title: 'Flags/AddFlagModal',
  component: AddFlagModal,
  decorators: [
    (Story) => (
      <LocaleProvider locale="en">
        <Story />
      </LocaleProvider>
    ),
  ],
} satisfies Meta<typeof AddFlagModal>;

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
        Open Add Flag Modal
      </button>
      {isOpen && (
        <AddFlagModal
          projectId="demo-project-id"
          existingKeys={['existing-flag']}
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            alert('Flag created successfully!');
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

function WithExistingKeysStory() {
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
        <AddFlagModal
          projectId="demo-project-id"
          existingKeys={['flag-one', 'flag-two', 'my-flag']}
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            alert('Flag created!');
            setIsOpen(false);
          }}
          onError={(message) => alert(`Error: ${message}`)}
        />
      )}
    </div>
  );
}

export const WithExistingKeys: Story = {
  render: () => <WithExistingKeysStory />,
};
