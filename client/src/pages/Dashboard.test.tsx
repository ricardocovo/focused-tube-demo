import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

const mockUseProfiles = vi.fn();

vi.mock('../context/ProfileContext', () => ({
  useProfiles: () => mockUseProfiles(),
}));

vi.mock('../components/ui/AppHeader', () => ({
  default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/profile/ProfileSwitcher', () => ({
  default: () => <div>Profile switcher</div>,
}));

vi.mock('../components/feed/VideoFeed', () => ({
  default: ({ onVideoSelect }: { onVideoSelect: (video: { videoId: string; title: string; channelTitle: string }) => void }) => (
    <button
      type="button"
      onClick={() => onVideoSelect({
        videoId: 'video-1',
        title: 'Demo video',
        channelTitle: 'Demo channel',
      })}
    >
      Open video
    </button>
  ),
}));

vi.mock('../components/feed/VideoPlayer', () => ({
  default: ({ video }: { video: { title: string } }) => <div>{video.title}</div>,
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
      <Dashboard />
    </MemoryRouter>,
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    mockUseProfiles.mockReturnValue({
      activeProfile: {
        id: 'profile-1',
        name: 'Deep Work',
        isDefault: true,
        isPublic: true,
        userId: 'user-1',
        createdAt: '',
        updatedAt: '',
        _count: { channels: 3, keywords: 0, followers: 1 },
      },
      profiles: [
        {
          id: 'profile-1',
          name: 'Deep Work',
          isDefault: true,
          isPublic: true,
          userId: 'user-1',
          createdAt: '',
          updatedAt: '',
          _count: { channels: 3, keywords: 0, followers: 1 },
        },
      ],
      updateProfile: vi.fn(),
    });
  });

  it('closes the open player when the active profile changes', async () => {
    const user = userEvent.setup();
    const { rerender } = renderPage();

    await user.click(screen.getByRole('button', { name: 'Open video' }));
    expect(screen.getByText('Demo video')).toBeInTheDocument();

    mockUseProfiles.mockReturnValue({
      activeProfile: {
        id: 'profile-2',
        name: 'Weekend Research',
        isDefault: false,
        isPublic: false,
        userId: 'user-1',
        createdAt: '',
        updatedAt: '',
        _count: { channels: 4, keywords: 0, followers: 0 },
      },
      profiles: [
        {
          id: 'profile-2',
          name: 'Weekend Research',
          isDefault: false,
          isPublic: false,
          userId: 'user-1',
          createdAt: '',
          updatedAt: '',
          _count: { channels: 4, keywords: 0, followers: 0 },
        },
      ],
      updateProfile: vi.fn(),
    });

    rerender(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Demo video')).not.toBeInTheDocument();
  });

  it('starts with the current profile section hidden and lets the user show and hide it', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByLabelText('Active profile summary')).not.toBeInTheDocument();
    expect(localStorage.getItem('ft_dashboard_profile_panel')).toBe('hidden');

    await user.click(screen.getByRole('button', { name: 'View details' }));

    expect(screen.getByLabelText('Active profile summary')).toBeInTheDocument();
    expect(localStorage.getItem('ft_dashboard_profile_panel')).toBe('visible');

    await user.click(screen.getByRole('button', { name: 'Hide details' }));

    expect(screen.queryByLabelText('Active profile summary')).not.toBeInTheDocument();
    expect(localStorage.getItem('ft_dashboard_profile_panel')).toBe('hidden');
  });

  it('restores the current profile section when the user previously left it open', () => {
    localStorage.setItem('ft_dashboard_profile_panel', 'visible');

    renderPage();

    expect(screen.getByLabelText('Active profile summary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hide details' })).toBeInTheDocument();
  });

  it('shows a followed profile feed when the user has no owned profiles', () => {
    mockUseProfiles.mockReturnValue({
      activeProfile: {
        id: 'followed-1',
        name: 'News Roundup',
        isDefault: false,
        isPublic: true,
        userId: '',
        createdAt: '',
        updatedAt: '',
        isFollowing: true,
        owner: { name: 'Taylor' },
      },
      profiles: [],
      updateProfile: vi.fn(),
    });

    renderPage();

    expect(screen.getByRole('heading', { name: 'News Roundup feed' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open video' })).toBeInTheDocument();
  });

  it('wraps the feed in a labeled tabpanel when a profile is active', () => {
    renderPage();

    const feedTabPanel = screen.getByRole('tabpanel', { name: 'Feed videos' });
    expect(feedTabPanel).toContainElement(screen.getByRole('button', { name: 'Open video' }));
  });
});
