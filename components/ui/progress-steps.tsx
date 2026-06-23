'use client';

import { Check, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: string;
  label: string;
  description?: string;
}

interface ProgressStepsProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                    isCompleted && 'bg-green-500 text-white',
                    isCurrent && 'bg-blue-500 text-white ring-4 ring-blue-200 dark:ring-blue-900',
                    isPending && 'bg-gray-200 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                  )}
                >
                  {isCompleted && <Check className="w-5 h-5" />}
                  {isCurrent && <Loader2 className="w-5 h-5 animate-spin" />}
                  {isPending && <Circle className="w-5 h-5" />}
                </div>

                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      'text-sm font-medium transition-colors',
                      isCompleted && 'text-green-600 dark:text-green-400',
                      isCurrent && 'text-blue-600 dark:text-blue-400',
                      isPending && 'text-gray-400 dark:text-gray-600'
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-gray-500 mt-1 max-w-[120px]">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-full h-1 mx-4 transition-all duration-500',
                    index < currentStep
                      ? 'bg-green-500'
                      : 'bg-gray-200 dark:bg-gray-800'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SimpleProgressProps {
  progress: number;
  label?: string;
  className?: string;
  showPercentage?: boolean;
}

export function SimpleProgress({
  progress,
  label,
  className,
  showPercentage = true,
}: SimpleProgressProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between mb-2">
          {label && <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>}
          {showPercentage && (
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}

      <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-out',
            clampedProgress < 30 && 'bg-red-500',
            clampedProgress >= 30 && clampedProgress < 70 && 'bg-yellow-500',
            clampedProgress >= 70 && 'bg-green-500'
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

// Preset step configurations
export const generationSteps = [
  { id: 'analyze', label: 'Analyze', description: 'Reading website content' },
  { id: 'scrape', label: 'Scrape', description: 'Extracting styles and structure' },
  { id: 'generate', label: 'Generate', description: 'Creating React components' },
  { id: 'build', label: 'Build', description: 'Setting up sandbox' },
];

export const deploymentSteps = [
  { id: 'prepare', label: 'Prepare', description: 'Packaging files' },
  { id: 'upload', label: 'Upload', description: 'Sending to server' },
  { id: 'deploy', label: 'Deploy', description: 'Setting up production' },
  { id: 'verify', label: 'Verify', description: 'Checking deployment' },
];
