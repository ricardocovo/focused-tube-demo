import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
    { id: 'c1', channelTitle: 'Focus Lab', thumbnailUrl: 'https://example.com/focus.jpg' },
    { id: 'c2', channelTitle: 'No Thumb Channel', thumbnailUrl: null },
  ],
};

const followedProfile: CommunityProfile = {
  id: 'profile-followed',
  name: 'Cooking',
  isPublic: true,
  user: { name: 'Jordan', avatarUrl: null },
  _count: { followers: 1 },
  isFollowing: true,
  isOwn: false,
  channels: [{ id: 'c3', channelTitle: 'Chef Daily', thumbnailUrl: 'https://example.com/chef.jpg' }],
};

const unfollowedProfile: CommunityProfile = {
  id: 'profile-unfollowed',
  name: 'Empty Picks',
  isPublic: true,
  user: { name: 'Riley', avatarUrl: null },
  _count: { followers: 0 },
  isFollowing: false,
  isOwn: false,
  channels: [],
};

const handlers = {
  setPage: vi.fn(),
  setKeyword: vi.fn(),
  handleFollow: vi.fn(),
  handleUnfollow: vi.fn(),
};

function mockCommunity(overrides: Record<string, unknown> = {}) {
  mockUseCommunity.mockReturnValue({
    profiles: [ownProfile, followedProfile, unfollowedProfile],
    total: 3,
    page: 1,
    limit: 12,
    keyword: '',
    isLoading: false,
    error: '',
    ...handlers,
    ...overrides,
  });
}

describe('CommunityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCommunity();
  });

  it('shows Yours in the owner line for the current user profile', () => {
    render(<CommunityPage />);

    expect(screen.getByText('Yours')).toBeInTheDocument();
    expect(screen.queryByText('by Casey')).not.toBeInTheDocument();
  });

  it('renders a See Channels button on owned, followed and unfollowed cards', () => {
    render(<CommunityPage />);

    expect(screen.getAllByRole('button', { name: /^See channels in / })).toHaveLength(3);
    for (const name of ['Deep Work', 'Cooking', 'Empty Picks']) {
      expect(screen.getByRole('button', { name: `See channels in ${name}` })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Unfollow Cooking' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Follow Empty Picks' })).toBeInTheDocument();
  });

  it('shows only the selected profile channels and replaces content when switching', async () => {
    const user = userEvent.setup();
    render(<CommunityPage />);

    await user.click(screen.getByRole('button', { name: 'See channels in Deep Work' }));
    let dialog = screen.getByRole('dialog', { name: 'Channels in Deep Work' });
    expect(within(dialog).getByText('Focus Lab')).toBeInTheDocument();
    expect(within(dialog).getByText('No Thumb Channel')).toBeInTheDocument();
    expect(within(dialog).queryByText('Chef Daily')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close channels for Deep Work' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'See channels in Cooking' }));
    dialog = screen.getByRole('dialog', { name: 'Channels in Cooking' });
    expect(within(dialog).getByText('Chef Daily')).toBeInTheDocument();
    expect(within(dialog).queryByText('Focus Lab')).not.toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('renders thumbnails only when available and no links in channel rows', async () => {
    const user = userEvent.setup();
    const { container } = render(<CommunityPage />);

    await user.click(screen.getByRole('button', { name: 'See channels in Deep Work' }));
    const dialog = screen.getByRole('dialog', { name: 'Channels in Deep Work' });
    const items = within(dialog).getAllByRole('listitem');

    expect(items).toHaveLength(2);
    expect(items[0].querySelector('img')).toHaveAttribute('src', 'https://example.com/focus.jpg');
    expect(items[1].querySelector('img')).toBeNull();
    expect(within(dialog).queryAllByRole('link')).toHaveLength(0);
    expect(within(items[0]).queryAllByRole('button')).toHaveLength(0);
    expect(container.querySelectorAll('.community-channels-item a')).toHaveLength(0);
  });

  it('shows an empty-state message for a profile without channels', async () => {
    const user = userEvent.setup();
    render(<CommunityPage />);

    await user.click(screen.getByRole('button', { name: 'See channels in Empty Picks' }));
    const dialog = screen.getByRole('dialog', { name: 'Channels in Empty Picks' });

    expect(within(dialog).getByText('This profile has no channels yet.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('list')).not.toBeInTheDocument();
  });

  it('activating channel rows does not follow, unfollow or paginate', async () => {
    const user = userEvent.setup();
    mockCommunity({ total: 30 });
    render(<CommunityPage />);

    await user.click(screen.getByRole('button', { name: 'See channels in Cooking' }));
    await user.click(screen.getByText('Chef Daily'));
    await user.keyboard('{Enter}');

    expect(handlers.handleFollow).not.toHaveBeenCalled();
    expect(handlers.handleUnfollow).not.toHaveBeenCalled();
    expect(handlers.setPage).not.toHaveBeenCalled();
  });

  it('keeps follow, unfollow and pagination controls working', async () => {
    const user = userEvent.setup();
    mockCommunity({ total: 30 });
    render(<CommunityPage />);

    await user.click(screen.getByRole('button', { name: 'Follow Empty Picks' }));
    await user.click(screen.getByRole('button', { name: 'Unfollow Cooking' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(handlers.handleFollow).toHaveBeenCalledWith('profile-unfollowed');
    expect(handlers.handleUnfollow).toHaveBeenCalledWith('profile-followed');
    expect(handlers.setPage).toHaveBeenCalledWith(2);
  });

  it('moves focus to close and restores it to the opener on close or Escape', async () => {
    const user = userEvent.setup();
    render(<CommunityPage />);

    const opener = screen.getByRole('button', { name: 'See channels in Cooking' });
    await user.click(opener);
    expect(screen.getByRole('button', { name: 'Close channels for Cooking' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
