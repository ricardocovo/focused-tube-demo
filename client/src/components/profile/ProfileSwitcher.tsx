import { useState, useRef, useEffect, useId, useMemo, useCallback, type KeyboardEvent } from 'react';
import { useProfiles } from '../../context/ProfileContext';
import { Link } from 'react-router-dom';
import type { CommunityProfile, Profile } from '../../types/profile';
import ProfileSwitcherSkeleton from './ProfileSwitcherSkeleton';
import './ProfileSwitcher.css';

type SwitcherOption =
  | { id: string; kind: 'owned'; profile: Profile }
  | { id: string; kind: 'followed'; profile: CommunityProfile };

export default function ProfileSwitcher() {
  const { profiles, activeProfile, setActiveProfile, isLoading, followedProfiles } = useProfiles();
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<Array<HTMLLIElement | null>>([]);
  const ownProfilesGroupLabelId = useId();
  const followedProfilesGroupLabelId = useId();
  const listboxId = useId();
  const hasAnyProfiles = profiles.length > 0 || followedProfiles.length > 0;
  const switcherOptions: SwitcherOption[] = useMemo(
    () => [
      ...profiles.map((profile) => ({ id: profile.id, kind: 'owned' as const, profile })),
      ...followedProfiles.map((profile) => ({ id: profile.id, kind: 'followed' as const, profile })),
    ],
    [profiles, followedProfiles],
  );

  const getInitialFocusedIndex = useCallback(() => {
    if (switcherOptions.length === 0) return 0;

    const activeIndex = switcherOptions.findIndex((option) => option.id === activeProfile?.id);
    return activeIndex >= 0 ? activeIndex : 0;
  }, [activeProfile?.id, switcherOptions]);

  const focusTrigger = () => {
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  const openDropdown = () => {
    setFocusedIndex(getInitialFocusedIndex());
    setOpen(true);
  };

  const closeDropdown = (returnFocus = false) => {
    setOpen(false);
    if (returnFocus) focusTrigger();
  };

  const selectOption = (index: number, returnFocus = true) => {
    const option = switcherOptions[index];
    if (!option) return;

    setActiveProfile(option.id);
    closeDropdown(returnFocus);
  };

  const moveFocus = (nextIndex: number) => {
    const optionCount = switcherOptions.length;
    if (optionCount === 0) return;

    setFocusedIndex((nextIndex + optionCount) % optionCount);
  };

  const handleOptionKeyDown = (e: KeyboardEvent<HTMLLIElement>, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveFocus(index + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveFocus(index - 1);
        break;
      case 'Home':
        e.preventDefault();
        moveFocus(0);
        break;
      case 'End':
        e.preventDefault();
        moveFocus(switcherOptions.length - 1);
        break;
      case 'Enter':
      case ' ':
      case 'Spacebar':
        e.preventDefault();
        selectOption(index);
        break;
      case 'Escape':
        e.preventDefault();
        closeDropdown(true);
        break;
    }
  };

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open && e.key === 'ArrowDown') {
      e.preventDefault();
      openDropdown();
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;

    setFocusedIndex(getInitialFocusedIndex());
  }, [open, getInitialFocusedIndex]);

  useEffect(() => {
    if (!open) return;

    optionRefs.current[focusedIndex]?.focus();
  }, [focusedIndex, open]);

  if (isLoading) {
    return <ProfileSwitcherSkeleton />;
  }

  if (!hasAnyProfiles) {
    return (
      <span className="profile-switcher-empty">
        No profiles yet —{' '}
        <Link to="/profiles" className="profile-switcher-empty-link">
          create one!
        </Link>
      </span>
    );
  }

  return (
    <div ref={ref} className="profile-switcher">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Watching ${activeProfile?.name ?? 'Select profile'} — switch profile`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        onClick={() => (open ? closeDropdown() : openDropdown())}
        onKeyDown={handleTriggerKeyDown}
        className="profile-switcher-trigger"
      >
        <span className="profile-switcher-trigger-label">Watching</span>
        <span className="profile-switcher-trigger-value">{activeProfile?.name ?? 'Select profile'}</span>
        <span aria-hidden="true" className="profile-switcher-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <ul
          id={listboxId}
          ref={listboxRef}
          role="listbox"
          aria-label="Select profile"
          tabIndex={-1}
          className="profile-switcher-dropdown"
        >
          {profiles.length > 0 && (
            <li role="presentation" className="profile-switcher-section">
              <span id={ownProfilesGroupLabelId} className="profile-switcher-group-label">Your profiles</span>
              <ul role="group" aria-labelledby={ownProfilesGroupLabelId} className="profile-switcher-section-options">
                {profiles.map((p, profileIndex) => {
                  const optionIndex = profileIndex;
                  const isActive = p.id === activeProfile?.id;
                  const isFocused = focusedIndex === optionIndex;

                  return (
                    <li
                      role="option"
                      aria-selected={isActive}
                      tabIndex={isFocused ? 0 : -1}
                      key={p.id}
                      ref={(element) => {
                        optionRefs.current[optionIndex] = element;
                      }}
                      onClick={() => selectOption(optionIndex)}
                      onKeyDown={(e) => handleOptionKeyDown(e, optionIndex)}
                      className={`profile-switcher-option${isActive ? ' profile-switcher-option--active' : ''}`}
                    >
                      <span className="profile-switcher-option-name">{p.name}</span>
                      &nbsp;&nbsp;<span className={`profile-switcher-visibility-badge${p.isPublic ? ' profile-switcher-visibility-badge--public' : ''}`}>
                        {p.isPublic ? 'Public' : 'Private'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </li>
          )}

          {followedProfiles.length > 0 && (
            <>
              {profiles.length > 0 && <li className="profile-switcher-divider" role="separator" aria-hidden="true" />}
              <li role="presentation" className="profile-switcher-section">
                <span id={followedProfilesGroupLabelId} className="profile-switcher-group-label">Community profiles you follow</span>
                <ul role="group" aria-labelledby={followedProfilesGroupLabelId} className="profile-switcher-section-options">
                  {followedProfiles.map((p, followedIndex) => {
                    const optionIndex = profiles.length + followedIndex;
                    const isActive = p.id === activeProfile?.id;
                    const isFocused = focusedIndex === optionIndex;

                    return (
                      <li
                        role="option"
                        aria-selected={isActive}
                        tabIndex={isFocused ? 0 : -1}
                        key={p.id}
                        ref={(element) => {
                          optionRefs.current[optionIndex] = element;
                        }}
                        onClick={() => selectOption(optionIndex)}
                        onKeyDown={(e) => handleOptionKeyDown(e, optionIndex)}
                        className={`profile-switcher-option profile-switcher-option--followed${isActive ? ' profile-switcher-option--active' : ''}`}
                      >
                        <span className="profile-switcher-option-main">
                          <span className="profile-switcher-followed-info">
                            <span className="profile-switcher-followed-name">{p.name}</span>
                            <span className="profile-switcher-followed-owner">by {p.user.name}</span>
                          </span>
                          &nbsp;&nbsp;<span className="profile-switcher-followed-state">Following</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            </>
          )}
        </ul>
      )}
    </div>
  );
}
