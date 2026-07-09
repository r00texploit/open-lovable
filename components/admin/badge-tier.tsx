import { cn } from "@/lib/utils";
import { getTierDisplayName, getTierColor } from "@/lib/stripe/subscription-display";
import type { SubscriptionTier } from "@/lib/stripe/stripe";

export function BadgeTier({ tier, className }: { tier: string; className?: string }) {
  const t = (tier || "free") as SubscriptionTier;
  const name = getTierDisplayName(t);
  const color = getTierColor(t);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        color.bg,
        color.border,
        color.text,
        className,
      )}
    >
      {name}
    </span>
  );
}

export function BadgeStatus({ status, className }: { status: string; className?: string }) {
  const tone =
    status === "active" || status === "trialing"
      ? "bg-accent-forest/10 text-accent-forest border-accent-forest/20"
      : status === "past_due" || status === "unpaid" || status === "canceled"
        ? "bg-red-50 text-red-700 border-red-100"
        : "bg-background-base text-foreground-dimmer border-border-faint";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        tone,
        className,
      )}
    >
      {status || "unknown"}
    </span>
  );
}