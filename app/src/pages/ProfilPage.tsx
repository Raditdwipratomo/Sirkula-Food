import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  HelpCircle,
  Lock,
  LogOut,
  Pencil,
  Plus,
  Shield,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { PathwayBadge } from '@/components/shared/PathwayBadge';
import { SimulatedBadge } from '@/components/shared/SimulatedBadge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { WASTE_PROFILES, type WasteProfile } from '@/domain/constants';
import { useAuth } from '@/features/auth/AuthContext';
import { menuFormSchema } from '@/features/waste/schemas';
import {
  useCreateMenuMutation,
  useMenusQuery,
  useUpdateMenuMutation,
} from '@/features/waste/store';
import type { MenuRow } from '@/types/database';
import { cn } from '@/lib/utils';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function ProfilPage() {
  const { user, signOut, updateProfileName } = useAuth();
  const navigate = useNavigate();

  const menusQuery = useMenusQuery();
  const createMenuMut = useCreateMenuMutation();
  const updateMenuMut = useUpdateMenuMutation();

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [newName, setNewName] = useState(user?.fullName ?? 'Andi Pratama');

  // Dialog Tambah / Edit Menu
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuRow | null>(null);
  const [menuName, setMenuName] = useState('');
  const [menuCategory, setMenuCategory] = useState('Pokok');
  const [menuProfile, setMenuProfile] = useState<WasteProfile>('karbohidrat');

  const displayName = user?.fullName ?? 'Andi Pratama';
  const displayEmail = user?.email ?? 'andi@email.com';

  const menus = menusQuery.data ?? [];

  async function toggleMenuActive(menu: MenuRow) {
    try {
      await updateMenuMut.mutateAsync({
        id: menu.id,
        values: { isActive: !menu.is_active },
      });
      toast.success(
        `Menu "${menu.name}" ${!menu.is_active ? 'diaktifkan' : 'dinonaktifkan'}.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengubah status menu.');
    }
  }

  function openAddMenuDialog() {
    setEditingMenu(null);
    setMenuName('');
    setMenuCategory('Pokok');
    setMenuProfile('karbohidrat');
    setMenuDialogOpen(true);
  }

  function openEditMenuDialog(menu: MenuRow) {
    setEditingMenu(menu);
    setMenuName(menu.name);
    setMenuCategory(menu.category ?? '');
    setMenuProfile(menu.waste_profile);
    setMenuDialogOpen(true);
  }

  async function handleSaveMenu(e: React.FormEvent) {
    e.preventDefault();
    const parsed = menuFormSchema.safeParse({
      name: menuName,
      category: menuCategory,
      wasteProfile: menuProfile,
      isActive: editingMenu ? editingMenu.is_active : true,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Input menu belum valid.');
      return;
    }

    try {
      if (editingMenu) {
        await updateMenuMut.mutateAsync({
          id: editingMenu.id,
          values: parsed.data,
        });
        toast.success(`Menu "${parsed.data.name}" diperbarui.`);
      } else {
        await createMenuMut.mutateAsync(parsed.data);
        toast.success(`Menu "${parsed.data.name}" ditambahkan.`);
      }
      setMenuDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan menu.');
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await updateProfileName(newName);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Nama profil berhasil diperbarui.');
    setEditProfileOpen(false);
  }

  async function handleSignOut() {
    await signOut();
    toast.success('Berhasil keluar dari akun.');
    navigate('/auth');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sf-dark sm:text-3xl">
            Profil & Pengaturan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola profil akun dan daftar menu makananmu.
          </p>
        </div>
        {(user?.isDemo ?? true) ? <SimulatedBadge /> : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Kiri: Kartu Profil & Menu Pengaturan */}
        <div className="lg:col-span-4 space-y-4">
          <div className="card-sirkulafood p-6 flex flex-col items-center text-center gap-3">
            <div className="flex size-20 items-center justify-center rounded-full bg-sf-mint text-2xl font-bold text-sf-dark">
              {getInitials(displayName)}
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {displayName}
              </h2>
              <p className="text-xs text-muted-foreground">{displayEmail}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sf-mint px-3 py-1 text-xs font-semibold text-primary">
              <Shield className="size-3.5" />
              <span>Pengguna SirkulaFood</span>
            </span>
            <Button
              size="sm"
              onClick={() => {
                setNewName(displayName);
                setEditProfileOpen(true);
              }}
              className="rounded-xl bg-primary hover:bg-sf-dark text-white font-semibold mt-1"
            >
              Ubah profil
            </Button>
          </div>

          <div className="card-sirkulafood divide-y divide-border overflow-hidden">
            {[
              {
                icon: User,
                label: 'Data pribadi',
                onClick: () => {
                  setNewName(displayName);
                  setEditProfileOpen(true);
                },
              },
              {
                icon: Lock,
                label: 'Keamanan',
                onClick: () =>
                  toast.info(
                    'Sesi dilindungi dengan JWT Supabase & Row Level Security.'
                  ),
              },
              {
                icon: HelpCircle,
                label: 'Bantuan & FAQ',
                onClick: () => setFaqDialogOpen(true),
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="size-4 text-primary" />
                    <span>{item.label}</span>
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              );
            })}
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-xs font-bold text-[#A32B1F] hover:bg-[#FCE6E3]/40"
            >
              <LogOut className="size-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* Kanan: Daftar Menu Makanan */}
        <div className="lg:col-span-8 space-y-6">
          <div className="card-sirkulafood p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Daftar menu makanan
                </h2>
                <p className="text-xs text-muted-foreground">
                  Kelola menu makanan dan profil limbah untuk memudahkan pencatatan harian.
                </p>
              </div>
              <Button
                size="sm"
                onClick={openAddMenuDialog}
                className="rounded-xl bg-primary hover:bg-sf-dark text-white font-semibold"
              >
                <Plus className="size-4 mr-1" />
                <span>Tambah menu</span>
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2.5 font-medium">Menu</th>
                    <th className="pb-2.5 font-medium">Kategori</th>
                    <th className="pb-2.5 font-medium">Profil limbah</th>
                    <th className="pb-2.5 font-medium text-right">Aktif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {menus.map((m) => {
                    const profileMeta = WASTE_PROFILES[m.waste_profile];
                    return (
                      <tr key={m.id}>
                        <td className="py-3 font-bold text-foreground">{m.name}</td>
                        <td className="py-3 text-muted-foreground">
                          {m.category ?? '-'}
                        </td>
                        <td className="py-3">
                          <PathwayBadge pathway={profileMeta.defaultPathway} />
                        </td>
                        <td className="py-3">
                          <div className="flex items-center justify-end gap-2.5">
                            <Switch
                              checked={m.is_active}
                              onCheckedChange={() => toggleMenuActive(m)}
                              aria-label={`Aktifkan menu ${m.name}`}
                            />
                            <button
                              type="button"
                              onClick={() => openEditMenuDialog(m)}
                              aria-label={`Ubah menu ${m.name}`}
                              className="text-muted-foreground hover:text-primary"
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog Tambah / Edit Menu */}
      <Dialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMenu ? `Ubah Menu: ${editingMenu.name}` : 'Tambah Menu Baru'}
            </DialogTitle>
            <DialogDescription>
              Atur nama menu, kategori, dan profil karakteristik limbahnya.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveMenu} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="prof-menu-name">Nama menu</Label>
              <Input
                id="prof-menu-name"
                required
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
                placeholder="Contoh: Nasi goreng sayur"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-menu-cat">Kategori</Label>
              <Input
                id="prof-menu-cat"
                value={menuCategory}
                onChange={(e) => setMenuCategory(e.target.value)}
                placeholder="Contoh: Pokok / Sayur / Lauk / Berkuah"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Profil karakteristik limbah</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(WASTE_PROFILES) as WasteProfile[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setMenuProfile(k)}
                    className={cn(
                      'rounded-xl border px-3 py-2 text-left text-xs font-medium',
                      menuProfile === k
                        ? 'border-primary bg-sf-mint text-sf-dark font-bold'
                        : 'border-border bg-white text-foreground'
                    )}
                  >
                    {WASTE_PROFILES[k].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMenuDialogOpen(false)}
                className="rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-primary hover:bg-sf-dark text-white"
              >
                Simpan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Ubah Profil */}
      <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah Profil</DialogTitle>
            <DialogDescription>
              Perbarui nama tampilan yang dicatat pada riwayat sisa makananmu.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-profile-name">Nama lengkap</Label>
              <Input
                id="edit-profile-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                minLength={2}
                className="rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditProfileOpen(false)}
                className="rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-primary hover:bg-sf-dark text-white"
              >
                Simpan perubahan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Bantuan & FAQ */}
      <Dialog open={faqDialogOpen} onOpenChange={setFaqDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Bantuan & FAQ Penggunaan</DialogTitle>
            <DialogDescription>
              Panduan singkat penggunaan SirkulaFood untuk mencatat dan mengolah sisa makanan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-xs leading-relaxed text-foreground">
            <div className="rounded-xl bg-[#F6FAF7] p-3">
              <p className="font-bold">1. Mengapa sisa piring dikunci dari donasi?</p>
              <p className="text-muted-foreground mt-0.5">
                Demi keamanan pangan, makanan yang sudah tersaji di piring
                dilarang keras didonasikan atau diolah ulang untuk dikonsumsi manusia.
              </p>
            </div>
            <div className="rounded-xl bg-[#F6FAF7] p-3">
              <p className="font-bold">
                2. Bagaimana cara menghitung rata-rata sisa dan proporsi pemanfaatan?
              </p>
              <p className="text-muted-foreground mt-0.5">
                Rumus deterministik: rata-rata sisa per catatan dihitung dari total
                berat sisa dibagi jumlah catatan, sedangkan proporsi pemanfaatan
                dihitung dari berat limbah yang dialihkan dibagi total sisa.
              </p>
            </div>
            <div className="rounded-xl bg-[#F6FAF7] p-3">
              <p className="font-bold">
                3. Bagaimana cara menambahkan menu makanan baru?
              </p>
              <p className="text-muted-foreground mt-0.5">
                Klik tombol &ldquo;Tambah menu&rdquo; di halaman Profil & Pengaturan atau
                langsung saat mencatat sisa makanan di halaman Catat Makanan.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
