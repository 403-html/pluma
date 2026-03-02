import type { Meta, StoryObj } from '@storybook/react-vite';
import { FlagRow } from './FlagRow';
import { LocaleProvider } from '@/i18n/LocaleContext';
import type { FlagEntry } from '@/lib/api/flags';
import { Table, TableBody } from '@/components/ui/table';

const baseMockFlag: FlagEntry = {
  flagId: 'flag-1',
  key: 'new-checkout-flow',
  name: 'New Checkout Flow',
  description: 'Enables the redesigned checkout experience.',
  enabled: true,
  allowList: [],
  denyList: [],
  rolloutPercentage: 50,
  parentFlagId: null,
};

const childMockFlag: FlagEntry = {
  flagId: 'flag-2',
  key: 'new-checkout-flow-ab',
  name: 'Checkout A/B Variant',
  description: null,
  enabled: false,
  allowList: [],
  denyList: [],
  rolloutPercentage: null,
  parentFlagId: 'flag-1',
};

const noopFns = {
  onToggle: () => {},
  onDeleteStart: () => {},
  onDeleteCancel: () => {},
  onDelete: () => {},
  onEdit: () => {},
  onAddSub: () => {},
};

const meta = {
  title: 'Flags/FlagRow',
  component: FlagRow,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <LocaleProvider locale="en">
        <Table>
          <TableBody>
            <Story />
          </TableBody>
        </Table>
      </LocaleProvider>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof FlagRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Root-level flag (depth=0). Shows the "Add sub-flag" button.
 */
export const RootFlag: Story = {
  args: {
    flag: baseMockFlag,
    depth: 0,
    indentPx: 0,
    isDeleting: false,
    isToggling: false,
    ...noopFns,
  },
};

/**
 * Child flag (depth=1). Rendered with left indent and sub-flag indicator.
 */
export const ChildFlag: Story = {
  args: {
    flag: childMockFlag,
    depth: 1,
    indentPx: 16,
    isDeleting: false,
    isToggling: false,
    ...noopFns,
  },
};

/**
 * Flag row in the delete-confirmation state.
 * Displays "Confirm delete?" with confirm/cancel buttons.
 */
export const DeletingState: Story = {
  args: {
    flag: baseMockFlag,
    depth: 0,
    indentPx: 0,
    isDeleting: true,
    isToggling: false,
    ...noopFns,
  },
};

/**
 * Flag row while a toggle operation is in progress.
 * The switch is disabled to prevent double-toggling.
 */
export const TogglingState: Story = {
  args: {
    flag: baseMockFlag,
    depth: 0,
    indentPx: 0,
    isDeleting: false,
    isToggling: true,
    ...noopFns,
  },
};
