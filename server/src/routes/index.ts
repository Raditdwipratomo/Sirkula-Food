import { Router } from 'express';
import { z } from 'zod';
import { isGeminiConfigured, isSupabaseConfigured } from '../config/env.js';
import { getSupabaseAdmin, getUserScopedSupabase } from '../config/supabase.js';
import {
  aiInsightRequestSchema,
  aiPathwayRecommendationRequestSchema,
  clientLogItemSchema,
} from '../domain/ai-contract.js';
import { getCircularRecommendation } from '../domain/circular-rules.js';
import { summarizePublicImpact, type PublicWasteAction, type PublicWasteLog } from '../domain/public-impact.js';
import {
  computeDeterministicAnalytics,
  type RawWasteAction,
  type RawWasteLog,
} from '../domain/metrics.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import {
  generateGeminiChat,
  generateGeminiInsight,
  generateGeminiPathwayRecommendation,
} from '../services/gemini.js';

export const apiRouter = Router();

const PUBLIC_IMPACT_CACHE_MS = 30_000;
let publicImpactCache: { expiresAt: number; value: ReturnType<typeof summarizePublicImpact> } | null = null;

async function fetchAllPages<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

// Rate limiter sederhana di memori untuk endpoint AI (maks 10 request / menit per kunci)
const aiRateMap = new Map<string, { count: number; resetAt: number }>();

function checkAiRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = aiRateMap.get(key);
  if (!entry || now > entry.resetAt) {
    aiRateMap.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) {
    return false;
  }
  entry.count += 1;
  return true;
}

apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sirkulafood-express-api',
    supabaseConfigured: isSupabaseConfigured(),
    geminiConfigured: isGeminiConfigured(),
  });
});

// Hanya menyajikan statistik agregat lintas organisasi untuk landing page publik.
apiRouter.get('/public/impact', async (_req, res) => {
  if (publicImpactCache && publicImpactCache.expiresAt > Date.now()) {
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=30');
    res.json(publicImpactCache.value);
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const [logs, actions] = await Promise.all([
      fetchAllPages<PublicWasteLog>((from, to) =>
        supabase.from('waste_logs').select('id, recorded_at, leftover_weight_g, prepared_portions, served_portions, leftover_source, reason, notes').order('recorded_at', { ascending: true }).range(from, to)
      ),
      fetchAllPages<PublicWasteAction>((from, to) =>
        supabase.from('waste_actions').select('waste_log_id, action_type, weight_g').range(from, to)
      ),
    ]);
    const summary = summarizePublicImpact(logs, actions);
    publicImpactCache = { value: summary, expiresAt: Date.now() + PUBLIC_IMPACT_CACHE_MS };
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=30');
    res.json(summary);
  } catch (error) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(503).json({ error: 'Statistik dampak belum dapat dimuat. Silakan coba lagi nanti.' });
  }
});

// Endpoint khusus Admin untuk mengambil seluruh data lintas pengguna (Global Admin Dashboard)
apiRouter.get('/admin/overview', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const supabase = getSupabaseAdmin();
    const [profilesRes, menusRes, logsRes, actionsRes, authUsersRes] = await Promise.all([
      supabase.from('profiles').select('id, organization_id, full_name, role, is_active, created_at').order('created_at', { ascending: true }),
      supabase.from('menus').select('*'),
      supabase.from('waste_logs').select('*').order('recorded_at', { ascending: false }).limit(1000),
      supabase.from('waste_actions').select('*').order('action_date', { ascending: false }).limit(2000),
      supabase.auth.admin.listUsers({ perPage: 1000 }),
    ]);

    if (profilesRes.error) throw new Error(profilesRes.error.message);
    if (logsRes.error) throw new Error(logsRes.error.message);
    if (actionsRes.error) throw new Error(actionsRes.error.message);

    const emailMap = new Map<string, string>();
    for (const u of authUsersRes.data?.users ?? []) {
      if (u.email) emailMap.set(u.id, u.email);
    }

    const profiles = (profilesRes.data ?? []).map((p) => ({
      ...p,
      email: emailMap.get(p.id) ?? `${p.full_name.toLowerCase().replace(/\s+/g, '.')}@pengguna.id`,
    }));

    res.json({
      profiles,
      menus: menusRes.data ?? [],
      logs: logsRes.data ?? [],
      actions: actionsRes.data ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal memuat data global admin.';
    res.status(500).json({ error: message });
  }
});

