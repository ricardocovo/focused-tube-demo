import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef } from 'react';
import './CommunityChannelsDialog.css';

const FOCUSABLE_ELEMENTS_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface CommunityChannelsDialogProps {
  profileName: string;
  channelNames: string[];
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

export default function CommunityChannelsDialog({
  profileName,
  channelNames,
  triggerRef,
  onClose,
}: CommunityChannelsDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = `community-channels-title-${profileName.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'profile'}`;

  useEffect(() => {
    const dialogRoot = dialogRef.current?.parentElement;
    const backgroundElements = Array.from(document.body.children).filter(
      (element) => element !== dialogRoot,
    ) as HTMLElement[];
    const previousInert = backgroundElements.map((element) => ({
      element,
      hadInert: element.hasAttribute('inert'),
    }));
    const previousOverflow = document.body.style.overflow;

    backgroundElements.forEach((element) => element.setAttribute('inert', ''));
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      previousInert.forEach(({ element, hadInert }) => {
        if (!hadInert) element.removeAttribute('inert');
      });
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [triggerRef]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const trapFocus = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableElements = Array.from(
      dialog.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS_SELECTOR),
    ).filter((element) => !element.hasAttribute('hidden'));

    if (focusableElements.length === 0) {
      event.preventDefault();
      closeButtonRef.current?.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    const activeElement = document.activeElement;

    if (!dialog.contains(activeElement)) {
      event.preventDefault();
      firstElement.focus();
    } else if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }, []);

  return createPortal(
    <div className="community-channels-overlay">
      <div
        ref={dialogRef}
        className="community-channels-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trapFocus}
      >
        <div className="community-channels-dialog-header">
          <h2 id={titleId}>Channels in {profileName}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="community-channels-close"
            aria-label="Close channels dialog"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <ul className="community-channels-list">
          {channelNames.map((channelName, index) => (
            <li key={`${channelName}-${index}`}>{channelName}</li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
