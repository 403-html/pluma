import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

const meta = {
  title: 'UI/Select',
  component: SelectTrigger,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof SelectTrigger>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Chevron sits immediately after the selected text with a small gap — NOT pushed to the far right. */
export const Default: Story = {
  render: () => (
    <div className="w-56">
      <Select defaultValue="production">
        <SelectTrigger>
          <SelectValue placeholder="Select environment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="production">Production</SelectItem>
          <SelectItem value="staging">Staging</SelectItem>
          <SelectItem value="development">Development</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

/** Short label — chevron should remain adjacent to text, not float right. */
export const ShortLabel: Story = {
  render: () => (
    <div className="w-56">
      <Select defaultValue="en">
        <SelectTrigger>
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="es">Español</SelectItem>
          <SelectItem value="fr">Français</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

/** Long label — text truncates, chevron stays shrink-0 at end of text. */
export const LongLabel: Story = {
  render: () => (
    <div className="w-56">
      <Select defaultValue="very-long">
        <SelectTrigger data-testid="long-label-trigger">
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="very-long">Very Long Environment Name That Should Truncate</SelectItem>
          <SelectItem value="short">Short</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const { within, expect } = await import('@storybook/test');
    const canvas = within(canvasElement);
    // Trigger should be present and its bounding box should be within the w-56 container
    const trigger = canvas.getByRole('combobox');
    expect(trigger).toBeInTheDocument();
    const triggerRect = trigger.getBoundingClientRect();
    // Chevron (svg inside the trigger) must be visible and not pushed beyond the trigger boundary
    const chevron = trigger.querySelector('svg');
    expect(chevron).not.toBeNull();
    if (chevron) {
      const chevronRect = chevron.getBoundingClientRect();
      // Chevron right edge must be within the trigger's right edge (± 2 px tolerance)
      expect(chevronRect.right).toBeLessThanOrEqual(triggerRect.right + 2);
      // Chevron must not be further than 24 px from the trigger's right edge (gap-2 + icon width)
      expect(triggerRect.right - chevronRect.right).toBeLessThanOrEqual(24);
    }
  },
};

/** Placeholder state — chevron adjacent to placeholder text. */
export const Placeholder: Story = {
  render: () => (
    <div className="w-56">
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select environment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="production">Production</SelectItem>
          <SelectItem value="staging">Staging</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

/** Disabled state. */
export const Disabled: Story = {
  render: () => (
    <div className="w-56">
      <Select disabled defaultValue="production">
        <SelectTrigger>
          <SelectValue placeholder="Select environment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="production">Production</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};
