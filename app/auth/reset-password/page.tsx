'use client';

import { Suspense } from 'react';
import { ResetPasswordContent } from './reset-password-content';

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md mx-auto p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-warm-100/10 rounded w-3/4 mx-auto" />
          <div className="h-4 bg-warm-100/10 rounded w-1/2 mx-auto" />
          <div className="space-y-2 pt-4">
            <div className="h-12 bg-warm-100/10 rounded" />
            <div className="h-12 bg-warm-100/10 rounded" />
          </div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
