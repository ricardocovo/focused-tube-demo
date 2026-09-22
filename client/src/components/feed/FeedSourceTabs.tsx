import React, { useRef } from 'react';

interface Tab {
  label: string;
  value: string | undefined;
}

const TABS: Tab[] = [
  { label: 'All', value: undefined },
  { label: 'Subscriptions', value: 'subscriptions' },
  // { label: 'Search', value: 'search' }, // Hidden: search UI disabled
];

interface FeedSourceTabsProps {
  activeSource: string | undefined;
  onSourceChange: (source?: string) => void;
}

const FeedSourceTabs: React.FC<FeedSourceTabsProps> = ({ activeSource, onSourceChange }) => {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rawSelectedTabIndex = TABS.findIndex((tab) => tab.value === activeSource);
  const selectedTabIndex = rawSelectedTabIndex >= 0 ? rawSelectedTabIndex : 0;

  const moveFocus = (index: number) => {
    tabRefs.current[index]?.focus();
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const lastIndex = TABS.length - 1;

    switch (event.key) {
      case 'ArrowRight':
        moveFocus(index === lastIndex ? 0 : index + 1);
        break;
      case 'ArrowLeft':
        moveFocus(index === 0 ? lastIndex : index - 1);
        break;
      case 'Home':
        moveFocus(0);
        break;
      case 'End':
        moveFocus(lastIndex);
        break;
    }
  };

  return (
    <div className="feed-tabs" role="tablist" aria-label="Feed source">
      {TABS.map((tab, index) => {
        const isActive = index === selectedTabIndex;
        return (
          <button
            key={tab.label}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`feed-tab-${index}`}
            tabIndex={index === selectedTabIndex ? 0 : -1}
            aria-selected={isActive}
            aria-controls="feed-tabpanel"
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            onClick={() => onSourceChange(tab.value)}
            className={`feed-tab${isActive ? ' feed-tab-active' : ''}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default FeedSourceTabs;
