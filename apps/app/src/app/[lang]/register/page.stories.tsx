import type { Meta, StoryObj } from "@storybook/react-vite";
import RegisterForm from "./RegisterForm";
import { LocaleProvider } from "@/i18n/LocaleContext";

const meta = {
  title: "App/Register",
  component: RegisterForm,
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
} satisfies Meta<typeof RegisterForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
