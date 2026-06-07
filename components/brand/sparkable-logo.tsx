import Image from "next/image";

type SparkableLogoProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
  variant?: "light" | "dark";
};

export function SparkableLogo({
  className = "",
  iconClassName = "h-[40px] w-[40px]",
  textClassName = "",
  showText = true,
  variant = "dark",
}: SparkableLogoProps) {
  const iconSrc =
    variant === "light"
      ? "/brand/sparkable-icon-light.png"
      : "/brand/sparkable-icon-app.png";

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <Image
        src={iconSrc}
        alt=""
        width={96}
        height={96}
        className={`shrink-0 rounded-[20%] object-cover ${iconClassName}`}
        priority
      />
      {showText ? (
        <span className={`font-semibold tracking-[-0.02em] ${textClassName}`}>
          Sparkable
        </span>
      ) : null}
    </span>
  );
}
