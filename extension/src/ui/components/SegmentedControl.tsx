import React, { KeyboardEvent, useRef } from 'react';
import './SegmentedControl.css';

export interface Segment {
  id: string;
  label: string;
}

export interface SegmentedControlProps {
  segments: Segment[];
  activeSegment: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  className?: string;
}

export const SegmentedControl = ({ segments, activeSegment, onChange, ariaLabel, className = '' }: SegmentedControlProps) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      nextIndex = (index + 1) % segments.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      nextIndex = (index - 1 + segments.length) % segments.length;
    } else {
      return;
    }
    e.preventDefault();
    refs.current[nextIndex]?.focus();
    onChange(segments[nextIndex].id);
  };

  return (
    <div 
      className={`mx-segmented-control ${className}`.trim()} 
      role="radiogroup" 
      aria-label={ariaLabel}
    >
      {segments.map((seg, index) => {
        const isActive = activeSegment === seg.id;
        return (
          <button
            key={seg.id}
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            className={`mx-segment ${isActive ? 'mx-segment-active' : ''}`}
            ref={(el) => { refs.current[index] = el; }}
            onClick={() => onChange(seg.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
};
