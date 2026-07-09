import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "default" | "accent" | "success";
}) {
  return (
    <div className="bg-background-lighter rounded-2xl border border-border-faint p-5 flex items-start gap-4">
      {Icon && (
        <div
          className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
            tone === "accent" && "bg-heat-8",
            tone === "success" && "bg-accent-forest/10",
            tone === "default" && "bg-background-base",
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              tone === "accent" && "text-heat-100",
              tone === "success" && "text-accent-forest",
              tone === "default" && "text-foreground-dimmer",
            )}
          />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-foreground-dimmer">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{value}</p>
        {hint && <p className="text-xs text-foreground-dimmer mt-1">{hint}</p>}
      </div>
    </div>
  );
}