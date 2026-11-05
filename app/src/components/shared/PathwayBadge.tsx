import {
  Bug,
  Droplets,
  Feather,
  Flame,
  Gift,
  Leaf,
  Soup,
  type LucideIcon,
} from 'lucide-react';
import { PATHWAYS, type PathwayType } from '@/domain/constants';
import { cn } from '@/lib/utils';

const PATHWAY_ICONS: Record<PathwayType, LucideIcon> = {
  donasi_aman: Gift,
  recycle_dapur: Soup,
  pakan_ternak: Feather,
  pakan_maggot_bsf: Bug,
  pupuk_kompos: Leaf,
  pupuk_cair_ecoenzyme: Droplets,
  buang_prosedur: Flame,
};

interface PathwayBadgeProps {
  pathway: PathwayType;
  customLabel?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function PathwayBadge({
  pathway,
  customLabel,
  size = 'sm',
  className,
}: PathwayBadgeProps) {
  const meta = PATHWAYS[pathway];
  const Icon = PATHWAY_ICONS[pathway];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm',
        className
      )}
      style={{
        backgroundColor: meta.bgColor,
        color: meta.fgColor,
      }}
    >
      <Icon className={size === 'sm' ? 'size-3.5 shrink-0' : 'size-4 shrink-0'} aria-hidden="true" />
      <span>{customLabel ?? meta.shortLabel}</span>
    </span>
  );
}
