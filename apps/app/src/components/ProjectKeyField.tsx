'use client';

import { useEffect, useRef } from 'react';

const PencilIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M11.333 2.00004C11.5081 1.82494 11.716 1.68605 11.9447 1.59129C12.1735 1.49653 12.4187 1.44775 12.6663 1.44775C12.914 1.44775 13.1592 1.49653 13.3879 1.59129C13.6167 1.68605 13.8246 1.82494 13.9997 2.00004C14.1748 2.17513 14.3137 2.383 14.4084 2.61178C14.5032 2.84055 14.552 3.08575 14.552 3.33337C14.552 3.58099 14.5032 3.82619 14.4084 4.05497C14.3137 4.28374 14.1748 4.49161 13.9997 4.66671L5.33301 13.3334L1.66634 14.3334L2.66634 10.6667L11.333 2.00004Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Displays a project key as a read-only code block with a hover-revealed
 * pencil button to enter edit mode. The parent owns all state.
 */
export function ProjectKeyField({
  id,
  value,
  isEditing,
  error,
  disabled,
  placeholder,
  editBtnLabel,
  hintId,
  onEditStart,
  onChange,
  onBlur,
}: {
  id: string;
  value: string;
  isEditing: boolean;
  error: string | null;
  disabled: boolean;
  placeholder: string;
  editBtnLabel: string;
  hintId?: string;
  onEditStart: () => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;
    return (
      <div className="project-key-input-wrapper">
        <input
          ref={inputRef}
          id={id}
          type="text"
          className="form-input"
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={!!error}
        />
        {error && (
          <div id={`${id}-error`} className="project-key-error" role="alert">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="project-key-preview">
      {value ? (
        <code className="project-key-preview-text">{value}</code>
      ) : (
        <span className="project-key-preview-text" aria-label="placeholder">
          {placeholder}
        </span>
      )}
      <button
        type="button"
        className="project-key-edit-btn"
        onClick={onEditStart}
        disabled={disabled}
        aria-label={editBtnLabel}
        title={editBtnLabel}
      >
        <PencilIcon />
      </button>
    </div>
  );
}
