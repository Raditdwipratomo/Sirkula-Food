import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ClipboardCheck,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { LogoMark } from '@/components/illustrations/LogoMark';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/features/auth/AuthContext';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const USER_NAV_ITEMS: NavItem[] = [
  { to: '/app', label: 'Beranda', icon: Home, end: true },
  { to: '/app/catat', label: 'Catat Makanan', icon: ClipboardList },
  { to: '/app/analitik', label: 'Analitik & Laporan', icon: BarChart3 },
  { to: '/app/ai-insights', label: 'AI Insights', icon: Sparkles },
  { to: '/app/limbah', label: 'Pengelolaan Limbah', icon: RefreshCw },
  { to: '/app/profil', label: 'Profil & Pengaturan', icon: User },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
  { to: '/app', label: 'Dashboard Admin', icon: ShieldCheck, end: true },
  { to: '/app/analitik', label: 'Analitik Global', icon: BarChart3 },
  { to: '/app/ai-insights', label: 'AI Insights Global', icon: Sparkles },
  { to: '/app/pengguna', label: 'Manajemen Pengguna', icon: Users },
  { to: '/app/audit', label: 'Audit Catatan', icon: ClipboardCheck },
  { to: '/app/profil', label: 'Profil & Pengaturan', icon: User },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sirkulafood_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const isAdmin = user?.role === 'admin';
  const navItems = useMemo(
    () => (isAdmin ? ADMIN_NAV_ITEMS : USER_NAV_ITEMS),
    [isAdmin]
  );

  const mobileBottomItems = useMemo<NavItem[]>(
    () => isAdmin
      ? [
          { to: '/app', label: 'Admin', icon: ShieldCheck, end: true },
          { to: '/app/analitik', label: 'Analitik', icon: BarChart3 },
          { to: '/app/ai-insights', label: 'AI Insights', icon: Sparkles },
          { to: '/app/pengguna', label: 'Pengguna', icon: Users },
        ]
      : [
          { to: '/app', label: 'Beranda', icon: Home, end: true },
          { to: '/app/catat', label: 'Catat', icon: ClipboardList },
          { to: '/app/ai-insights', label: 'AI Insights', icon: Sparkles },
          { to: '/app/limbah', label: 'Limbah', icon: RefreshCw },
        ],
    [isAdmin]
  );

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sirkulafood_sidebar_collapsed', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCollapsed]);

  const displayName = user?.fullName ?? 'Radit Pratama';
  const displaySubtitle = user?.email ?? 'Pengguna SirkulaFood';
  const initials = getInitials(displayName);

  async function handleSignOut() {
    await signOut();
    toast.success('Berhasil keluar dari akun.');
    navigate('/auth');
  }

  return (
    <div className="flex min-h-dvh w-full">
      {/* Sidebar Desktop — Collapsible with Tooltips & Keyboard shortcut */}
      <aside
        aria-label="Navigasi utama"
        className={cn(
          'hidden md:flex md:shrink-0 md:flex-col md:justify-between bg-white border-r border-border sticky top-0 h-dvh transition-all duration-300 ease-in-out z-20',
          isCollapsed ? 'md:w-[72px] px-2.5 py-5' : 'md:w-64 px-4 py-6'
        )}
      >
        <div className="space-y-6">
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <Link
                to="/app"
                className="flex items-center justify-center p-0.5 rounded-lg group"
                title="SirkulaFood"
              >
                <LogoMark className="size-8 shrink-0 transition-transform group-hover:scale-105" />
              </Link>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={toggleCollapsed}
                    aria-label="Bentangkan navigasi (Ctrl+B)"
                    className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <PanelLeftOpen className="size-4.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  Bentangkan navigasi (Ctrl+B)
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <Link
                  to="/app"
                  className="flex items-center gap-3 min-w-0 rounded-lg group"
                  title="SirkulaFood"
                >
                  <LogoMark className="size-9 shrink-0 transition-transform group-hover:scale-105" />
                  <span className="text-xl font-bold tracking-tight text-sf-dark truncate">
                    SirkulaFood
                  </span>
                </Link>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={toggleCollapsed}
                      aria-label="Ciutkan navigasi (Ctrl+B)"
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <PanelLeftClose className="size-4.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Ciutkan navigasi (Ctrl+B)
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="px-1">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold',
                    isAdmin
                      ? 'bg-primary/15 text-sf-dark'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {isAdmin ? (
                    <>
                      <ShieldCheck className="size-3.5 text-primary" />
                      <span>Mode Admin (Semua User)</span>
                    </>
                  ) : (
                    <>
                      <User className="size-3.5" />
                      <span>Mode Pengguna Pribadi</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          )}

          <nav className={cn('space-y-1.5', isCollapsed && 'flex flex-col items-center')}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const link = (
                <NavLink
                  to={item.to}
                  end={item.end}
                  aria-label={item.label}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center rounded-xl transition-all',
                      isCollapsed
                        ? 'size-10 justify-center'
                        : 'w-full justify-between px-3.5 py-2.5 text-sm',
                      isActive
                        ? 'bg-sf-mint text-sf-dark font-semibold shadow-xs'
                        : 'text-foreground/80 hover:bg-muted hover:text-foreground font-medium'
                    )
                  }
                >
                  <span
                    className={cn(
                      'flex items-center',
                      isCollapsed ? 'justify-center' : 'gap-3 min-w-0'
                    )}
                  >
                    <Icon
                      className={cn('shrink-0', isCollapsed ? 'size-5' : 'size-4.5')}
                      aria-hidden="true"
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </span>
                </NavLink>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="font-medium text-xs"
                    >
                      <span>{item.label}</span>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <div key={item.to} className="w-full">{link}</div>;
            })}
          </nav>
        </div>

        {/* Kartu profil bawah */}
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2 pt-3 border-t border-border/70">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F49742] text-xs font-bold text-white cursor-pointer select-none"
                  tabIndex={0}
                  role="button"
                  aria-label={displayName}
                >
                  {initials}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="space-y-0.5">
                <p className="font-semibold text-xs text-white">{displayName}</p>
                <p className="text-[10px] text-white/80">{displaySubtitle}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Keluar dari akun"
                  aria-label="Keluar dari akun"
                  className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-[#FCE6E3] hover:text-[#A32B1F] transition-colors"
                >
                  <LogOut className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span>Keluar dari akun</span>
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="rounded-2xl bg-[#F6FAF7] border border-border p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F49742] text-xs font-bold text-white"
                  aria-hidden="true"
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {displaySubtitle}
                  </p>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    title="Keluar"
                    aria-label="Keluar dari akun"
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-white hover:text-[#A32B1F] transition-colors"
                  >
                    <LogOut className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <span>Keluar dari akun</span>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </aside>

      {/* Konten Utama */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        {/* Header Mobile */}
        <header className="flex md:hidden items-center justify-between bg-white border-b border-border px-4 py-3 sticky top-0 z-30">
          <Link to="/app" className="flex items-center gap-2.5">
            <LogoMark className="size-8" />
            <span className="text-lg font-bold text-sf-dark">SirkulaFood</span>
          </Link>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Buka menu navigasi"
                className="rounded-xl border border-border p-2 text-foreground hover:bg-muted"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-5 flex flex-col justify-between">
              <div className="space-y-4">
                <SheetHeader className="text-left pb-2">
                  <SheetTitle className="flex items-center gap-2.5 text-sf-dark">
                    <LogoMark className="size-7" />
                    <span>SirkulaFood</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm',
                            isActive
                              ? 'bg-sf-mint text-sf-dark font-semibold'
                              : 'text-foreground/80 hover:bg-muted font-medium'
                          )
                        }
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="size-4.5" aria-hidden="true" />
                          <span>{item.label}</span>
                        </span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-foreground">{displayName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {displaySubtitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#A32B1F] hover:bg-[#FCE6E3]"
                  >
                    <LogOut className="size-3.5" />
                    <span>Keluar</span>
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 w-full p-4 md:p-6">
          <Outlet />
        </main>

        {/* Bottom Navigation Mobile */}
        <nav
          aria-label="Navigasi cepat ponsel"
          className="fixed bottom-0 inset-x-0 z-30 flex md:hidden items-center justify-around bg-white border-t border-border py-2 px-2"
        >
          {mobileBottomItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-xs',
                    isActive
                      ? 'text-primary font-semibold'
                      : 'text-muted-foreground font-medium'
                  )
                }
              >
                <Icon className="size-4.5" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <Menu className="size-4.5" aria-hidden="true" />
            <span>Lainnya</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
