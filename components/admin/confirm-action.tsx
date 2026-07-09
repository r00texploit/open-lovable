"use client";

import { ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/shadcn/dialog";
import { cn } from "@/lib/utils";

/**
 * Confirmation dialog wrapping a destructive/admin mutation. On confirm, calls
 * `onConfirm` (a server-refreshable fetch), shows a toast, and refreshes the
 * route so the server-component table re-renders.
 */
export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  successMessage = "Done",
}: {
  trigger: (open: () => void) => ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<Response>;
  successMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        const res = await onConfirm();
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `Request failed (${res.status})`);
        }
        toast.success(successMessage);
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Request failed");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger(() => setOpen(true))}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <button type="button" className="btn btn-ghost text-sm" disabled={pending}>
              {cancelLabel}
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            className={cn(
              "btn text-sm inline-flex items-center gap-2",
              destructive ? "btn-primary" : "btn-secondary-light-light",
            )}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}