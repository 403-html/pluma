import type { Meta, StoryObj } from '@storybook/react';
import { CopyPill } from './CopyPill';

const meta = {
  title: 'Components/CopyPill',
  component: CopyPill,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof CopyPill>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default CopyPill with a standard project key value.
 * Click to copy to clipboard - icon changes to green checkmark on success.
 */
export const Default: Story = {
  args: {
    value: 'project-key-abc',
  },
};

/**
 * CopyPill with a very long environment key value.
 * Tests how the component handles longer text.
 */
export const LongValue: Story = {
  args: {
    value: 'very-long-environment-key-value-that-is-long',
  },
};

/**
 * CopyPill with a very short key value.
 * Tests how the component handles minimal text.
 */
export const Short: Story = {
  args: {
    value: 'k1',
  },
};
