import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableHeadRow,
  TablePagination,
} from './table';

const meta = {
  title: 'UI/Table',
  component: Table,
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableHeadRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
        </TableHeadRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium">Alpha Project</TableCell>
          <TableCell>Active</TableCell>
          <TableCell className="text-muted-foreground whitespace-nowrap">Jan 1, 2025</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Beta Project</TableCell>
          <TableCell>Inactive</TableCell>
          <TableCell className="text-muted-foreground whitespace-nowrap">Feb 14, 2025</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-medium">Gamma Project</TableCell>
          <TableCell>Active</TableCell>
          <TableCell className="text-muted-foreground whitespace-nowrap">Mar 3, 2025</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const CompactHeaders: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableHeadRow>
          <TableHead className="px-3 py-2 text-xs font-semibold uppercase">Key</TableHead>
          <TableHead className="px-3 py-2 text-xs font-semibold uppercase">Environment</TableHead>
          <TableHead className="px-3 py-2 text-xs font-semibold uppercase">Actions</TableHead>
        </TableHeadRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="px-3 py-3">
            <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
              flag-001
            </span>
          </TableCell>
          <TableCell className="px-3 py-3 text-muted-foreground">production</TableCell>
          <TableCell className="px-3 py-3">—</TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="px-3 py-3">
            <span className="font-mono text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
              flag-002
            </span>
          </TableCell>
          <TableCell className="px-3 py-3 text-muted-foreground">staging</TableCell>
          <TableCell className="px-3 py-3">—</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const WithPagination: Story = {
  render: () => (
    <div>
      <Table>
        <TableHeader>
          <TableHeadRow>
            <TableHead>Actor</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity</TableHead>
          </TableHeadRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>admin@example.com</TableCell>
            <TableCell>
              <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                create
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground">flag: my-flag</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>dev@example.com</TableCell>
            <TableCell>
              <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground">
                delete
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground">project: old-project</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <TablePagination
        currentPage={2}
        hasPrev={true}
        hasNext={true}
        onPrev={() => {}}
        onNext={() => {}}
        prevLabel="← Previous"
        nextLabel="Next →"
        pageInfoTemplate="Page {page}"
      />
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableHeadRow>
          <TableHead>Name</TableHead>
          <TableHead>Value</TableHead>
        </TableHeadRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
            No data available.
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
