import { cn } from '@/lib/utils';

interface IllustrationProps {
  className?: string;
}

export function LogoMark({ className }: IllustrationProps) {
  return (
    <span
      className={cn(
        'inline-grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-white',
        className
      )}
      aria-hidden="true"
    >
      <img
        src="/logo.jpeg"
        alt=""
        className="size-full scale-[1.6] object-cover"
      />
    </span>
  );
}

export default LogoMark;
