import Image from "next/image";

type NoeronLogoProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
  variant?: "light" | "dark";
};

export function NoeronLogo({
  className = "",
  iconClassName = "h-[40px] w-[40px]",
  textClassName = "",
  showText = true,
  variant = "dark",
}: NoeronLogoProps) {
  const iconSrc =
    variant === "light"
      ? "/brand/noeron-icon-light.png"
      : "/brand/noeron-icon.png";

  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <Image
        src={iconSrc}
        alt="Noeron"
        width={96}
        height={96}
        className={`shrink-0 rounded-[20%] object-cover ${iconClassName}`}
        priority
      />
      {showText ? (
        <span className={`font-semibold tracking-[-0.02em] ${textClassName}`}>
          Noeron
        </span>
      ) : null}
    </span>
  );
}
