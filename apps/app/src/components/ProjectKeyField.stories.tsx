import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ProjectKeyField } from './ProjectKeyField';

const meta = {
  title: 'Components/ProjectKeyField',
  component: ProjectKeyField,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ProjectKeyField>;

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive wrapper to handle state
function InteractiveProjectKeyField({
  initialValue = 'my-awesome-project',
  hint,
  error,
}: {
  initialValue?: string;
  hint?: string;
  error?: string | null;
}) {
  const [value, setValue] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div style={{ maxWidth: '600px' }}>
      <div className="form-group">
        <label htmlFor="project-key" className="form-label">
          Project Key
        </label>
        <ProjectKeyField
          id="project-key"
          value={value}
          isEditing={isEditing}
          error={error || null}
          disabled={false}
          placeholder="my-project-key"
          editBtnLabel="Edit project key"
          hint={hint}
          onEditStart={() => setIsEditing(true)}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => setIsEditing(false)}
        />
      </div>
    </div>
  );
}

/**
 * The read-only state showing the key with the pencil edit button.
 * Hover over the code block to see the pencil icon appear.
 */
export const ReadOnly: Story = {
  render: () => <InteractiveProjectKeyField />,
};

/**
 * The read-only state with the auto-generated hint text displayed below the key.
 * The hint text should appear OUTSIDE and BELOW the code block, not inside it.
 */
export const WithHint: Story = {
  render: () => (
    <InteractiveProjectKeyField hint="Auto-generated from project name" />
  ),
};

/**
 * Empty state with placeholder text
 */
export const Empty: Story = {
  render: () => <InteractiveProjectKeyField initialValue="" />,
};

/**
 * Empty state with hint text
 */
export const EmptyWithHint: Story = {
  render: () => (
    <InteractiveProjectKeyField
      initialValue=""
      hint="Auto-generated from project name"
    />
  ),
};

/**
 * Editing mode where the user can type in the key
 */
export const Editing: Story = {
  render: () => {
    const [value, setValue] = useState('my-awesome-project');
    const [isEditing, setIsEditing] = useState(true);

    return (
      <div style={{ maxWidth: '600px' }}>
        <div className="form-group">
          <label htmlFor="project-key-edit" className="form-label">
            Project Key
          </label>
          <ProjectKeyField
            id="project-key-edit"
            value={value}
            isEditing={isEditing}
            error={null}
            disabled={false}
            placeholder="my-project-key"
            editBtnLabel="Edit project key"
            hint="Auto-generated from project name"
            onEditStart={() => setIsEditing(true)}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  },
};

/**
 * Error state with validation message
 */
export const WithError: Story = {
  render: () => {
    const [value, setValue] = useState('my invalid key!');
    const [isEditing, setIsEditing] = useState(true);

    return (
      <div style={{ maxWidth: '600px' }}>
        <div className="form-group">
          <label htmlFor="project-key-error" className="form-label">
            Project Key
          </label>
          <ProjectKeyField
            id="project-key-error"
            value={value}
            isEditing={isEditing}
            error="Only lowercase letters, numbers, and hyphens are allowed"
            disabled={false}
            placeholder="my-project-key"
            editBtnLabel="Edit project key"
            hint="Auto-generated from project name"
            onEditStart={() => setIsEditing(true)}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  },
};
