import { cn } from '@/lib/utils';

interface IllustrationProps {
  className?: string;
}

export function ChickenIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 88 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-16 shrink-0', className)}
      role="img"
      aria-label="Ilustrasi pakan ternak unggas"
    >
      {/* Bayangan */}
      <ellipse cx="44" cy="79" rx="22" ry="4" fill="#E2ECE5" />

      {/* Kaki */}
      <line x1="38" y1="68" x2="38" y2="77" stroke="#E07A2E" strokeWidth="3" strokeLinecap="round" />
      <line x1="50" y1="68" x2="50" y2="77" stroke="#E07A2E" strokeWidth="3" strokeLinecap="round" />

      {/* Jengger merah */}
      <path
        d="M36 22C36 16 42 16 44 21C46 15 53 16 52 23"
        fill="#E76F51"
      />

      {/* Badan ayam bundar */}
      <circle cx="44" cy="46" r="24" fill="#F9DC9C" />

      {/* Sayap kecil */}
      <path
        d="M26 46C26 40 34 40 36 46C38 52 28 56 26 46Z"
        fill="#F3C36C"
      />

      {/* Mata */}
      <circle cx="52" cy="41" r="3" fill="#14231A" />
      <circle cx="56" cy="47" r="3.5" fill="#F4A2A8" opacity="0.75" />

      {/* Paruh segitiga */}
      <path d="M67 42L76 46L67 50Z" fill="#E07A2E" />
    </svg>
  );
}

export default ChickenIllustration;
