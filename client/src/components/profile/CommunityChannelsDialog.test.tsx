import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommunityChannelsDialog from './CommunityChannelsDialog';

describe('CommunityChannelsDialog', () => {
  it('renders channel names in an accessible semantic dialog', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    const triggerRef = { current: trigger };

    render(
      <CommunityChannelsDialog
        profileName="Deep Work"
        channelNames={['Focus Lab', 'Quiet Coding']}
        triggerRef={triggerRef}
        onClose={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Channels in Deep Work' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('list')).toHaveTextContent('Focus LabQuiet Coding');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Close channels dialog' })).toHaveFocus());
  });

  it('traps focus, closes on Escape, and restores focus to the trigger', async () => {
    const user = userEvent.setup();
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const triggerRef = { current: trigger };
    const onClose = vi.fn();

    const { unmount } = render(
      <>
        <button type="button">Background action</button>
        <CommunityChannelsDialog
          profileName="Deep Work"
          channelNames={['Focus Lab']}
          triggerRef={triggerRef}
          onClose={onClose}
        />
      </>,
    );

    const closeButton = screen.getByRole('button', { name: 'Close channels dialog' });
    await waitFor(() => expect(closeButton).toHaveFocus());
    await user.tab();
    expect(closeButton).toHaveFocus();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.firstElementChild).toHaveAttribute('inert');

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
    unmount();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
    expect(document.body.firstElementChild).not.toHaveAttribute('inert');
  });
});
