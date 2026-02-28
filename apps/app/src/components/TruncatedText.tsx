'use client';

import { useState } from 'react';

const DEFAULT_MAX_CHARS = 80;

interface TruncatedTextProps {
  text: string;
  maxChars?: number;
  showMoreLabel: string;
  showLessLabel: string;
}

/**
 * Renders text clipped to `maxChars` with an inline toggle button to
 * expand/collapse the full content.  When the text is shorter than
 * `maxChars` it is rendered as a plain span with no controls.
 */
export function TruncatedText({
  text,
  maxChars = DEFAULT_MAX_CHARS,
  showMoreLabel,
  showLessLabel,
}: TruncatedTextProps) {
  const [expanded, setExpanded] = useState(false);

  if (text.length <= maxChars) {
    return <span>{text}</span>;
  }

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    setExpanded(!expanded);
  }

  return (
    <span>
      {expanded ? text : `${text.slice(0, maxChars)}…`}
      {' '}
      <button
        type="button"
        className="text-xs text-muted-foreground underline hover:no-underline whitespace-nowrap"
        onClick={handleToggle}
        aria-expanded={expanded}
      >
        {expanded ? showLessLabel : showMoreLabel}
      </button>
    </span>
  );
}
