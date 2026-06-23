'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const sizeClasses = {
    sm: 'py-8 px-4',
    md: 'py-12 px-6',
    lg: 'py-16 px-8',
  };

  const iconSizes = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeClasses[size],
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            'mb-4 text-gray-400 dark:text-gray-600',
            iconSizes[size]
          )}
        >
          {icon}
        </div>
      )}

      <h3
        className={cn(
          'font-semibold text-gray-900 dark:text-gray-100',
          size === 'sm' ? 'text-base' : size === 'md' ? 'text-lg' : 'text-xl'
        )}
      >
        {title}
      </h3>

      {description && (
        <p
          className={cn(
            'mt-2 text-gray-500 dark:text-gray-400',
            size === 'sm' ? 'text-sm' : 'text-base'
          )}
        >
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="mt-6 flex gap-3">
          {action && (
            <Button onClick={action.onClick}>
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Preset empty states for common scenarios
export function NoSandboxEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4M6 21h12" />
        </svg>
      }
      title="No active sandbox"
      description="Create a sandbox to start building and previewing your React app"
      action={{ label: 'Create Sandbox', onClick: onCreate }}
    />
  );
}

export function NoFilesEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      }
      title="No files yet"
      description="Start by creating a new file or generating code from a prompt"
      action={{ label: 'Create File', onClick: onCreate }}
    />
  );
}

export function NoConversationEmpty({ onStart }: { onStart: () => void }) {
  return (
    <EmptyState
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      }
      title="Start a conversation"
      description="Describe what you want to build or ask for changes to your code"
      action={{ label: 'Start Chat', onClick: onStart }}
      size="sm"
    />
  );
}

export function ErrorEmpty({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <EmptyState
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      }
      title="Something went wrong"
      description={error}
      action={{ label: 'Try Again', onClick: onRetry }}
    />
  );
}

export function LoadingEmpty({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin" />
      <p className="mt-4 text-sm text-gray-500">{message}</p>
    </div>
  );
}
