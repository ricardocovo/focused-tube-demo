import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommunityPage from './CommunityPage';
import type { CommunityProfile } from '../types/profile';

const mockUseCommunity = vi.fn();

vi.mock('../hooks/useCommunity', () => ({
  useCommunity: () => mockUseCommunity(),
}));

vi.mock('../components/ui/AppHeader', () => ({
  default: () => <div>Header</div>,
}));

const ownProfile: CommunityProfile = {
  id: 'profile-own',
  name: 'Deep Work',
  isPublic: true,
  user: { name: 'Casey', avatarUrl: 'https://example.com/avatar.jpg' },
  _count: { followers: 2 },
  isFollowing: false,
  isOwn: true,
  channels: [
    { id: 'chan-own-1', channelTitle: 'Focus Channel', thumbnailUrl: 'https://example.com/focus.jpg' },
  ],
};

const followedProfile: CommunityProfile = {
  id: 'profile-followed',
  name: 'Space Explorers',
  isPublic: true,
  user: { name: 'Riley', avatarUrl: null },
  _count: { followers: 5 },
  isFollowing: true,
  isOwn: false,
  channels: [
    { id: 'chan-followed-1', channelTitle: 'Rockets Weekly', thumbnailUrl: null },
    { id: 'chan-followed-2', channelTitle: 'Orbit News', thumbnailUrl: 'https://example.com/orbit.jpg' },
  ],
};

const emptyProfile: CommunityProfile = {
  id: 'profile-empty',
  name: 'Empty Profile',
  isPublic: true,
  user: { name: 'Jordan', avatarUrl: null },
  _count: { followers: 0 },
  isFollowing: false,
  isOwn: false,
  channels: [],
};

function mockCommunity(profiles: CommunityProfile[], overrides: Record<string, unknown> = {}) {
  mockUseCommunity.mockReturnValue({
    profiles,
    total: profiles.length,
    page: 1,
    setPage: vi.fn(),
    limit: 12,
    keyword: '',
    setKeyword: vi.fn(),
    isLoading: false,
    error: '',
    handleFollow: vi.fn(),
    handleUnfollow: vi.fn(),
    ...overrides,
  });
}

