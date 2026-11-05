import { cn } from '@/lib/utils';

interface SimulatedBadgeProps {
  className?: string;
}

export function SimulatedBadge({ className }: SimulatedBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        className
      )}
      style={{
        backgroundColor: 'var(--sf-sim-bg)',
        color: 'var(--sf-sim-fg)',
      }}
    >
      Data simulasi
    </span>
  );
}
