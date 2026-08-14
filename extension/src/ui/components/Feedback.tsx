import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import './Feedback.css';

export const Spinner = ({ className = '' }: { className?: string }) => (
  <svg className={`mx-animate-spin ${className}`.trim()} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 24, height: 24 }}>
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeDasharray="32" strokeLinecap="round" opacity="0.25"/>
    <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"/>
  </svg>
);

export const Skeleton = ({ width, height, className = '' }: { width?: string | number, height?: string | number, className?: string }) => (
  <div className={`mx-skeleton ${className}`.trim()} style={{ width, height }} />
);

export type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';
export const Badge = ({ children, variant = 'neutral', className = '' }: { children: ReactNode, variant?: BadgeVariant, className?: string }) => (
  <span className={`mx-badge mx-badge-${variant} ${className}`.trim()}>
    {children}
  </span>
);

export interface InlineAlertProps {
  variant: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}
export const InlineAlert = ({ variant, title, children, action, className = '' }: InlineAlertProps) => (
  <div className={`mx-inline-alert mx-inline-alert-${variant} ${className}`.trim()} role={variant === 'error' ? 'alert' : 'status'}>
    <div className="mx-inline-alert-icon">
      {/* Icon placeholder based on variant */}
      {variant === 'error' && <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>}
      {variant === 'info' && <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>}
      {variant === 'success' && <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
      {variant === 'warning' && <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>}
    </div>
    <div className="mx-inline-alert-content">
      {title && <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>}
      <div>{children}</div>
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  </div>
);

/* Toast Provider */
type ToastType = 'info' | 'success' | 'error';
interface ToastInfo { id: string; message: string; type: ToastType; }
interface ToastContextValue { showToast: (message: string, type?: ToastType) => void; }

export const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) return { showToast: () => {} };
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="mx-toast-viewport">
        {toasts.map((toast) => (
          <div key={toast.id} className="mx-toast" role="status" aria-live="polite">
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
