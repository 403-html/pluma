import type { Meta, StoryObj } from '@storybook/react-vite';
import DashboardView from './DashboardView';
import type { DashboardData } from '@/lib/api/dashboard';
import type { DashboardLabels } from './DashboardView';

const labels: DashboardLabels = {
  title: 'Dashboard',
  projects: 'Projects',
  environments: 'Environments',
  activeFlags: 'Active Flags',
  targetedFlags: 'Flags with Targeting',
  rollingOutFlags: 'Rolling Out',
  recentChanges: 'Changes Today',
  chartTitle: 'Flag Changes – Last 7 Days',
  chartDayLabel: 'Day',
  chartCountLabel: 'Changes',
  loadingError: 'Failed to load dashboard data',
};

const mockData: DashboardData = {
  projects: 4,
  environments: 12,
  activeFlags: 31,
  targetedFlags: 8,
  rollingOutFlags: 3,
  recentChanges: 7,
  dailyChanges: [
    { date: '2024-06-14', count: 2 },
    { date: '2024-06-15', count: 5 },
    { date: '2024-06-16', count: 0 },
    { date: '2024-06-17', count: 3 },
    { date: '2024-06-18', count: 8 },
    { date: '2024-06-19', count: 1 },
    { date: '2024-06-20', count: 7 },
  ],
};

const emptyData: DashboardData = {
  projects: 0,
  environments: 0,
  activeFlags: 0,
  targetedFlags: 0,
  rollingOutFlags: 0,
  recentChanges: 0,
  dailyChanges: [],
};

const meta = {
  title: 'Pages/Dashboard',
  component: DashboardView,
} satisfies Meta<typeof DashboardView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { data: mockData, labels },
};

export const AllZeros: Story = {
  args: { data: emptyData, labels },
};

export const SingleSpike: Story = {
  args: {
    data: {
      ...mockData,
      dailyChanges: [
        { date: '2024-06-14', count: 0 },
        { date: '2024-06-15', count: 0 },
        { date: '2024-06-16', count: 0 },
        { date: '2024-06-17', count: 0 },
        { date: '2024-06-18', count: 0 },
        { date: '2024-06-19', count: 0 },
        { date: '2024-06-20', count: 42 },
      ],
    },
    labels,
  },
};