describe('CommunityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCommunity([ownProfile, followedProfile, emptyProfile]);
  });

  it('shows Yours in the owner line for the current user profile', () => {
    render(<CommunityPage />);

    expect(screen.getByText('Yours')).toBeInTheDocument();
    expect(screen.queryByText('by Casey')).not.toBeInTheDocument();
  });

  it('renders a See Channels button for owned, followed and unfollowed profiles independent of follow controls', () => {
    render(<CommunityPage />);

    expect(screen.getByRole('button', { name: `See channels for ${ownProfile.name}` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `See channels for ${followedProfile.name}` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `See channels for ${emptyProfile.name}` })).toBeInTheDocument();

    // Follow/unfollow controls remain present and distinct from See Channels.
    expect(screen.getByRole('button', { name: `Unfollow ${followedProfile.name}` })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Follow ${emptyProfile.name}` })).toBeInTheDocument();
  });

  it("shows only the selected profile's channels with names and available thumbnails, replacing content when switching cards", async () => {
    const user = userEvent.setup();
    render(<CommunityPage />);

    await user.click(screen.getByRole('button', { name: `See channels for ${ownProfile.name}` }));

    const dialog = screen.getByRole('dialog', { name: `${ownProfile.name} channels` });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Focus Channel')).toBeInTheDocument();
    const img = screen.getByRole('presentation');
    expect(img).toHaveAttribute('src', 'https://example.com/focus.jpg');

    await user.click(screen.getByRole('button', { name: `Close ${ownProfile.name} channels` }));
    await user.click(screen.getByRole('button', { name: `See channels for ${followedProfile.name}` }));

    expect(screen.getByRole('dialog', { name: `${followedProfile.name} channels` })).toBeInTheDocument();
    expect(screen.getByText('Rockets Weekly')).toBeInTheDocument();
    expect(screen.getByText('Orbit News')).toBeInTheDocument();
    expect(screen.queryByText('Focus Channel')).not.toBeInTheDocument();
  });

  it('shows a legible name without a broken image when a channel has no thumbnail', async () => {
    const user = userEvent.setup();
    render(<CommunityPage />);

    await user.click(screen.getByRole('button', { name: `See channels for ${followedProfile.name}` }));

    expect(screen.getByText('Rockets Weekly')).toBeInTheDocument();
    // Only one image is rendered (Orbit News), none for Rockets Weekly.
    expect(screen.getAllByRole('presentation')).toHaveLength(1);
  });

  it('shows a clear no-channels message for a profile with zero channels', async () => {
    const user = userEvent.setup();
    render(<CommunityPage />);

    await user.click(screen.getByRole('button', { name: `See channels for ${emptyProfile.name}` }));

    expect(screen.getByText('This profile has no channels yet.')).toBeInTheDocument();
  });

  it('renders channel entries as non-interactive content with no YouTube links', async () => {
    const user = userEvent.setup();
    render(<CommunityPage />);

    await user.click(screen.getByRole('button', { name: `See channels for ${followedProfile.name}` }));

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Rockets Weekly').closest('button')).toBeNull();
  });

  it('moves focus into the dialog on open and restores focus to the opener on close', async () => {
    const user = userEvent.setup();
    render(<CommunityPage />);

    const openButton = screen.getByRole('button', { name: `See channels for ${ownProfile.name}` });
    openButton.focus();
    await user.click(openButton);

    const closeButton = await screen.findByRole('button', { name: `Close ${ownProfile.name} channels` });
    await waitFor(() => expect(closeButton).toHaveFocus());

    await user.click(closeButton);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(openButton).toHaveFocus());
  });

  it('closes on Escape and restores focus to the opener', async () => {
    const user = userEvent.setup();
    render(<CommunityPage />);

    const openButton = screen.getByRole('button', { name: `See channels for ${ownProfile.name}` });
    await user.click(openButton);
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(openButton).toHaveFocus());
  });

  it('closes when the backdrop outside the dialog content is activated, but not when clicking inside content', async () => {
    const user = userEvent.setup();
    render(<CommunityPage />);

    await user.click(screen.getByRole('button', { name: `See channels for ${ownProfile.name}` }));
    const dialog = await screen.findByRole('dialog');

    // Click inside content keeps it open.
    await user.click(dialog);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Click on the backdrop (outside the dialog content) closes it.
    const backdrop = dialog.parentElement!;
    await user.click(backdrop);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('traps Tab focus within the open dialog', async () => {
    const user = userEvent.setup();
    render(<CommunityPage />);

    await user.click(screen.getByRole('button', { name: `See channels for ${followedProfile.name}` }));
    const dialog = await screen.findByRole('dialog');
    const closeButton = screen.getByRole('button', { name: `Close ${followedProfile.name} channels` });

    await waitFor(() => expect(closeButton).toHaveFocus());

    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.tab({ shift: true });
    expect(closeButton).toHaveFocus();
  });

  it('falls back to a logical focus target when the original opener no longer exists on close', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<CommunityPage />);

    await user.click(screen.getByRole('button', { name: `See channels for ${ownProfile.name}` }));
    await screen.findByRole('dialog');

    // Simulate the opener unmounting (e.g. pagination/search changed the result set).
    mockCommunity([followedProfile, emptyProfile]);
    rerender(<CommunityPage />);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Search by keyword')).toHaveFocus());
  });

  it('does not change follow, search or pagination behavior', async () => {
    const handleUnfollow = vi.fn();
    mockCommunity([ownProfile, followedProfile, emptyProfile], { handleUnfollow });
    const user = userEvent.setup();
    render(<CommunityPage />);

    await user.click(screen.getByRole('button', { name: `See channels for ${followedProfile.name}` }));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: `Unfollow ${followedProfile.name}` }));
    expect(handleUnfollow).toHaveBeenCalledWith(followedProfile.id);
  });

  it('renders long channel names and large lists within a scrollable list without breaking the dialog', async () => {
    const longName = 'A'.repeat(200);
    const manyChannelsProfile: CommunityProfile = {
      ...followedProfile,
      id: 'profile-many',
      name: 'Many Channels',
      channels: [
        { id: 'chan-long', channelTitle: longName, thumbnailUrl: null },
        ...Array.from({ length: 30 }, (_, i) => ({
          id: `chan-${i}`,
          channelTitle: `Channel ${i}`,
          thumbnailUrl: null,
        })),
      ],
    };
    mockCommunity([manyChannelsProfile]);
    const user = userEvent.setup();
    render(<CommunityPage />);

    await user.click(screen.getByRole('button', { name: `See channels for ${manyChannelsProfile.name}` }));

    expect(screen.getByText(longName)).toBeInTheDocument();
    expect(screen.getByText('Channel 29')).toBeInTheDocument();
  });
});
