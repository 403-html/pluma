import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import Modal from './Modal';
import { LocaleProvider } from '@/i18n/LocaleContext';

const meta = {
  title: 'Components/Modal',
  component: Modal,
  decorators: [
    (Story) => (
      <LocaleProvider locale="en">
        <Story />
      </LocaleProvider>
    ),
  ],
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

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
          <Modal
            titleId="example-modal-title"
            title="Example Modal"
            onClose={() => setIsOpen(false)}
          >
            <p>This is the modal content.</p>
          </Modal>
        )}
      </div>
    );
  },
};
