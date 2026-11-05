import { cn } from '@/lib/utils';

interface IllustrationProps {
  className?: string;
}

export function MaggotIllustration({ className }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 96 76"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('size-16 shrink-0', className)}
      role="img"
      aria-label="Ilustrasi biokonversi Maggot BSF"
    >
      {/* Alas daun hijau */}
      <ellipse cx="48" cy="56" rx="38" ry="10" fill="#B7E4C7" />

      {/* Segmen badan maggot dari belakang ke depan */}
      <circle cx="24" cy="46" r="9" fill="#C89F74" />
      <circle cx="35" cy="44" r="10.5" fill="#D5B088" />
      <circle cx="47" cy="43" r="11.5" fill="#DEC09A" />
      <circle cx="60" cy="44" r="11" fill="#E6CCA9" />
      <circle cx="71" cy="45" r="9.5" fill="#EDD7B8" />

      {/* Mata & detail kepala */}
      <circle cx="74" cy="43" r="2" fill="#4A3219" />
    </svg>
  );
}

export default MaggotIllustration;
