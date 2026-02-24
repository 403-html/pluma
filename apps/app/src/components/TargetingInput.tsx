'use client';

import { useState, useRef, useEffect } from 'react';
import { TagInput } from './TagInput';

export interface TargetingInputProps {
  id: string;
  tags: string[];
  suggestions: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  disabledValues?: string[];
  addOptionLabel?: string;
  disabledValueHint?: string;
  errorId?: string;
}

export function TargetingInput({
  id,
  tags,
  suggestions,
  onAdd,
  onRemove,
  placeholder,
  disabled,
  disabledValues = [],
  addOptionLabel = 'Add',
  disabledValueHint = 'In other list',
  errorId,
}: TargetingInputProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const listboxId = `${id}-listbox`;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlight when the query changes (not when isOpen changes, to avoid
  // cancelling the highlight set by ArrowDown in the same render cycle)
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [query]);

  // Scroll highlighted option into view within the listbox only (avoids scrolling the page)
  useEffect(() => {
    if (highlightedIndex < 0 || !listboxRef.current) return;
    const option = listboxRef.current.querySelector<HTMLElement>(`#${CSS.escape(`${id}-option-${highlightedIndex}`)}`);
    if (!option) return;
    const list = listboxRef.current;
    const optionBottom = option.offsetTop + option.offsetHeight;
    if (option.offsetTop < list.scrollTop) {
      list.scrollTop = option.offsetTop;
    } else if (optionBottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = optionBottom - list.clientHeight;
    }
  }, [highlightedIndex, id]);

  // Derived: filtered suggestions (exclude already-selected, match query case-insensitively)
  const filteredSuggestions = suggestions.filter(
    (s) => !tags.includes(s) && s.toLowerCase().includes(query.toLowerCase()),
  );

  const trimmedQuery = query.trim();
  const showAddOption =
    trimmedQuery.length > 0 &&
    !tags.includes(trimmedQuery) &&
    !suggestions.some((s) => s.toLowerCase() === trimmedQuery.toLowerCase());

  const hasDropdownContent = filteredSuggestions.length > 0 || showAddOption;

  function handleSelect(value: string) {
    if (!disabledValues.includes(value)) {
      onAdd(value);
      setQuery('');
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    }
  }

  function handleAdd(value: string) {
    const v = value.trim();
    if (v && !tags.includes(v) && !disabledValues.includes(v)) {
      onAdd(v);
    }
    setQuery('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const totalOptions = filteredSuggestions.length + (showAddOption ? 1 : 0);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen && hasDropdownContent) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else if (totalOptions > 0) {
        setHighlightedIndex((i) => (i + 1) % totalOptions);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (totalOptions > 0) {
        setHighlightedIndex((i) => (i <= 0 ? totalOptions - 1 : i - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0) {
        if (highlightedIndex < filteredSuggestions.length) {
          handleSelect(filteredSuggestions[highlightedIndex]);
        } else {
          handleAdd(trimmedQuery);
        }
      } else if (trimmedQuery) {
        handleAdd(trimmedQuery);
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    } else if (e.key === 'Backspace' && query === '' && tags.length > 0) {
      onRemove(tags[tags.length - 1]);
    }
  }

  function handleFocus() {
    setIsOpen(true);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setIsOpen(true);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Tag chips + input */}
      <div
        className="flex flex-wrap gap-1.5 min-h-[38px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-within:ring-1 focus-within:ring-ring cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag) => (
          <TagInput
            key={tag}
            value={tag}
            onRemove={() => {
              if (!disabled) onRemove(tag);
            }}
            disabled={disabled}
          />
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen && hasDropdownContent}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-activedescendant={
            isOpen && highlightedIndex >= 0 ? `${id}-option-${highlightedIndex}` : undefined
          }
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={tags.length === 0 ? placeholder : ''}
          disabled={disabled}
          aria-describedby={errorId}
          className="flex-1 min-w-[120px] bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          autoComplete="off"
        />
      </div>

      {/* Dropdown */}
      {isOpen && hasDropdownContent && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-[200px] overflow-y-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md py-1"
        >
          {filteredSuggestions.map((suggestion, index) => {
            const isDisabled = disabledValues.includes(suggestion);
            const isHighlighted = highlightedIndex === index;
            return (
              <li
                key={suggestion}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={isHighlighted}
                aria-disabled={isDisabled}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent default mousedown behavior which would blur the input before selection completes
                  handleSelect(suggestion);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={
                  isDisabled
                    ? 'flex items-center justify-between px-3 py-1.5 text-sm text-muted-foreground cursor-not-allowed select-none'
                    : `flex items-center justify-between px-3 py-1.5 text-sm cursor-pointer select-none ${isHighlighted ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`
                }
              >
                <span>{suggestion}</span>
                {isDisabled && (
                  <span className="ml-2 text-xs text-muted-foreground/70 italic">
                    {disabledValueHint}
                  </span>
                )}
              </li>
            );
          })}

          {showAddOption && (() => {
            const addIndex = filteredSuggestions.length;
            const isHighlighted = highlightedIndex === addIndex;
            return (
              <li
                id={`${id}-option-${addIndex}`}
                role="option"
                aria-selected={isHighlighted}
                aria-label={`${addOptionLabel} "${trimmedQuery}"`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleAdd(trimmedQuery);
                }}
                onMouseEnter={() => setHighlightedIndex(addIndex)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer select-none border-t border-border/40 ${isHighlighted ? 'bg-accent text-accent-foreground' : 'hover:bg-accent hover:text-accent-foreground'}`}
              >
                <span className="font-medium">{addOptionLabel}</span>
                <span className={isHighlighted ? '' : 'text-muted-foreground'}>"{trimmedQuery}"</span>
              </li>
            );
          })()}
        </ul>
      )}
    </div>
  );
}
