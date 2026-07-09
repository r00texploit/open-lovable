"use client";

import { RefreshCw, Ban, XCircle, RotateCcw } from "lucide-react";
import { ActionButton } from "@/components/admin/action-button";
import { ConfirmAction } from "@/components/admin/confirm-action";

/**
 * Row-level actions for a subscription in the admin table. Stripe-backed
 * actions only render when the subscription has a Stripe subscription id.
 */
export function SubscriptionActions({
  subscriptionId,
  status,
  cancelAtPeriodEnd,
  hasStripeId,
}: {
  subscriptionId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  hasStripeId: boolean;
}) {
  if (!hasStripeId) {
    return <span className="text-xs text-foreground-dimmer">No Stripe sub</span>;
  }

  const cancellable = ["active", "trialing", "past_due", "unpaid"].includes(status);

  return (
    <div className="flex items-center justify-end gap-1">
      <ActionButton
        endpoint={`/api/admin/subscriptions/${subscriptionId}`}
        method="PATCH"
        body={{ action: "sync" }}
        label="Sync"
        icon={RefreshCw}
        variant="ghost"
        successMessage="Synced from Stripe"
      />

      {cancelAtPeriodEnd ? (
        <>
          <ActionButton
            endpoint={`/api/admin/subscriptions/${subscriptionId}`}
            method="PATCH"
            body={{ action: "uncancel" }}
            label="Uncancel"
            icon={RotateCcw}
            variant="ghost"
            successMessage="Cancellation reversed"
          />
          <ConfirmAction
            trigger={(open) => (
              <button
                type="button"
                onClick={open}
                aria-haspopup="dialog"
                className="btn btn-ghost text-xs inline-flex items-center gap-1.5 text-red-600 hover:bg-red-50"
              >
                <Ban className="h-3.5 w-3.5" />
                Cancel now
              </button>
            )}
            title="Cancel this subscription immediately?"
            description="The subscription will be canceled in Stripe right now, the user's plan reverts to Free, and access ends immediately. This cannot be undone."
            confirmLabel="Cancel immediately"
            destructive
            successMessage="Subscription canceled"
            onConfirm={() =>
              fetch(`/api/admin/subscriptions/${subscriptionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "cancel", immediately: true }),
              })
            }
          />
        </>
      ) : cancellable ? (
        <>
          <ConfirmAction
            trigger={(open) => (
              <button
                type="button"
                onClick={open}
                aria-haspopup="dialog"
                className="btn btn-ghost text-xs inline-flex items-center gap-1.5 text-red-600 hover:bg-red-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </button>
            )}
            title="Schedule cancellation at period end?"
            description="The subscription will remain active until the current period ends, then cancel automatically. You can reverse this with Uncancel until then."
            confirmLabel="Schedule cancel"
            destructive
            successMessage="Cancellation scheduled"
            onConfirm={() =>
              fetch(`/api/admin/subscriptions/${subscriptionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "cancel", immediately: false }),
              })
            }
          />
          <ConfirmAction
            trigger={(open) => (
              <button
                type="button"
                onClick={open}
                aria-haspopup="dialog"
                className="btn btn-ghost text-xs inline-flex items-center gap-1.5 text-red-600 hover:bg-red-50"
              >
                <Ban className="h-3.5 w-3.5" />
                Now
              </button>
            )}
            title="Cancel this subscription immediately?"
            description="The subscription will be canceled in Stripe right now, the user's plan reverts to Free, and access ends immediately. This cannot be undone."
            confirmLabel="Cancel immediately"
            destructive
            successMessage="Subscription canceled"
            onConfirm={() =>
              fetch(`/api/admin/subscriptions/${subscriptionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "cancel", immediately: true }),
              })
            }
          />
        </>
      ) : null}
    </div>
  );
}