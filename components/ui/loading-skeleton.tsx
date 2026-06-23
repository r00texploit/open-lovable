'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  animate?: boolean;
}

export function Skeleton({
  className,
  width,
  height,
  circle = false,
  animate = true,
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-800',
        animate && 'animate-pulse',
        circle && 'rounded-full',
        !circle && 'rounded-md',
        className
      )}
      style={{
        width: width,
        height: height,
      }}
    />
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      <Skeleton width="100%" height={200} className="rounded-lg" />
      <Skeleton width="80%" height={24} />
      <Skeleton width="60%" height={16} />
      <Skeleton width="40%" height={16} />
    </div>
  );
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height={16}
        />
      ))}
    </div>
  );
}

export function ChatMessageSkeleton() {
  return (
    <div className="flex gap-3 p-4">
      <Skeleton width={40} height={40} circle />
      <div className="flex-1 space-y-2">
        <Skeleton width={100} height={16} />
        <TextSkeleton lines={2} />
      </div>
    </div>
  );
}

export function CodeEditorSkeleton() {
  return (
    <div className="space-y-2 p-4">
      <div className="flex gap-2">
        <Skeleton width={80} height={24} />
        <Skeleton width={120} height={24} />
        <Skeleton width={100} height={24} />
      </div>
      <div className="space-y-1">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="flex gap-2">
            <Skeleton width={30} height={16} />
            <Skeleton width={`${Math.random() * 40 + 60}%`} height={16} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PreviewSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton width="100%" height={60} className="rounded-lg" />
      <div className="flex gap-4">
        <Skeleton width="60%" height={200} className="rounded-lg" />
        <Skeleton width="40%" height={200} className="rounded-lg" />
      </div>
      <Skeleton width="100%" height={100} className="rounded-lg" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={80} height={36} className="rounded-full" />
        ))}
      </div>
    </div>
  );
}

export function BuilderSkeleton() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-800 p-4 space-y-4">
        <Skeleton width="80%" height={32} />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={28} />
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-14 border-b border-gray-800 px-4 flex items-center gap-2">
          <Skeleton width={100} height={32} />
          <Skeleton width={80} height={32} />
          <div className="flex-1" />
          <Skeleton width={120} height={32} />
        </div>

        {/* Split view */}
        <div className="flex-1 flex">
          <div className="flex-1 border-r border-gray-800">
            <CodeEditorSkeleton />
          </div>
          <div className="flex-1">
            <PreviewSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
