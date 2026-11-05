import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: ReactNode;
  iconBg?: string;
  iconColor?: string;
  label: string;
  value: string;
  subtitle: string;
  className?: string;
}

export function StatCard({
  icon,
  iconBg = '#E3F4E9',
  iconColor = '#16783F',
  label,
  value,
  subtitle,
  className,
}: StatCardProps) {
  return (
    <div className={cn('card-sirkulafood p-5 flex flex-col gap-3', className)}>
      <div className="flex items-center gap-3">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: iconBg, color: iconColor }}
          aria-hidden="true"
        >
          {icon}
        </div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
