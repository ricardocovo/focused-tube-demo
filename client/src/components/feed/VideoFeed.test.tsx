import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VideoFeed from './VideoFeed';
import type { FeedVideo } from '../../types/feed';

const mockUseFeed = vi.fn();
vi.mock('../../hooks/useFeed', () => ({
  useFeed: (...args: unknown[]) => mockUseFeed(...args),
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function makeVideo(id: string, source: 'subscription' | 'search' = 'subscription'): FeedVideo {
  return {
    videoId: id,
    title: `Video ${id}`,
    channelId: 'ch1',
    channelTitle: 'Channel 1',
    thumbnailUrl: `http://example.com/${id}.jpg`,
    publishedAt: '2024-01-01T00:00:00Z',
    source,
  };
}

function defaultFeedReturn(overrides = {}) {
  return {
    videos: [] as FeedVideo[],
    isLoading: false,
    isFetchingMore: false,
    error: null,
    nextPageToken: undefined,
    loadMore: vi.fn(),
    reset: vi.fn(),
    hasLoadedOnce: false,
    ...overrides,
  };
}

describe('VideoFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal('IntersectionObserver', class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      constructor() { /* noop */ }
    });
  });

  it('renders 8 skeletons while loading', () => {
    mockUseFeed.mockReturnValue(defaultFeedReturn({ isLoading: true }));

    const { container } = renderWithRouter(<VideoFeed profileId="p1" />);

    const skeletons = container.querySelectorAll('.video-card-skeleton');
    expect(skeletons).toHaveLength(8);
  });

  it('renders video titles when videos are present', () => {
    const videos = [makeVideo('1'), makeVideo('2')];
    mockUseFeed.mockReturnValue(defaultFeedReturn({ videos, hasLoadedOnce: true }));

    renderWithRouter(<VideoFeed profileId="p1" />);

    expect(screen.getByText('Video 1')).toBeInTheDocument();
    expect(screen.getByText('Video 2')).toBeInTheDocument();
    expect(screen.queryByText('Subscription')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Open .* on YouTube/i)).not.toBeInTheDocument();
  });

  it('shows empty state when no videos and loading is done', () => {
    mockUseFeed.mockReturnValue(defaultFeedReturn({ hasLoadedOnce: true }));

    renderWithRouter(<VideoFeed profileId="p1" />);

    expect(screen.getByText(/No videos found/)).toBeInTheDocument();
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });

  it('shows error state with retry button', () => {
    const resetFn = vi.fn();
    mockUseFeed.mockReturnValue(
      defaultFeedReturn({ error: 'Something went wrong', hasLoadedOnce: true, reset: resetFn })
    );

    renderWithRouter(<VideoFeed profileId="p1" />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('announces loading state via role="status" live region', () => {
    mockUseFeed.mockReturnValue(defaultFeedReturn({ isLoading: true }));

    renderWithRouter(<VideoFeed profileId="p1" />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading videos…');
  });

  it('announces fetching-more state via role="status" live region', () => {
    const videos = [makeVideo('1')];
    mockUseFeed.mockReturnValue(
      defaultFeedReturn({ videos, hasLoadedOnce: true, isFetchingMore: true, nextPageToken: 'tok' })
    );

    renderWithRouter(<VideoFeed profileId="p1" />);

    // The "all caught up" <p> also has role="status"; find the sr-only one
    const statusRegions = screen.getAllByRole('status');
    const liveRegion = statusRegions.find((el) => el.classList.contains('sr-only'));
    expect(liveRegion).toHaveTextContent('Loading more videos…');
  });

  it('full-page error has role="alert"', () => {
    mockUseFeed.mockReturnValue(
      defaultFeedReturn({ error: 'Network error', hasLoadedOnce: true })
    );

    renderWithRouter(<VideoFeed profileId="p1" />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
  });

  it('inline error (videos present) has role="alert"', () => {
    const videos = [makeVideo('1')];
    mockUseFeed.mockReturnValue(
      defaultFeedReturn({ videos, hasLoadedOnce: true, error: 'Partial error' })
    );

    renderWithRouter(<VideoFeed profileId="p1" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Partial error');
  });

  it('"all caught up" message has role="status"', () => {
    const videos = [makeVideo('1')];
    mockUseFeed.mockReturnValue(
      defaultFeedReturn({ videos, hasLoadedOnce: true, nextPageToken: undefined })
    );

    renderWithRouter(<VideoFeed profileId="p1" />);

    const caughtUp = screen.getByText(/You're all caught up/);
    expect(caughtUp).toHaveAttribute('role', 'status');
  });

  it('does not render source tabs (feature disabled)', () => {
    mockUseFeed.mockReturnValue(defaultFeedReturn({ isLoading: true }));

    renderWithRouter(<VideoFeed profileId="p1" />);

    expect(screen.queryByRole('button', { name: 'All' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Subscriptions' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument();
  });

  it('shows "all caught up" when no more pages', () => {
    const videos = [makeVideo('1')];
    mockUseFeed.mockReturnValue(
      defaultFeedReturn({ videos, hasLoadedOnce: true, nextPageToken: undefined })
    );

    renderWithRouter(<VideoFeed profileId="p1" />);

    expect(screen.getByText(/You're all caught up/)).toBeInTheDocument();
  });
});
