import type { Meta, StoryObj } from "@storybook/react-vite";
import NotFound from "./not-found";

const meta = {
  title: "App/NotFound",
  component: NotFound,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof NotFound>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
