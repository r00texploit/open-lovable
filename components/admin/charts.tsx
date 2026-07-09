import { cn } from "@/lib/utils";

export type DayPoint = { date: string; count: number };

/**
 * Lightweight inline SVG bar chart for a small time series (e.g. last 30 days).
 * No external chart library — keeps the admin bundle lean and matches the
 * Fire design system palette.
 */
export function MiniBarChart({
  data,
  className,
  barClassName = "fill-heat-100",
}: {
  data: DayPoint[];
  className?: string;
  barClassName?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const width = 100; // viewBox units; scales responsively
  const gap = 1;
  const barWidth = data.length > 0 ? (width - gap * (data.length - 1)) / data.length : width;

  return (
    <div className={cn("w-full", className)}>
      <svg
        viewBox={`0 0 ${width} 28`}
        preserveAspectRatio="none"
        className="w-full h-16"
        role="img"
        aria-label="Signups over the last 30 days"
      >
        {data.map((d, i) => {
          const h = (d.count / max) * 26;
          const x = i * (barWidth + gap);
          return (
            <rect
              key={d.date}
              x={x}
              y={28 - h}
              width={Math.max(0.6, barWidth)}
              height={Math.max(0.4, h)}
              rx={0.6}
              className={d.count === 0 ? "fill-border-muted" : barClassName}
            >
              <title>{`${d.date}: ${d.count}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-foreground-dimmer mt-1">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}