"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * Segmented filters for the subscriptions table: tier and status. Each writes
 * to a URL search param so the server-component page re-renders with the
 * filtered set.
 */
export function SubscriptionsFilter({
  currentTier,
  currentStatus,
}: {
  currentTier: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const update = (key: string, value: string) => {
    const params = new URLSearchParams(sp.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };

  const tiers: { value: string; label: string }[] = [
    { value: "all", label: "All" },
    { value: "free", label: "Free" },
    { value: "pro", label: "Pro" },
    { value: "plus", label: "Plus" },
    { value: "team", label: "Team" },
  ];
  const statuses: { value: string; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "trialing", label: "Trialing" },
    { value: "past_due", label: "Past due" },
    { value: "canceled", label: "Canceled" },
  ];

  const activeTier = ["", "all"].includes(currentTier) ? "all" : currentTier;
  const activeStatus = ["", "all"].includes(currentStatus) ? "all" : currentStatus;

  const Segmented = ({
    label,
    options,
    value,
    param,
  }: {
    label: string;
    options: { value: string; label: string }[];
    value: string;
    param: string;
  }) => (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border border-border-faint bg-background-lighter p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => update(param, o.value)}
          className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            value === o.value ? "bg-heat-8 text-heat-100" : "text-foreground-dimmer hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Segmented label="Filter by tier" options={tiers} value={activeTier} param="tier" />
      <Segmented label="Filter by status" options={statuses} value={activeStatus} param="status" />
    </div>
  );
}