import { avatarGradient, initials } from '@/lib/format';

interface Props {
  name: string;
  seed: string;
  size?: number;
  className?: string;
  /** Draw a soft ring around the avatar (story-row / card style). */
  ring?: boolean;
  /** Gradient story ring, as in the Figma story row. */
  storyRing?: boolean;
}

export function Avatar({
  name,
  seed,
  size = 40,
  className = '',
  ring = false,
  storyRing = false,
}: Props) {
  const inner = (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${
        ring && !storyRing ? 'ring-2 ring-hair/[0.06]' : ''
      } ${className}`}
      style={{
        width: size,
        height: size,
        background: avatarGradient(seed),
        fontSize: size * 0.36,
      }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );

  if (!storyRing) return inner;

  // Gradient ring wrapper: padding creates the ring, inner bg creates the gap.
  return (
    <div
      className="grad-primary shrink-0 rounded-full p-[2.5px]"
      style={{ width: size + 7, height: size + 7 }}
    >
      <div className="flex h-full w-full items-center justify-center rounded-full bg-surface p-[2px]">
        {inner}
      </div>
    </div>
  );
}
