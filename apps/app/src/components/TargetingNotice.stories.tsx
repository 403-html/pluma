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
    body: 'IDs you add here are matched against the subjectKey you pass to the SDK evaluator. User IDs are never collected automatically — enter the ones you want to target in advance.',
    codeSnippet: "evaluator({ subjectKey: 'user-id' })",
  },
};
