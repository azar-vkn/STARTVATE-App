interface Props {
  size?: 'sm' | 'md' | 'lg';
  withMark?: boolean;
}

const sizes = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-4xl',
};

/** The STARTVATE wordmark with a spark mark. */
export function Brand({ size = 'md', withMark = true }: Props) {
  return (
    <span className="inline-flex items-center gap-2">
      {withMark && <SparkMark />}
      <span className={`font-extrabold tracking-tight ${sizes[size]}`}>
        <span className="text-ink">START</span>
        <span className="text-gradient">VATE</span>
      </span>
    </span>
  );
}

export function SparkMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <defs>
        <linearGradient id="sv-g" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#E08A5F" />
          <stop offset="1" stopColor="#D0602F" />
        </linearGradient>
      </defs>
      <path
        d="M16 2 L19.2 12.8 L30 16 L19.2 19.2 L16 30 L12.8 19.2 L2 16 L12.8 12.8 Z"
        fill="url(#sv-g)"
      />
    </svg>
  );
}
