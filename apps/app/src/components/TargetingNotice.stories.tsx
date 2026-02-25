import type { Meta, StoryObj } from '@storybook/react';
import { TargetingNotice } from './TargetingNotice';

const meta: Meta<typeof TargetingNotice> = {
  title: 'Components/TargetingNotice',
  component: TargetingNotice,
};
export default meta;

type Story = StoryObj<typeof TargetingNotice>;

export const Default: Story = {
  args: {
    title: 'How targeting works',
    body: 'IDs are matched against the subjectKey passed to the SDK evaluator. Add known IDs - they are never auto-collected.',
    codeSnippet: "evaluator({ subjectKey: 'user-id' })",
    dismissLabel: 'Dismiss targeting notice',
  },
};
