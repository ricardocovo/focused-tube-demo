import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { usePageTitle } from '../hooks/usePageTitle';
import { useProfiles } from '../context/ProfileContext';
import { addChannel, removeChannel } from '../services/profilesApi';
import { fetchProfile } from '../services/profilesApi';
import SubscriptionChannelRow from '../components/subscriptions/SubscriptionChannelRow';
import SubscriptionItemSkeleton from '../components/subscriptions/SubscriptionItemSkeleton';
import AppHeader from '../components/ui/AppHeader';
import { notify } from '../lib/toast';
import type { Profile, ProfileChannel } from '../types/profile';
import './SubscriptionPickerPage.css';

export default function SubscriptionPickerPage() {
  const { profileId } = useParams<{ profileId: string }>();
  const { subscriptions, isLoading, error, refetch } = useSubscriptions();
  const { refreshProfiles } = useProfiles();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  usePageTitle(profile ? `Subscriptions – ${profile.name}` : 'Browse Subscriptions');

  const [search, setSearch] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<Map<string, ProfileChannel>>(new Map());
  const [savingChannelIds, setSavingChannelIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profileId) return;
    setProfileLoading(true);
    fetchProfile(profileId)
      .then((data) => {
        setProfile(data);
        setSelectedChannels(
          new Map((data.channels ?? []).map((ch) => [ch.youtubeChannelId, ch])),
        );
      })
      .catch(() => {
        setProfile(null);
      })
      .finally(() => setProfileLoading(false));
  }, [profileId]);

  const filtered = useMemo(() => {
    if (!search.trim()) return subscriptions;
    const q = search.toLowerCase();
    return subscriptions.filter((ch) =>
      ch.channelTitle.toLowerCase().includes(q),
    );
  }, [subscriptions, search]);

  const handleToggle = useCallback(
    async (channel: (typeof subscriptions)[number]) => {
      if (!profileId) return;
      const existing = selectedChannels.get(channel.youtubeChannelId);

      setSavingChannelIds((prev) => new Set(prev).add(channel.youtubeChannelId));

      try {
        if (existing) {
          setSelectedChannels((prev) => {
            const next = new Map(prev);
            next.delete(channel.youtubeChannelId);
            return next;
          });
          await removeChannel(profileId, existing.id);
          notify.success(`Removed ${channel.channelTitle}`);
        } else {
          setSelectedChannels((prev) => {
            const next = new Map(prev);
            next.set(channel.youtubeChannelId, {
              id: `pending-${channel.youtubeChannelId}`,
              profileId,
              youtubeChannelId: channel.youtubeChannelId,
              channelTitle: channel.channelTitle,
              thumbnailUrl: channel.thumbnailUrl ?? null,
              createdAt: '',
            });
            return next;
          });
          const created = await addChannel(profileId, {
            youtubeChannelId: channel.youtubeChannelId,
            channelTitle: channel.channelTitle,
            thumbnailUrl: channel.thumbnailUrl,
          });
          setSelectedChannels((prev) => {
            const next = new Map(prev);
            next.set(channel.youtubeChannelId, created);
            return next;
          });
          notify.success(`Added ${channel.channelTitle}`);
        }
        await refreshProfiles();
      } catch {
        setSelectedChannels((prev) => {
          const next = new Map(prev);
          if (existing) {
            next.set(channel.youtubeChannelId, existing);
          } else {
            next.delete(channel.youtubeChannelId);
          }
          return next;
        });
        notify.error(`Failed to update ${channel.channelTitle}`);
      } finally {
        setSavingChannelIds((prev) => {
          const next = new Set(prev);
          next.delete(channel.youtubeChannelId);
          return next;
        });
      }
    },
    [profileId, refreshProfiles, selectedChannels],
  );

  const showLoading = isLoading || profileLoading;
  const selectedCount = selectedChannels.size;

  return (
    <>
      <AppHeader>
        <nav className="app-header-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><Link to="/profiles">Profiles</Link></li>
            <li><Link to={`/profiles/${profileId}/edit`}>Edit Profile</Link></li>
            <li><span aria-current="page">Subscriptions</span></li>
          </ol>
        </nav>
      </AppHeader>
      <main id="main-content" tabIndex={-1} className="page-container-narrow">
        <div className="sub-picker-header">
          <div>
            <h1 className="sub-picker-title">Browse Subscriptions</h1>
            <p className="sub-picker-subtitle">
              Select the channels that should appear in {profile?.name ?? 'this profile'}.
            </p>
          </div>
          <div className="sub-picker-summary" aria-live="polite">
            <span className="sub-picker-summary-count">{selectedCount}</span>
            <span className="sub-picker-summary-label">
              {selectedCount === 1 ? 'channel selected' : 'channels selected'}
            </span>
          </div>
        </div>

        <label className="sub-picker-search-label" htmlFor="subscription-search">
          Search subscriptions
        </label>
        <input
          id="subscription-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search channels…"
          className="subscription-search"
        />

        {/* Error state */}
        {error && !showLoading && (
          <div className="sub-picker-error">
            <p className="sub-picker-error-text">{error}</p>
            <button
              onClick={refetch}
              className="sub-picker-retry-btn"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {showLoading && (
          <div className="sub-picker-list">
            {Array.from({ length: 8 }, (_, i) => (
              <SubscriptionItemSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!showLoading && !error && subscriptions.length === 0 && (
          <p className="sub-picker-empty">
            No YouTube subscriptions found.
          </p>
        )}

        {/* No search results */}
        {!showLoading && !error && subscriptions.length > 0 && filtered.length === 0 && (
          <p className="sub-picker-empty">
            No channels match "{search}".
          </p>
        )}

        {/* Channel list */}
        {!showLoading && !error && filtered.length > 0 && (
          <div className="sub-picker-list">
            {filtered.map((ch) => (
              <SubscriptionChannelRow
                key={ch.youtubeChannelId}
                channel={ch}
                isSelected={selectedChannels.has(ch.youtubeChannelId)}
                isSaving={savingChannelIds.has(ch.youtubeChannelId)}
                onToggle={() => handleToggle(ch)}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
