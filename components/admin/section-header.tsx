import { ReactNode } from "react";

export function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-foreground-dimmer mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}