// Custom abstract shapes for hero - NOT stock imagery
// These are SVG-based, on-brand, and feel commissioned

export function HeroGlow() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Primary orange glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-orange-500/20 rounded-full blur-[120px]" />

      {/* Secondary violet glow */}
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-violet-500/15 rounded-full blur-[100px]" />

      {/* Tertiary glow */}
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-orange-400/10 rounded-full blur-[80px]" />
    </div>
  );
}

export function GridPattern() {
  return (
    <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
      <div
        className="w-full h-full"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "100px 100px",
        }}
      />
    </div>
  );
}

export function FloatingOrb({
  className,
  color = "orange",
}: {
  className?: string;
  color?: "orange" | "violet" | "amber";
}) {
  const colorClasses = {
    orange: "bg-orange-500/30",
    violet: "bg-violet-500/30",
    amber: "bg-amber-500/30",
  };

  return (
    <div
      className={`absolute rounded-full blur-3xl ${colorClasses[color]} ${className}`}
    />
  );
}

export function GradientLine({ className }: { className?: string }) {
  return (
    <div
      className={`h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent ${className}`}
    />
  );
}

export function AnimatedGradient() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,103,40,0.15), transparent),
            radial-gradient(ellipse 60% 40% at 80% 50%, rgba(139,92,246,0.1), transparent)
          `,
        }}
      />
    </div>
  );
}

// Decorative accent line
export function AccentLine({ direction = "horizontal" }: { direction?: "horizontal" | "vertical" }) {
  if (direction === "vertical") {
    return (
      <div className="w-px h-24 bg-gradient-to-b from-transparent via-orange-500/50 to-transparent" />
    );
  }
  return (
    <div className="h-px w-24 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
  );
}

// Noise texture overlay for depth
export function NoiseTexture() {
  return (
    <div
      className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}
