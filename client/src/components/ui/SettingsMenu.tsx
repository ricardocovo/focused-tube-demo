import { useState, useRef, useEffect, useId, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './SettingsMenu.css';

export default function SettingsMenu() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const openInteractionRef = useRef<'keyboard' | 'pointer'>();
  const dropdownId = useId();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setActiveIndex(0);
      if (openInteractionRef.current === 'keyboard') {
        requestAnimationFrame(() => {
          focusMenuItem(0);
        });
      }
    }
  }, [open]);

  function focusMenuItem(index: number) {
    const normalizedIndex = (index + menuItemRefs.current.length) % menuItemRefs.current.length;
    setActiveIndex(normalizedIndex);
    menuItemRefs.current[normalizedIndex]?.focus();
  }

  function handleMenuItemKeyDown(index: number, e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusMenuItem(index + 1);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusMenuItem(index - 1);
      return;
    }

    if (e.key === 'Home') {
      e.preventDefault();
      focusMenuItem(0);
      return;
    }

    if (e.key === 'End') {
      e.preventDefault();
      focusMenuItem(menuItemRefs.current.length - 1);
    }
  }

  return (
    <div ref={ref} className="settings-menu">
      <button
        ref={toggleRef}
        onPointerDown={() => {
          openInteractionRef.current = 'pointer';
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            openInteractionRef.current = 'keyboard';
            setOpen(true);
            return;
          }

          if (e.key === 'Enter' || e.key === ' ') {
            openInteractionRef.current = 'keyboard';
          }
        }}
        onClick={() => setOpen(!open)}
        aria-label="Settings"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={dropdownId}
        className={`settings-menu-toggle${open ? ' settings-menu-toggle--open' : ''}`}
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--ft-text-secondary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div id={dropdownId} role="menu" className="settings-menu-dropdown">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate('/profiles');
            }}
            onKeyDown={(e) => handleMenuItemKeyDown(0, e)}
            tabIndex={activeIndex === 0 ? 0 : -1}
            ref={(node) => {
              menuItemRefs.current[0] = node;
            }}
            role="menuitem"
            className="settings-menu-link"
          >
            <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Manage Profiles
          </button>
          <div role="separator" className="settings-menu-divider" />
          <button
            onClick={() => {
              setOpen(false);
              logout();
            }}
            onKeyDown={(e) => handleMenuItemKeyDown(1, e)}
            tabIndex={activeIndex === 1 ? 0 : -1}
            ref={(node) => {
              menuItemRefs.current[1] = node;
            }}
            role="menuitem"
            className="settings-menu-btn"
          >
            <svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
