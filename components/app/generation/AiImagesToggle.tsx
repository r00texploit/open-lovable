"use client";

// DALL-E 3 at 1792x1024 = $0.08/image. Typical generation uses 3-8 images.
const COST_PER_IMAGE_USD = 0.08;
const EST_MIN_IMAGES = 3;
const EST_MAX_IMAGES = 8;
const estMin = (COST_PER_IMAGE_USD * EST_MIN_IMAGES).toFixed(2);
const estMax = (COST_PER_IMAGE_USD * EST_MAX_IMAGES).toFixed(2);

type Props = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  canUse: boolean;
  disabled?: boolean;
};

export default function AiImagesToggle({ enabled, onChange, canUse, disabled = false }: Props) {
  const isLocked = !canUse;
  const isDisabled = disabled || isLocked;

  const tooltip = isLocked
    ? 'AI Images requires Plus or Team plan — upgrade to generate real images with DALL-E 3'
    : enabled
    ? `AI Images ON · DALL-E 3 · ~${EST_MIN_IMAGES}-${EST_MAX_IMAGES} images per generation · est. $${estMin}-$${estMax}/use`
    : `Enable AI image generation with DALL-E 3 · est. $${estMin}-$${estMax}/generation · Plus & Team only`;

  return (
    <button
      type="button"
      onClick={() => {
        if (isDisabled) return;
        onChange(!enabled);
      }}
      disabled={isDisabled}
      title={tooltip}
      aria-label={tooltip}
      className={[
        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all select-none',
        isLocked
          ? 'opacity-50 cursor-not-allowed bg-warm-100 text-warm-500 border border-warm-200'
          : disabled
          ? 'opacity-40 cursor-not-allowed bg-warm-100 text-warm-500 border border-warm-200'
          : enabled
          ? 'cursor-pointer bg-violet-600 text-white shadow-sm hover:bg-violet-700'
          : 'cursor-pointer bg-warm-100 text-warm-600 border border-warm-200 hover:bg-warm-200',
      ].join(' ')}
    >
      {isLocked ? (
        <span className="text-[11px]">🔒</span>
      ) : (
        <span className="text-[11px]">{enabled ? '✦' : '✧'}</span>
      )}
      AI Images
      {!isLocked && (
        <span className={[
          'w-6 h-3 rounded-full transition-colors relative flex-shrink-0',
          enabled ? 'bg-violet-400' : 'bg-warm-300',
        ].join(' ')}>
          <span className={[
            'absolute top-0.5 w-2 h-2 rounded-full bg-white shadow transition-transform',
            enabled ? 'translate-x-3.5' : 'translate-x-0.5',
          ].join(' ')} />
        </span>
      )}
    </button>
  );
}
