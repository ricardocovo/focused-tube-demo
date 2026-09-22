import React from 'react';
import './VideoCardSkeleton.css';

const VideoCardSkeleton: React.FC = React.memo(function VideoCardSkeleton() {
  return (
    <div className="video-card video-card-skeleton">
      {/* Thumbnail placeholder */}
      <div className="skeleton-shimmer video-card-skeleton-thumb" />

      {/* Info placeholder */}
      <div className="video-card-skeleton-info">
        {/* Title line 1 */}
        <div className="skeleton-shimmer video-card-skeleton-title-1" />
        {/* Title line 2 */}
        <div className="skeleton-shimmer video-card-skeleton-title-2" />
        {/* Channel name */}
        <div className="skeleton-shimmer video-card-skeleton-channel" />
        {/* Date + badge row */}
        <div className="video-card-skeleton-meta">
          <div className="skeleton-shimmer video-card-skeleton-date" />
          <div className="skeleton-shimmer video-card-skeleton-badge" />
        </div>
      </div>
    </div>
  );
});

export default VideoCardSkeleton;
