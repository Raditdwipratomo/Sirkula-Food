import { cn } from '@/lib/utils';

interface IllustrationProps {
  className?: string;
}

export function EarthMascot({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-48', className)}
      role="img"
      aria-label="Maskot Bumi SirkulaFood"
    >
      {/* Bayangan bawah */}
      <ellipse cx="120" cy="218" rx="68" ry="10" fill="#D4E8DC" />

      {/* Tangkai & daun kecambah di atas kepala */}
      <path
        d="M120 44V22"
        stroke="#16783F"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M120 26C120 15 104 12 96 20C96 30 110 32 120 26Z"
        fill="#2FA566"
      />
      <path
        d="M120 26C120 15 136 12 144 20C144 30 130 32 120 26Z"
        fill="#16783F"
      />

      {/* Bola bumi biru */}
      <circle cx="120" cy="126" r="82" fill="#4EA8DE" />

      {/* Benua hijau */}
      <path
        d="M62 94C76 76 102 78 108 94C114 110 92 126 74 128C56 130 48 112 62 94Z"
        fill="#52B788"
      />
      <path
        d="M148 122C164 114 186 128 184 150C182 172 158 180 144 166C130 152 132 130 148 122Z"
        fill="#52B788"
      />

      {/* Pipi merah muda */}
      <circle cx="82" cy="144" r="10" fill="#F4A2A8" opacity="0.85" />
      <circle cx="158" cy="144" r="10" fill="#F4A2A8" opacity="0.85" />

      {/* Mata kiri + kilau */}
      <circle cx="96" cy="128" r="8.5" fill="#14231A" />
      <circle cx="93.5" cy="125.5" r="2.8" fill="#FFFFFF" />

      {/* Mata kanan + kilau */}
      <circle cx="144" cy="128" r="8.5" fill="#14231A" />
      <circle cx="141.5" cy="125.5" r="2.8" fill="#FFFFFF" />

      {/* Senyum ramah */}
      <path
        d="M104 144C110 155 130 155 136 144"
        stroke="#14231A"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default EarthMascot;
