"use client";

import { EyeOff, Trash2 } from "lucide-react";
import { ConfirmAction } from "@/components/admin/confirm-action";

/**
 * Row-level actions for a site in the admin sites table.
 * `published` reflects current state so the button label flips accordingly.
 */
export function SiteActions({
  siteId,
  published,
}: {
  siteId: string;
  published: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {published && (
        <ConfirmAction
          trigger={(open) => (
            <button
              type="button"
              onClick={open}
              aria-haspopup="dialog"
              className="btn btn-ghost text-xs inline-flex items-center gap-1.5"
            >
              <EyeOff className="h-3.5 w-3.5" />
              Unpublish
            </button>
          )}
          title="Force unpublish this site?"
          description="The site will immediately become unavailable at its public URL. The owner can republish it later."
          confirmLabel="Unpublish"
          destructive
          successMessage="Site unpublished"
          onConfirm={() =>
            fetch(`/api/admin/sites/${siteId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ published: false }),
            })
          }
        />
      )}
      <ConfirmAction
        trigger={(open) => (
          <button
            type="button"
            onClick={open}
            aria-haspopup="dialog"
            className="btn btn-ghost text-xs inline-flex items-center gap-1.5 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        )}
        title="Permanently delete this site?"
        description="This deletes the site and all of its assets. This cannot be undone."
        confirmLabel="Delete"
        destructive
        successMessage="Site deleted"
        onConfirm={() => fetch(`/api/admin/sites/${siteId}`, { method: "DELETE" })}
      />
    </div>
  );
}