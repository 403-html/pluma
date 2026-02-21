import type { Meta, StoryObj } from "@storybook/react-vite";
import LoginForm from "./LoginForm";
import { LocaleProvider } from "@/i18n/LocaleContext";

const meta = {
  title: "App/Login",
  component: LoginForm,
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
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
