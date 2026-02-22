import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { EditFlagModal } from './EditFlagModal';
import { LocaleProvider } from '@/i18n/LocaleContext';
import type { FeatureFlag } from '@pluma/types';

const sampleFlag: FeatureFlag = {
  id: 'flag-1',
  projectId: 'project-1',
  key: 'feature-a',
  name: 'Feature A',
  description: 'This is a sample feature flag',
  parentFlagId: null,
  createdAt: new Date('2024-01-01'),
};

const flagWithoutDescription: FeatureFlag = {
  id: 'flag-2',
  projectId: 'project-1',
  key: 'beta-access',
  name: 'Beta Access',
  description: null,
  parentFlagId: null,
  createdAt: new Date('2024-01-15'),
};

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

export const Default: Story = {
  render: () => {
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
            existingKeys={['feature-b', 'dark-mode']}
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
  },
};

export const WithoutDescription: Story = {
  render: () => {
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
            flag={flagWithoutDescription}
            existingKeys={['feature-a', 'dark-mode']}
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
  },
};

export const WithManyExistingKeys: Story = {
  render: () => {
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
            flag={sampleFlag}
            existingKeys={[
              'feature-b',
              'feature-c',
              'dark-mode',
              'beta-access',
              'premium-features',
            ]}
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
  },
};
