import { cn } from '@/lib/utils';

interface IllustrationProps {
  className?: string;
}

export function VeggieBasket({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-24 shrink-0', className)}
      role="img"
      aria-label="Keranjang sayur dan bahan makanan"
    >
      {/* Sayuran hijau di belakang */}
      <circle cx="52" cy="34" r="18" fill="#2FA566" />
      <circle cx="72" cy="30" r="20" fill="#16783F" />
      <circle cx="88" cy="42" r="14" fill="#52B788" />

      {/* Tomat merah di kiri */}
      <circle cx="36" cy="44" r="13" fill="#E76F51" />
      <path
        d="M34 31L36 34L39 31"
        stroke="#16783F"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Wortel oranye miring di kanan */}
      <path
        d="M72 48L85 26L94 32L82 50Z"
        fill="#F4A261"
      />

      {/* Bibir keranjang */}
      <rect x="16" y="46" width="88" height="10" rx="5" fill="#C68B59" />

      {/* Badan keranjang trapesium */}
      <path
        d="M22 56H98L90 88C89.2 91.5 86 94 82.4 94H37.6C34 94 30.8 91.5 30 88L22 56Z"
        fill="#D49B6A"
      />

      {/* Garis anyaman keranjang */}
      <line x1="27" y1="67" x2="93" y2="67" stroke="#A66E3E" strokeWidth="2.5" />
      <line x1="30" y1="79" x2="90" y2="79" stroke="#A66E3E" strokeWidth="2.5" />
    </svg>
  );
}

export default VeggieBasket;
