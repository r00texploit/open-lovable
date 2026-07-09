"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Debounced search input that syncs to the `q` URL search param. Because admin
 * list pages are server components reading searchParams, updating the URL
 * triggers a server re-render — no client state needed.
 */
export function SearchInput({
  param = "q",
  placeholder = "Search…",
  className,
}: {
  param?: string;
  placeholder?: string;
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get(param) ?? "";
  const [value, setValue] = useState(current);

  // Keep local input in sync if the URL changes elsewhere (e.g. clear button).
  useEffect(() => {
    setValue(current);
  }, [current]);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(param, value);
      else params.delete(param);
      params.delete("page"); // reset to first page on new search
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    }, 350);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-dimmer pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-lg border border-border-faint bg-background-lighter pl-9 pr-9 py-2 text-sm text-foreground placeholder:text-foreground-dimmer focus:outline-none focus:border-heat-40 focus:ring-1 focus:ring-heat-40"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-foreground-dimmer hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}