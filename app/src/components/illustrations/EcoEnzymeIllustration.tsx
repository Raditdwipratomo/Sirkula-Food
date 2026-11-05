import { cn } from '@/lib/utils';

interface IllustrationProps {
  className?: string;
}

export function EcoEnzymeIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 88 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-16 shrink-0', className)}
      role="img"
      aria-label="Ilustrasi fermentasi POC dan Eco-enzyme"
    >
      {/* Bayangan alas */}
      <ellipse cx="44" cy="80" rx="22" ry="4" fill="#E2ECE5" />

      {/* Tutup botol fermentasi */}
      <rect x="33" y="14" width="22" height="7" rx="3.5" fill="#5C4A8A" />
      <rect x="36" y="21" width="16" height="5" fill="#7B68C4" />

      {/* Badan toples kaca */}
      <rect
        x="24"
        y="25"
        width="40"
        height="50"
        rx="10"
        fill="#F3EFFB"
        stroke="#7B68C4"
        strokeWidth="2.5"
      />

      {/* Cairan fermentasi eco-enzyme */}
      <path
        d="M25.5 44C32 41.5 38 46.5 44 44C50 41.5 56 46.5 62.5 44V65C62.5 69.7 58.7 73.5 54 73.5H34C29.3 73.5 25.5 69.7 25.5 65V44Z"
        fill="#D6C8F7"
      />

      {/* Potongan kulit jeruk & daun organik di dalam cairan */}
      <circle cx="36" cy="58" r="6" fill="#F49742" />
      <circle cx="36" cy="58" r="3" fill="#FFF0D2" />
      <path
        d="M48 62C48 55 56 54 57 60C57 65 50 66 48 62Z"
        fill="#2FA566"
      />

      {/* Gelembung fermentasi */}
      <circle cx="46" cy="50" r="2.2" fill="#5C4A8A" opacity="0.65" />
      <circle cx="52" cy="36" r="2.5" fill="#7B68C4" opacity="0.55" />
      <circle cx="38" cy="34" r="1.8" fill="#7B68C4" opacity="0.55" />
    </svg>
  );
}

export default EcoEnzymeIllustration;
