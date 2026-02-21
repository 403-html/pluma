import type { Meta, StoryObj } from "@storybook/react-vite";
import NotFound from "./not-found";
import { LocaleProvider } from "@/i18n/LocaleContext";

const meta = {
  title: "App/NotFound",
  component: NotFound,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  decorators: [
    (Story: React.ComponentType) => (
      <LocaleProvider locale="en">
        <Story />
      </LocaleProvider>
    ),
  ],
} satisfies Meta<typeof NotFound>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
