import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { TargetingInput } from './TargetingInput';

const meta = {
  title: 'Components/TargetingInput',
  component: TargetingInput,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TargetingInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Empty combobox with no pre-selected tags and a pool of suggestions.
 * Type to filter suggestions or create a new entry.
 */
export const Empty: Story = {
  args: {
    id: 'targeting-empty',
    tags: [],
    suggestions: ['user-001', 'user-002', 'user-003', 'user-abc'],
    onAdd: () => {},
    onRemove: () => {},
    placeholder: 'Search or add user ID…',
    disabled: false,
    addOptionLabel: 'Add',
    disabledValueHint: 'In other list',
  },
};

/**
 * Combobox with pre-selected tags. Demonstrates chip rendering and
 * suggestions filtered to exclude already-selected values.
 */
export const WithTags: Story = {
  args: {
    id: 'targeting-with-tags',
    tags: ['user-001', 'user-002'],
    suggestions: ['user-001', 'user-002', 'user-003', 'user-abc'],
    onAdd: () => {},
    onRemove: () => {},
    placeholder: 'Search or add user ID…',
    disabled: false,
    addOptionLabel: 'Add',
    disabledValueHint: 'In other list',
  },
};

/**
 * Combobox with disabled (conflicting) values shown greyed-out in the dropdown.
 * These values exist in the other targeting list and cannot be added.
 */
export const WithDisabledValues: Story = {
  args: {
    id: 'targeting-disabled-values',
    tags: [],
    suggestions: ['user-001', 'user-002', 'user-003'],
    onAdd: () => {},
    onRemove: () => {},
    placeholder: 'Search or add user ID…',
    disabled: false,
    disabledValues: ['user-002'],
    addOptionLabel: 'Add',
    disabledValueHint: 'In other list',
  },
};

/**
 * Combobox in a fully disabled state — input and remove buttons are non-interactive.
 */
export const Disabled: Story = {
  args: {
    id: 'targeting-disabled',
    tags: ['user-001'],
    suggestions: ['user-001', 'user-002'],
    onAdd: () => {},
    onRemove: () => {},
    placeholder: 'Search or add user ID…',
    disabled: true,
    addOptionLabel: 'Add',
    disabledValueHint: 'In other list',
  },
};

/**
 * Interactive story demonstrating full add/remove behaviour.
 */
export const Interactive: Story = {
  render: (args) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [tags, setTags] = useState<string[]>(['user-001']);
    return (
      <TargetingInput
        {...args}
        tags={tags}
        suggestions={['user-001', 'user-002', 'user-003']}
        onAdd={(v) => setTags((prev) => [...prev, v])}
        onRemove={(v) => setTags((prev) => prev.filter((t) => t !== v))}
      />
    );
  },
  args: {
    id: 'targeting-interactive',
    tags: [],
    suggestions: [],
    onAdd: () => {},
    onRemove: () => {},
    placeholder: 'Search or add user ID…',
    disabled: false,
    addOptionLabel: 'Add',
    disabledValueHint: 'In other list',
  },
};
