'use client';

import { useTheme } from '../lib/theme';

interface LogoProps {
  /** px size of the SVG (default 32) */
  size?: number;
  className?: string;
  /** Override the primary color hex (default: reads from theme) */
  color?: string;
  /** Color of the face / chat-bubble cutout */
  faceColor?: string;
  /** Disable the hover animation */
  static?: boolean;
}

export function Logo({
  size = 32,
  className = '',
  color,
  faceColor,
  static: isStatic = false,
}: LogoProps) {
  const { primaryHex } = useTheme();
  const fill = color ?? primaryHex;
  const face = faceColor ?? '#1a1a2e';

  return (
    <span
      className={`inline-flex shrink-0 ${
        isStatic ? '' : 'transition-transform duration-300 ease-out hover:scale-110'
      } ${className}`}
      style={{
        filter: `drop-shadow(0 0 ${size * 0.3}px ${fill}40)`,
        transition: 'filter 0.5s ease, transform 0.3s ease',
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 200"
        width={size}
        height={size}
        fill="none"
        role="img"
        aria-label="ChatBox logo"
      >
        {/* Antenna stick */}
        <line
          x1="100" y1="28" x2="100" y2="48"
          stroke={fill} strokeWidth="6" strokeLinecap="round"
          style={{ transition: 'stroke 0.5s ease' }}
        />
        {/* Antenna ball */}
        <circle cx="100" cy="23" r="7" fill={fill} style={{ transition: 'fill 0.5s ease' }} />
        {/* Head */}
        <ellipse cx="100" cy="105" rx="62" ry="55" fill={fill} style={{ transition: 'fill 0.5s ease' }} />
        {/* Left ear */}
        <rect x="28" y="88" width="16" height="36" rx="8" fill={fill} style={{ transition: 'fill 0.5s ease' }} />
        {/* Right ear */}
        <rect x="156" y="88" width="16" height="36" rx="8" fill={fill} style={{ transition: 'fill 0.5s ease' }} />
        {/* Chat bubble (mouth) */}
        <path
          d="M66 90 Q66 78 80 78 L120 78 Q134 78 134 90 L134 110 Q134 122 120 122 L90 122 L78 134 L78 122 L80 122 Q66 122 66 110 Z"
          fill={face}
          style={{ transition: 'fill 0.5s ease' }}
        />
        {/* Left eye */}
        <circle cx="88" cy="100" r="8" fill={fill} style={{ transition: 'fill 0.5s ease' }} />
        {/* Right eye */}
        <circle cx="112" cy="100" r="8" fill={fill} style={{ transition: 'fill 0.5s ease' }} />
      </svg>
    </span>
  );
}
