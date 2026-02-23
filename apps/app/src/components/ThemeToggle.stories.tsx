import type { Meta, StoryObj } from '@storybook/react-vite';
import ThemeToggle from './ThemeToggle';
import { LocaleProvider } from '@/i18n/LocaleContext';
import { ThemeProvider } from './ThemeContext';

const meta = {
  title: 'Components/ThemeToggle',
  component: ThemeToggle,
  decorators: [
    (Story) => (
      <LocaleProvider locale="en">
        <ThemeProvider>
          <Story />
        </ThemeProvider>
      </LocaleProvider>
    ),
  ],
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ThemeToggle />,
};
