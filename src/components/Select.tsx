import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from '../icons';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
}

interface SelectProps {
  value: string;
  options?: SelectOption[];
  children?: React.ReactNode;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  ariaLabel?: string;
  className?: string;
}

export default function Select({ value, options: providedOptions, children, onChange, ariaLabel, className = '' }: SelectProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 240 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const options = providedOptions ?? React.Children.toArray(children).flatMap(child => {
    if (!React.isValidElement<{ value?: string; children?: React.ReactNode }>(child)) return [];
    return [{ value: String(child.props.value ?? ''), label: child.props.children }];
  });
  const selected = options.find(option => option.value === value) ?? options[0];

  const updatePosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const maxHeight = Math.max(120, Math.min(240, Math.max(spaceBelow, spaceAbove)));
    const opensAbove = spaceBelow < 160 && spaceAbove > spaceBelow;
    setPosition({
      top: opensAbove ? Math.max(8, rect.top - maxHeight - 6) : rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
      width: rect.width,
      maxHeight,
    });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const close = (event: MouseEvent) => {
      if (!buttonRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('mousedown', close);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          updatePosition();
          setOpen(previous => !previous);
        }}
        className={`planner-select ${className}`}
      >
        <span className="min-w-0 truncate">{selected?.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && createPortal(
        <div
          id={listId}
          role="listbox"
          className="planner-select-menu"
          style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }}
          onMouseDown={event => event.stopPropagation()}
        >
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange({ target: { value: option.value } } as React.ChangeEvent<HTMLSelectElement>);
                setOpen(false);
                buttonRef.current?.focus();
              }}
              className={`planner-select-option ${option.value === value ? 'planner-select-option--active' : ''}`}
            >
              <span className="min-w-0 truncate">{option.label}</span>
              {option.value === value && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
