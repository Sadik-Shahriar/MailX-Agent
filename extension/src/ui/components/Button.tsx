import React, { ButtonHTMLAttributes } from 'react';
import './Button.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  isLoading?: boolean;
  loadingText?: string;
  isFullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  isLoading = false,
  loadingText,
  isFullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClass = 'mx-btn';
  const variantClass = `mx-btn-${variant}`;
  const widthClass = isFullWidth ? 'mx-btn-full' : '';
  const loadingClass = isLoading ? 'mx-btn-loading' : '';

  return (
    <button
      className={`${baseClass} ${variantClass} ${widthClass} ${loadingClass} ${className}`.trim()}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <span className="mx-btn-content">
          <svg className="mx-animate-spin mx-btn-spinner" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="32" strokeLinecap="round" opacity="0.25"/>
            <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/>
          </svg>
          {loadingText || children}
        </span>
      ) : (
        <span className="mx-btn-content">{children}</span>
      )}
    </button>
  );
};

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string; // Accessible name required
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  label,
  className = '',
  ...props
}) => {
  return (
    <button
      className={`mx-icon-btn ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
};
