import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SubscriptionPickerPage from './SubscriptionPickerPage';

const mockUseSubscriptions = vi.fn();
const mockUseProfiles = vi.fn();

vi.mock('../hooks/useSubscriptions', () => ({
  useSubscriptions: () => mockUseSubscriptions(),
}));

vi.mock('../context/ProfileContext', () => ({
  useProfiles: () => mockUseProfiles(),
}));

vi.mock('../services/profilesApi', () => ({
  fetchProfile: vi.fn(),
  addChannel: vi.fn(),
  removeChannel: vi.fn(),
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

import { fetchProfile, addChannel, removeChannel } from '../services/profilesApi';

const mockFetchProfile = vi.mocked(fetchProfile);
const mockAddChannel = vi.mocked(addChannel);
const mockRemoveChannel = vi.mocked(removeChannel);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/profiles/profile-1/subscriptions']}>
      <Routes>
        <Route path="/profiles/:profileId/subscriptions" element={<SubscriptionPickerPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SubscriptionPickerPage', () => {
  const refreshProfiles = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSubscriptions.mockReturnValue({
      subscriptions: [
        {
          youtubeChannelId: 'ch-1',
          channelTitle: 'Channel One',
          thumbnailUrl: null,
          description: 'First channel',
        },
        {
          youtubeChannelId: 'ch-2',
          channelTitle: 'Channel Two',
          thumbnailUrl: null,
          description: 'Second channel',
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseProfiles.mockReturnValue({
      refreshProfiles,
    });

    mockFetchProfile.mockResolvedValue({
      id: 'profile-1',
      name: 'Deep Work',
      isDefault: false,
      isPublic: false,
      userId: 'user-1',
      createdAt: '',
      updatedAt: '',
      channels: [
        {
          id: 'membership-1',
          profileId: 'profile-1',
          youtubeChannelId: 'ch-1',
          channelTitle: 'Channel One',
          thumbnailUrl: null,
          createdAt: '',
        },
      ],
      keywords: [],
      _count: { channels: 1, keywords: 0, followers: 0 },
    });

    mockAddChannel.mockResolvedValue({
      id: 'membership-2',
      profileId: 'profile-1',
      youtubeChannelId: 'ch-2',
      channelTitle: 'Channel Two',
      thumbnailUrl: null,
      createdAt: '',
    });

    mockRemoveChannel.mockResolvedValue(undefined);
    refreshProfiles.mockResolvedValue(undefined);
  });

  it('removes a selected channel from the picker list', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText('Channel One')).toBeInTheDocument();
    });

    const row = container.querySelectorAll<HTMLElement>('.subscription-row')[0]!;
    await user.click(within(row).getByRole('button', { name: 'Selected - remove Channel One' }));

    await waitFor(() => {
      expect(mockRemoveChannel).toHaveBeenCalledWith('profile-1', 'membership-1');
    });
  });

  it('adds an unselected channel from the picker list', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();

    await waitFor(() => {
      expect(screen.getByText('Channel Two')).toBeInTheDocument();
    });

    const row = container.querySelectorAll<HTMLElement>('.subscription-row')[1]!;
    await user.click(within(row).getByRole('button', { name: 'Select Channel Two' }));

    await waitFor(() => {
      expect(mockAddChannel).toHaveBeenCalledWith('profile-1', {
        youtubeChannelId: 'ch-2',
        channelTitle: 'Channel Two',
        thumbnailUrl: null,
      });
    });
  });
});
