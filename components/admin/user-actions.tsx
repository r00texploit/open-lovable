"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RotateCcw, Save } from "lucide-react";
import type { SubscriptionTier } from "@/lib/stripe/stripe";
import { cn } from "@/lib/utils";

const TIERS: SubscriptionTier[] = ["free", "pro", "plus", "team"];

/**
 * Admin panel to change a user's subscription tier and adjust their token usage.
 * Mutations go to PATCH /api/admin/users/[id]; on success the route refreshes.
 */
export function UserActions({
  userId,
  currentTier,
  usageUsed,
  usageLimit,
}: {
  userId: string;
  currentTier: string;
  usageUsed: number;
  usageLimit: number;
}) {
  const router = useRouter();
  const [tier, setTier] = useState(currentTier || "free");
  const [limit, setLimit] = useState(String(usageLimit ?? 0));
  const [savingTier, startSaveTier] = useTransition();
  const [savingUsage, startSaveUsage] = useTransition();

  const saveTier = () => {
    startSaveTier(async () => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setTier", tier }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d?.error || "Failed to update tier");
        return;
      }
      toast.success(`Tier set to ${tier}`);
      router.refresh();
    });
  };

  const saveUsage = () => {
    const parsed = Number(limit);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("Limit must be a non-negative number");
      return;
    }
    startSaveUsage(async () => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setLimit", limit: parsed }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d?.error || "Failed to update usage limit");
        return;
      }
      toast.success("Token limit updated");
      router.refresh();
    });
  };

  const resetUsage = () => {
    startSaveUsage(async () => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resetUsage" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d?.error || "Failed to reset usage");
        return;
      }
      toast.success("Token usage reset to 0");
      router.refresh();
    });
  };

  return (
    <div className="bg-background-lighter rounded-2xl border border-border-faint p-5 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Manage user</h2>
        <p className="text-xs text-foreground-dimmer mt-0.5">Change plan or adjust the monthly token quota.</p>
      </div>

      {/* Tier */}
      <div className="space-y-2">
        <label htmlFor="tier" className="text-xs font-medium text-foreground-dimmer">Subscription tier</label>
        <div className="flex items-center gap-2">
          <select
            id="tier"
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="flex-1 rounded-lg border border-border-faint bg-background-base px-3 py-2 text-sm text-foreground focus:outline-none focus:border-heat-40 focus:ring-1 focus:ring-heat-40"
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={saveTier}
            disabled={savingTier || tier === currentTier}
            className="btn btn-primary text-xs inline-flex items-center gap-1.5"
          >
            {savingTier ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
      </div>

      {/* Usage limit */}
      <div className="space-y-2">
        <label htmlFor="limit" className="text-xs font-medium text-foreground-dimmer">Monthly token limit</label>
        <div className="flex items-center gap-2">
          <input
            id="limit"
            type="number"
            min={0}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="flex-1 rounded-lg border border-border-faint bg-background-base px-3 py-2 text-sm text-foreground focus:outline-none focus:border-heat-40 focus:ring-1 focus:ring-heat-40 tabular-nums"
          />
          <button
            type="button"
            onClick={saveUsage}
            disabled={savingUsage}
            className="btn btn-secondary-light-light text-xs inline-flex items-center gap-1.5"
          >
            {savingUsage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
        <button
          type="button"
          onClick={resetUsage}
          disabled={savingUsage}
          className={cn("btn btn-ghost text-xs inline-flex items-center gap-1.5")}
        >
          {savingUsage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          Reset used → 0
        </button>
      </div>
    </div>
  );
}