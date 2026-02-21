import type { Meta, StoryObj } from '@storybook/react-vite';
import ProjectsPage from './page';
import { LocaleProvider } from '@/i18n/LocaleContext';

const meta = {
  title: 'Pages/Projects',
  component: ProjectsPage,
  decorators: [
    (Story) => (
      <LocaleProvider locale="en">
        <div style={{ minHeight: '100vh', background: '#fafafa' }}>
          <Story />
        </div>
      </LocaleProvider>
    ),
  ],
  parameters: {
    mockData: [
      {
        url: '/api/v1/projects',
        method: 'GET',
        status: 200,
        response: [
          {
            id: '1',
            key: 'web-app',
            name: 'Web Application',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            environments: [
              { id: 'env1', key: 'dev', name: 'Development' },
              { id: 'env2', key: 'prod', name: 'Production' },
            ],
            flagStats: { enabled: 3, total: 10 },
          },
          {
            id: '2',
            key: 'mobile-app',
            name: 'Mobile Application',
            createdAt: '2024-01-02T00:00:00.000Z',
            updatedAt: '2024-01-02T00:00:00.000Z',
            environments: [{ id: 'env3', key: 'staging', name: 'Staging' }],
            flagStats: { enabled: 5, total: 8 },
          },
          {
            id: '3',
            key: 'api-service',
            name: 'API Service',
            createdAt: '2024-01-03T00:00:00.000Z',
            updatedAt: '2024-01-03T00:00:00.000Z',
            environments: [],
            flagStats: { enabled: 0, total: 0 },
          },
        ],
      },
    ],
  },
} satisfies Meta<typeof ProjectsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/projects',
        method: 'GET',
        status: 200,
        response: [],
      },
    ],
  },
};

export const Loading: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/projects',
        method: 'GET',
        delay: 10000,
        status: 200,
        response: [],
      },
    ],
  },
};

export const Error: Story = {
  parameters: {
    mockData: [
      {
        url: '/api/v1/projects',
        method: 'GET',
        status: 500,
        response: { message: 'Internal server error' },
      },
    ],
  },
};
