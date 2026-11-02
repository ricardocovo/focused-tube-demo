import React, { useEffect, useRef } from 'react';
import type { CommunityProfile } from '../../types/profile';
import './CommunityChannelsDialog.css';

const FOCUSABLE_ELEMENTS_SELECTOR =
  'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, object, embed, details, summary, [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"]):not([disabled])';

interface CommunityChannelsDialogProps {
  profile: CommunityProfile;
  onClose: () => void;
}

const CommunityChannelsDialog: React.FC<CommunityChannelsDialogProps> = ({ profile, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = 'community-channels-dialog-title';

  // Focus the close button when the dialog opens.
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Escape key closes the dialog.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const trapFocus = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableElements = Array.from(
      dialog.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS_SELECTOR),
    ).filter((element) => {
      if (
        element.hasAttribute('hidden')
        || element.getAttribute('aria-hidden') === 'true'
        || element.closest('[aria-hidden="true"]')
        || element.hasAttribute('inert')
        || element.closest('[inert]')
      ) {
        return false;
      }
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });

    if (focusableElements.length === 0) {
      e.preventDefault();
      closeButtonRef.current?.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement as HTMLElement | null;

    if (!activeElement || !dialog.contains(activeElement)) {
      e.preventDefault();
      firstElement.focus();
      return;
    }

    if (e.shiftKey && activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
      return;
    }

    if (!e.shiftKey && activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  };

  const channels = profile.channels ?? [];

  return (
    <div
      className="community-channels-backdrop"
      // Clicking the backdrop (outside the dialog content) dismisses the view.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="community-channels-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trapFocus}
      >
        <div className="community-channels-dialog-header">
          <h2 id={titleId} className="community-channels-dialog-title">
            {profile.name} channels
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="community-channels-dialog-close"
            aria-label={`Close ${profile.name} channels`}
            onClick={onClose}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {channels.length === 0 ? (
          <p className="community-channels-empty">This profile has no channels yet.</p>
        ) : (
          <ul className="community-channels-list">
            {channels.map((channel) => (
              <li key={channel.id} className="community-channels-item">
                {channel.thumbnailUrl && (
                  <img
                    src={channel.thumbnailUrl}
                    alt=""
                    className="community-channels-item-thumb"
                  />
                )}
                <span className="community-channels-item-name">{channel.channelTitle}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CommunityChannelsDialog;
