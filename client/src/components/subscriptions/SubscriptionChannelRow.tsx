import type { SubscriptionChannel } from '../../types/youtube';
import './SubscriptionChannelRow.css';

interface Props {
  channel: SubscriptionChannel;
  isSelected: boolean;
  isSaving: boolean;
  onToggle: () => void;
}

export default function SubscriptionChannelRow({ channel, isSelected, isSaving, onToggle }: Props) {
  const disabled = isSaving;

  let btnLabel = 'Select';
  let btnClass = 'sub-channel-btn';
  let ariaLabel = `Select ${channel.channelTitle}`;

  if (isSaving) {
    btnLabel = 'Updating…';
    btnClass += ' sub-channel-btn--saving';
    ariaLabel = `Updating ${channel.channelTitle}…`;
  } else if (isSelected) {
    btnLabel = 'Selected';
    btnClass += ' sub-channel-btn--selected';
    ariaLabel = `Selected - remove ${channel.channelTitle}`;
  }

  return (
    <div className={`subscription-row${isSelected ? ' subscription-row--selected' : ''}`}>
      <img
        src={channel.thumbnailUrl ?? undefined}
        alt=""
      />

      <div className="subscription-row-info">
        <div className="subscription-row-title">
          {channel.channelTitle}
        </div>
        {channel.description && (
          <div className="subscription-row-desc">
            {channel.description}
          </div>
        )}
      </div>

      <button
        type="button"
        aria-pressed={isSelected}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={onToggle}
        className={btnClass}
      >
        {btnLabel}
      </button>
    </div>
  );
}
