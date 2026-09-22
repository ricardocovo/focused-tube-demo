import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { FeedVideo } from '../../types/feed';
import './VideoPlayer.css';

/* ------------------------------------------------------------------ */
/*  YouTube IFrame API — module-level singleton loader                 */
/* ------------------------------------------------------------------ */

interface YTPlayerLike {
  destroy: () => void;
}

let ytApiPromise: Promise<void> | undefined;

function loadYouTubeIFrameApi(): Promise<void> {
  if (ytApiPromise) return ytApiPromise;

  if (window.YT?.Player) {
    ytApiPromise = Promise.resolve();
    return ytApiPromise;
  }

  ytApiPromise = new Promise<void>((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady as (() => void) | undefined;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => {
      ytApiPromise = undefined;
      reject(new Error('Failed to load YouTube IFrame API'));
    };
    document.head.appendChild(script);

    const TIMEOUT_MS = 10_000;
    setTimeout(() => {
      if (!window.YT?.Player) {
        ytApiPromise = undefined;
        reject(new Error('YouTube IFrame API timed out'));
      }
    }, TIMEOUT_MS);
  });

  return ytApiPromise;
}

const YT_ERROR_MESSAGES: Record<number, string> = {
  2: 'This video request is invalid.',
  5: 'The browser could not load this YouTube video format.',
  100: 'This video is unavailable or has been removed.',
  101: 'The video owner does not allow playback in embedded players.',
  150: 'The video owner does not allow playback in embedded players.',
  153: 'Playback is blocked because your browser did not send a valid referrer.',
};
const VIDEO_PLAYER_TITLE_ID = 'video-player-title-id';
const FOCUSABLE_ELEMENTS_SELECTOR =
  'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, object, embed, details, summary, [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"]):not([disabled])';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface VideoPlayerProps {
  video: FeedVideo;
  onClose: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayerLike | null>(null);

  const [loading, setLoading] = useState(true);
  const [playerErrorCode, setPlayerErrorCode] = useState<number | null>(null);
  const [apiLoadFailed, setApiLoadFailed] = useState(false);

  // Focus close button on mount
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Escape key closes player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Initialise YT.Player when video changes
  useEffect(() => {
    let cancelled = false;

    function destroyPlayer() {
      try { playerRef.current?.destroy(); } catch { /* already destroyed */ }
      playerRef.current = null;
    }

    async function init() {
      setLoading(true);
      setPlayerErrorCode(null);
      setApiLoadFailed(false);
      destroyPlayer();

      try {
        await loadYouTubeIFrameApi();
      } catch {
        if (!cancelled) {
          setApiLoadFailed(true);
          setLoading(false);
        }
        return;
      }

      if (cancelled || !playerContainerRef.current) return;

      // Create a fresh target div for YT.Player (it replaces the element)
      const target = document.createElement('div');
      target.id = `yt-player-${video.videoId}`;
      playerContainerRef.current.innerHTML = '';
      playerContainerRef.current.appendChild(target);

      playerRef.current = new window.YT!.Player(target.id, {
        videoId: video.videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (!cancelled) setLoading(false);
          },
          onError: (event: { data: number }) => {
            if (!cancelled) {
              setPlayerErrorCode(event.data);
              setLoading(false);
            }
          },
        },
      });
    }

    init();

    return () => {
      cancelled = true;
      destroyPlayer();
    };
  }, [video.videoId]);

  const youtubeUrl = `https://www.youtube.com/watch?v=${video.videoId}`;

  const handleWatchOnYouTube = useCallback(() => {
    window.open(youtubeUrl, '_blank', 'noopener,noreferrer');
  }, [youtubeUrl]);

  const showFallback = playerErrorCode !== null || apiLoadFailed;
  const playerErrorMessage =
    playerErrorCode !== null
      ? YT_ERROR_MESSAGES[playerErrorCode] ?? 'This video cannot be played in the embedded player.'
      : null;

  const trapFocus = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableElements = Array.from(
      dialog.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS_SELECTOR),
    ).filter((element) => {
      if (
        element.hasAttribute('hidden')
        || element.getAttribute('aria-hidden') === 'true'
        || element.closest('[aria-hidden="true"]')
        || element.hasAttribute('inert')
        || element.closest('[inert]')
      ) {
        return false;
      }

      const style = window.getComputedStyle(element);
      return (
        style.display !== 'none'
        && style.visibility !== 'hidden'
      );
    });

    if (focusableElements.length === 0) {
      e.preventDefault();
      closeButtonRef.current?.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement as HTMLElement | null;

    if (!activeElement || !dialog.contains(activeElement)) {
      e.preventDefault();
      firstElement.focus();
      return;
    }

    if (e.shiftKey && activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
      return;
    }

    if (!e.shiftKey && activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }, []);

  return (
    <div
      ref={dialogRef}
      className="video-player"
      role="dialog"
      aria-modal="true"
      aria-labelledby={VIDEO_PLAYER_TITLE_ID}
      onKeyDown={trapFocus}
    >
      <div className="video-player-inner">
        <button
          ref={closeButtonRef}
          className="video-player-close"
          aria-label="Close video player"
          onClick={onClose}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="video-player-iframe-wrapper">
          {loading && !showFallback && (
            <div className="video-player-loading" role="status">
              <span className="video-player-spinner" aria-hidden="true" />
              <span className="sr-only">Loading video…</span>
            </div>
          )}

          {showFallback ? (
            <div className="video-player-fallback" role="region" aria-label="Video unavailable">
              {video.thumbnailUrl && (
                <img
                  className="video-player-fallback-thumb"
                  src={video.thumbnailUrl}
                  alt=""
                />
              )}
              <div className="video-player-fallback-content">
                <p className="video-player-fallback-message">
                  {apiLoadFailed
                    ? 'Could not load the video player.'
                    : playerErrorMessage}
                </p>
                {playerErrorCode !== null && (
                  <p className="video-player-fallback-code">YouTube error code: {playerErrorCode}</p>
                )}
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="video-player-fallback-link"
                  onClick={(e) => { e.preventDefault(); handleWatchOnYouTube(); }}
                >
                  Watch on YouTube
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M6 3h7v7M13 3L6 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            </div>
          ) : (
            <div ref={playerContainerRef} />
          )}
        </div>

        <div className="video-player-info">
          <h2 id={VIDEO_PLAYER_TITLE_ID} className="video-player-title">{video.title}</h2>
          <p className="video-player-channel">{video.channelTitle}</p>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