const circularInputSchema = z.object({
  leftoverSource: z.enum(['belum_disajikan', 'sisa_penyajian', 'sisa_piring']),
  conditionStatus: z.enum([
    'layak_konsumsi',
    'tidak_layak_konsumsi_segar',
    'basi_fermentasi',
  ]),
  wasteProfile: z.enum([
    'karbohidrat',
    'sayuran_serat',
    'protein_hewani',
    'buah_kulit',
    'berkuah_berminyak',
    'campuran',
  ]),
});

apiRouter.post('/circular/recommend', (req, res) => {
  const parsed = circularInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Parameter input rekomendasi tidak valid.',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }
  const result = getCircularRecommendation(parsed.data);
  res.json(result);
});

const aiRequestSchema = aiInsightRequestSchema;

function dayAfterJakartaDate(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

const REASON_LABELS: Record<string, string> = {
  produksi_berlebih: 'Masak / beli kebanyakan',
  porsi_terlalu_besar: 'Tidak habis dimakan',
  selera_rendah: 'Lupa disimpan / kedaluwarsa',
  rasa_menu_tidak_sesuai: 'Kurang cocok / bosan',
  lainnya: 'Bagian tak termakan / ampas dapur',
};

const SOURCE_LABELS: Record<string, string> = {
  belum_disajikan: 'Makanan utuh (belum disentuh)',
  sisa_penyajian: 'Sisa masak / penyimpanan dapur',
  sisa_piring: 'Sisa makan di piring',
};

async function getAiContext(request: z.infer<typeof aiRequestSchema>, req: import('express').Request) {
  const isAdmin = req.user!.role === 'admin';
  const isGlobalScope = isAdmin && request.scope !== 'personal';
  const db = isGlobalScope ? getSupabaseAdmin() : getUserScopedSupabase(req.accessToken!);

  let query = db
    .from('waste_logs')
    .select('id, recorded_by, recorded_at, prepared_portions, served_portions, leftover_weight_g, leftover_source, condition_status, reason, notes, menus(name, category, waste_profile)')
    .gte('recorded_at', `${request.periodStart}T00:00:00+07:00`)
    .lt('recorded_at', `${dayAfterJakartaDate(request.periodEnd)}T00:00:00+07:00`)
    .order('recorded_at', { ascending: false })
    .limit(500);

  if (isGlobalScope) {
    if (request.targetUserId) {
      query = query.eq('recorded_by', request.targetUserId);
    }
  } else {
    query = query.eq('recorded_by', req.user!.id);
  }

  const { data: rows, error } = await query;
  if (error) throw new Error(`Gagal mengambil data catatan limbah: ${error.message}`);

  const profileMap = new Map<string, string>();
  if (isGlobalScope) {
    const { data: profs } = await db.from('profiles').select('id, full_name');
    for (const p of (profs ?? []) as Array<{ id: string; full_name: string }>) {
      profileMap.set(p.id, p.full_name);
    }
  } else {
    profileMap.set(req.user!.id, req.user!.fullName);
  }

  let logs = (rows ?? []).map((row: Record<string, unknown>) => {
    const menu = row.menus as { name?: string; category?: string; waste_profile?: string } | null;
    const recordedBy = String(row.recorded_by ?? req.user!.id);
    return {
      id: String(row.id),
      recordedBy,
      recorderName: profileMap.get(recordedBy) ?? 'Pengguna',
      menuName: menu?.name ?? 'Makanan',
      recordedAt: String(row.recorded_at),
      preparedPortions: Number(row.prepared_portions),
      servedPortions: Number(row.served_portions),
      leftoverWeightG: Number(row.leftover_weight_g),
      leftoverSource: row.leftover_source as RawWasteLog['leftoverSource'],
      reason: String(row.reason),
      condition: String(row.condition_status),
      category: menu?.category ?? null,
      wasteProfile: menu?.waste_profile ?? 'campuran',
      isSample: String(row.notes ?? '').startsWith('[DATA SIMULASI]'),
    };
  });

  // Fallback ke clientLogs apabila data yang difilter di sisi klien (misal akun simulasi Radit) tidak ditemukan di DB
  if (logs.length === 0 && request.clientLogs && request.clientLogs.length > 0) {
    logs = request.clientLogs.map((cl) => ({
      id: cl.id,
      recordedBy: cl.recordedBy ?? req.user!.id,
      recorderName: cl.recorderName ?? req.user!.fullName,
      menuName: cl.menuName,
      recordedAt: cl.recordedAt,
      preparedPortions: cl.preparedPortions ?? 1,
      servedPortions: cl.servedPortions ?? 1,
      leftoverWeightG: cl.leftoverWeightG,
      leftoverSource: cl.leftoverSource,
      reason: cl.reason,
      condition: cl.condition,
      category: cl.category ?? null,
      wasteProfile: cl.wasteProfile ?? 'campuran',
      isSample: String(cl.notes ?? '').startsWith('[DATA SIMULASI]'),
    }));
  }

  const ids = logs.map((row) => row.id);
  let actions: RawWasteAction[] = [];
  if (ids.length) {
    const { data: actionRows, error: actionsError } = await db
      .from('waste_actions')
      .select('waste_log_id, action_type, weight_g')
      .in('waste_log_id', ids);
    if (actionsError) throw new Error(`Gagal mengambil tindakan limbah: ${actionsError.message}`);
    actions = (actionRows ?? []).map((a: Record<string, unknown>) => ({
      wasteLogId: String(a.waste_log_id),
      actionType: a.action_type as RawWasteAction['actionType'],
      weightG: Number(a.weight_g),
    }));
  }

  const metrics = computeDeterministicAnalytics(logs, actions);
  const menuCounts = new Map<string, number>();
  for (const log of logs) {
    menuCounts.set(log.menuName, (menuCounts.get(log.menuName) ?? 0) + log.leftoverWeightG);
  }

  const userSummaryMap = new Map<string, { fullName: string; logsCount: number; weightG: number }>();
  for (const log of logs) {
    const prev = userSummaryMap.get(log.recordedBy) ?? {
      fullName: log.recorderName,
      logsCount: 0,
      weightG: 0,
    };
    prev.logsCount += 1;
    prev.weightG += log.leftoverWeightG;
    userSummaryMap.set(log.recordedBy, prev);
  }

  const userContributions = [...userSummaryMap.entries()]
    .map(([userId, info]) => ({
      userId,
      fullName: info.fullName,
      logsCount: info.logsCount,
      totalWeightKg: Number((info.weightG / 1000).toFixed(2)),
    }))
    .sort((a, b) => b.totalWeightKg - a.totalWeightKg);

  const reasons = metrics.reasonBreakdown.map((r) => ({
    label: REASON_LABELS[r.reason] ?? r.reason,
    count: r.count,
    percentage: r.percentage,
  }));
  const avgWeightPerLogKg =
    logs.length > 0 ? Number((metrics.totalLeftoverWeightKg / logs.length).toFixed(2)) : 0;

  const summary = {
    analysisScope: isGlobalScope
      ? request.targetUserId
        ? `Filter Pengguna Spesifik (${userContributions[0]?.fullName ?? 'Pengguna'})`
        : `Agregasi Global Admin (${userContributions.length} pengguna aktif)`
      : `Data Pribadi Pengguna (${req.user!.fullName})`,
    totalActiveUsersCount: userContributions.length,
    userContributions,
    totalLogsCount: logs.length,
    sampleLogsCount: logs.filter((log) => log.isSample).length,
    dataNature: logs.some((log) => log.isSample)
      ? 'Termasuk data simulasi; temuan terkait data ini hanya contoh demo, bukan dampak operasional nyata.'
      : 'Catatan operasional pengguna.',
    totalLeftoverWeightKg: metrics.totalLeftoverWeightKg,
    avgWeightPerLogKg,
    utilizedWeightKg: metrics.utilizedWeightKg,
    unhandledWeightKg: metrics.unhandledWeightKg,
    utilizedPercentage: metrics.utilizedPercentage,
    topMenus: [...menuCounts.entries()]
      .map(([name, grams]) => ({ name, weightKg: Number((grams / 1000).toFixed(2)) }))
      .sort((a, b) => b.weightKg - a.weightKg)
      .slice(0, 5),
    reasonBreakdown: reasons,
    plateLeftoverLogsCount: logs.filter((l) => l.leftoverSource === 'sisa_piring').length,
    plateLeftoverWeightKg: Number(
      (
        logs
          .filter((l) => l.leftoverSource === 'sisa_piring')
          .reduce((n, l) => n + l.leftoverWeightG, 0) / 1000
      ).toFixed(2)
    ),
  };

  return {
    request,
    summary,
    wasteLogs: logs.map((l) => ({
      tanggal: l.recordedAt.slice(0, 10),
      pencatat: l.recorderName,
      makanan: l.menuName,
      kategori: l.category,
      jenis_bahan: l.wasteProfile,
      berat_sisa_kg: Number((l.leftoverWeightG / 1000).toFixed(2)),
      sumber_sisa: SOURCE_LABELS[l.leftoverSource] ?? l.leftoverSource,
      kondisi: l.condition,
      penyebab_sisa: REASON_LABELS[l.reason] ?? l.reason,
      status_data: l.isSample ? 'simulasi' : 'operasional',
    })),
  };
}

apiRouter.post('/ai/insights', requireAuth, async (req, res) => {
  const clientKey = req.ip ?? 'local';
  if (!checkAiRateLimit(clientKey)) {
    res.status(429).json({
      error: 'Terlalu banyak permintaan analisis AI. Silakan tunggu 1 menit.',
    });
    return;
  }

  const parsed = aiRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Payload permintaan AI tidak valid.',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const context = await getAiContext(parsed.data, req);
    const envelope = await generateGeminiInsight(context);
    const userSupabase = getUserScopedSupabase(req.accessToken!);
    await userSupabase.from('ai_recommendations').insert({
      organization_id: req.user!.organizationId,
      created_by: req.user!.id,
      interaction_type: parsed.data.interactionType,
      user_prompt: parsed.data.userPrompt ?? null,
      period_start: parsed.data.periodStart,
      period_end: parsed.data.periodEnd,
      model_id: envelope.modelId,
      input_summary: context.summary,
      result: envelope.result,
      status: envelope.status,
    });
    res.json(envelope);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Gemini gagal menghasilkan insight.' });
  }
});

