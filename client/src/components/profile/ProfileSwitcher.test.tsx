import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProfileSwitcher from './ProfileSwitcher';

const mockUseProfiles = vi.fn();

vi.mock('../../context/ProfileContext', () => ({
  useProfiles: () => mockUseProfiles(),
}));

vi.mock('./ProfileSwitcherSkeleton', () => ({
  default: () => <div>Loading profiles</div>,
}));

function renderSwitcher() {
  return render(
    <MemoryRouter>
      <ProfileSwitcher />
    </MemoryRouter>,
  );
}

describe('ProfileSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseProfiles.mockReturnValue({
      profiles: [],
      activeProfile: {
        id: 'followed-1',
        name: 'News Roundup',
      },
      setActiveProfile: vi.fn(),
      isLoading: false,
      followedProfiles: [
        {
          id: 'followed-1',
          name: 'News Roundup',
          isPublic: true,
          isFollowing: true,
          user: { name: 'Taylor', avatarUrl: null },
          _count: { followers: 3 },
        },
      ],
    });
  });

  it('shows followed profiles when the user has no owned profiles', async () => {
    const user = userEvent.setup();
    const setActiveProfile = vi.fn();

    mockUseProfiles.mockReturnValue({
      profiles: [],
      activeProfile: {
        id: 'followed-1',
        name: 'News Roundup',
      },
      setActiveProfile,
      isLoading: false,
      followedProfiles: [
        {
          id: 'followed-1',
          name: 'News Roundup',
          isPublic: true,
          isFollowing: true,
          user: { name: 'Taylor', avatarUrl: null },
          _count: { followers: 3 },
        },
      ],
    });

    renderSwitcher();

    const trigger = screen.getByRole('button', { name: /watching\s*news roundup.*switch profile/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    expect(screen.getByText('Community profiles you follow')).toBeInTheDocument();
    expect(screen.getByText('Following')).toBeInTheDocument();
    expect(screen.getByText('by Taylor')).toBeInTheDocument();
    expect(screen.queryByText('👥')).not.toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: /news roundup\s*by\s*taylor\s*following/i }));

    expect(setActiveProfile).toHaveBeenCalledWith('followed-1');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('associates group labels with listbox groups', async () => {
    const user = userEvent.setup();

    mockUseProfiles.mockReturnValue({
      profiles: [
        {
          id: 'owned-1',
          name: 'Deep Work',
          isPublic: false,
        },
      ],
      activeProfile: {
        id: 'owned-1',
        name: 'Deep Work',
      },
      setActiveProfile: vi.fn(),
      isLoading: false,
      followedProfiles: [
        {
          id: 'followed-1',
          name: 'News Roundup',
          isPublic: true,
          isFollowing: true,
          user: { name: 'Taylor', avatarUrl: null },
          _count: { followers: 3 },
        },
      ],
    });

    renderSwitcher();

    await user.click(screen.getByRole('button', { name: /watching\s*deep work.*switch profile/i }));

    expect(screen.getByRole('group', { name: 'Your profiles' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Community profiles you follow' })).toBeInTheDocument();
  });
});
