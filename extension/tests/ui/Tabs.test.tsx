import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { Tabs } from '../../src/ui/components/Tabs';

const TabsTestHarness = () => {
  const [activeTab, setActiveTab] = useState('tab1');
  return (
    <Tabs 
      tabs={[{ id: 'tab1', label: 'Tab 1' }, { id: 'tab2', label: 'Tab 2' }, { id: 'tab3', label: 'Tab 3' }]}
      activeTab={activeTab}
      onChange={setActiveTab}
    />
  );
};

describe('Tabs component', () => {
  it('renders tablist and tabs with correct ARIA attributes', () => {
    render(<TabsTestHarness />);
    expect(screen.getByRole('tablist')).toBeDefined();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
  });

  it('supports arrow key navigation', async () => {
    render(<TabsTestHarness />);
    const tabs = screen.getAllByRole('tab');
    
    // Focus first tab
    tabs[0].focus();
    
    // Press right arrow
    await userEvent.keyboard('{ArrowRight}');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    
    // Press left arrow
    await userEvent.keyboard('{ArrowLeft}');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  });
});
