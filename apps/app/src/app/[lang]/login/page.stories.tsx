import type { Meta, StoryObj } from "@storybook/react-vite";
import LoginForm from "./LoginForm";
import { en } from "@/i18n";

const meta = {
  title: "App/Login",
  component: LoginForm,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    t: en,
    lang: "en",
  },
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
