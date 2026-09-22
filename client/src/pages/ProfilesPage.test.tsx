import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProfilesPage from './ProfilesPage';

const mockUseProfiles = vi.fn();

vi.mock('../context/ProfileContext', () => ({
  useProfiles: () => mockUseProfiles(),
}));

vi.mock('../components/ui/AppHeader', () => ({
  default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../lib/toast', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <ProfilesPage />
    </MemoryRouter>,
  );
}

describe('ProfilesPage', () => {
  const createProfile = vi.fn();
  const updateProfile = vi.fn();
  const deleteProfile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    createProfile.mockResolvedValue(undefined);
    updateProfile.mockResolvedValue(undefined);
    deleteProfile.mockResolvedValue(undefined);

    mockUseProfiles.mockReturnValue({
      profiles: [
        {
          id: 'profile-1',
          name: 'Deep Work',
          isDefault: true,
          isPublic: false,
          userId: 'user-1',
          createdAt: '',
          updatedAt: '',
          _count: { channels: 6, keywords: 0, followers: 2 },
        },
      ],
      isLoading: false,
      createProfile,
      updateProfile,
      deleteProfile,
    });
  });

  it('creates a profile with visibility chosen in the form', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(screen.getByRole('button', { name: '+ New Profile' }));
    await user.type(screen.getByLabelText('Profile name'), 'Weekend Research');
    await user.click(screen.getByRole('switch', { name: 'List this profile in Community' }));
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(createProfile).toHaveBeenCalledWith({
        name: 'Weekend Research',
        isPublic: true,
      });
    });
  });

  it('toggles profile visibility inline from the list', async () => {
    const user = userEvent.setup();

    renderPage();

    await user.click(screen.getByRole('switch', { name: 'Community visibility' }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith('profile-1', { isPublic: true });
    });
  });

  it('provides contextual labels for profile action buttons', () => {
    renderPage();

    expect(screen.getByRole('button', { name: 'Edit Deep Work' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Deep Work' })).toBeInTheDocument();
  });
});
