import { cn } from '@/lib/utils';

interface IllustrationProps {
  className?: string;
}

export function ScaleIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 96 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-16 shrink-0', className)}
      role="img"
      aria-label="Timbangan sisa makanan"
    >
      {/* Bahan makanan di atas nampan */}
      <circle cx="40" cy="22" r="9" fill="#E76F51" />
      <circle cx="54" cy="20" r="11" fill="#52B788" />
      <path d="M58 28L67 16L73 20L64 30Z" fill="#F4A261" />

      {/* Nampan timbangan */}
      <rect x="22" y="28" width="52" height="6" rx="3" fill="#8ECAE6" />
      <rect x="44" y="34" width="8" height="6" fill="#5B6B61" />

      {/* Badan timbangan hijau */}
      <rect x="16" y="40" width="64" height="34" rx="10" fill="#16783F" />

      {/* Layar angka "1,25" */}
      <rect x="24" y="49" width="28" height="16" rx="5" fill="#E9F7EF" />
      <text
        x="38"
        y="60"
        textAnchor="middle"
        fill="#0F4D2E"
        fontSize="9.5"
        fontWeight="700"
        fontFamily="Helvetica, Arial, sans-serif"
      >
        1,25
      </text>

      {/* Indikator jarum bundar kanan */}
      <circle cx="64" cy="57" r="8" fill="#E9F7EF" />
      <line
        x1="64"
        y1="57"
        x2="68"
        y2="52"
        stroke="#16783F"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default ScaleIllustration;
