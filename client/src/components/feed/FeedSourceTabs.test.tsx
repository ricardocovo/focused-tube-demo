import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeedSourceTabs from './FeedSourceTabs';

describe('FeedSourceTabs', () => {
  it('renders a labeled tablist with tab roles and selected state', () => {
    render(<FeedSourceTabs activeSource={undefined} onSourceChange={vi.fn()} />);

    expect(screen.getByRole('tablist', { name: 'Feed source' })).toBeInTheDocument();

    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Subscriptions' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('tabIndex', '0');
    expect(screen.getByRole('tab', { name: 'Subscriptions' })).toHaveAttribute('tabIndex', '-1');
  });

  it('changes source when a tab is clicked', async () => {
    const user = userEvent.setup();
    const onSourceChange = vi.fn();

    render(<FeedSourceTabs activeSource={undefined} onSourceChange={onSourceChange} />);

    await user.click(screen.getByRole('tab', { name: 'Subscriptions' }));
    await user.click(screen.getByRole('tab', { name: 'All' }));

    expect(onSourceChange).toHaveBeenNthCalledWith(1, 'subscriptions');
    expect(onSourceChange).toHaveBeenNthCalledWith(2, undefined);
  });

  it('moves keyboard focus with arrows and supports wrap-around', async () => {
    const user = userEvent.setup();
    const onSourceChange = vi.fn();
    render(<FeedSourceTabs activeSource={undefined} onSourceChange={onSourceChange} />);

    const allTab = screen.getByRole('tab', { name: 'All' });
    const subscriptionsTab = screen.getByRole('tab', { name: 'Subscriptions' });

    allTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(subscriptionsTab).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(allTab).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(subscriptionsTab).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(allTab).toHaveFocus();
    expect(onSourceChange).not.toHaveBeenCalled();
  });

  it('moves keyboard focus with home and end keys', async () => {
    const user = userEvent.setup();
    render(<FeedSourceTabs activeSource={undefined} onSourceChange={vi.fn()} />);

    const allTab = screen.getByRole('tab', { name: 'All' });
    const subscriptionsTab = screen.getByRole('tab', { name: 'Subscriptions' });

    allTab.focus();
    await user.keyboard('{End}');
    expect(subscriptionsTab).toHaveFocus();

    await user.keyboard('{Home}');
    expect(allTab).toHaveFocus();
  });
});
