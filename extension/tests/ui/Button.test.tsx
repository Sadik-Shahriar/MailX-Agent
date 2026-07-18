import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Button, IconButton } from '../../src/ui/components/Button';

afterEach(() => {
  screen.queryAllByRole('button').forEach(btn => btn.remove());
});


describe('Button component', () => {
  it('renders correctly with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeDefined();
  });

  it('shows loading state and disables button', () => {
    render(<Button isLoading loadingText="Saving...">Save</Button>);
    const button = screen.getByRole('button');
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(button.textContent).toContain('Saving...');
  });

  it('calls onClick when not disabled', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('IconButton component', () => {
  it('requires an accessible name', () => {
    render(<IconButton label="Close panel" />);
    expect(screen.getByRole('button', { name: 'Close panel' })).toBeDefined();
  });
});
