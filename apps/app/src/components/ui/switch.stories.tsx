import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switch, SwitchField } from './switch';

const meta = {
  title: 'UI/Switch',
  component: Switch,
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <Switch />,
};

export const Checked: Story = {
  render: () => <Switch defaultChecked />,
};

export const Disabled: Story = {
  render: () => <Switch disabled />,
};

export const DisabledChecked: Story = {
  render: () => <Switch disabled defaultChecked />,
};

export const Small: Story = {
  render: () => <Switch size="sm" />,
};

export const SmallChecked: Story = {
  render: () => <Switch size="sm" defaultChecked />,
};

export const FieldLabelRight: Story = {
  render: () => <SwitchField label="Enable feature" labelPosition="right" />,
};

export const FieldLabelLeft: Story = {
  render: () => <SwitchField label="Enable feature" labelPosition="left" />,
};

export const FieldWithDescription: Story = {
  render: () => (
    <SwitchField
      label="Rollout enabled"
      description="Gradually roll out this flag to a percentage of users."
      defaultChecked
    />
  ),
};

export const FieldSmall: Story = {
  render: () => (
    <SwitchField size="sm" label="Compact toggle" description="Uses the sm size variant." />
  ),
};

export const FieldDisabled: Story = {
  render: () => (
    <SwitchField label="Disabled toggle" description="Cannot be changed." disabled />
  ),
};
