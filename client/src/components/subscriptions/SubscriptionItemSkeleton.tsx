import Skeleton from '../ui/Skeleton';
import './SubscriptionItemSkeleton.css';

export default function SubscriptionItemSkeleton() {
  return (
    <div className="sub-item-skeleton">
      {/* Avatar circle */}
      <Skeleton className="sub-item-skeleton-avatar" />

      {/* Text lines */}
      <div className="sub-item-skeleton-text">
        <Skeleton className="sub-item-skeleton-title" />
        <Skeleton className="sub-item-skeleton-desc" />
      </div>

      {/* Button placeholder */}
      <Skeleton className="sub-item-skeleton-btn" />
    </div>
  );
}
