import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Check,
  CookingPot,
  Gift,
  Leaf,
  Lock,
  ShieldCheck,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BiogasIllustration,
  ChickenIllustration,
  ComposterIllustration,
  EcoEnzymeIllustration,
  MaggotIllustration,
} from '@/components/illustrations';
import { PathwayBadge } from '@/components/shared/PathwayBadge';
import { SimulatedBadge } from '@/components/shared/SimulatedBadge';
import { StatCard } from '@/components/shared/StatCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getCircularRecommendation,
  validateWasteActionSafety,
} from '@/domain/circular-rules';
import {
  LEFTOVER_SOURCES,
  PATHWAYS,
  WASTE_PROFILES,
  type PathwayType,
} from '@/domain/constants';
import { computeAnalyticsSummary } from '@/features/analytics/metrics';
import { useAuth } from '@/features/auth/AuthContext';
import { wasteActionFormSchema } from '@/features/waste/schemas';
import {
  useCreateWasteActionMutation,
  useWasteActionsQuery,
  useWasteLogsQuery,
  type EnrichedWasteLog,
} from '@/features/waste/store';
import { formatDateShort, todayWIB } from '@/lib/dates';
import { formatKg, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

type TabKey = 'layak' | 'tidak_layak';

const HUMAN_PATHWAYS: PathwayType[] = ['donasi_aman', 'recycle_dapur'];
const NON_HUMAN_PATHWAYS: PathwayType[] = [
  'pakan_ternak',
  'pakan_maggot_bsf',
  'pupuk_kompos',
  'pupuk_cair_ecoenzyme',
  'buang_prosedur',
];

function isEligibleForHuman(log: EnrichedWasteLog): boolean {
  return (
    log.leftover_source === 'belum_disajikan' &&
    log.condition_status === 'layak_konsumsi'
  );
}

/** Jalur rekomendasi untuk log, disesuaikan dengan tab aktif. */
function recommendedPathwayFor(log: EnrichedWasteLog, tab: TabKey): PathwayType {
  const rec = getCircularRecommendation({
    leftoverSource: log.leftover_source,
    conditionStatus: log.condition_status,
    wasteProfile: log.menu_waste_profile,
  });
  const allowedInTab = tab === 'layak' ? HUMAN_PATHWAYS : NON_HUMAN_PATHWAYS;
  if (allowedInTab.includes(rec.primaryPathway)) return rec.primaryPathway;
  if (rec.secondaryPathway && allowedInTab.includes(rec.secondaryPathway)) {
    return rec.secondaryPathway;
  }
  return tab === 'layak'
    ? 'donasi_aman'
    : WASTE_PROFILES[log.menu_waste_profile].defaultPathway;
}

function logLabel(log: EnrichedWasteLog): string {
  return `${LEFTOVER_SOURCES[log.leftover_source].shortLabel} · ${log.menu_name} · ${formatDateShort(log.recorded_at)} · sisa ${formatNumber(log.remaining_weight_g)} g`;
}

interface PathwayCardProps {
  pathway: PathwayType;
  illustration: ReactNode;
  title: string;
  suitableFor: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

function PathwayCard({
  pathway,
  illustration,
  title,
  suitableFor,
  selected,
  disabled,
  onSelect,
}: PathwayCardProps) {
  return (
    <div
      className={cn(
        'card-sirkulafood p-4 flex items-center justify-between gap-4 transition-colors',
        selected && 'border-primary ring-1 ring-primary'
      )}
    >
      <div className="flex items-center gap-4">
        <div className="size-16 shrink-0 flex items-center justify-center">
          {illustration}
        </div>
        <div className="space-y-1">
          <PathwayBadge pathway={pathway} />
          <p className="text-xs font-bold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">Cocok untuk: {suitableFor}</p>
        </div>
      </div>
      <Button
        type="button"
        variant={selected ? 'default' : 'outline'}
        size="sm"
        disabled={disabled}
        aria-pressed={selected}
        onClick={onSelect}
        className={cn(
          'rounded-xl font-semibold shrink-0',
          selected
            ? 'bg-primary text-white hover:bg-sf-dark'
            : 'border-primary text-primary hover:bg-sf-mint'
        )}
      >
        {selected ? 'Dipilih' : 'Pilih'}
      </Button>
    </div>
  );
}

export function LimbahPage() {
  const { user } = useAuth();
  const logsQuery = useWasteLogsQuery();
  const actionsQuery = useWasteActionsQuery();
  const createActionMut = useCreateWasteActionMutation();

  const [tab, setTab] = useState<TabKey>('tidak_layak');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [actionOverride, setActionOverride] = useState<PathwayType | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [partner, setPartner] = useState('');
  const [actionDate, setActionDate] = useState(todayWIB());
  const [safetyConfirmed, setSafetyConfirmed] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);
  const actions = useMemo(() => actionsQuery.data ?? [], [actionsQuery.data]);

  const summary = useMemo(
    () => computeAnalyticsSummary(logs, actions),
    [logs, actions]
  );
  const handledG = summary.utilizedWeightG + summary.disposedWeightG;

  const unhandledLogs = useMemo(
    () =>
      logs
        .filter((l) => l.remaining_weight_g > 0)
        .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at)),
    [logs]
  );

  const candidateLogs = useMemo(
    () => (tab === 'layak' ? unhandledLogs.filter(isEligibleForHuman) : unhandledLogs),
    [tab, unhandledLogs]
  );

  // State turunan: log aktif & jalur aktif (tanpa useEffect sinkronisasi)
  const selectedLog =
    candidateLogs.find((l) => l.id === selectedLogId) ?? candidateLogs[0] ?? null;

  const tabPathways = tab === 'layak' ? HUMAN_PATHWAYS : NON_HUMAN_PATHWAYS;
  const recommended = selectedLog ? recommendedPathwayFor(selectedLog, tab) : null;
  const selectedAction: PathwayType | null =
    actionOverride && tabPathways.includes(actionOverride)
      ? actionOverride
      : recommended;

  const logLocksHuman = selectedLog ? !isEligibleForHuman(selectedLog) : false;
  const remainingG = selectedLog?.remaining_weight_g ?? 0;
  const weightG = Number(weightInput.replace(/\./g, '').replace(',', '.'));
  const weightValid = Number.isFinite(weightG) && weightG > 0;
  const afterG = weightValid ? remainingG - weightG : remainingG;
  const needsSafetyConfirm =
    selectedAction === 'donasi_aman' || selectedAction === 'recycle_dapur';

  const resetForm = () => {
    setWeightInput('');
    setFormError(null);
    setSafetyConfirmed(false);
  };

  const handleTabChange = (next: TabKey) => {
    setTab(next);
    setActionOverride(null);
    resetForm();
  };

  const handleLogChange = (id: string) => {
    setSelectedLogId(id);
    setActionOverride(null);
    resetForm();
  };

  const handleSelectPathway = (p: PathwayType) => {
    setActionOverride(p);
    setFormError(null);
  };

  const handleSubmit = async () => {
    setFormError(null);
    if (!selectedLog || !selectedAction) {
      setFormError('Pilih log sisa yang belum ditangani terlebih dahulu.');
      return;
    }

    const parsed = wasteActionFormSchema.safeParse({
      wasteLogId: selectedLog.id,
      actionType: selectedAction,
      weightG: weightValid ? weightG : 0,
      partnerOrTarget: partner,
      actionDate,
      notes: '',
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Data penanganan tidak valid.');
      return;
    }
    if (actionDate > todayWIB()) {
      setFormError('Tanggal penanganan tidak boleh di masa depan.');
      return;
    }

    const safety = validateWasteActionSafety({
      leftoverSource: selectedLog.leftover_source,
      conditionStatus: selectedLog.condition_status,
      leftoverWeightG: selectedLog.leftover_weight_g,
      alreadyHandledWeightG: selectedLog.handled_weight_g,
      actionType: selectedAction,
      actionWeightG: parsed.data.weightG,
    });
    if (!safety.valid) {
      setFormError(safety.error ?? 'Tindakan tidak diizinkan.');
      return;
    }

    if (needsSafetyConfirm && !safetyConfirmed) {
      setFormError(
        'Centang konfirmasi keamanan pangan sebelum mencatat donasi aman atau recycle dapur.'
      );
      return;
    }

    try {
      await createActionMut.mutateAsync({ log: selectedLog, values: parsed.data });
      toast.success(
        `Penanganan ${PATHWAYS[selectedAction].label} ${formatNumber(parsed.data.weightG)} g tersimpan.`
      );
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan penanganan.');
    }
  };

  const isLoading = logsQuery.isLoading || actionsQuery.isLoading;
  const loadError = logsQuery.error ?? actionsQuery.error;

  return (
    <div className="space-y-6">
      {/* Header — sesuai 07-pengelolaan-limbah.png */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sf-dark sm:text-3xl">
            Pengelolaan Limbah
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih jalur pengolahan yang sesuai, lalu catat berat yang dialihkan.
          </p>
        </div>
        {(user?.isDemo ?? true) ? <SimulatedBadge /> : null}
      </div>

      {loadError ? (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-[#F3C2BB] bg-[#FCE6E3] px-4 py-3 text-xs text-[#A32B1F]"
        >
          <AlertTriangle className="size-4 shrink-0" />
          <span>Gagal memuat data limbah: {loadError.message}</span>
        </div>
      ) : null}

      {/* 3 Kartu Statistik Atas */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<BarChart3 className="size-5" />}
            iconBg="#E3F4E9"
            iconColor="#16783F"
            label="Total sisa tercatat"
            value={`${formatKg(summary.totalLeftoverWeightKg, 1)} kg`}
            subtitle="Semua sumber"
          />
          <StatCard
            icon={<Check className="size-5" />}
            iconBg="#E3F4E9"
            iconColor="#16783F"
            label="Sudah ditangani"
            value={`${formatKg(handledG / 1000, 1)} kg`}
            subtitle={`${summary.handledPercentage}% dari total`}
          />
          <StatCard
            icon={<AlertTriangle className="size-5" />}
            iconBg="#FFF0D2"
            iconColor="#8A5200"
            label="Belum ditangani"
            value={`${formatKg(summary.unhandledWeightKg, 1)} kg`}
            subtitle={
              unhandledLogs.length > 0
                ? `Perlu dicatat · ${unhandledLogs.length} log`
                : 'Semua sudah ditangani'
            }
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Kiri: Tab & Kartu Jalur Pengolahan */}
        <div className="lg:col-span-7 space-y-4">
          <div
            role="tablist"
            aria-label="Kategori kelayakan limbah"
            className="grid grid-cols-2 rounded-xl bg-muted p-1"
          >
            {(
              [
                { key: 'layak', label: 'Layak konsumsi (belum disajikan)' },
                { key: 'tidak_layak', label: 'Tidak layak konsumsi' },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={tab === t.key}
                aria-controls={`panel-${t.key}`}
                onClick={() => handleTabChange(t.key)}
                className={cn(
                  'rounded-lg py-2.5 text-xs sm:text-sm font-semibold transition-colors',
                  tab === t.key
                    ? 'bg-primary text-white'
                    : 'text-foreground/80 hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'tidak_layak' ? (
            <div
              role="tabpanel"
              id="panel-tidak_layak"
              aria-labelledby="tab-tidak_layak"
              className="space-y-3.5"
            >
              <PathwayCard
                pathway="pakan_ternak"
                illustration={<ChickenIllustration className="size-16" />}
                title="Unggas, lele, nila. Tanpa tulang keras dan bumbu pedas."
                suitableFor="nasi, roti, sayur belum basi"
                selected={selectedAction === 'pakan_ternak'}
                onSelect={() => handleSelectPathway('pakan_ternak')}
              />
              <PathwayCard
                pathway="pakan_maggot_bsf"
                illustration={<MaggotIllustration className="size-16" />}
                title="Diurai maggot BSF menjadi pakan ternak."
                suitableFor="sisa campuran, lauk berlemak, sisa piring"
                selected={selectedAction === 'pakan_maggot_bsf'}
                onSelect={() => handleSelectPathway('pakan_maggot_bsf')}
              />
              <PathwayCard
                pathway="pupuk_kompos"
                illustration={<ComposterIllustration className="size-16" />}
                title="Takakura atau biopori, minim minyak."
                suitableFor="basi, sayur mentah, ampas teh/kopi"
                selected={selectedAction === 'pupuk_kompos'}
                onSelect={() => handleSelectPathway('pupuk_kompos')}
              />
              <PathwayCard
                pathway="pupuk_cair_ecoenzyme"
                illustration={<EcoEnzymeIllustration className="size-16" />}
                title="Fermentasi kulit buah dan sayur segar menjadi cairan serbaguna."
                suitableFor="kulit buah-buahan, potongan sayur segar mentah tanpa minyak"
                selected={selectedAction === 'pupuk_cair_ecoenzyme'}
                onSelect={() => handleSelectPathway('pupuk_cair_ecoenzyme')}
              />
              <PathwayCard
                pathway="buang_prosedur"
                illustration={<BiogasIllustration className="size-16" />}
                title="Fermentasi anaerob di biodigester menjadi energi biogas & pupuk slurry."
                suitableFor="sisa makanan basah, nasi, lauk, sayur, dan kuah organik"
                selected={selectedAction === 'buang_prosedur'}
                onSelect={() => handleSelectPathway('buang_prosedur')}
              />

              {/* Info Tab Layak Konsumsi */}
              <div className="rounded-2xl border border-[#CBE6D4] bg-[#EAF7EF] p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-sf-dark">
                  <Gift className="size-4 text-primary shrink-0" />
                  <span>
                    <strong>Tab Layak konsumsi:</strong> hanya untuk makanan belum
                    disajikan dan memenuhi prosedur keamanan pangan.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <PathwayBadge pathway="donasi_aman" />
                  <PathwayBadge pathway="recycle_dapur" />
                </div>
              </div>
            </div>
          ) : (
            <div
              role="tabpanel"
              id="panel-layak"
              aria-labelledby="tab-layak"
              className="space-y-3.5"
            >
              <div className="flex items-start gap-2.5 rounded-xl border border-[#F0D6A8] bg-[#FFFBF2] px-4 py-3 text-xs text-[#8A5200]">
                <ShieldCheck className="size-4 shrink-0 mt-0.5" />
                <span>
                  Hanya untuk makanan <strong>belum disajikan</strong> yang sudah
                  dicek sesuai prosedur keamanan pangan dapur. SirkulaFood dan AI
                  tidak menilai kelayakan makan. Sisa piring tidak pernah muncul di
                  tab ini.
                </span>
              </div>

              <PathwayCard
                pathway="donasi_aman"
                illustration={
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-[#E3F4E9] text-[#15703B]">
                    <Gift className="size-7" />
                  </span>
                }
                title="Salurkan makanan berlebih yang belum disajikan ke penerima."
                suitableFor="makanan utuh belum disajikan, suhu & higienitas terjaga"
                selected={selectedAction === 'donasi_aman'}
                disabled={candidateLogs.length === 0}
                onSelect={() => handleSelectPathway('donasi_aman')}
              />
              <PathwayCard
                pathway="recycle_dapur"
                illustration={
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-[#DCF1F4] text-[#14707F]">
                    <CookingPot className="size-7" />
                  </span>
                }
                title="Olah ulang bahan segar yang belum tersentuh konsumen."
                suitableFor="potongan sayur bersih untuk kaldu, bahan belum tersaji"
                selected={selectedAction === 'recycle_dapur'}
                disabled={candidateLogs.length === 0}
                onSelect={() => handleSelectPathway('recycle_dapur')}
              />

              {candidateLogs.length === 0 && !isLoading ? (
                <div className="card-sirkulafood p-5 text-center text-xs text-muted-foreground">
                  Belum ada makanan belum disajikan berstatus layak konsumsi yang
                  belum ditangani.
                </div>
              ) : null}
            </div>
          )}

          {/* Daftar log belum ditangani */}
          {candidateLogs.length > 0 ? (
            <div className="card-sirkulafood p-5 space-y-3">
              <h2 className="text-sm font-bold text-foreground">
                Log belum ditangani ({candidateLogs.length})
              </h2>
              <ul className="space-y-2">
                {candidateLogs.slice(0, 6).map((l) => {
                  const active = selectedLog?.id === l.id;
                  return (
                    <li key={l.id}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => handleLogChange(l.id)}
                        className={cn(
                          'w-full flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-xs transition-colors',
                          active
                            ? 'border-primary bg-sf-mint'
                            : 'border-border hover:bg-muted'
                        )}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {isEligibleForHuman(l) ? (
                            <Leaf className="size-4 text-primary shrink-0" />
                          ) : (
                            <Lock className="size-4 text-[#A32B1F] shrink-0" />
                          )}
                          <span className="truncate font-medium text-foreground">
                            {LEFTOVER_SOURCES[l.leftover_source].shortLabel} ·{' '}
                            {l.menu_name} · {formatDateShort(l.recorded_at)}
                          </span>
                        </span>
                        <span className="shrink-0 font-bold text-foreground">
                          {formatNumber(l.remaining_weight_g)} g
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Kanan: Form Catat Penanganan */}
        <div className="lg:col-span-5">
          <form
            className="card-sirkulafood p-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
            noValidate
          >
            <h2 className="text-base font-bold text-foreground">Catat penanganan</h2>

            {selectedLog && logLocksHuman ? (
              <div className="flex items-center gap-2.5 rounded-xl bg-[#FCE6E3] p-3 text-xs font-medium text-[#A32B1F]">
                <Lock className="size-4 shrink-0" />
                <span>
                  {selectedLog.leftover_source === 'sisa_piring'
                    ? 'Sisa piring dikunci: donasi dan recycle dapur tidak tersedia.'
                    : 'Log ini bukan makanan belum disajikan yang layak konsumsi: donasi dan recycle dapur tidak tersedia.'}
                </span>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label htmlFor="action-log" className="text-xs font-bold text-foreground block">
                Log sisa
              </label>
              {candidateLogs.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-3.5 py-3 text-xs text-muted-foreground">
                  Tidak ada log yang perlu ditangani di tab ini.
                </p>
              ) : (
                <div className="relative">
                  <Leaf className="pointer-events-none size-4 text-primary absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    id="action-log"
                    value={selectedLog?.id ?? ''}
                    onChange={(e) => handleLogChange(e.target.value)}
                    className="h-11 w-full appearance-none rounded-xl border border-border bg-white pl-10 pr-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {candidateLogs.map((l) => (
                      <option key={l.id} value={l.id}>
                        {logLabel(l)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <fieldset className="space-y-1.5">
              <legend className="text-xs font-bold text-foreground mb-1.5">
                Jenis tindakan
              </legend>
              <div className="flex flex-wrap gap-2">
                {tabPathways.map((p) => {
                  const locked = HUMAN_PATHWAYS.includes(p) && logLocksHuman;
                  const isSelected = selectedAction === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      disabled={locked || !selectedLog}
                      aria-pressed={isSelected}
                      onClick={() => handleSelectPathway(p)}
                      className={cn(
                        'rounded-full transition-transform disabled:opacity-40 disabled:cursor-not-allowed',
                        isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
                      )}
                    >
                      <PathwayBadge
                        pathway={p}
                        customLabel={`${PATHWAYS[p].shortLabel}${isSelected ? ' ✓' : ''}`}
                      />
                    </button>
                  );
                })}
              </div>
              {selectedAction && recommended === selectedAction ? (
                <p className="text-[11px] text-muted-foreground">
                  Rekomendasi sistem berdasarkan sumber, kondisi, dan profil limbah.
                </p>
              ) : null}
              {selectedAction ? (
                <p className="text-[11px] text-[#8A5200]">
                  {PATHWAYS[selectedAction].safetyNote}
                </p>
              ) : null}
            </fieldset>

            <div className="space-y-1.5">
              <label htmlFor="action-weight" className="text-xs font-bold text-foreground block">
                Berat dialihkan (gram)
              </label>
              <Input
                id="action-weight"
                inputMode="numeric"
                placeholder={remainingG > 0 ? `Maks. ${formatNumber(remainingG)} g` : '0'}
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value.replace(/[^\d.,]/g, ''))}
                aria-describedby="action-weight-help"
                aria-invalid={weightValid && afterG < 0}
                className="h-11 rounded-xl text-sm font-medium"
              />
              <p
                id="action-weight-help"
                className={cn(
                  'text-[11px]',
                  weightValid && afterG < 0 ? 'text-[#A32B1F] font-medium' : 'text-muted-foreground'
                )}
              >
                Sisa belum ditangani {formatNumber(remainingG)} g.
                {weightValid
                  ? afterG < 0
                    ? ` Melebihi sisa sebesar ${formatNumber(-afterG)} g.`
                    : ` Setelah ini ${formatNumber(afterG)} g.`
                  : ''}
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="action-partner" className="text-xs font-bold text-foreground block">
                Mitra / tujuan
              </label>
              <div className="relative">
                <User className="pointer-events-none size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  id="action-partner"
                  maxLength={160}
                  value={partner}
                  onChange={(e) => setPartner(e.target.value)}
                  placeholder="Contoh: Peternak mitra, Pak Slamet"
                  className="pl-10 h-11 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="action-date" className="text-xs font-bold text-foreground block">
                Tanggal
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  id="action-date"
                  type="date"
                  max={todayWIB()}
                  value={actionDate}
                  onChange={(e) => setActionDate(e.target.value)}
                  className="pl-10 h-11 rounded-xl text-xs"
                />
              </div>
            </div>

            {needsSafetyConfirm ? (
              <label className="flex items-start gap-2.5 rounded-xl border border-[#CBE6D4] bg-[#EAF7EF] p-3 text-xs text-sf-dark cursor-pointer">
                <input
                  type="checkbox"
                  checked={safetyConfirmed}
                  onChange={(e) => setSafetyConfirmed(e.target.checked)}
                  className="mt-0.5 size-4 accent-[#16783F]"
                />
                <span>
                  Saya mengonfirmasi makanan ini <strong>belum disajikan</strong> dan
                  sudah dicek sesuai prosedur keamanan pangan dapur.
                </span>
              </label>
            ) : null}

            {formError ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-[#FCE6E3] px-3 py-2.5 text-xs text-[#A32B1F]"
              >
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            ) : null}

            <Button
              type="submit"
              disabled={
                !selectedLog ||
                createActionMut.isPending ||
                (needsSafetyConfirm && !safetyConfirmed)
              }
              className="w-full h-11 rounded-xl bg-primary hover:bg-sf-dark text-white font-semibold"
            >
              {createActionMut.isPending ? 'Menyimpan...' : 'Simpan penanganan'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