apiRouter.post('/ai/recommend-pathway', requireAuth, async (req, res) => {
  const clientKey = req.ip ?? 'local';
  if (!checkAiRateLimit(clientKey)) {
    res.status(429).json({
      error: 'Terlalu banyak permintaan rekomendasi AI. Silakan tunggu sebentar.',
    });
    return;
  }

  const parsed = aiPathwayRecommendationRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Parameter rekomendasi tindakan tidak valid.',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const recommendation = await generateGeminiPathwayRecommendation(parsed.data);
    res.json(recommendation);
  } catch (err) {
    res.status(502).json({
      error:
        err instanceof Error
          ? err.message
          : 'Gagal mendapatkan rekomendasi tindakan dari AI.',
    });
  }
});

const aiChatSchema = z.object({
  userPrompt: z.string().trim().min(1).max(500),
  chatHistory: z
    .array(
      z.object({
        sender: z.enum(['user', 'ai']),
        text: z.string().max(2000),
      })
    )
    .max(15)
    .optional(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  scope: z.enum(['personal', 'global']).optional(),
  targetUserId: z.string().optional().nullable(),
  clientLogs: z.array(clientLogItemSchema).max(200).optional(),
});

apiRouter.post('/ai/chat', requireAuth, async (req, res) => {
  const clientKey = req.ip ?? 'local';
  if (!checkAiRateLimit(clientKey)) {
    res.status(429).json({
      error: 'Terlalu banyak permintaan chat AI. Silakan tunggu sebentar.',
    });
    return;
  }

  const parsed = aiChatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Format pesan chat tidak valid.',
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const context = await getAiContext({ ...parsed.data, interactionType: 'contextual_chat' }, req);
    const chatRes = await generateGeminiChat(context);
    const userSupabase = getUserScopedSupabase(req.accessToken!);
    await userSupabase.from('ai_recommendations').insert({
      organization_id: req.user!.organizationId,
      created_by: req.user!.id,
      interaction_type: 'contextual_chat',
      user_prompt: parsed.data.userPrompt,
      period_start: parsed.data.periodStart,
      period_end: parsed.data.periodEnd,
      model_id: chatRes.modelId,
      input_summary: context.summary,
      result: {
        summary: chatRes.reply,
        direct_answer_to_user: chatRes.reply,
        observed_patterns: [],
        prevention_recommendations: [],
        circular_waste_recommendations: [],
        limitations: [],
      },
      status: 'completed',
    });
    res.json(chatRes);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Gagal menghubungi layanan Gemini AI.';
    res.status(502).json({ error: message });
  }
});

