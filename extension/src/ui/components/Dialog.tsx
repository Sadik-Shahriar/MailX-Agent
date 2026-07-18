import React, { useEffect, useId, useRef, ReactNode } from 'react';
import './Dialog.css';

export interface DialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

export const Dialog = ({ isOpen, title, description, onClose, children, footer }: DialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (isOpen) {
      const dialog = dialogRef.current;
      if (!dialog) return;

      // Closed shadow roots expose their focused descendant through the root, not document.
      const getActiveElement = (): Element | null => {
        const root = dialog.getRootNode();
        return root instanceof ShadowRoot ? root.activeElement : document.activeElement;
      };
      const getFocusableElements = (): HTMLElement[] => Array.from(dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]'
      )).filter((element) => (
        element.tabIndex >= 0
        && !element.matches(':disabled')
        && element.getAttribute('aria-hidden') !== 'true'
      ));

      const previouslyFocusedElement = getActiveElement();
      previousFocusRef.current = previouslyFocusedElement instanceof HTMLElement
        ? previouslyFocusedElement
        : null;

      const focusableElements = getFocusableElements();
      if (focusableElements && focusableElements.length > 0) {
        focusableElements[0].focus();
      } else {
        dialog.focus();
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'Tab') {
          const focusableElements = getFocusableElements();
          if (!focusableElements || focusableElements.length === 0) {
            e.preventDefault();
            return;
          }
          
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          const activeElement = getActiveElement();
          const focusIsInDialog = activeElement === dialog || dialog.contains(activeElement);
          
          if (e.shiftKey) {
            if (!focusIsInDialog || activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            if (!focusIsInDialog || activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        if (previousFocusRef.current?.isConnected) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="mx-dialog-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div 
        className="mx-dialog" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div id={titleId} className="mx-dialog-header">{title}</div>
        <div className="mx-dialog-body">
          {description && <div id={descriptionId} style={{ marginBottom: 16 }}>{description}</div>}
          {children}
        </div>
        {footer && <div className="mx-dialog-footer">{footer}</div>}
      </div>
    </div>
  );
};
