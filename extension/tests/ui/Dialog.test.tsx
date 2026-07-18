import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Dialog } from '../../src/ui/components/Dialog';

describe('Dialog component', () => {
  it('is accessible with correct ARIA roles', () => {
    render(
      <Dialog isOpen={true} title="Test Dialog" description="Test description" onClose={() => {}}>
        <div>Content</div>
      </Dialog>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByText('Test Dialog').id).toBe(dialog.getAttribute('aria-labelledby'));
    expect(screen.getByText('Test description').id).toBe(dialog.getAttribute('aria-describedby'));
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    render(
      <Dialog isOpen={true} title="Test" onClose={onClose}>
        <div>Content</div>
      </Dialog>
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('traps focus when rendered in a closed shadow root', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const shadowRoot = host.attachShadow({ mode: 'closed' });
    const container = document.createElement('div');
    shadowRoot.append(container);
    const { getByRole, unmount } = render(
      <Dialog isOpen={true} title="Test" onClose={() => {}}>
        <button type="button">First</button>
        <button type="button">Last</button>
      </Dialog>,
      { container },
    );

    const buttons = getByRole('dialog').querySelectorAll('button');
    expect(shadowRoot.activeElement).toBe(buttons[0]);
    buttons[1].focus();
    await userEvent.keyboard('{Tab}');
    expect(shadowRoot.activeElement).toBe(buttons[0]);

    unmount();
    host.remove();
  });
});
