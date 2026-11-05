import { cn } from '@/lib/utils';

interface IllustrationProps {
  className?: string;
}

export function ComposterIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 88 92"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-16 shrink-0', className)}
      role="img"
      aria-label="Ilustrasi komposter pupuk organik"
    >
      {/* Tanaman tumbuh di atas komposter */}
      <path d="M44 36V18" stroke="#16783F" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M44 22C44 13 32 11 27 17C27 25 37 26 44 22Z" fill="#2FA566" />
      <path d="M44 22C44 13 56 11 61 17C61 25 51 26 44 22Z" fill="#16783F" />

      {/* Bibir atas pot komposter */}
      <rect x="20" y="34" width="48" height="9" rx="4" fill="#8B5E34" />

      {/* Badan komposter */}
      <path
        d="M24 43H64L59 78C58.5 81.5 55.5 84 52 84H36C32.5 84 29.5 81.5 29 78L24 43Z"
        fill="#6F4518"
      />

      {/* Lencana lingkaran centang */}
      <circle cx="44" cy="63" r="10" fill="#E9F7EF" />
      <path
        d="M39.5 63L42.5 66L49 59.5"
        stroke="#16783F"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default ComposterIllustration;
