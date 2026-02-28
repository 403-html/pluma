import type { Meta, StoryObj } from '@storybook/react-vite';
import { AuditActionBadge } from './AuditActionBadge';

const meta = {
  title: 'Audit/AuditActionBadge',
  component: AuditActionBadge,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AuditActionBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shown when a new resource is created. */
export const Create: Story = {
  args: {
    action: 'create',
  },
};

/** Shown when an existing resource is updated. */
export const Update: Story = {
  args: {
    action: 'update',
  },
};

/** Shown when a resource is permanently deleted. */
export const Delete: Story = {
  args: {
    action: 'delete',
  },
};

/** Shown when a feature flag or resource is enabled. */
export const Enable: Story = {
  args: {
    action: 'enable',
  },
};

/** Shown when a feature flag or resource is disabled. */
export const Disable: Story = {
  args: {
    action: 'disable',
  },
};
