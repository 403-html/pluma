import type { Meta, StoryObj } from "@storybook/react-vite";
import LoginPage from "./page";

const meta = {
  title: "App/Login",
  component: LoginPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof LoginPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
