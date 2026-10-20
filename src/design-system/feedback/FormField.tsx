import React, { useId } from 'react';
import { useT } from '@/i18n';
import { Icon } from '../icons';
import './feedback.css';

export type FieldStatus = 'idle' | 'invalid' | 'valid';

type ControlProps = { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean };

export interface FormFieldProps {
  label: string;
  /** Help under the field when it is not invalid. */
  hint?: string;
  status?: FieldStatus;
  /** What to fix, shown and announced while `status` is `invalid`. Say how to fix it, not just that it is wrong. */
  message?: string;
  /** One input, select or textarea. It gets the id, aria-invalid and aria-describedby. */
  children: React.ReactElement<ControlProps>;
}

/**
 * A labelled web form field with inline validation (board Feedback, "Inline
 * validation"). Invalid: a danger border, a cross, the fix in words under it,
 * and one shake on the field that caused it — never the whole screen. Valid:
 * a positive border and a tick. The message is tied to the control with
 * aria-describedby and read out as it appears; colour is never the only cue.
 *
 * Presentation only: whether the value is valid is the caller's decision.
 */
export function FormField({ label, hint, status = 'idle', message, children }: FormFieldProps): React.ReactElement {
  const t = useT();
  const generated = useId();
  const id = children.props.id ?? generated;
  const invalid = status === 'invalid';
  const noteId = `${id}-note`;
  const note = invalid ? message : hint;
  const describedBy = [children.props['aria-describedby'], note ? noteId : ''].filter(Boolean).join(' ') || undefined;

  return (
    <div className="sk-field" data-status={status}>
      <label className="sk-field__label" htmlFor={id}>{label}</label>
      <div className="sk-field__control">
        {React.cloneElement(children, { id, 'aria-describedby': describedBy, 'aria-invalid': invalid || undefined })}
        {invalid ? <Icon name="x" size={17} strokeWidth={2.4} className="sk-field__mark" /> : null}
        {status === 'valid' ? <Icon name="check" size={17} strokeWidth={2.8} className="sk-field__mark" label={t('ds.field.valid')} /> : null}
      </div>
      {note ? (
        <small id={noteId} className="sk-field__note" role={invalid ? 'alert' : undefined}>{note}</small>
      ) : null}
    </div>
  );
}
