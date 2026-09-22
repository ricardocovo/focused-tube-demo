import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer${className ? ` ${className}` : ''}`}
      style={style}
    />
  );
}
