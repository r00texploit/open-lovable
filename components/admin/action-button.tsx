"use client";

import { ReactNode, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Generic client-side mutation button for admin actions. Calls the given
 * endpoint with JSON, toasts the result, and refreshes the server-component
 * route so the table/page re-renders with fresh data.
 */
export function ActionButton({
  endpoint,
  method = "POST",
  body,
  label,
  icon: Icon,
  variant = "ghost",
  destructive = false,
  confirm,
  successMessage = "Done",
  className,
  disabled,
}: {
  endpoint: string;
  method?: string;
  body?: unknown;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "ghost" | "primary" | "secondary";
  destructive?: boolean;
  confirm?: boolean;
  successMessage?: string;
  className?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      try {
        const res = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `Request failed (${res.status})`);
        }
        toast.success(successMessage);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Request failed");
      }
    });
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending || disabled}
      className={cn(
        "btn text-xs inline-flex items-center gap-1.5",
        variant === "primary" && "btn-primary",
        variant === "secondary" && "btn-secondary-light-light",
        variant === "ghost" && "btn-ghost",
        destructive && "text-red-600 hover:bg-red-50",
        className,
      )}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {label}
    </button>
  );
}