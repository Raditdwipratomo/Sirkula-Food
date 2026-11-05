import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Gift,
  Leaf,
  Loader2,
  Lock,
  Minus,
  Pencil,
  Plus,
  Soup,
  Sparkles,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ComposterIllustration,
  ScaleIllustration,
  VeggieBasket,
} from '@/components/illustrations';
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
import { Textarea } from '@/components/ui/textarea';
import { getCircularRecommendation } from '@/domain/circular-rules';
import {
  CONDITION_STATUSES,
  LEFTOVER_SOURCES,
  PATHWAYS,
  WASTE_PROFILES,
  WASTE_REASONS,
  type ConditionStatus,
  type LeftoverSource,
  type PathwayType,
  type WasteProfile,
  type WasteReason,
} from '@/domain/constants';
import { useAuth } from '@/features/auth/AuthContext';
import {
  requestAiPathwayRecommendation,
  type PathwayRecommendationResponse,
} from '@/features/ai-insights/service';
import {
  wasteActionFormSchema,
  wasteLogFormSchema,
} from '@/features/waste/schemas';
import {
  canEditWasteLog,
  canManageMenus,
  useCreateMenuMutation,
  useCreateWasteActionMutation,
  useCreateWasteLogMutation,
  useMenusQuery,
  useUpdateMenuMutation,
  useUpdateWasteLogMutation,
  useWasteLogsQuery,
  type EnrichedWasteLog,
} from '@/features/waste/store';
import { formatDateShort, todayWIB } from '@/lib/dates';
import { gramToKgDisplay } from '@/lib/format';
import { cn } from '@/lib/utils';

