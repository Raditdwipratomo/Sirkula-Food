import { cn } from '@/lib/utils';

interface IllustrationProps {
  className?: string;
}

export function BiogasIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 88 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-16 shrink-0', className)}
      role="img"
      aria-label="Ilustrasi reaktor biogas organik"
    >
      {/* Bayangan alas */}
      <ellipse cx="44" cy="80" rx="26" ry="4" fill="#E2ECE5" />

      {/* Pipa penyalur gas atas */}
      <path
        d="M44 38V28"
        stroke="#14707F"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Api biru/hijau biogas bersih */}
      <path
        d="M44 10C44 10 53 17 51 24C49.5 28.5 46.8 30 44 30C41.2 30 38.5 28.5 37 24C35 17 44 10 44 10Z"
        fill="#1D8296"
      />
      <path
        d="M44 16C44 16 48.5 20.5 47.5 24.5C46.8 27 45.4 28 44 28C42.6 28 41.2 27 40.5 24.5C39.5 20.5 44 16 44 16Z"
        fill="#7CE0F4"
      />

      {/* Kubah biodigester */}
      <path
        d="M20 62C20 47.6 30.7 36 44 36C57.3 36 68 47.6 68 62V72C68 74.8 65.8 77 63 77H25C22.2 77 20 74.8 20 72V62Z"
        fill="#DCF1F4"
        stroke="#14707F"
        strokeWidth="2.5"
      />

      {/* Lapisan substrat organik di dasar kubah */}
      <path
        d="M21.5 64H66.5V71.5C66.5 73.7 64.7 75.5 62.5 75.5H25.5C23.3 75.5 21.5 73.7 21.5 71.5V64Z"
        fill="#2FA566"
      />

      {/* Indikator sirkulasi energi */}
      <circle cx="44" cy="54" r="7.5" fill="#FFFFFF" />
      <path
        d="M44 49.5L41 54.5H44.5L43.5 58.5L47 53.5H43.5L44 49.5Z"
        fill="#14707F"
      />
    </svg>
  );
}

export default BiogasIllustration;
