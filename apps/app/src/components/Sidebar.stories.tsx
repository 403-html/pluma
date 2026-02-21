import type { Meta, StoryObj } from '@storybook/react-vite';
import Sidebar from './Sidebar';
import { LocaleProvider } from '@/i18n/LocaleContext';

const meta = {
  title: 'Components/Sidebar',
  component: Sidebar,
  decorators: [
    (Story) => (
      <LocaleProvider locale="en">
        <div style={{ minHeight: '100vh', position: 'relative' }}>
          <Story />
        </div>
      </LocaleProvider>
    ),
  ],
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
