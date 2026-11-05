import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Info,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { AiRobot } from '@/components/illustrations';
import { PathwayBadge } from '@/components/shared/PathwayBadge';
import { SimulatedBadge } from '@/components/shared/SimulatedBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  requestAiInsights,
  requestGeminiChat,
  type AiEnvelope,
  type ChatTurn,
} from '@/features/ai-insights/service';
import { computeAnalyticsSummary } from '@/features/analytics/metrics';
import { useAuth } from '@/features/auth/AuthContext';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import {
  useWasteActionsQuery,
  useWasteLogsQuery,
} from '@/features/waste/store';
import { todayWIB } from '@/lib/dates';

const USER_QUICK_CHIPS = [
  'Menu mana dikurangi?',
  'Kompos atau maggot?',
  'Olah ampas dapur',
];

const ADMIN_QUICK_CHIPS = [
  'Penyebab sisa terbesar seluruh user?',
  'Jalur sirkular paling efektif?',
  'Saran intervensi untuk pengguna',
];

const INITIAL_CHAT_TURNS: ChatTurn[] = [];

export function AiInsightsPage() {
  const { user, signInDemo } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [prompt, setPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatSending, setIsChatSending] = useState(false);
  const [chatTurns, setChatTurns] = useState<ChatTurn[]>(INITIAL_CHAT_TURNS);

  const logsQuery = useWasteLogsQuery();
  const actionsQuery = useWasteActionsQuery();

  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);
  const actions = useMemo(() => actionsQuery.data ?? [], [actionsQuery.data]);

  const todayStr = todayWIB();
  const summary = useMemo(
    () => computeAnalyticsSummary(logs, actions, todayStr),
    [logs, actions, todayStr]
  );

  const [activeEnvelope, setCustomEnvelope] = useState<AiEnvelope | null>(null);
  const insight = activeEnvelope?.result;

  const periodStartStr = summary.dailyTrend7Days[0]?.date ?? todayStr;
  const quickChips = isAdmin ? ADMIN_QUICK_CHIPS : USER_QUICK_CHIPS;

  const getAiAccessToken = async (): Promise<string> => {
    const { data: sessionData } = await supabase.auth.getSession();
    let accessToken = user?.accessToken ?? sessionData.session?.access_token ?? null;
    if (!accessToken && user?.isDemo) {
      const { error } = await signInDemo(user.role);
      if (error) throw new Error(error);
      const { data } = await supabase.auth.getSession();
      accessToken = data.session?.access_token ?? null;
    }
    if (!accessToken) {
      if (!env.isConfigured) {
        throw new Error(
          'Frontend masih berjalan dalam mode simulasi: Vite belum memuat VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY. Hentikan Vite, jalankan ulang dari folder app, lalu login kembali.'
        );
      }
      throw new Error(
        'Tidak ada sesi Supabase aktif di browser. Jika baru daftar, konfirmasi email dahulu; lalu keluar dan login kembali sebelum menekan Analyze.'
      );
    }
    return accessToken;
  };

  const handleRunAutoInsight = async () => {
    setIsAnalyzing(true);
    setCustomEnvelope(null);
    try {
      const accessToken = await getAiAccessToken();
      const envRes = await requestAiInsights({
        summary,
        logs,
        interactionType: 'auto_insight',
        periodStart: periodStartStr,
        periodEnd: todayStr,
        accessToken,
        roleMode: isAdmin ? 'admin' : 'staff',
        scope: isAdmin ? 'global' : 'personal',
      });
      setCustomEnvelope(envRes);
      if (envRes.status === 'completed') {
        toast.success(`Analisis limbah dari ${envRes.modelId} berhasil dimuat.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gemini belum dapat dihubungi.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendChat = async (questionOverride?: string) => {
    const text = (questionOverride ?? prompt).trim();
    if (!text) {
      toast.error('Ketik pertanyaan terlebih dahulu.');
      return;
    }
    if (text.length > 500) {
      toast.error('Pertanyaan maksimal 500 karakter.');
      return;
    }

    const userTurn: ChatTurn = {
      id: `u-${crypto.randomUUID()}`,
      sender: 'user',
      text,
      createdAt: 'Baru saja',
    };
    const nextHistory = [...chatTurns, userTurn];
    setChatTurns(nextHistory);
    if (!questionOverride) {
      setPrompt('');
    }

    setIsChatSending(true);
    try {
      const accessToken = await getAiAccessToken();
      const chatRes = await requestGeminiChat({
        summary,
        logs,
        userPrompt: text,
        chatHistory: nextHistory.map((t) => ({
          sender: t.sender,
          text: t.text,
        })),
        periodStart: periodStartStr,
        periodEnd: todayStr,
        accessToken,
        roleMode: isAdmin ? 'admin' : 'staff',
        scope: isAdmin ? 'global' : 'personal',
      });

      const aiTurn: ChatTurn = {
        id: `ai-${crypto.randomUUID()}`,
        sender: 'ai',
        text: chatRes.reply,
        basis: isAdmin
          ? `Dijawab oleh Gemini berdasarkan ${summary.totalLogsCount} catatan lintas pengguna.`
          : `Dijawab langsung oleh Gemini berdasarkan ${summary.totalLogsCount} catatan sisa makananmu.`,
        sourceBadge: `AI (${chatRes.modelId})`,
        createdAt: 'Baru saja',
      };
      setChatTurns((prev) => [...prev, aiTurn]);
    } catch (err) {
      const errMsg =
        err instanceof Error
          ? err.message
          : 'Gagal menghubungi Gemini AI.';
      toast.error(`Gagal memanggil Gemini: ${errMsg}`);
      const errTurn: ChatTurn = {
        id: `ai-err-${crypto.randomUUID()}`,
        sender: 'ai',
        text: `Maaf, koneksi ke AI gagal (${errMsg}). Pastikan dev server backend sudah berjalan (cd server && npm run dev) dan VITE_API_BASE_URL di app/.env.local benar.`,
        sourceBadge: 'Koneksi Gemini Gagal',
        createdAt: 'Baru saja',
      };
      setChatTurns((prev) => [...prev, errTurn]);
    } finally {
      setIsChatSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-sf-dark sm:text-3xl">
              {isAdmin ? 'AI Insights (Global Admin)' : 'AI Insights'}
            </h1>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">
                <ShieldCheck className="size-3.5" />
                <span>Multi-User Scope</span>
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>
              {isAdmin
                ? 'Analisis Gemini untuk agregasi data seluruh pengguna, tanpa angka karangan.'
                : 'Analisis dari catatan sisa makanan pribadimu, tanpa angka karangan.'}
            </span>
            {(user?.isDemo ?? true) ? <SimulatedBadge /> : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3.5 py-2 text-xs font-medium text-foreground">
            <Calendar className="size-4 text-muted-foreground" />
            <span>7 hari terakhir</span>
          </div>
          <Button
            type="button"
            disabled={isAnalyzing}
            onClick={handleRunAutoInsight}
            className="rounded-xl bg-primary hover:bg-sf-dark text-white font-semibold"
          >
            {isAnalyzing ? (
              <RefreshCw className="size-4 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="size-4 mr-1.5" />
            )}
            <span>
              {isAnalyzing
                ? 'Menganalisis...'
                : isAdmin
                  ? 'Analisis Global'
                  : 'Analisis Limbah'}
            </span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Kolom Kiri: Pola, Jawaban, Pencegahan, Pengolahan Sirkular */}
        <div className="lg:col-span-7 space-y-5">
          {/* AI menemukan pola menarik */}
          <div className="rounded-2xl border border-[#CBE6D4] bg-[#EAF7EF] p-5 flex items-start gap-4">
            <AiRobot className="size-16 shrink-0" />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  {insight
                    ? 'AI menemukan pola menarik'
                    : isAdmin
                      ? 'Insight Gemini Lintas Pengguna'
                      : 'Insight Gemini'}
                </h2>
                {!activeEnvelope ? (
                  <span className="rounded-full bg-white/80 border border-[#CBE6D4] px-2 py-0.5 text-[10px] font-semibold text-sf-dark">
                    Menunggu Gemini
                  </span>
                ) : (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">
                    {activeEnvelope.modelId}
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-foreground">
                {insight?.observed_patterns[0]?.finding ??
                  (isAnalyzing
                    ? 'Gemini sedang menganalisis data catatan dari server...'
                    : isAdmin
                      ? `Tekan Analisis Global untuk meminta Gemini menganalisis ${summary.totalLogsCount} catatan dari pengguna yang dipilih.`
                      : 'Tekan Analisis Limbah untuk meminta Gemini menganalisis catatan sisa makananmu.')}
              </p>
              <p className="text-[11px] text-muted-foreground pt-1">
                {activeEnvelope
                  ? `Model: ${activeEnvelope.modelId} · ${summary.totalLogsCount} catatan · ${insight?.observed_patterns[0]?.uncertainty_note ?? ''}`
                  : `Cakupan data aktif: ${summary.totalLogsCount} catatan (${summary.totalLeftoverWeightKg} kg).`}
              </p>
            </div>
          </div>

          {/* Jawaban untuk pertanyaanmu */}
          {insight?.direct_answer_to_user ? (
            <div className="rounded-2xl border-2 border-primary bg-white p-5 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <User className="size-4 text-primary" />
                <span>Jawaban untuk pertanyaanmu</span>
              </div>
              <p className="text-xs leading-relaxed whitespace-pre-line text-foreground">
                {insight?.direct_answer_to_user}
              </p>
            </div>
          ) : null}

          {/* Rekomendasi pencegahan */}
          <div className="card-sirkulafood p-5 space-y-4">
            <h2 className="text-base font-bold text-foreground">
              Rekomendasi pencegahan
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(insight?.prevention_recommendations ?? []).map((rec, idx) => (
                <div
                  key={`${rec.title}-${idx}`}
                  className="rounded-xl border border-border p-4 space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-foreground">
                      {rec.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {rec.action}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {rec.basis}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#DCF1F4] px-3 py-1.5 text-xs font-semibold text-[#14707F]">
                    <BarChart3 className="size-3.5" />
                    <span>{rec.metric_to_watch}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rekomendasi pengolahan sirkular */}
          <div className="card-sirkulafood p-5 space-y-4">
            <h2 className="text-base font-bold text-foreground">
              Rekomendasi pengolahan sirkular
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(insight?.circular_waste_recommendations ?? []).map((circ, idx) => (
                <div
                  key={`${circ.waste_stream}-${idx}`}
                  className="rounded-xl border border-border p-3.5 space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-foreground">
                      {circ.waste_stream}
                    </h3>
                    <PathwayBadge pathway={circ.recommended_pathway} />
                    <p className="text-xs text-muted-foreground">
                      {circ.reason}
                    </p>
                  </div>
                  <div className="flex items-start gap-1.5 rounded-lg bg-[#FFF8EA] p-2 text-[11px] text-[#8A5200]">
                    <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                    <span>{circ.caution}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Keterbatasan data */}
          <div className="flex items-center gap-2.5 rounded-xl border border-[#F0D6A8] bg-[#FFFBF2] px-4 py-3 text-xs text-[#8A5200]">
            <Info className="size-4 shrink-0" />
            <span>
              <strong>Keterbatasan data:</strong>{' '}
              {insight?.limitations[0] ?? 'Hasil analisis dari Gemini akan muncul setelah permintaan berhasil.'}
            </span>
          </div>
        </div>

        {/* Kolom Kanan: Panel Chat AI */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 lg:self-start">
          <div className="card-sirkulafood overflow-hidden flex flex-col h-[580px] max-h-[calc(100vh-4rem)]">
            <div className="bg-primary px-5 py-4 flex items-center justify-between gap-3 text-white shrink-0">
              <div className="flex items-center gap-3">
                <AiRobot className="size-9" />
                <div>
                  <h2 className="text-sm font-bold">
                    {isAdmin ? 'Chat AI Admin SirkulaFood' : 'Chat AI SirkulaFood'}
                  </h2>
                  <p className="text-xs text-white/80">
                    {isAdmin
                      ? `Data lintas pengguna (${summary.totalLogsCount} catatan)`
                      : `Berdasarkan data pribadimu (${summary.totalLogsCount} catatan)`}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold text-white shrink-0">
                {activeEnvelope ? activeEnvelope.modelId : 'Menunggu Gemini'}
              </span>
            </div>

            <div className="flex-1 min-h-0 p-4 space-y-3 bg-white overflow-y-auto">
              <p className="text-center text-[11px] text-muted-foreground">
                Hari ini
              </p>

              {chatTurns.map((turn) =>
                turn.sender === 'user' ? (
                  <div
                    key={turn.id}
                    className="ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-xs text-white"
                  >
                    {turn.text}
                  </div>
                ) : (
                  <div
                    key={turn.id}
                    className="mr-auto max-w-[90%] rounded-2xl bg-[#F4F8F5] border border-border px-4 py-3 text-xs text-foreground space-y-1.5"
                  >
                    {turn.sourceBadge ? (
                      <span className="inline-block rounded-full bg-sf-mint px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {turn.sourceBadge}
                      </span>
                    ) : null}
                    <p className="leading-relaxed whitespace-pre-line">{turn.text}</p>
                    {turn.basis ? (
                      <p className="text-[11px] text-muted-foreground">
                        {turn.basis}
                      </p>
                    ) : null}
                  </div>
                )
              )}

              {chatTurns.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  {isAdmin
                    ? 'Belum ada percakapan. Tanyakan pola lintas pengguna atau efektivitas jalur sirkular kepada Gemini.'
                    : 'Belum ada percakapan. Kirim pertanyaan untuk meminta jawaban Gemini berdasarkan catatan sisa makananmu.'}
                </p>
              ) : null}

              {isChatSending ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                  <span className="size-2 rounded-full bg-primary animate-pulse" />
                  <span>AI sedang menyusun jawaban...</span>
                </div>
              ) : null}
            </div>

            {/* Quick Chips Bar */}
            <div className="flex flex-wrap gap-1.5 px-4 py-2 border-t border-border/70 bg-[#F9FBF9] shrink-0">
              {quickChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={isChatSending}
                  onClick={() => handleSendChat(chip)}
                  className="rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-foreground hover:bg-sf-mint disabled:opacity-50 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="border-t border-border p-3.5 space-y-2 bg-white shrink-0">
              <Textarea
                value={prompt}
                maxLength={500}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendChat();
                  }
                }}
                placeholder={
                  isAdmin
                    ? 'Tanya soal statistik limbah seluruh pengguna atau rekomendasi program...'
                    : 'Tanya soal catatan sisa makanan atau pengolahan limbah...'
                }
                aria-label="Pertanyaan untuk Chat AI SirkulaFood"
                className="rounded-xl text-xs min-h-16 resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {prompt.length}/500 karakter
                </span>
                <Button
                  type="button"
                  size="sm"
                  disabled={isChatSending}
                  onClick={() => void handleSendChat()}
                  className="rounded-xl bg-primary hover:bg-sf-dark text-white font-semibold"
                >
                  <Send className="size-3.5 mr-1.5" />
                  <span>{isChatSending ? 'Mengirim...' : 'Kirim'}</span>
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                AI membahas catatan sisa makanan, pencegahan sisa, dan pengolahan
                limbah organik. AI tidak menilai makanan aman dimakan manusia.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
