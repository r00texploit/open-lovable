"use client";

import { Power } from "lucide-react";
import { ConfirmAction } from "@/components/admin/confirm-action";

export function SandboxActions({ sessionId }: { sessionId: string }) {
  return (
    <ConfirmAction
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          aria-haspopup="dialog"
          className="btn btn-ghost text-xs inline-flex items-center gap-1.5 text-red-600 hover:bg-red-50"
        >
          <Power className="h-3.5 w-3.5" />
          Kill
        </button>
      )}
      title="Kill this sandbox?"
      description="The sandbox process will be terminated and the session marked as killed. The user will need to restart it to continue editing."
      confirmLabel="Kill sandbox"
      destructive
      successMessage="Sandbox killed"
      onConfirm={() =>
        fetch(`/api/admin/sandboxes/${sessionId}`, { method: "POST" })
      }
    />
  );
}