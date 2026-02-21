import type { Meta, StoryObj } from "@storybook/react-vite";
import RegisterForm from "./RegisterForm";
import { en } from "@/i18n";

const meta = {
  title: "App/Register",
  component: RegisterForm,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    t: en,
    lang: "en",
  },
} satisfies Meta<typeof RegisterForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
