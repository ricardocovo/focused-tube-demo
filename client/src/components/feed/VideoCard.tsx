import React, { useId } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { FeedVideo } from '../../types/feed';
import './VideoCard.css';

interface VideoCardProps {
  video: FeedVideo;
  onSelect?: (video: FeedVideo) => void;
}

const compactCount = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const fullCount = new Intl.NumberFormat('en');

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
  const statsId = useId();
  const stats = [
    { count: video.viewCount, label: 'view' },
    { count: video.likeCount, label: 'like' },
  ].filter((stat): stat is { count: number; label: string } =>
    stat.count != null && Number.isSafeInteger(stat.count) && stat.count >= 0);
  const statsDescription = stats
    .map(({ count, label }) => `${fullCount.format(count)} ${label}${count === 1 ? '' : 's'}`)
    .join(', ');

  return (
    <button
      type="button"
      className="video-card"
      aria-label={`Play ${video.title} by ${video.channelTitle}`}
      aria-describedby={stats.length > 0 ? statsId : undefined}
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
          {stats.map(({ count, label }) => (
            <span className="video-card-stat" key={label} aria-hidden="true">
              {compactCount.format(count)} {label}{count === 1 ? '' : 's'}
            </span>
          ))}
          <span className="video-card-time">{relativeTime}</span>
        </div>
        {stats.length > 0 && (
          <span id={statsId} hidden>{statsDescription}</span>
        )}
      </div>
    </button>
  );
});

export default VideoCard;
