import './ProfileVisibilitySwitch.css';

interface ProfileVisibilitySwitchProps {
  checked: boolean;
  label: string;
  helpText?: string;
  onToggle: () => void;
  disabled?: boolean;
  followersCount?: number;
  compact?: boolean;
}

export default function ProfileVisibilitySwitch({
  checked,
  label,
  helpText,
  onToggle,
  disabled = false,
  followersCount,
  compact = false,
}: ProfileVisibilitySwitchProps) {
  return (
    <div className={`profile-visibility-switch${compact ? ' profile-visibility-switch--compact' : ''}`}>
      <div className="profile-visibility-switch-row">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          disabled={disabled}
          onClick={onToggle}
          className={`profile-visibility-switch-control${checked ? ' profile-visibility-switch-control--on' : ''}`}
        >
          <span className="profile-visibility-switch-thumb" />
        </button>
        <div className="profile-visibility-switch-copy">
          <span className="profile-visibility-switch-label">{label}</span>
          <span className="profile-visibility-switch-state">{checked ? 'Public' : 'Private'}</span>
        </div>
      </div>

      {(helpText || (checked && followersCount !== undefined)) && (
        <div className="profile-visibility-switch-meta">
          {helpText && <p className="profile-visibility-switch-help">{helpText}</p>}
          {checked && followersCount !== undefined && (
            <p className="profile-visibility-switch-followers">
              {followersCount} {followersCount === 1 ? 'follower' : 'followers'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
