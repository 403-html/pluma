import type { Meta, StoryObj } from '@storybook/react-vite';
import LoadingSkeleton from './LoadingSkeleton';

const meta = {
  title: 'Components/LoadingSkeleton',
  component: LoadingSkeleton,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof LoadingSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default loading skeleton with no explicit label.
 * Uses the default aria-label: 'Loading content'.
 */
export const Default: Story = {};

/**
 * Loading skeleton with a custom descriptive label.
 * Useful when a more specific aria-label improves accessibility context.
 */
export const CustomLabel: Story = {
  args: {
    label: 'Loading API keys',
  },
};
