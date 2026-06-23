'use client';

import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  Terminal,
  Bug,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function successToast(message: string, options?: ToastOptions) {
  toast.success(message, {
    icon: <CheckCircle className="w-5 h-5 text-green-500" />,
    description: options?.description,
    duration: options?.duration || 4000,
    action: options?.action,
  });
}

export function errorToast(message: string, options?: ToastOptions) {
  toast.error(message, {
    icon: <XCircle className="w-5 h-5 text-red-500" />,
    description: options?.description,
    duration: options?.duration || 6000,
    action: options?.action,
  });
}

export function warningToast(message: string, options?: ToastOptions) {
  toast.warning(message, {
    icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    description: options?.description,
    duration: options?.duration || 5000,
    action: options?.action,
  });
}

export function infoToast(message: string, options?: ToastOptions) {
  toast.info(message, {
    icon: <Info className="w-5 h-5 text-blue-500" />,
    description: options?.description,
    duration: options?.duration || 4000,
    action: options?.action,
  });
}

export function loadingToast(message: string, promiseId?: string | number) {
  return toast.loading(message, {
    icon: <Loader2 className="w-5 h-5 animate-spin text-blue-500" />,
    id: promiseId,
    duration: Infinity,
  });
}

export function dismissToast(id?: string | number) {
  toast.dismiss(id);
}

export function promiseToast<T>(
  promise: Promise<T>,
  {
    loading,
    success,
    error,
  }: {
    loading: string;
    success: (data: T) => string;
    error: (err: Error) => string;
  }
) {
  const toastId = loadingToast(loading);

  promise
    .then((data) => {
      dismissToast(toastId);
      successToast(success(data));
      return data;
    })
    .catch((err) => {
      dismissToast(toastId);
      errorToast(error(err instanceof Error ? err : new Error(String(err))));
      throw err;
    });

  return promise;
}

export function sandboxToast(message: string, options?: ToastOptions) {
  toast(message, {
    icon: <Terminal className="w-5 h-5 text-purple-500" />,
    description: options?.description,
    duration: options?.duration || 5000,
    className: cn(
      'border-purple-500/20',
      'bg-purple-50 dark:bg-purple-950/20'
    ),
    action: options?.action,
  });
}

export function debugToast(message: string, data?: unknown) {
  if (process.env.NODE_ENV === 'development') {
    toast(message, {
      icon: <Bug className="w-5 h-5 text-orange-500" />,
      description: data ? JSON.stringify(data, null, 2).slice(0, 200) : undefined,
      duration: 8000,
      className: cn(
        'border-orange-500/20',
        'bg-orange-50 dark:bg-orange-950/20'
      ),
    });
  }
}

export function aiToast(message: string, options?: ToastOptions) {
  toast(message, {
    icon: <Zap className="w-5 h-5 text-yellow-500" />,
    description: options?.description,
    duration: options?.duration || 4000,
    className: cn(
      'border-yellow-500/20',
      'bg-yellow-50 dark:bg-yellow-950/20'
    ),
    action: options?.action,
  });
}

// Preset toasts for common operations
export const sandboxToasts = {
  creating: () => loadingToast('Creating sandbox...'),
  ready: (url: string) => sandboxToast('Sandbox ready!', {
    description: url,
  }),
  error: (error: string) => errorToast('Sandbox creation failed', {
    description: error,
  }),
  timeout: () => warningToast('Sandbox timed out', {
    description: 'Creating a new sandbox...',
  }),
};

export const generationToasts = {
  starting: () => loadingToast('Starting generation...'),
  analyzing: () => loadingToast('Analyzing website...'),
  generating: () => loadingToast('Generating code...'),
  complete: () => successToast('Generation complete!'),
  error: (msg: string) => errorToast('Generation failed', {
    description: msg,
  }),
};

export const fileToasts = {
  saving: () => loadingToast('Saving changes...'),
  saved: () => successToast('Changes saved'),
  error: () => errorToast('Failed to save changes'),
  creating: (name: string) => loadingToast(`Creating ${name}...`),
  created: (name: string) => successToast(`${name} created`),
};
