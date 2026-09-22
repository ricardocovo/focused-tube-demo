import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoPlayer from './VideoPlayer';
import type { FeedVideo } from '../../types/feed';

const video: FeedVideo = {
  videoId: 'video-1',
  title: 'Example video title',
  channelId: 'channel-1',
  channelTitle: 'Example channel',
  thumbnailUrl: 'http://example.com/thumb.jpg',
  publishedAt: '2024-01-01T00:00:00Z',
  source: 'subscription',
};

describe('VideoPlayer', () => {
  beforeEach(() => {
    window.YT = {
      Player: class MockPlayer {
        constructor(_elementId: string, _options: YTPlayerOptions) {}

        destroy() {
          return undefined;
        }

        playVideo() {
          return undefined;
        }

        pauseVideo() {
          return undefined;
        }
      },
    };
  });

  it('renders a modal dialog with an accessible title', () => {
    render(<VideoPlayer video={video} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: video.title });
    const title = screen.getByRole('heading', { level: 2, name: video.title });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'video-player-title-id');
    expect(title).toHaveAttribute('id', 'video-player-title-id');
  });

  it('keeps keyboard focus trapped inside the modal', async () => {
    const user = userEvent.setup();

    render(
      <>
        <button type="button">Background action</button>
        <VideoPlayer video={video} onClose={vi.fn()} />
      </>,
    );

    const dialog = screen.getByRole('dialog', { name: video.title });
    const closeButton = screen.getByRole('button', { name: /close video player/i });
    const backgroundButton = screen.getByRole('button', { name: /background action/i });
    const focusableElements = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button, [href], iframe, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => !element.hasAttribute('disabled') && !element.hasAttribute('hidden'));
    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];

    expect(focusableElements.length).toBeGreaterThan(1);

    await waitFor(() => expect(closeButton).toHaveFocus());

    await user.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(backgroundButton).not.toHaveFocus();

    firstFocusableElement.focus();
    expect(firstFocusableElement).toHaveFocus();

    await user.tab({ shift: true });
    expect(lastFocusableElement).toHaveFocus();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(backgroundButton).not.toHaveFocus();

    lastFocusableElement.focus();
    expect(lastFocusableElement).toHaveFocus();

    await user.tab();
    expect(firstFocusableElement).toHaveFocus();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(backgroundButton).not.toHaveFocus();
  });
});
