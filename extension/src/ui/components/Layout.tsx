import React, { ReactNode } from 'react';
import './Layout.css';
import '../styles/components.css'; // to ensure mx-stack classes are loaded

export const Card = ({ children, className = '' }: { children: ReactNode, className?: string }) => (
  <div className={`mx-card ${className}`.trim()}>{children}</div>
);

export const Section = ({ children, className = '' }: { children: ReactNode, className?: string }) => (
  <section className={`mx-section ${className}`.trim()}>{children}</section>
);

export const Divider = ({ className = '' }: { className?: string }) => (
  <hr className={`mx-divider ${className}`.trim()} />
);

export const Stack = ({ children, gap = 3, className = '' }: { children: ReactNode, gap?: 1|2|3|4, className?: string }) => (
  <div className={`mx-stack mx-stack-gap-${gap} ${className}`.trim()}>{children}</div>
);
