import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { FeedVideo } from '../../types/feed';
import './VideoCard.css';

interface VideoCardProps {
  video: FeedVideo;
  onSelect?: (video: FeedVideo) => void;
}

/** Converts ISO 8601 duration (e.g. PT4M13S) to a display string (e.g. 4:13 or 1:23:45). */
function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const h = parseInt(match[1] ?? '0', 10);
  const m = parseInt(match[2] ?? '0', 10);
  const s = parseInt(match[3] ?? '0', 10);
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

const VideoCard: React.FC<VideoCardProps> = React.memo(function VideoCard({ video, onSelect }) {
  const relativeTime = formatDistanceToNow(new Date(video.publishedAt), { addSuffix: true });
  const duration = video.duration ? formatDuration(video.duration) : null;

  return (
    <button
      type="button"
      className="video-card"
      aria-label={`Play ${video.title} by ${video.channelTitle}`}
      onClick={() => onSelect?.(video)}
    >
      {/* Thumbnail */}
      <div className="video-card-thumbnail">
        <img
          src={video.thumbnailUrl}
          alt=""
          loading="lazy"
        />
        {duration && (
          <span className="video-card-duration" aria-label={`Duration: ${duration}`}>
            {duration}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="video-card-info">
        <p className="video-card-title">{video.title}</p>
        <p className="video-card-channel">{video.channelTitle}</p>
        <div className="video-card-meta">
          <span className="video-card-time">{relativeTime}</span>
        </div>
      </div>
    </button>
  );
});

export default VideoCard;