apiRouter.get('/analytics/summary', requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user!.role === 'admin';
    const supabase = isAdmin ? getSupabaseAdmin() : getUserScopedSupabase(req.accessToken!);

    let logsQuery = supabase
      .from('waste_logs')
      .select(
        'id, recorded_by, recorded_at, prepared_portions, served_portions, leftover_weight_g, leftover_source, reason, menus(name)'
      )
      .order('recorded_at', { ascending: false });

    if (!isAdmin) {
      logsQuery = logsQuery.eq('recorded_by', req.user!.id);
    }

    const { data: logsData, error: logsErr } = await logsQuery;
    if (logsErr) {
      res.status(500).json({ error: logsErr.message });
      return;
    }

    const logIds = (logsData ?? []).map((row: Record<string, unknown>) => String(row.id));
    let mappedActions: RawWasteAction[] = [];

    if (logIds.length > 0) {
      const { data: actionsData, error: actionsErr } = await supabase
        .from('waste_actions')
        .select('waste_log_id, action_type, weight_g')
        .in('waste_log_id', logIds);

      if (actionsErr) {
        res.status(500).json({ error: actionsErr.message });
        return;
      }

      mappedActions = (actionsData ?? []).map(
        (act: Record<string, unknown>) => ({
          wasteLogId: String(act.waste_log_id),
          actionType: act.action_type as RawWasteAction['actionType'],
          weightG: Number(act.weight_g),
        })
      );
    }

    const mappedLogs: RawWasteLog[] = (logsData ?? []).map(
      (row: Record<string, unknown>) => {
        const menuObj = row.menus as { name?: string } | null;
        return {
          id: String(row.id),
          menuName: menuObj?.name ?? 'Menu',
          recordedAt: String(row.recorded_at),
          preparedPortions: Number(row.prepared_portions),
          servedPortions: Number(row.served_portions),
          leftoverWeightG: Number(row.leftover_weight_g),
          leftoverSource: row.leftover_source as RawWasteLog['leftoverSource'],
          reason: String(row.reason),
        };
      }
    );

    const summary = computeDeterministicAnalytics(mappedLogs, mappedActions);
    res.json(summary);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Gagal menghitung analitik.';
    res.status(500).json({ error: message });
  }
});
