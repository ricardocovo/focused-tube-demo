import { useEffect, useRef } from 'react';
import type { CommunityProfile } from '../../types/profile';
import './CommunityChannelsView.css';

interface CommunityChannelsViewProps {
  profile: CommunityProfile;
  onClose: () => void;
}

export default function CommunityChannelsView({ profile, onClose }: CommunityChannelsViewProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = `community-channels-title-${profile.id}`;

  useEffect(() => {
    closeRef.current?.focus();
  }, [profile.id]);

  return (
    <div className="community-channels-backdrop">
      <div
        className="community-channels-view"
        role="dialog"
        aria-labelledby={titleId}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <div className="community-channels-header">
          <h2 id={titleId} className="community-channels-title">
            Channels in {profile.name}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="community-channels-close"
            onClick={onClose}
            aria-label={`Close channels for ${profile.name}`}
          >
            Close
          </button>
        </div>

        {profile.channels.length === 0 ? (
          <p className="community-channels-empty">This profile has no channels yet.</p>
        ) : (
          <ul className="community-channels-list">
            {profile.channels.map((channel) => (
              <li key={channel.id} className="community-channels-item">
                {channel.thumbnailUrl && (
                  <img
                    src={channel.thumbnailUrl}
                    alt=""
                    className="community-channels-avatar"
                    width={40}
                    height={40}
                  />
                )}
                <span className="community-channels-name">{channel.channelTitle}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
