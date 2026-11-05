import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 text-center space-y-4">
      <h1 className="text-3xl font-bold text-sf-dark">Halaman tidak ditemukan</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        Rute yang kamu tuju tidak tersedia di SirkulaFood.
      </p>
      <Button asChild className="rounded-xl bg-primary hover:bg-sf-dark text-white">
        <Link to="/">Kembali ke Beranda</Link>
      </Button>
    </div>
  );
}