export function CatatPage() {
  const { user } = useAuth();
  const canAddMenu = canManageMenus(user);
  const recorderLabel = user ? user.fullName : 'Andi Pratama';

  const menusQuery = useMenusQuery();
  const logsQuery = useWasteLogsQuery();
  const createMenuMut = useCreateMenuMutation();
  const updateMenuMut = useUpdateMenuMutation();
  const createLogMut = useCreateWasteLogMutation();
  const updateLogMut = useUpdateWasteLogMutation();
  const createActionMut = useCreateWasteActionMutation();

  const activeMenus = useMemo(
    () => (menusQuery.data ?? []).filter((m) => m.is_active),
    [menusQuery.data]
  );

  // State Wizard 4 Langkah
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [foodName, setFoodName] = useState('Sayur lodeh');
  const [selectedMenuId, setSelectedMenuId] = useState<string>('m-sayur-lodeh');
  const [profile, setProfile] = useState<WasteProfile>('sayuran_serat');
  const [recordedDate, setRecordedDate] = useState<string>(todayWIB());

  // Langkah 2: Sisa & Penyebab
  const [weightG, setWeightG] = useState<number>(1250);
  const [source, setSource] = useState<LeftoverSource>('sisa_piring');
  const [condition, setCondition] = useState<ConditionStatus>(
    'tidak_layak_konsumsi_segar'
  );
  const [reason, setReason] = useState<WasteReason>('porsi_terlalu_besar');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  // Langkah 3 & 4: Penanganan Langsung & Ringkasan Selesai
  const [savedLogId, setSavedLogId] = useState<string | null>(null);
  const [selectedActionType, setSelectedActionType] =
    useState<PathwayType>('pakan_ternak');
  const [actionWeightG, setActionWeightG] = useState<number>(1250);
  const [actionPartner, setActionPartner] = useState<string>(
    'Peternak mitra, Pak Slamet'
  );
  const [recordedActionSummary, setRecordedActionSummary] = useState<{
    actionType: PathwayType;
    weightG: number;
    partner: string;
  } | null>(null);

  // Rekomendasi AI Gemini untuk Penanganan di Langkah 3
  const [aiRecommendation, setAiRecommendation] =
    useState<PathwayRecommendationResponse | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiFetchError, setAiFetchError] = useState<string | null>(null);

  // Dialog Edit Log Riwayat
  const [editingLog, setEditingLog] = useState<EnrichedWasteLog | null>(null);
  const [editWeightG, setEditWeightG] = useState(2100);
  const [editSource, setEditSource] = useState<LeftoverSource>('sisa_piring');
  const [editCondition, setEditCondition] = useState<ConditionStatus>(
    'tidak_layak_konsumsi_segar'
  );
  const [editReason, setEditReason] =
    useState<WasteReason>('porsi_terlalu_besar');
  const [editNotes, setEditNotes] = useState('');

  // Sinkronisasi pilihan menu pertama ketika daftar menu selesai dimuat
  useEffect(() => {
    if (activeMenus.length > 0) {
      const found = activeMenus.find((m) => m.id === selectedMenuId);
      const target = found ?? activeMenus[0];
      if (target && target.id !== selectedMenuId) {
        setSelectedMenuId(target.id);
        setFoodName((prev) => (!prev || prev === 'Sayur lodeh' ? target.name : prev));
        setProfile(target.waste_profile);
      }
    }
  }, [activeMenus, selectedMenuId]);

  const selectedMenu = useMemo(
    () =>
      activeMenus.find((m) => m.id === selectedMenuId) ??
      activeMenus[0] ?? {
        id: 'm-sayur-lodeh',
        name: foodName || 'Sayur lodeh',
        category: 'Makanan',
        waste_profile: profile,
      },
    [activeMenus, selectedMenuId, foodName, profile]
  );

  // Rekomendasi sirkular real-time untuk Langkah 2 & 3
  const recommendation = useMemo(
    () =>
      getCircularRecommendation({
        leftoverSource: source,
        conditionStatus: condition,
        wasteProfile: profile,
      }),
    [source, condition, profile]
  );

  // Ambil rekomendasi AI Gemini saat pengguna berada di Langkah 3
  useEffect(() => {
    if (step !== 3) return;

    let isMounted = true;
    const controller = new AbortController();

    async function fetchAiPathway() {
      setIsAiLoading(true);
      setAiFetchError(null);
      try {
        const result = await requestAiPathwayRecommendation({
          foodName,
          category: selectedMenu?.category ?? 'Makanan',
          wasteProfile: profile,
          leftoverWeightG: weightG,
          leftoverSource: source,
          conditionStatus: condition,
          reason,
          allowedPathways: recommendation.allowedPathways,
          accessToken: user?.accessToken,
          roleMode: user?.role === 'admin' ? 'admin' : 'staff',
        });

        if (isMounted) {
          setAiRecommendation(result);
          // Bila jalur rekomendasi AI tersedia di allowedPathways, jadikan pilihan aktif
          if (recommendation.allowedPathways.includes(result.recommendedPathway)) {
            setSelectedActionType(result.recommendedPathway);
          }
        }
      } catch (err) {
        if (isMounted) {
          const msg =
            err instanceof Error ? err.message : 'Gagal memuat rekomendasi AI.';
          setAiFetchError(msg);
          // Mode fallback deterministik agar pengguna tetap dipandu
          setAiRecommendation({
            recommendedPathway: recommendation.primaryPathway,
            reasonTitle: 'Rekomendasi Berdasarkan Karakteristik Bahan',
            explanation:
              recommendation.safetyNotice ||
              'Pilihan penanganan organik aman yang disesuaikan dengan kondisi bahan.',
            confidence: 'sedang',
            source: 'fallback',
          });
        }
      } finally {
        if (isMounted) {
          setIsAiLoading(false);
        }
      }
    }

    void fetchAiPathway();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [
    step,
    foodName,
    selectedMenu?.category,
    profile,
    weightG,
    source,
    condition,
    reason,
    recommendation.allowedPathways,
    recommendation.primaryPathway,
    recommendation.safetyNotice,
    user?.accessToken,
    user?.role,
  ]);

  // Riwayat hari ini (atau 5 catatan terbaru)
  const todayHistory = useMemo(() => {
    const all = logsQuery.data ?? [];
    const today = todayWIB();
    const todayItems = all.filter((l) => l.recorded_at.slice(0, 10) === today);
    return (todayItems.length > 0 ? todayItems : all).slice(0, 5);
  }, [logsQuery.data]);

  function handleFoodNameChange(val: string) {
    setFoodName(val);
    const match = activeMenus.find(
      (m) => m.name.toLowerCase() === val.trim().toLowerCase()
    );
    if (match) {
      setSelectedMenuId(match.id);
      setProfile(match.waste_profile);
    }
  }

  async function handleProfileSelect(nextProfile: WasteProfile) {
    setProfile(nextProfile);
    if (canAddMenu && selectedMenu?.id) {
      try {
        await updateMenuMut.mutateAsync({
          id: selectedMenu.id,
          values: { wasteProfile: nextProfile },
        });
      } catch {
        // tetap izinkan perubahan state lokal
      }
    }
  }

  function handleSourceChange(next: LeftoverSource) {
    setSource(next);
    if (next !== 'belum_disajikan' && condition === 'layak_konsumsi') {
      setCondition('tidak_layak_konsumsi_segar');
    }
  }

  function handleGoToStep2() {
    setFormError(null);
    if (!foodName.trim()) {
      setFormError('Ketik nama makanan yang dicatat terlebih dahulu.');
      return;
    }
    setStep(2);
  }

  async function handleSaveLogAndGoToStep3() {
    setFormError(null);
    const trimmed = foodName.trim();
    if (!trimmed) {
      setFormError('Ketik nama makanan yang dicatat terlebih dahulu.');
      return;
    }

    let menuId = selectedMenuId;
    let menuTitle = trimmed;

    const existing = activeMenus.find(
      (m) => m.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (existing) {
      menuId = existing.id;
      menuTitle = existing.name;
    } else {
      try {
        const created = await createMenuMut.mutateAsync({
          name: trimmed,
          category: 'Makanan',
          wasteProfile: profile,
          isActive: true,
        });
        menuId = created.id;
        menuTitle = created.name;
        setSelectedMenuId(created.id);
      } catch {
        const fallback = activeMenus.find(
          (m) => m.name.toLowerCase() === trimmed.toLowerCase()
        ) ?? activeMenus[0];
        if (fallback) {
          menuId = fallback.id;
          menuTitle = fallback.name;
        }
      }
    }

    const parsed = wasteLogFormSchema.safeParse({
      menuId,
      recordedDate,
      preparedPortions: 1,
      servedPortions: 1,
      leftoverWeightG: weightG,
      weightMethod: 'timbang',
      leftoverSource: source,
      conditionStatus: condition,
      reason,
      notes,
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setFormError(firstIssue?.message ?? 'Periksa kembali input pencatatan.');
      return;
    }

    try {
      const created = await createLogMut.mutateAsync(parsed.data);
      setSavedLogId(created.id);
      setSelectedActionType(recommendation.primaryPathway);
      setActionWeightG(weightG);
      setRecordedActionSummary(null);
      toast.success(
        `Catatan sisa ${menuTitle} (${gramToKgDisplay(weightG)} kg) berhasil disimpan!`
      );
      setStep(3);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan catatan.';
      setFormError(msg);
    }
  }

  async function handleSaveActionInWizard() {
    setFormError(null);
    const parsed = wasteActionFormSchema.safeParse({
      wasteLogId: savedLogId ?? 'log-temp',
      actionType: selectedActionType,
      weightG: actionWeightG,
      partnerOrTarget: actionPartner,
      actionDate: recordedDate,
      notes: '',
    });

    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Input tindakan belum valid.');
      return;
    }

    const targetLog: EnrichedWasteLog = {
      id: savedLogId ?? 'log-temp',
      organization_id: user?.organizationId ?? '',
      menu_id: selectedMenu.id,
      recorded_by: user?.id ?? '',
      recorded_at: new Date().toISOString(),
      prepared_portions: 1,
      served_portions: 1,
      leftover_weight_g: weightG,
      weight_method: 'timbang',
      leftover_source: source,
      condition_status: condition,
      reason,
      notes: notes || null,
      created_at: new Date().toISOString(),
      menu_name: selectedMenu.name,
      menu_category: selectedMenu.category,
      menu_waste_profile: profile,
      recorder_name: recorderLabel,
      handled_weight_g: 0,
      remaining_weight_g: weightG,
    };

    try {
      await createActionMut.mutateAsync({
        log: targetLog,
        values: parsed.data,
      });
      setRecordedActionSummary({
        actionType: selectedActionType,
        weightG: actionWeightG,
        partner: actionPartner,
      });
      toast.success('Penanganan limbah berhasil dicatat!');
      setStep(4);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Gagal menyimpan tindakan penanganan.';
      setFormError(msg);
    }
  }

  function handleResetWizard() {
    setStep(1);
    setFoodName(activeMenus[0]?.name ?? 'Sayur lodeh');
    setWeightG(1250);
    setNotes('');
    setSavedLogId(null);
    setRecordedActionSummary(null);
    setFormError(null);
    setAiRecommendation(null);
    setAiFetchError(null);
  }

  function openEditDialog(log: EnrichedWasteLog) {
    if (!canEditWasteLog(user, log)) {
      toast.error('Kamu hanya dapat mengubah catatan yang kamu buat.');
      return;
    }
    setEditingLog(log);
    setEditWeightG(log.leftover_weight_g);
    setEditSource(log.leftover_source);
    setEditCondition(log.condition_status);
    setEditReason(log.reason);
    setEditNotes(log.notes ?? '');
  }

  async function handleUpdateLogSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLog) return;

    const parsed = wasteLogFormSchema.safeParse({
      menuId: editingLog.menu_id,
      recordedDate: editingLog.recorded_at.slice(0, 10),
      preparedPortions: Math.max(1, editingLog.prepared_portions || 1),
      servedPortions: Math.max(
        0,
        Math.min(
          Math.max(1, editingLog.prepared_portions || 1),
          editingLog.served_portions || 1
        )
      ),
      leftoverWeightG: editWeightG,
      weightMethod: editingLog.weight_method,
      leftoverSource: editSource,
      conditionStatus: editCondition,
      reason: editReason,
      notes: editNotes,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Input tidak valid.');
      return;
    }

    try {
      await updateLogMut.mutateAsync({
        id: editingLog.id,
        recordedBy: editingLog.recorded_by,
        values: parsed.data,
      });
      toast.success(`Catatan ${editingLog.menu_name} berhasil diperbarui.`);
      setEditingLog(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memperbarui catatan.');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-sf-dark sm:text-3xl">
          Catat Makanan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === 1
            ? 'Langkah 1 dari 4: pilih makanan, karakteristik bahan limbah, dan tanggal pencatatan.'
            : step === 2
              ? 'Langkah 2 dari 4: isi berat sisa, sumber, kondisi, dan penyebabnya.'
              : step === 3
                ? 'Langkah 3 dari 4: catat jalur penanganan limbah langsung atau lewati untuk dicatat nanti.'
                : 'Langkah 4 dari 4: ringkasan catatan sisa makanan berhasil disimpan.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Form Wizard Kiri */}
        <div className="lg:col-span-8 card-sirkulafood p-6 space-y-6">
          {/* Stepper 4 Langkah */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 border-b border-border pb-4 text-xs sm:text-sm">
            {[
              { num: 1, title: 'Pilih makanan' },
              { num: 2, title: 'Sisa & penyebab' },
              { num: 3, title: 'Penanganan' },
              { num: 4, title: 'Selesai' },
            ].map((s, idx) => {
              const active = step === s.num;
              const done = step > s.num;
              return (
                <div key={s.num} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (s.num <= 2 || savedLogId) {
                        setStep(s.num as 1 | 2 | 3 | 4);
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <span
                      className={cn(
                        'flex size-6 items-center justify-center rounded-full text-xs font-bold',
                        active
                          ? 'bg-primary text-white'
                          : done
                            ? 'bg-sf-mint text-primary border border-primary'
                            : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {done ? <Check className="size-3.5" /> : s.num}
                    </span>
                    <span
                      className={cn(
                        active
                          ? 'font-bold text-foreground'
                          : 'font-medium text-muted-foreground'
                      )}
                    >
                      {s.title}
                    </span>
                  </button>
                  {idx < 3 ? (
                    <span className="hidden sm:inline-block w-6 h-px bg-border" />
                  ) : null}
                </div>
              );
            })}
          </div>

          {formError ? (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl bg-[#FCE6E3] p-3 text-xs font-medium text-[#A32B1F]"
            >
              <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          ) : null}

          {step === 1 ? (
            /* LANGKAH 1: Pilih Makanan & Karakteristik Bahan */
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="food-name-input"
                  className="text-sm font-bold text-foreground block"
                >
                  Makanan apa yang kamu catat hari ini?
                </label>
                <Input
                  id="food-name-input"
                  value={foodName}
                  onChange={(e) => handleFoodNameChange(e.target.value)}
                  placeholder="Ketik nama makanan (contoh: Sayur lodeh, Nasi putih, Ayam goreng)..."
                  className="h-11 rounded-xl text-sm"
                  list="food-suggestions"
                />
                <datalist id="food-suggestions">
                  {activeMenus.map((m) => (
                    <option key={m.id} value={m.name} />
                  ))}
                </datalist>
              </div>

              {/* Profil Limbah Makanan */}
              <div className="space-y-2.5">
                <p className="text-sm font-bold text-foreground">
                  Karakteristik bahan limbah{' '}
                  <span className="font-normal text-muted-foreground">
                    (menentukan saran pakan atau pupuk)
                  </span>
                </p>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                  {(Object.keys(WASTE_PROFILES) as WasteProfile[]).map((key) => {
                    const active = profile === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleProfileSelect(key)}
                        className={cn(
                          'flex flex-col items-start gap-2 rounded-xl border p-3 text-left text-xs transition-colors',
                          active
                            ? 'border-primary bg-sf-mint text-sf-dark font-bold'
                            : 'border-border bg-white text-foreground hover:bg-muted font-medium'
                        )}
                      >
                        <Leaf className="size-4 text-primary" aria-hidden="true" />
                        <span>{WASTE_PROFILES[key].label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tanggal & Pencatat */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="log-date-input"
                    className="text-xs font-bold text-foreground block"
                  >
                    Tanggal
                  </label>
                  <div className="relative">
                    <Calendar
                      className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <Input
                      id="log-date-input"
                      type="date"
                      max={todayWIB()}
                      value={recordedDate}
                      onChange={(e) => setRecordedDate(e.target.value)}
                      className="pl-10 h-11 rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-foreground block">
                    Pencatat
                  </span>
                  <div className="flex items-center gap-2.5 rounded-xl border border-border bg-white px-3.5 h-11 text-sm">
                    <User className="size-4 text-muted-foreground" />
                    <span>{recorderLabel}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetWizard}
                  className="rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={handleGoToStep2}
                  className="rounded-xl bg-primary hover:bg-sf-dark text-white font-semibold"
                >
                  <span>Lanjut ke sisa & penyebab</span>
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : step === 2 ? (
            /* LANGKAH 2: Sisa & Penyebab */
            <div className="space-y-5">
              <div className="space-y-2.5">
                <p className="text-sm font-bold text-foreground">
                  Berapa berat sisa makanan?
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    aria-label="Kurangi berat 50 gram"
                    onClick={() => setWeightG((w) => Math.max(0, w - 50))}
                    className="flex size-11 items-center justify-center rounded-xl border border-border bg-white hover:bg-muted"
                  >
                    <Minus className="size-4" />
                  </button>
                  <div className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border bg-white h-11 px-3">
                    <input
                      type="number"
                      min={0}
                      value={weightG}
                      onChange={(e) => setWeightG(Math.max(0, Number(e.target.value)))}
                      aria-label="Berat sisa dalam gram"
                      className="w-24 text-center text-lg font-bold focus:outline-none"
                    />
                    <span className="text-xs text-muted-foreground">g</span>
                  </div>
                  <button
                    type="button"
                    aria-label="Tambah berat 50 gram"
                    onClick={() => setWeightG((w) => w + 50)}
                    className="flex size-11 items-center justify-center rounded-xl border border-border bg-white hover:bg-muted"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Input dalam gram, ringkasan menampilkan{' '}
                  <strong>{gramToKgDisplay(weightG)} kg</strong>.
                </p>
              </div>

              {/* Dari mana sisa ini? */}
              <div className="space-y-2.5">
                <p className="text-sm font-bold text-foreground">
                  Dari mana sisa ini?
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(Object.keys(LEFTOVER_SOURCES) as LeftoverSource[]).map((key) => {
                    const active = source === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSourceChange(key)}
                        className={cn(
                          'flex flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-colors',
                          active
                            ? 'border-primary bg-sf-mint text-sf-dark font-bold'
                            : 'border-border bg-white text-foreground hover:bg-muted font-medium'
                        )}
                      >
                        {key === 'belum_disajikan' ? (
                          <Gift className="size-4" />
                        ) : key === 'sisa_penyajian' ? (
                          <Soup className="size-4" />
                        ) : (
                          <Leaf className="size-4" />
                        )}
                        <span className="text-xs">{LEFTOVER_SOURCES[key].label}</span>
                        {key === 'sisa_piring' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FCE6E3] px-2 py-0.5 text-[11px] font-semibold text-[#A32B1F]">
                            <Lock className="size-3" />
                            <span>Tidak untuk dimakan</span>
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kondisi Sisa */}
              <div className="space-y-2">
                <p className="text-sm font-bold text-foreground">Kondisi sisa</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(CONDITION_STATUSES) as ConditionStatus[]).map((key) => {
                    const locked =
                      key === 'layak_konsumsi' && source !== 'belum_disajikan';
                    const active = condition === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={locked}
                        onClick={() => setCondition(key)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                          locked
                            ? 'border-border bg-muted text-muted-foreground cursor-not-allowed'
                            : active
                              ? 'border-primary bg-sf-mint text-sf-dark'
                              : 'border-border bg-white text-foreground hover:bg-muted'
                        )}
                      >
                        {locked ? (
                          <Lock className="size-3.5" />
                        ) : active ? (
                          <Check className="size-3.5 text-primary" />
                        ) : null}
                        <span>{CONDITION_STATUSES[key].label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Penyebab */}
              <div className="space-y-2">
                <p className="text-sm font-bold text-foreground">
                  Apa penyebab makanan tidak habis?
                </p>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(WASTE_REASONS) as WasteReason[]).map((key) => {
                    const active = reason === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setReason(key)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                          active
                            ? 'border-primary bg-sf-mint text-sf-dark'
                            : 'border-border bg-white text-foreground hover:bg-muted'
                        )}
                      >
                        {active ? (
                          <Check className="size-3.5 text-primary" />
                        ) : null}
                        <span>{WASTE_REASONS[key].label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Catatan opsional */}
              <div className="space-y-1.5">
                <label
                  htmlFor="waste-notes"
                  className="text-sm font-bold text-foreground block"
                >
                  Catatan (opsional)
                </label>
                <Textarea
                  id="waste-notes"
                  value={notes}
                  maxLength={500}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: banyak sayur tersisa di piring..."
                  className="rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="rounded-xl"
                >
                  <ChevronLeft className="size-4 mr-1" />
                  <span>Kembali</span>
                </Button>
                <Button
                  type="button"
                  disabled={createLogMut.isPending}
                  onClick={handleSaveLogAndGoToStep3}
                  className="rounded-xl bg-primary hover:bg-sf-dark text-white font-semibold"
                >
                  <span>
                    {createLogMut.isPending
                      ? 'Menyimpan...'
                      : 'Simpan & lanjut ke penanganan'}
                  </span>
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : step === 3 ? (
            /* LANGKAH 3: Penanganan Langsung */
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#CBE6D4] bg-[#EAF7EF] p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-sf-dark">
                    Catatan berhasil disimpan!
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedMenu.name} · {gramToKgDisplay(weightG)} kg ({weightG} g) ·{' '}
                    {LEFTOVER_SOURCES[source].label}
                  </p>
                </div>
                <PathwayBadge
                  pathway={
                    aiRecommendation?.recommendedPathway ??
                    recommendation.primaryPathway
                  }
                />
              </div>

              {recommendation.locksHumanConsumption ? (
                <div className="flex items-center gap-2.5 rounded-xl bg-[#FCE6E3] p-3 text-xs font-medium text-[#A32B1F]">
                  <Lock className="size-4 shrink-0" />
                  <span>
                    {source === 'sisa_piring'
                      ? 'Sisa piring dikunci: donasi aman dan recycle dapur tidak tersedia.'
                      : 'Makanan tidak layak konsumsi manusia: donasi aman dan recycle dapur dikunci.'}
                  </span>
                </div>
              ) : null}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground block">
                    Pilih jenis tindakan pengolahan
                  </span>
                  {aiRecommendation && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#16783F]">
                      <Sparkles className="size-3 text-[#16783F]" />
                      <span>Rekomendasi AI Gemini aktif</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2.5 pt-0.5">
                  {recommendation.allowedPathways.map((p) => {
                    const isAiRecommended =
                      aiRecommendation?.recommendedPathway === p;
                    const isSelected = selectedActionType === p;
                    return (
                      <div key={p} className="relative inline-flex">
                        <button
                          type="button"
                          onClick={() => setSelectedActionType(p)}
                          className={cn(
                            'rounded-full transition-all relative',
                            isSelected
                              ? 'ring-2 ring-primary ring-offset-2'
                              : 'opacity-85 hover:opacity-100',
                            isAiRecommended && !isSelected && 'ring-1 ring-[#52b788]'
                          )}
                        >
                          <PathwayBadge pathway={p} size="md" />
                        </button>
                        {isAiRecommended ? (
                          <span
                            title="Rekomendasi AI Gemini"
                            className="absolute -top-2.5 -right-1.5 flex items-center gap-0.5 rounded-full bg-[#0b3b24] px-1.5 py-0.5 text-[9px] font-bold text-[#74e39a] shadow-xs pointer-events-none"
                          >
                            <Sparkles className="size-2.5" />
                            <span>AI Rekomendasi</span>
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {/* Kotak Rekomendasi AI Gemini (Berupa Teks Sederhana & Penjelasan Singkat) */}
                <div className="rounded-2xl border border-[#bfe0c9] bg-[#f2f8f4] p-4 text-xs">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#d8e8dc]">
                    <div className="flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded-lg bg-[#0b3b24] text-[#74e39a]">
                        <Sparkles className="size-3.5" />
                      </span>
                      <span className="font-bold text-[#0b3b24]">
                        Rekomendasi AI Gemini
                      </span>
                      {isAiLoading && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#4a5d52]">
                          <Loader2 className="size-3 animate-spin text-primary" />
                          <span>Menganalisis jenis sisa {foodName}...</span>
                        </span>
                      )}
                    </div>
                    {aiRecommendation && !isAiLoading && (
                      <span className="rounded-full bg-[#dcf2e4] px-2.5 py-0.5 text-[10px] font-bold text-[#16783F]">
                        {aiRecommendation.source === 'gemini'
                          ? 'Google Gemini 2.5 Flash'
                          : 'Rekomendasi Sirkular'}
                      </span>
                    )}
                  </div>

                  {isAiLoading ? (
                    <div className="pt-2.5 flex items-center gap-2 text-muted-foreground animate-pulse">
                      <Loader2 className="size-3.5 animate-spin text-[#16783F]" />
                      <span>
                        Sedang menghubungkan ke Google Gemini API untuk merekomendasikan jalur terbaik untuk {foodName}...
                      </span>
                    </div>
                  ) : aiRecommendation ? (
                    <div className="pt-2.5 space-y-1">
                      <p className="text-[#0c2617]">
                        Pilihan yang direkomendasikan:{' '}
                        <strong className="text-[#16783F] font-bold">
                          {PATHWAYS[aiRecommendation.recommendedPathway]?.label ?? aiRecommendation.recommendedPathway}
                        </strong>
                        {aiRecommendation.reasonTitle ? (
                          <span className="text-[#52645a]"> — {aiRecommendation.reasonTitle}</span>
                        ) : null}
                      </p>
                      <p className="leading-relaxed text-[#3d5245]">
                        {aiRecommendation.explanation}
                      </p>
                    </div>
                  ) : aiFetchError ? (
                    <div className="pt-2 text-[11px] text-[#705200]">
                      <p>{aiFetchError}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="step3-weight">Berat dialihkan (gram)</Label>
                  <Input
                    id="step3-weight"
                    type="number"
                    min={1}
                    max={weightG}
                    value={actionWeightG}
                    onChange={(e) =>
                      setActionWeightG(
                        Math.min(weightG, Math.max(0, Number(e.target.value)))
                      )
                    }
                    className="h-11 rounded-xl font-bold"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Maksimal {weightG} g ({gramToKgDisplay(weightG)} kg). Sisa belum
                    ditangani setelah ini: {Math.max(0, weightG - actionWeightG)} g.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="step3-partner">Mitra / tujuan (opsional)</Label>
                  <Input
                    id="step3-partner"
                    value={actionPartner}
                    onChange={(e) => setActionPartner(e.target.value)}
                    placeholder="Contoh: Peternak mitra, Pak Slamet"
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(4)}
                  className="rounded-xl"
                >
                  Lewati, catat nanti di Pengelolaan Limbah
                </Button>
                <Button
                  type="button"
                  disabled={createActionMut.isPending}
                  onClick={handleSaveActionInWizard}
                  className="rounded-xl bg-primary hover:bg-sf-dark text-white font-semibold"
                >
                  <span>
                    {createActionMut.isPending
                      ? 'Menyimpan...'
                      : 'Simpan penanganan & selesai'}
                  </span>
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            /* LANGKAH 4: Ringkasan Sukses */
            <div className="space-y-6 py-2">
              <div className="rounded-2xl border border-[#CBE6D4] bg-[#EAF7EF] p-6 flex flex-col sm:flex-row items-center gap-5">
                <ComposterIllustration className="size-20 shrink-0" />
                <div className="space-y-1 text-center sm:text-left">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white">
                    <Check className="size-3.5" />
                    <span>Pencatatan Selesai</span>
                  </span>
                  <h2 className="text-lg font-bold text-sf-dark pt-1">
                    Data sisa {selectedMenu.name} berhasil tercatat!
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Data langsung masuk ke perhitungan deterministik Dashboard &
                    Analitik catatanmu.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border p-3.5">
                  <p className="text-[11px] text-muted-foreground">Makanan</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">
                    {selectedMenu.name}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3.5">
                  <p className="text-[11px] text-muted-foreground">Berat sisa</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">
                    {gramToKgDisplay(weightG)} kg ({weightG} g)
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3.5">
                  <p className="text-[11px] text-muted-foreground">
                    Kondisi sisa
                  </p>
                  <p className="text-xs font-bold text-foreground mt-0.5">
                    {CONDITION_STATUSES[condition].label}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-3.5">
                  <p className="text-[11px] text-muted-foreground">
                    Sumber & Penyebab
                  </p>
                  <p className="text-xs font-bold text-foreground mt-0.5">
                    {LEFTOVER_SOURCES[source].label} · {WASTE_REASONS[reason].label}
                  </p>
                </div>
              </div>

              {recordedActionSummary ? (
                <div className="rounded-xl border border-border bg-[#F6FAF7] p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">
                      Tindakan pengolahan tercatat
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Dialihkan {gramToKgDisplay(recordedActionSummary.weightG)} kg (
                      {recordedActionSummary.weightG} g) ke{' '}
                      {recordedActionSummary.partner || 'mitra pengolahan'}.
                    </p>
                  </div>
                  <PathwayBadge pathway={recordedActionSummary.actionType} />
                </div>
              ) : (
                <div className="rounded-xl border border-[#F0D6A8] bg-[#FFFBF2] p-4 flex items-center justify-between gap-3 text-xs text-[#8A5200]">
                  <span>
                    Penanganan sirkular belum dicatat ({gramToKgDisplay(weightG)} kg
                    menunggu tindakan).
                  </span>
                  <Link
                    to="/app/limbah"
                    className="font-bold underline hover:opacity-80 shrink-0"
                  >
                    Buka Pengelolaan Limbah
                  </Link>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetWizard}
                  className="rounded-xl border-primary text-primary hover:bg-sf-mint font-semibold"
                >
                  Catat makanan lain
                </Button>
                <Button
                  asChild
                  className="rounded-xl bg-primary hover:bg-sf-dark text-white font-semibold"
                >
                  <Link to="/app">Ke Beranda</Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Kolom Kanan */}
        <div className="lg:col-span-4 space-y-4">
          {step === 1 ? (
            <>
              <div className="rounded-2xl border border-[#CBE6D4] bg-[#EAF7EF] p-6 flex flex-col items-center text-center gap-3">
                <VeggieBasket className="size-24" />
                <p className="text-xs text-muted-foreground">
                  Catat setiap hari agar pola sisa mudah terlihat.
                </p>
              </div>

              <div className="card-sirkulafood p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground">
                    Riwayat hari ini
                  </h2>
                  {(user?.isDemo ?? true) ? <SimulatedBadge /> : null}
                </div>
                {todayHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    Belum ada catatan hari ini.
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {todayHistory.map((item) => {
                      const editable = canEditWasteLog(user, item);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                        >
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              {item.menu_name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {LEFTOVER_SOURCES[item.leftover_source].shortLabel} ·{' '}
                              {formatDateShort(item.recorded_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs font-bold text-foreground">
                              {gramToKgDisplay(item.leftover_weight_g)} kg
                            </span>
                            <button
                              type="button"
                              onClick={() => openEditDialog(item)}
                              title={
                                editable
                                  ? `Ubah catatan ${item.menu_name}`
                                  : 'Hanya pembuat catatan yang dapat mengubah'
                              }
                              aria-label={`Ubah catatan ${item.menu_name}`}
                              className={cn(
                                'transition-colors',
                                editable
                                  ? 'text-muted-foreground hover:text-primary'
                                  : 'text-muted-foreground/40 cursor-not-allowed'
                              )}
                            >
                              <Pencil className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-[#CBE6D4] bg-[#EAF7EF] p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <ScaleIllustration className="size-14" />
                  <div>
                    <p className="text-xs text-muted-foreground">Pratinjau sisa</p>
                    <p className="text-2xl font-bold text-foreground">
                      {gramToKgDisplay(weightG)} kg
                    </p>
                  </div>
                </div>
                <p className="text-xs font-bold text-foreground">
                  Jalur penanganan disarankan
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <PathwayBadge pathway={recommendation.primaryPathway} />
                  {recommendation.secondaryPathway ? (
                    <PathwayBadge pathway={recommendation.secondaryPathway} />
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {recommendation.safetyNotice}
                </p>
              </div>

              {recommendation.locksHumanConsumption ? (
                <div className="card-sirkulafood p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#A32B1F]">
                    <Lock className="size-4" />
                    <span>
                      {source === 'sisa_piring'
                        ? 'Dikunci untuk sisa piring'
                        : 'Dikunci untuk non-konsumsi'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground line-through">
                      <Lock className="size-3" />
                      <span>Donasi aman</span>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground line-through">
                      <Lock className="size-3" />
                      <span>Recycle dapur</span>
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Sisa piring tidak boleh disalurkan atau diolah ulang untuk
                    dikonsumsi manusia.
                  </p>
                </div>
              ) : null}

              <div className="flex items-start gap-2.5 rounded-2xl bg-sf-mint/70 p-4 text-xs text-sf-dark">
                <Check className="size-4 text-primary shrink-0 mt-0.5" />
                <span>
                  Langkah 4: setelah disimpan, kamu melihat ringkasan dan bisa
                  mencatat catatan berikutnya.
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dialog Edit Log Riwayat */}
      <Dialog
        open={Boolean(editingLog)}
        onOpenChange={(v) => {
          if (!v) setEditingLog(null);
        }}
      >
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah Catatan: {editingLog?.menu_name}</DialogTitle>
            <DialogDescription>
              Perbarui berat sisa (gram), sumber, atau alasan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateLogSubmit} className="space-y-4 pt-1">
            <div className="space-y-1">
              <Label htmlFor="edit-weight">Berat sisa (gram)</Label>
              <Input
                id="edit-weight"
                type="number"
                min={0}
                value={editWeightG}
                onChange={(e) => setEditWeightG(Number(e.target.value))}
                className="rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">
                Setara {gramToKgDisplay(editWeightG)} kg
              </p>
            </div>

            <div className="space-y-1">
              <Label>Sumber sisa</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(LEFTOVER_SOURCES) as LeftoverSource[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setEditSource(k);
                      if (
                        k !== 'belum_disajikan' &&
                        editCondition === 'layak_konsumsi'
                      ) {
                        setEditCondition('tidak_layak_konsumsi_segar');
                      }
                    }}
                    className={cn(
                      'rounded-xl border px-2.5 py-2 text-xs font-medium',
                      editSource === k
                        ? 'border-primary bg-sf-mint text-sf-dark font-bold'
                        : 'border-border bg-white'
                    )}
                  >
                    {LEFTOVER_SOURCES[k].shortLabel}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Penyebab</Label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(WASTE_REASONS) as WasteReason[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setEditReason(k)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium',
                      editReason === k
                        ? 'border-primary bg-sf-mint text-sf-dark font-bold'
                        : 'border-border bg-white'
                    )}
                  >
                    {WASTE_REASONS[k].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingLog(null)}
                className="rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={updateLogMut.isPending}
                className="rounded-xl bg-primary hover:bg-sf-dark text-white"
              >
                Simpan perubahan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
