import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Column<T> = {
  key: string;
  header: ReactNode;
  className?: string;
  cell: (row: T) => ReactNode;
};

export function AdminTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  actions,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty?: ReactNode;
  actions?: (row: T) => ReactNode;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-muted bg-background-lighter py-16 text-center">
        {empty ?? <p className="text-sm text-foreground-dimmer">No results found.</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border-faint bg-background-lighter overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-faint bg-background-base">
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground-dimmer whitespace-nowrap",
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
              {actions && <th scope="col" className="px-4 py-3 w-0" aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-border-faint last:border-0 hover:bg-background-base/60 transition-colors"
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 align-middle text-foreground", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-right whitespace-nowrap">{actions(row)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TableLoadingSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-2xl border border-border-faint bg-background-lighter overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-faint bg-background-base">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-3 w-20 rounded bg-background-base" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} className="border-b border-border-faint last:border-0">
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="px-4 py-3.5">
                    <div className="h-3 w-full max-w-[180px] rounded bg-background-base animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}