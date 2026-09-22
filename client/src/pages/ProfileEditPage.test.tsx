import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProfileEditPage from './ProfileEditPage';

const mockUseProfiles = vi.fn();

vi.mock('../context/ProfileContext', () => ({
  useProfiles: () => mockUseProfiles(),
}));

vi.mock('../services/profilesApi', () => ({
  fetchProfile: vi.fn(),
  addKeyword: vi.fn(),
  removeKeyword: vi.fn(),
  removeChannel: vi.fn(),
}));

vi.mock('../components/ui/AppHeader', () => ({
  default: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/profile/ProfileVisibilitySwitch', () => ({
  default: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock('../lib/toast', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { fetchProfile } from '../services/profilesApi';

const mockFetchProfile = vi.mocked(fetchProfile);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/profiles/profile-1/edit']}>
      <Routes>
        <Route path="/profiles/:id/edit" element={<ProfileEditPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProfileEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseProfiles.mockReturnValue({
      updateProfile: vi.fn(),
      refreshProfiles: vi.fn(),
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
          channelTitle: 'Calm Coding',
          thumbnailUrl: null,
          createdAt: '',
        },
      ],
      keywords: [],
      _count: { channels: 1, keywords: 0, followers: 0 },
    });
  });

  it('provides an associated visible label for the profile name input', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Edit Profile' })).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText('Profile name');
    expect(nameInput).toHaveAttribute('id', 'profile-edit-name');
    expect(nameInput).toHaveValue('Deep Work');
  });

  it('provides contextual labels for channel removal buttons', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remove Calm Coding' })).toBeInTheDocument();
    });
  });
});
