import React, { useState, KeyboardEvent, useRef, ReactNode } from 'react';
import './Tabs.css';

export interface Tab {
  id: string;
  label: string | ReactNode;
  icon?: ReactNode;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs = ({ tabs, activeTab, onChange, className = '' }: TabsProps) => {
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    tabsRef.current[nextIndex]?.focus();
    onChange(tabs[nextIndex].id);
  };

  return (
    <div className={`mx-tabs-container ${className}`.trim()}>
      <div role="tablist" className="mx-tablist">
        {tabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={`mx-tab ${isActive ? 'mx-tab-active' : ''}`}
              ref={(el) => { tabsRef.current[index] = el; }}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              {tab.icon && <span className="mx-tab-icon">{tab.icon}</span>}
              <span className="mx-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
