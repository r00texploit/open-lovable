type NoeronLogoProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
  variant?: "light" | "dark";
};

function NoeronIcon({ className = "", variant = "dark" }: { className?: string; variant?: "light" | "dark" }) {
  const isLight = variant === "light";
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background circle */}
      <rect width="100" height="100" rx="22" fill={isLight ? "#f0f4ff" : "#0a1628"} />
      {/* Arc */}
      <path
        d="M 22 38 A 32 32 0 0 1 78 38"
        stroke={isLight ? "#3a5aad" : "#4a7fd4"}
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Star / compass shape */}
      <path
        d="M50 18 L53 44 L76 50 L53 56 L50 82 L47 56 L24 50 L47 44 Z"
        fill="url(#noeronGrad)"
      />
      {/* Center glow */}
      <circle cx="50" cy="50" r="5" fill="white" opacity="0.9" />
      {/* Wing left */}
      <path d="M36 56 L44 50 L36 44 L30 50 Z" fill={isLight ? "#1a2f5e" : "#1a3060"} opacity="0.85" />
      {/* Wing right */}
      <path d="M64 44 L56 50 L64 56 L70 50 Z" fill={isLight ? "#1a2f5e" : "#1a3060"} opacity="0.85" />
      <defs>
        <linearGradient id="noeronGrad" x1="50" y1="18" x2="50" y2="82" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isLight ? "#2a4db5" : "#2a6dd9"} />
          <stop offset="50%" stopColor={isLight ? "#4169e1" : "#4a90f5"} />
          <stop offset="100%" stopColor={isLight ? "#1a2f5e" : "#1a3060"} />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function NoeronLogo({
  className = "",
  iconClassName = "h-[40px] w-[40px]",
  textClassName = "",
  showText = true,
  variant = "dark",
}: NoeronLogoProps) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <NoeronIcon className={`shrink-0 ${iconClassName}`} variant={variant} />
      {showText ? (
        <span className={`font-semibold tracking-[-0.02em] ${textClassName}`}>
          Noeron
        </span>
      ) : null}
    </span>
  );
}
