import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageHeader } from './PageHeader';
import { Button } from './ui/button';

const meta = {
  title: 'Components/PageHeader',
  component: PageHeader,
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Projects',
  },
};

export const WithBreadcrumbs: Story = {
  args: {
    title: 'Development',
    breadcrumbs: [
      { label: 'Projects', href: '/projects' },
      { label: 'My Project', href: '/projects/my-project' },
    ],
  },
};

export const WithActions: Story = {
  args: {
    title: 'Projects',
    actions: (
      <Button type="button">
        New Project
      </Button>
    ),
  },
};

export const WithBreadcrumbsAndActions: Story = {
  args: {
    title: 'Flags',
    breadcrumbs: [
      { label: 'Projects', href: '/projects' },
      { label: 'My Project', href: '/projects/my-project' },
      { label: 'Development', href: '/projects/my-project/environments/dev' },
    ],
    actions: (
      <Button type="button">
        New Flag
      </Button>
    ),
  },
};

export const WithFiltersAsActions: Story = {
  args: {
    title: 'Audit Log',
    actions: (
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="project-filter" className="text-xs font-medium text-muted-foreground">Project</label>
          <select id="project-filter" className="text-sm border border-border rounded-md px-3 py-1.5 bg-background">
            <option>All Projects</option>
            <option>My Project</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="env-filter" className="text-xs font-medium text-muted-foreground">Environment</label>
          <select id="env-filter" className="text-sm border border-border rounded-md px-3 py-1.5 bg-background">
            <option>All Environments</option>
            <option>Development</option>
          </select>
        </div>
      </div>
    ),
  },
};
