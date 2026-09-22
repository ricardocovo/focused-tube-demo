import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SettingsMenu from './SettingsMenu';

const mockUseAuth = vi.fn();
const mockLogout = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderSettingsMenu() {
  return render(
    <MemoryRouter>
      <SettingsMenu />
    </MemoryRouter>,
  );
}

describe('SettingsMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ logout: mockLogout });
  });

  it('exposes expanded state and menu relationship attributes on the toggle', async () => {
    const user = userEvent.setup();

    renderSettingsMenu();

    const toggle = screen.getByRole('button', { name: 'Settings' });
    expect(toggle).toHaveAttribute('aria-haspopup', 'menu');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const menu = screen.getByRole('menu');
    expect(menu.id).toBeTruthy();
    expect(toggle).toHaveAttribute('aria-controls', menu.id);
    expect(screen.getByRole('menuitem', { name: /manage profiles/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the toggle button', async () => {
    const user = userEvent.setup();

    renderSettingsMenu();

    const toggle = screen.getByRole('button', { name: 'Settings' });
    await user.click(toggle);

    const signOut = screen.getByRole('menuitem', { name: /sign out/i });
    signOut.focus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports arrow key movement between menu items', async () => {
    const user = userEvent.setup();

    renderSettingsMenu();

    const toggle = screen.getByRole('button', { name: 'Settings' });
    await user.click(toggle);

    const manageProfiles = screen.getByRole('menuitem', { name: /manage profiles/i });
    const signOut = screen.getByRole('menuitem', { name: /sign out/i });

    manageProfiles.focus();
    expect(manageProfiles).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(signOut).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(manageProfiles).toHaveFocus();
  });

  it('moves focus into the first menu item when opened with keyboard', async () => {
    const user = userEvent.setup();

    renderSettingsMenu();

    const toggle = screen.getByRole('button', { name: 'Settings' });
    toggle.focus();

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /manage profiles/i })).toHaveFocus();
    });
  });
});
