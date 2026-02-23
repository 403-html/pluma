import type { Meta, StoryObj } from '@storybook/react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Select>;

const SelectDemo = () => (
  <Select>
    <SelectTrigger className="w-[180px]">
      <SelectValue placeholder="Select a fruit" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="apple">Apple</SelectItem>
      <SelectItem value="banana">Banana</SelectItem>
      <SelectItem value="orange">Orange</SelectItem>
      <SelectItem value="grape">Grape</SelectItem>
      <SelectItem value="mango">Mango</SelectItem>
    </SelectContent>
  </Select>
);

export const Default: Story = {
  render: () => <SelectDemo />,
};

const SelectWithGroups = () => (
  <Select>
    <SelectTrigger className="w-[200px]">
      <SelectValue placeholder="Select an option" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="option1">Option 1</SelectItem>
      <SelectItem value="option2">Option 2</SelectItem>
      <SelectItem value="option3">Option 3</SelectItem>
      <SelectItem value="option4" disabled>
        Option 4 (Disabled)
      </SelectItem>
    </SelectContent>
  </Select>
);

export const WithDisabledOption: Story = {
  render: () => <SelectWithGroups />,
};
