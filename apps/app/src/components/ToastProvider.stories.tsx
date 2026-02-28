import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToastProvider } from './ToastProvider';
import { toast } from 'react-toastify';

const meta = {
  title: 'Components/ToastProvider',
  component: ToastProvider,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ToastProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <>
      <ToastProvider />
      <button onClick={() => toast.success('Action completed!')}>Show success toast</button>
    </>
  ),
};

export const ErrorToast: Story = {
  render: () => (
    <>
      <ToastProvider />
      <button onClick={() => toast.error('Something went wrong.')}>Show error toast</button>
    </>
  ),
};

export const LoadingToast: Story = {
  render: () => (
    <>
      <ToastProvider />
      <button
        onClick={() => {
          const id = toast.loading('Processing…');
          setTimeout(() => toast.update(id, { render: 'Done!', type: 'success', isLoading: false, autoClose: 3000 }), 2000);
        }}
      >
        Show loading → success toast
      </button>
    </>
  ),
};
