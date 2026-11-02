import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoCard from './VideoCard';
import type { FeedVideo } from '../../types/feed';

const video: FeedVideo = {
  videoId: 'video-1',
  title: 'My Video Title',
  channelId: 'channel-1',
  channelTitle: 'My Channel',
  thumbnailUrl: 'http://example.com/thumb.jpg',
  publishedAt: '2024-01-01T00:00:00Z',
  source: 'subscription',
};

describe('VideoCard', () => {
  it('renders decorative thumbnail and non-heading title text inside button', () => {
    const { container } = render(<VideoCard video={video} />);

    const thumbnail = container.querySelector('.video-card-thumbnail img');
    expect(thumbnail).toHaveAttribute('alt', '');
    expect(screen.queryByRole('heading', { name: video.title })).not.toBeInTheDocument();
    expect(screen.getByText(video.title, { selector: '.video-card-title' })).toBeInTheDocument();
  });

  it('calls onSelect when activated', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(<VideoCard video={video} onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: /My Video Title/i }));

    expect(onSelect).toHaveBeenCalledWith(video);
  });

  it('renders duration badge when duration is present', () => {
    const videoWithDuration: FeedVideo = { ...video, duration: 'PT4M13S' };
    render(<VideoCard video={videoWithDuration} />);

    const badge = screen.getByText('4:13');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('video-card-duration');
    expect(badge).toHaveAttribute('aria-label', 'Duration: 4:13');
  });

  it('renders hours in duration badge when over an hour', () => {
    const videoWithDuration: FeedVideo = { ...video, duration: 'PT1H23M45S' };
    render(<VideoCard video={videoWithDuration} />);

    expect(screen.getByText('1:23:45')).toBeInTheDocument();
  });

  it('does not render duration badge when duration is absent', () => {
    const { container } = render(<VideoCard video={video} />);
    expect(container.querySelector('.video-card-duration')).not.toBeInTheDocument();
  });

  it('shows compact statistics and describes exact counts without changing the play name', () => {
    render(<VideoCard video={{ ...video, viewCount: 1234, likeCount: 2345678 }} />);
    expect(screen.getByText('1.2K views')).toBeInTheDocument();
    expect(screen.getByText('2.3M likes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: `Play ${video.title} by ${video.channelTitle}` }))
      .toHaveAccessibleDescription('1,234 views, 2,345,678 likes');
  });

  it.each([
    [{ viewCount: 1 }, '1 view'],
    [{ likeCount: 1 }, '1 like'],
    [{ viewCount: 0, likeCount: 0 }, '0 views, 0 likes'],
    [{ viewCount: null, likeCount: 12 }, '12 likes'],
    [{ viewCount: 12, likeCount: null }, '12 views'],
  ])('renders only available statistics %j', (counts, description) => {
    render(<VideoCard video={{ ...video, ...counts }} />);
    const button = screen.getByRole('button', { name: /Play My Video Title/ });
    expect(button).toHaveAccessibleDescription(description);
    expect(button).toHaveTextContent(/ago/);
    if (!('viewCount' in counts) || counts.viewCount == null) {
      expect(screen.queryByText(/\bviews?\b/)).not.toBeInTheDocument();
    }
    if (!('likeCount' in counts) || counts.likeCount == null) {
      expect(screen.queryByText(/\blikes?\b/)).not.toBeInTheDocument();
    }
  });

  it.each([{}, { viewCount: null, likeCount: null }, { viewCount: -1, likeCount: NaN }])(
    'omits unavailable or invalid statistics %j',
    (counts) => {
      render(<VideoCard video={{ ...video, ...counts }} />);
      expect(screen.getByRole('button')).not.toHaveAttribute('aria-describedby');
      expect(screen.queryByText(/\b(?:views?|likes?)\b/)).not.toBeInTheDocument();
    },
  );

  it('uses unique statistic descriptions for each card', () => {
    render(<>
      <VideoCard video={{ ...video, viewCount: 12 }} />
      <VideoCard video={{ ...video, videoId: 'other', title: 'Other video', likeCount: 34 }} />
    </>);
    expect(screen.getByRole('button', { name: /My Video Title/ })).toHaveAccessibleDescription('12 views');
    expect(screen.getByRole('button', { name: /Other video/ })).toHaveAccessibleDescription('34 likes');
  });

  it('keeps keyboard activation and duration when statistics are present', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const withStats = { ...video, viewCount: 1234, likeCount: 12, duration: 'PT4M13S' };
    render(<VideoCard video={withStats} onSelect={onSelect} />);
    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenLastCalledWith(withStats);
    expect(screen.getByText('4:13')).toBeInTheDocument();
  });
});
