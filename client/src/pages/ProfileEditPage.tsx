import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchProfile, addKeyword, removeKeyword, removeChannel } from '../services/profilesApi';
import { usePageTitle } from '../hooks/usePageTitle';
import { useProfiles } from '../context/ProfileContext';
import { notify } from '../lib/toast';
import AppHeader from '../components/ui/AppHeader';
import ProfileVisibilitySwitch from '../components/profile/ProfileVisibilitySwitch';
import type { Profile } from '../types/profile';
import './ProfileEditPage.css';

export default function ProfileEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateProfile, refreshProfiles } = useProfiles();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [error, setError] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  usePageTitle(profile ? `Edit ${profile.name}` : 'Edit Profile');

  useEffect(() => {
    if (!id) return;
    loadProfile(id);
  }, [id]);

  async function loadProfile(profileId: string) {
    setLoading(true);
    try {
      const data = await fetchProfile(profileId);
      setProfile(data);
      setName(data.name);
      setIsPublic(data.isPublic ?? false);
    } catch {
      setError('Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await updateProfile(id, { name: name.trim() });
      await loadProfile(id);
      notify.success('Profile name updated');
    } catch {
      setError('Failed to update name.');
      notify.error('Failed to update name');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddKeyword(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !newKeyword.trim()) return;
    setError('');
    try {
      await addKeyword(id, newKeyword.trim());
      setNewKeyword('');
      await loadProfile(id);
      await refreshProfiles();
      notify.success('Keyword added');
    } catch {
      setError('Failed to add keyword.');
      notify.error('Failed to add keyword');
    }
  }

  async function handleRemoveKeyword(keywordId: string) {
    if (!id) return;
    try {
      await removeKeyword(id, keywordId);
      await loadProfile(id);
      await refreshProfiles();
      notify.success('Keyword removed');
    } catch {
      setError('Failed to remove keyword.');
      notify.error('Failed to remove keyword');
    }
  }

  async function handleTogglePublic() {
    if (!id) return;
    const newValue = !isPublic;
    setIsPublic(newValue);
    try {
      await updateProfile(id, { isPublic: newValue });
      await loadProfile(id);
      notify.success(newValue ? 'Profile is now public' : 'Profile is now private');
    } catch {
      setIsPublic(!newValue);
      notify.error('Failed to update visibility');
    }
  }

  async function handleRemoveChannel(channelId: string) {
    if (!id) return;
    try {
      await removeChannel(id, channelId);
      await loadProfile(id);
      await refreshProfiles();
      notify.success('Channel removed');
    } catch {
      setError('Failed to remove channel.');
      notify.error('Failed to remove channel');
    }
  }

  return (
    <>
      <AppHeader>
        <nav className="app-header-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><Link to="/profiles">Profiles</Link></li>
            <li><span aria-current="page">Edit Profile</span></li>
          </ol>
        </nav>
      </AppHeader>
      <main id="main-content" tabIndex={-1} className="page-container-narrow">
        {loading ? (
          <p className="profile-edit-loading">Loading…</p>
        ) : !profile ? (
          <div className="profile-edit-not-found">
            <p className="profile-edit-not-found-text">{error || 'Profile not found.'}</p>
            <button onClick={() => navigate('/profiles')} className="profile-edit-not-found-back">
              Back to profiles
            </button>
          </div>
        ) : (
          <>
            <h1 className="profile-edit-title">Edit Profile</h1>

            {error && <p className="profile-edit-error">{error}</p>}

            {/* Name section */}
            <form onSubmit={handleSaveName} className="profile-edit-name-form">
              <label htmlFor="profile-edit-name" className="profile-edit-label">
                Profile name
              </label>
              <div className="profile-edit-name-controls">
                <input
                  id="profile-edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="profile-edit-input"
                />
                <button
                  type="submit"
                  disabled={saving || !name.trim() || name.trim() === profile.name}
                  className="profile-edit-save-btn"
                >
                  {saving ? 'Saving…' : 'Save Name'}
                </button>
              </div>
            </form>

            {/* Visibility section */}
            <section className="profile-edit-section">
              <h2 className="profile-edit-section-title">Visibility</h2>
              <div className="profile-edit-visibility">
                <ProfileVisibilitySwitch
                  checked={isPublic}
                  label="Make this profile public"
                  helpText="Public profiles appear on the Community page and can be followed by other users."
                  followersCount={profile?._count?.followers ?? 0}
                  onToggle={handleTogglePublic}
                />
              </div>
            </section>

            {/* Channels section */}
            <section className="profile-edit-section">
              <div className="profile-edit-section-header">
                <h2 className="profile-edit-section-title">
                  Channels ({profile.channels?.length ?? 0})
                </h2>
                <Link
                  to={`/profiles/${id}/subscriptions`}
                  className="profile-edit-browse-link"
                >
                  Browse Subscriptions
                </Link>
              </div>
              {!profile.channels || profile.channels.length === 0 ? (
                <p className="profile-edit-empty-text">
                  No channels yet. Add channels from the subscriptions page.
                </p>
              ) : (
                <div className="profile-edit-channel-list">
                  {profile.channels.map((ch) => (
                    <div
                      key={ch.id}
                      className="profile-edit-channel-item"
                    >
                      <div className="profile-edit-channel-info">
                        {ch.thumbnailUrl && (
                          <img
                            src={ch.thumbnailUrl}
                            alt=""
                            className="profile-edit-channel-avatar"
                          />
                        )}
                        <span className="profile-edit-channel-name">{ch.channelTitle}</span>
                      </div>
                      <button
                        aria-label={`Remove ${ch.channelTitle}`}
                        onClick={() => handleRemoveChannel(ch.id)}
                        className="profile-edit-remove-btn"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Keywords section — hidden: search UI disabled */}
          </>
        )}
      </main>
    </>
  );
}
