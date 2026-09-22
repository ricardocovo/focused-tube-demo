import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfiles } from '../context/ProfileContext';
import { usePageTitle } from '../hooks/usePageTitle';
import AppHeader from '../components/ui/AppHeader';
import ProfileVisibilitySwitch from '../components/profile/ProfileVisibilitySwitch';
import { notify } from '../lib/toast';
import './ProfilesPage.css';

export default function ProfilesPage() {
  usePageTitle('Profiles');
  const { profiles, isLoading, createProfile, deleteProfile, updateProfile } = useProfiles();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIsPublic, setNewIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [savingVisibilityId, setSavingVisibilityId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreating(true);
    setError('');
    try {
      await createProfile({ name: trimmed, isPublic: newIsPublic });
      setNewName('');
      setNewIsPublic(false);
      setShowForm(false);
      notify.success('Profile created');
    } catch {
      setError('Failed to create profile.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete profile "${name}"? This cannot be undone.`)) return;
    try {
      await deleteProfile(id);
    } catch {
      alert('Failed to delete profile.');
    }
  }

  async function handleTogglePublic(id: string, currentValue: boolean | undefined) {
    setSavingVisibilityId(id);
    setError('');
    const newValue = !currentValue;
    try {
      await updateProfile(id, { isPublic: newValue });
      notify.success(newValue ? 'Profile is now public' : 'Profile is now private');
    } catch {
      setError('Failed to update visibility.');
      notify.error('Failed to update visibility');
    } finally {
      setSavingVisibilityId(null);
    }
  }

  return (
    <>
      <AppHeader>
        <nav className="app-header-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><span aria-current="page">Profiles</span></li>
          </ol>
        </nav>
      </AppHeader>
      <main id="main-content" tabIndex={-1} className="page-container-narrow">
        <div className="profiles-header">
          <h1 className="profiles-title">Profiles</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="profiles-new-btn"
            aria-expanded={showForm}
            aria-controls="new-profile-form"
          >
            {showForm ? 'Cancel' : '+ New Profile'}
          </button>
        </div>

      {showForm && (
        <form
          id="new-profile-form"
          onSubmit={handleCreate}
          className="profiles-create-form"
        >
          <div className="profiles-create-fields">
            <label className="profiles-create-label" htmlFor="new-profile-name">
              Profile name
            </label>
            <input
              id="new-profile-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Profile name"
              autoFocus
              className="profiles-create-input"
            />
            <ProfileVisibilitySwitch
              checked={newIsPublic}
              compact
              label="List this profile in Community"
              helpText="Private is the default. You can change this again later."
              onToggle={() => setNewIsPublic((prev) => !prev)}
            />
          </div>
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="profiles-create-btn"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>
      )}

      {error && <p className="profiles-error" role="alert">{error}</p>}

      {isLoading ? (
        <p className="profiles-loading">Loading profiles…</p>
      ) : profiles.length === 0 ? (
        <p className="profiles-empty">No profiles yet. Create your first one above!</p>
      ) : (
        <div className="profiles-list">
          {profiles.map((p) => (
            <div key={p.id} className="profiles-item">
              <div className="profiles-item-main">
                <div className="profiles-item-heading">
                  <span className="profiles-item-name">{p.name}</span>
                  <div className="profiles-item-badges">
                    {p.isDefault && (
                      <span className="profiles-item-default">
                        Default
                      </span>
                    )}
                    <span className={`profiles-item-public${p.isPublic ? ' profiles-item-public--on' : ''}`}>
                      {p.isPublic ? 'Public' : 'Private'}
                    </span>
                  </div>
                </div>
                <div className="profiles-item-meta">
                  <span>{p._count?.channels ?? 0} channels</span>
                  <span>{p._count?.followers ?? 0} followers</span>
                </div>
              </div>
              <div className="profiles-item-side">
                <div className="profiles-item-visibility">
                  <ProfileVisibilitySwitch
                    checked={p.isPublic ?? false}
                    compact
                    disabled={savingVisibilityId === p.id}
                    label="Community visibility"
                    helpText={(p.isPublic ?? false)
                      ? 'People can discover and follow this profile.'
                      : 'Only you can see this profile in your list.'}
                    followersCount={p._count?.followers}
                    onToggle={() => handleTogglePublic(p.id, p.isPublic)}
                  />
                </div>
                <div className="profiles-item-actions">
                  <button
                    aria-label={`Edit ${p.name}`}
                    onClick={() => navigate(`/profiles/${p.id}/edit`)}
                    className="profiles-edit-btn"
                  >
                    Edit
                  </button>
                  <button
                    aria-label={`Delete ${p.name}`}
                    onClick={() => handleDelete(p.id, p.name)}
                    className="profiles-delete-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </main>
    </>
  );
}
