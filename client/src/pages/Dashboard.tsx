import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProfiles } from '../context/ProfileContext';
import { usePageTitle } from '../hooks/usePageTitle';
import AppHeader from '../components/ui/AppHeader';
import ProfileSwitcher from '../components/profile/ProfileSwitcher';
import ProfileVisibilitySwitch from '../components/profile/ProfileVisibilitySwitch';
import VideoFeed from '../components/feed/VideoFeed';
import VideoPlayer from '../components/feed/VideoPlayer';
import type { FeedVideo } from '../types/feed';
import { notify } from '../lib/toast';
import './Dashboard.css';

const PROFILE_PANEL_STORAGE_KEY = 'ft_dashboard_profile_panel';

export default function Dashboard() {
  const { activeProfile, profiles, updateProfile } = useProfiles();
  usePageTitle(activeProfile ? `${activeProfile.name} feed` : 'Dashboard');
  const [selectedVideo, setSelectedVideo] = useState<FeedVideo | null>(null);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [isProfilePanelVisible, setIsProfilePanelVisible] = useState(
    () => localStorage.getItem(PROFILE_PANEL_STORAGE_KEY) === 'visible',
  );
  const lastFocusRef = useRef<HTMLElement | null>(null);

  const ownedActiveProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfile?.id),
    [activeProfile?.id, profiles],
  );

  const handleVideoSelect = useCallback((video: FeedVideo) => {
    lastFocusRef.current = document.activeElement as HTMLElement;
    setSelectedVideo(video);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedVideo(null);
    // Use requestAnimationFrame to ensure DOM has updated before restoring focus
    requestAnimationFrame(() => {
      lastFocusRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    setSelectedVideo(null);
    lastFocusRef.current = null;
  }, [activeProfile?.id]);

  useEffect(() => {
    const mainContent = document.getElementById('main-content');
    const header = document.querySelector('header');

    if (selectedVideo) {
      mainContent?.setAttribute('inert', '');
      header?.setAttribute('inert', '');
    } else {
      mainContent?.removeAttribute('inert');
      header?.removeAttribute('inert');
    }

    return () => {
      mainContent?.removeAttribute('inert');
      header?.removeAttribute('inert');
    };
  }, [selectedVideo]);

  useEffect(() => {
    localStorage.setItem(PROFILE_PANEL_STORAGE_KEY, isProfilePanelVisible ? 'visible' : 'hidden');
  }, [isProfilePanelVisible]);

  const handleToggleVisibility = useCallback(async () => {
    if (!ownedActiveProfile) return;

    const nextValue = !(ownedActiveProfile.isPublic ?? false);
    setSavingVisibility(true);
    try {
      await updateProfile(ownedActiveProfile.id, { isPublic: nextValue });
      notify.success(nextValue ? 'Profile is now public' : 'Profile is now private');
    } catch {
      notify.error('Failed to update visibility');
    } finally {
      setSavingVisibility(false);
    }
  }, [ownedActiveProfile, updateProfile]);

  const profilePanelToggleLabel = isProfilePanelVisible ? 'Hide details' : 'View details';

  return (
    <>
      <AppHeader />
      {selectedVideo && (
        <VideoPlayer video={selectedVideo} onClose={handleClose} />
      )}
      <main id="main-content" tabIndex={-1} className="page-container">
        <h1 className="dashboard-page-title">
          {activeProfile ? `${activeProfile.name} feed` : 'Dashboard'}
        </h1>
        <div className="dashboard-toolbar">
          <ProfileSwitcher />
          {activeProfile && (
            <button
              type="button"
              aria-label={profilePanelToggleLabel}
              aria-controls="dashboard-current-profile-panel"
              aria-pressed={isProfilePanelVisible}
              title={profilePanelToggleLabel}
              onClick={() => setIsProfilePanelVisible((current) => !current)}
              className={`dashboard-profile-panel-toggle${isProfilePanelVisible ? ' dashboard-profile-panel-toggle--active' : ''}`}
            >
              {isProfilePanelVisible ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                  <circle cx="12" cy="12" r="3.25" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 3l18 18" />
                  <path d="M10.7 5.1A10.1 10.1 0 0 1 12 5c6 0 9.5 7 9.5 7a17.6 17.6 0 0 1-3 3.7" />
                  <path d="M6.2 6.2A17.3 17.3 0 0 0 2.5 12s3.5 7 9.5 7a9.7 9.7 0 0 0 3-.5" />
                  <path d="M9.9 9.9A3 3 0 0 0 9 12c0 1.7 1.3 3 3 3 .8 0 1.5-.3 2.1-.9" />
                </svg>
              )}
              <span>{profilePanelToggleLabel}</span>
            </button>
          )}
        </div>

        {activeProfile && isProfilePanelVisible && (
          <section
            id="dashboard-current-profile-panel"
            className="dashboard-profile-panel"
            aria-label="Active profile summary"
          >
            <div className="dashboard-profile-panel-copy">
              <span className="dashboard-profile-eyebrow">Current profile</span>
              <h2 className="dashboard-profile-title">{activeProfile.name}</h2>
              {ownedActiveProfile ? (
                <>
                  <p className="dashboard-profile-description">
                    Control whether this profile appears in Community, then jump straight into profile setup.
                  </p>
                  <div className="dashboard-profile-meta">
                    <span>{ownedActiveProfile._count?.channels ?? 0} channels</span>
                    <span>{ownedActiveProfile._count?.followers ?? 0} followers</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="dashboard-profile-description">
                    This is a followed community profile. You can watch its feed here, but visibility controls stay with the owner.
                  </p>
                  <div className="dashboard-profile-meta">
                    <span>Community profile</span>
                    {activeProfile.owner?.name && <span>by {activeProfile.owner.name}</span>}
                  </div>
                </>
              )}
            </div>

            <div className="dashboard-profile-panel-actions">
              {ownedActiveProfile ? (
                <>
                  <div className="dashboard-profile-visibility">
                    <ProfileVisibilitySwitch
                      checked={ownedActiveProfile.isPublic ?? false}
                      compact
                      disabled={savingVisibility}
                      label="Community visibility"
                      helpText={(ownedActiveProfile.isPublic ?? false)
                        ? 'People can discover and follow this profile.'
                        : 'Private profiles stay out of the community list.'}
                      followersCount={ownedActiveProfile._count?.followers}
                      onToggle={handleToggleVisibility}
                    />
                  </div>
                  <div className="dashboard-profile-links">
                    <Link to={`/profiles/${ownedActiveProfile.id}/subscriptions`} className="dashboard-profile-link dashboard-profile-link--primary">
                      Manage subscriptions
                    </Link>
                    <Link to={`/profiles/${ownedActiveProfile.id}/edit`} className="dashboard-profile-link">
                      Edit profile
                    </Link>
                  </div>
                </>
              ) : (
                <div className="dashboard-profile-links">
                  <Link to="/community" className="dashboard-profile-link dashboard-profile-link--primary">
                    Browse community
                  </Link>
                  <Link to="/profiles" className="dashboard-profile-link">
                    Manage your profiles
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}

        {activeProfile ? (
          <section aria-label="Video feed">
            <VideoFeed profileId={activeProfile.id} onVideoSelect={handleVideoSelect} />
          </section>
        ) : (
          <div className="dashboard-empty">
            <div className="dashboard-empty-icon">🎬</div>
            <p className="dashboard-empty-text">
              Select or create a profile to get started.
            </p>
            <Link to="/profiles" className="dashboard-empty-cta">
              Manage Profiles
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
