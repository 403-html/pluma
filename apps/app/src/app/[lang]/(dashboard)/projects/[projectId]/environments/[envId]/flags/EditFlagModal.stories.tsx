import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EditFlagModal } from './EditFlagModal';
import { LocaleProvider } from '@/i18n/LocaleContext';
import type { FlagEntry } from '@/lib/api/flags';

const meta = {
  title: 'Flags/EditFlagModal',
  component: EditFlagModal,
  decorators: [
    (Story) => (
      <LocaleProvider locale="en">
        <Story />
      </LocaleProvider>
    ),
  ],
} satisfies Meta<typeof EditFlagModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleFlag: FlagEntry = {
  flagId: 'flag-1',
  key: 'my-feature-flag',
  name: 'My Feature Flag',
  description: 'A sample feature flag',
  enabled: true,
  allowList: [],
  denyList: [],
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
        Open Edit Flag Modal
      </button>
      {isOpen && (
        <EditFlagModal
          flag={sampleFlag}
          envId="env-preview-123"
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            alert('Flag updated successfully!');
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

function WithoutDescriptionStory() {
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
        <EditFlagModal
          flag={{
            ...sampleFlag,
            description: null,
          }}
          envId="env-preview-123"
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            alert('Flag updated!');
            setIsOpen(false);
          }}
          onError={(message) => alert(`Error: ${message}`)}
        />
      )}
    </div>
  );
}

export const WithoutDescription: Story = {
  render: () => <WithoutDescriptionStory />,
};

function DisabledStory() {
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
        <EditFlagModal
          flag={{
            ...sampleFlag,
            enabled: false,
          }}
          envId="env-preview-123"
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            alert('Flag updated!');
            setIsOpen(false);
          }}
          onError={(message) => alert(`Error: ${message}`)}
        />
      )}
    </div>
  );
}

export const Disabled: Story = {
  render: () => <DisabledStory />,
};
