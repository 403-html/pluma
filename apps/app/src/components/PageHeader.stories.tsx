import type { Meta, StoryObj } from '@storybook/react-vite';
import { PageHeader } from './PageHeader';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';

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
          <Select defaultValue="">
            <SelectTrigger id="project-filter">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Projects</SelectItem>
              <SelectItem value="my-project">My Project</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="env-filter" className="text-xs font-medium text-muted-foreground">Environment</label>
          <Select defaultValue="">
            <SelectTrigger id="env-filter">
              <SelectValue placeholder="All Environments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Environments</SelectItem>
              <SelectItem value="development">Development</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    ),
  },
};
