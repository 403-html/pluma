import type { Meta, StoryObj } from '@storybook/react-vite';
import AuditPage from './page';
import { LocaleProvider } from '@/i18n/LocaleContext';

const meta = {
  title: 'Pages/Audit',
  component: AuditPage,
  decorators: [
    (Story) => (
      <LocaleProvider locale="en">
        <div style={{ minHeight: '100vh' }}>
          <Story />
        </div>
      </LocaleProvider>
    ),
  ],
} satisfies Meta<typeof AuditPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
