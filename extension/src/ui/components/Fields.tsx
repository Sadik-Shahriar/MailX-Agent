import React, { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode, useId } from 'react';
import './Fields.css';

export interface FieldProps {
  label: string;
  helperText?: ReactNode;
  error?: string;
  children: (id: string, ariaDescribedBy: string | undefined) => ReactNode;
  className?: string;
}

export const Field = ({ label, helperText, error, children, className = '' }: FieldProps) => {
  const id = useId();
  const helperId = helperText ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`mx-field ${className}`.trim()}>
      <label htmlFor={id} className="mx-field-label">{label}</label>
      {children(id, describedBy)}
      {error && <div id={errorId} className="mx-field-error">{error}</div>}
      {helperText && !error && <div id={helperId} className="mx-field-helper">{helperText}</div>}
    </div>
  );
};

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  helperText?: ReactNode;
  error?: string;
}
export const SelectField = ({ label, helperText, error, className = '', ...props }: SelectFieldProps) => (
  <Field label={label} helperText={helperText} error={error} className={className}>
    {(id, describedBy) => (
      <select id={id} className="mx-input" aria-describedby={describedBy} aria-invalid={!!error} {...props} />
    )}
  </Field>
);

export interface NumberFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: ReactNode;
  error?: string;
}
export const NumberField = ({ label, helperText, error, className = '', ...props }: NumberFieldProps) => (
  <Field label={label} helperText={helperText} error={error} className={className}>
    {(id, describedBy) => (
      <input type="number" id={id} className="mx-input" aria-describedby={describedBy} aria-invalid={!!error} {...props} />
    )}
  </Field>
);

export interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  helperText?: ReactNode;
  error?: string;
}
export const TextareaField = ({ label, helperText, error, className = '', ...props }: TextareaFieldProps) => (
  <Field label={label} helperText={helperText} error={error} className={className}>
    {(id, describedBy) => (
      <textarea id={id} className="mx-input" aria-describedby={describedBy} aria-invalid={!!error} {...props} />
    )}
  </Field>
);

export interface CheckboxFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string | ReactNode;
  description?: ReactNode;
}
export const CheckboxField = ({ label, description, className = '', ...props }: CheckboxFieldProps) => {
  const id = useId();
  const descId = description ? `${id}-desc` : undefined;
  
  return (
    <div className={`mx-checkbox-container ${className}`.trim()}>
      <input type="checkbox" id={id} className="mx-checkbox" aria-describedby={descId} {...props} />
      <div className="mx-field">
        <label htmlFor={id} className="mx-field-label" style={{ cursor: 'pointer' }}>{label}</label>
        {description && <div id={descId} className="mx-field-helper">{description}</div>}
      </div>
    </div>
  );
};
