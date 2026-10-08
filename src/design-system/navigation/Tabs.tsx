import React, { useRef } from 'react';
import './tabs.css';

export interface TabOption<T extends string> {
  id: T;
  label: string;
  /** Shown after the label, e.g. inbox filter counts. */
  count?: number;
}

export interface TabsProps<T extends string> {
  label: string;
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** `pill`: the report-reviews switcher; `chip`: the inbox filters. */
  variant?: 'pill' | 'chip';
  /** Id of the panel these tabs control. */
  controls?: string;
}

/**
 * Tabs that filter one list (siblings, not steps — so they fade, never slide).
 * Arrow keys move between tabs; only the selected tab is in the Tab order.
 */
export function Tabs<T extends string>({ label, options, value, onChange, variant = 'pill', controls }: TabsProps<T>): React.ReactElement {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (event: React.KeyboardEvent, index: number) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].id);
    refs.current[next]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={`sk-tabs sk-tabs--${variant}`}>
      {options.map((option, index) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            ref={(node) => { refs.current[index] = node; }}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={controls}
            tabIndex={selected ? 0 : -1}
            className={`sk-tab${selected ? ' is-selected' : ''}`}
            onClick={() => onChange(option.id)}
            onKeyDown={(event) => onKey(event, index)}
          >
            {option.label}
            {option.count !== undefined ? <span className="sk-tab__count">{option.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
