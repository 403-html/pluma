import type { Meta, StoryObj } from '@storybook/react-vite';
import SettingsPanel from './SettingsPanel';
import { LocaleProvider } from '@/i18n/LocaleContext';
import { useState } from 'react';

function SettingsPanelWrapper() {
  const [isOpen, setIsOpen] = useState(true);
  
  return (
    <LocaleProvider locale="en">
      <div>
        <button onClick={() => setIsOpen(true)}>Open Settings</button>
        <SettingsPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
      </div>
    </LocaleProvider>
  );
}

const meta = {
  title: 'Components/SettingsPanel',
  component: SettingsPanelWrapper,
} satisfies Meta<typeof SettingsPanelWrapper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
