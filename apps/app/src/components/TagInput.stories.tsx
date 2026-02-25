import type { Meta, StoryObj } from '@storybook/react';
import { TagInput } from './TagInput';

const meta = {
  title: 'Components/TagInput',
  component: TagInput,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TagInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default chip with a user ID value and an active remove button.
 */
export const Default: Story = {
  args: {
    value: 'user-123',
    onRemove: () => {},
    disabled: false,
  },
};

/**
 * Chip in a disabled state — the remove button is non-interactive.
 */
export const Disabled: Story = {
  args: {
    value: 'user-456',
    onRemove: () => {},
    disabled: true,
  },
};

/**
 * Chip with a longer user ID value.
 */
export const LongValue: Story = {
  args: {
    value: 'very-long-user-id-value-that-may-wrap',
    onRemove: () => {},
    disabled: false,
  },
};
