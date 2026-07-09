"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Prev/next pagination that writes `?page=` to the URL. Server-component pages
 * read the page from searchParams, so a URL change re-renders with the new page.
 */
export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  if (total === 0) return null;

  const goTo = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(Math.max(1, Math.min(totalPages, nextPage))));
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-3 mt-4">
      <p className="text-xs text-foreground-dimmer">
        Showing <span className="text-foreground font-medium">{from}</span>–
        <span className="text-foreground font-medium">{to}</span> of{" "}
        <span className="text-foreground font-medium">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={cn(
            "inline-flex items-center justify-center h-8 w-8 rounded-md border border-border-faint",
            page <= 1
              ? "text-foreground-dimmer opacity-50 cursor-not-allowed"
              : "text-foreground hover:bg-background-base",
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs text-foreground-dimmer px-2 tabular-nums">
          {page} / {Math.max(1, totalPages)}
        </span>
        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
          className={cn(
            "inline-flex items-center justify-center h-8 w-8 rounded-md border border-border-faint",
            page >= totalPages
              ? "text-foreground-dimmer opacity-50 cursor-not-allowed"
              : "text-foreground hover:bg-background-base",
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}