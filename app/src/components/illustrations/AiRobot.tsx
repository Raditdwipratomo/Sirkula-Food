import { cn } from '@/lib/utils';

interface IllustrationProps {
  className?: string;
}

export function AiRobot({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-16 shrink-0', className)}
      role="img"
      aria-label="Asisten Robot AI SirkulaFood"
    >
      {/* Antena */}
      <line
        x1="48"
        y1="14"
        x2="48"
        y2="24"
        stroke="#16783F"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="48" cy="11" r="5.5" fill="#F4A261" />

      {/* Telinga kiri & kanan */}
      <rect x="10" y="38" width="8" height="18" rx="4" fill="#2FA566" />
      <rect x="78" y="38" width="8" height="18" rx="4" fill="#2FA566" />

      {/* Kepala robot */}
      <rect x="16" y="24" width="64" height="46" rx="18" fill="#2FA566" />

      {/* Layar wajah dalam */}
      <rect x="24" y="32" width="48" height="30" rx="12" fill="#E9F7EF" />

      {/* Mata */}
      <circle cx="38" cy="45" r="4.2" fill="#14231A" />
      <circle cx="36.8" cy="43.8" r="1.4" fill="#FFFFFF" />
      <circle cx="58" cy="45" r="4.2" fill="#14231A" />
      <circle cx="56.8" cy="43.8" r="1.4" fill="#FFFFFF" />

      {/* Pipi */}
      <circle cx="31" cy="51" r="3.2" fill="#F4A2A8" opacity="0.8" />
      <circle cx="65" cy="51" r="3.2" fill="#F4A2A8" opacity="0.8" />

      {/* Senyum */}
      <path
        d="M42 52C44.5 55.5 51.5 55.5 54 52"
        stroke="#14231A"
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* Leher / dudukan bawah */}
      <rect x="30" y="73" width="36" height="9" rx="4.5" fill="#16783F" />
    </svg>
  );
}

export default AiRobot;
