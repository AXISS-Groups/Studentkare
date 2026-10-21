import React from 'react';
import { Icon } from '../icons';

export interface SheetOptionProps {
  label: string;
  meta?: string;
  /** Small tag on the right, e.g. "LOCKED" or "SHARED". */
  tag?: string;
  selected: boolean;
  /** Shown on and cannot be turned off (safety alerts): visible, never hidden. */
  locked?: boolean;
  /** `radio` for one-of (a pickup slot); `checkbox` for any-of (filters). */
  kind?: 'radio' | 'checkbox';
  onChange?: (selected: boolean) => void;
}

/**
 * A choice row inside a sheet (board Sheets: selection, filter, notification,
 * confirm). One tap selects; the sheet's own button confirms, so a mis-tap
 * never becomes a booking. A locked row stays visible as on rather than hidden:
 * a permission you cannot see is one you cannot trust.
 */
export function SheetOption({ label, meta, tag, selected, locked = false, kind = 'checkbox', onChange }: SheetOptionProps): React.ReactElement {
  return (
    <button
      type="button"
      role={kind}
      aria-checked={selected}
      aria-disabled={locked || undefined}
      className="sk-ov-option"
      data-selected={selected || undefined}
      data-kind={kind}
      onClick={() => { if (!locked) onChange?.(kind === 'radio' ? true : !selected); }}
    >
      <span className="sk-ov-option__mark" aria-hidden="true">
        {selected ? <Icon name="check" size={11} strokeWidth={3.2} /> : null}
      </span>
      <span className="sk-ov-option__text">
        <span className="sk-ov-option__label">{label}</span>
        {meta ? <span className="sk-ov-option__meta">{meta}</span> : null}
      </span>
      {tag ? <span className="sk-ov-option__tag">{tag}</span> : null}
    </button>
  );
}
