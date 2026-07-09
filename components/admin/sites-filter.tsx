"use client";

import { useRouter, useSearchParams } from "next/navigation";

/**
 * Segmented filter for site published state (All / Published / Drafts).
 * Syncs to the `published` URL search param so the server-component page
 * re-renders with the filtered set.
 */
export function SitesFilter({ current }: { current: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  const update = (v: string) => {
    const params = new URLSearchParams(sp.toString());
    if (v === "all") params.delete("published");
    else params.set("published", v);
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };

  const opts: { value: string; label: string }[] = [
    { value: "all", label: "All" },
    { value: "true", label: "Published" },
    { value: "false", label: "Drafts" },
  ];
  const active = ["", "all"].includes(current) ? "all" : current;

  return (
    <div role="group" aria-label="Filter sites by status" className="inline-flex rounded-lg border border-border-faint bg-background-lighter p-0.5">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={active === o.value}
          onClick={() => update(o.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            active === o.value ? "bg-heat-8 text-heat-100" : "text-foreground-dimmer hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}