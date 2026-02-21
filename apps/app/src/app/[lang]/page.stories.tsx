import type { Meta, StoryObj } from "@storybook/react-vite";
import Home from "./page";

const meta = {
  title: "App/Home",
  component: Home,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Home>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    params: Promise.resolve({ lang: "en" }),
  },
};
