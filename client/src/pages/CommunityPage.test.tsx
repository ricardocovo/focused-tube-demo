import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommunityPage from './CommunityPage';

const mockUseCommunity = vi.fn();

vi.mock('../hooks/useCommunity', () => ({
  useCommunity: () => mockUseCommunity(),
}));

vi.mock('../components/ui/AppHeader', () => ({
  default: () => <div>Header</div>,
}));

describe('CommunityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseCommunity.mockReturnValue({
      profiles: [
        {
          id: 'profile-own',
          name: 'Deep Work',
          isPublic: true,
          user: { name: 'Casey', avatarUrl: 'https://example.com/avatar.jpg' },
          channels: [{ id: 'channel-1', channelTitle: 'Focus Lab' }],
          _count: { followers: 2 },
          isFollowing: false,
          isOwn: true,
        },
      ],
      total: 1,
      page: 1,
      setPage: vi.fn(),
      limit: 12,
      keyword: '',
      setKeyword: vi.fn(),
      isLoading: false,
      error: '',
      handleFollow: vi.fn(),
      handleUnfollow: vi.fn(),
    });
  });

  it('shows Yours in the owner line for the current user profile', () => {
    render(<CommunityPage />);

    expect(screen.getByText('Yours')).toBeInTheDocument();
    expect(screen.queryByText('by Casey')).not.toBeInTheDocument();
  });

  it('shows channels for nonempty profiles and opens the dialog without changing follow controls', async () => {
    const user = userEvent.setup();
    render(<CommunityPage />);

    await user.click(screen.getByRole('button', { name: /See channels in Deep Work/i }));

    expect(screen.getByRole('dialog', { name: 'Channels in Deep Work' })).toBeInTheDocument();
    expect(screen.getByRole('list')).toHaveTextContent('Focus Lab');
    expect(screen.getByText('Your profile')).toBeInTheDocument();
    expect(mockUseCommunity().handleFollow).not.toHaveBeenCalled();
  });
});