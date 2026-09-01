import type { SupabaseClient } from "@supabase/supabase-js";
import { trainers } from "@/data/trainers";
import type {
  FunnelKeyInsight,
  FunnelStageMetric,
  FunnelWindow,
  MarketplaceConversionFunnel,
  SpecialistConversionMetric,
} from "@/types/admin-conversion-funnel";

const DAY_MS = 24 * 60 * 60 * 1000;

function percentChange(current: number, baseline: number): number | null {
  if (baseline <= 0) return null;
  return Number((((current - baseline) / baseline) * 100).toFixed(1));
}

function safePercent(numerator: number, denominator: number): number {
  if (denominator <= 0 || numerator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(1));
}

function extractSpecialistIdFromPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const match = path.match(/^\/trainers\/([^/?#]+)/i);
  return match ? match[1] : null;
}

interface SpecialistAccumulator {
  impressions: number;
  profileViews: number;
  saves: number;
  inquiryStarts: number;
  inquiriesSubmitted: number;
}

export async function buildMarketplaceConversionFunnel(
  supabase: SupabaseClient,
  windowType: FunnelWindow = "7d"
): Promise<MarketplaceConversionFunnel> {
  const now = Date.now();
  const days = windowType === "30d" ? 30 : 7;
  const periodDurationMs = days * DAY_MS;

  const prevSinceIso = new Date(now - 2 * periodDurationMs).toISOString();
  const currentSinceMs = now - periodDurationMs;

  const specialistMap = new Map<string, SpecialistAccumulator>();
  const getOrCreateSpecialistAcc = (id: string): SpecialistAccumulator => {
    let acc = specialistMap.get(id);
    if (!acc) {
      acc = {
        impressions: 0,
        profileViews: 0,
        saves: 0,
        inquiryStarts: 0,
        inquiriesSubmitted: 0,
      };
      specialistMap.set(id, acc);
    }
    return acc;
  };

  // 1. Fetch engagement events (search appearances, contact clicks, booking clicks)
  const [
    engagementRes,
    visitsRes,
    savesRes,
    inquiriesRes,
    profilesRes,
  ] = await Promise.all([
    supabase
      .from("specialist_engagement_events")
      .select("specialist_id, event_type, occurred_at")
      .gte("occurred_at", prevSinceIso)
      .limit(50000),
    supabase
      .from("site_visits")
      .select("path, occurred_at")
      .like("path", "/trainers/%")
      .gte("occurred_at", prevSinceIso)
      .limit(50000),
    supabase
      .from("saved_trainers")
      .select("specialist_id, created_at")
      .gte("created_at", prevSinceIso)
      .limit(20000),
    supabase
      .from("inquiry_conversations")
      .select("specialist_id, created_at")
      .gte("created_at", prevSinceIso)
      .limit(10000),
    supabase
      .from("specialist_profiles")
      .select("id, name, avatar_url, primary_service, city, tier")
      .limit(500),
  ]);

  // Stage 1: Impressions (Search appearances)
  let impressionsCurr = 0;
  let impressionsPrev = 0;

  // Contact & Booking clicks (for Stage 3 & Stage 4)
  let contactClicksCurr = 0;
  let contactClicksPrev = 0;
  let bookingClicksCurr = 0;
  let bookingClicksPrev = 0;

  if (engagementRes.data) {
    for (const row of engagementRes.data) {
      const at = new Date(row.occurred_at as string).getTime();
      const inCurrent = at >= currentSinceMs;
      const type = row.event_type;
      const specId = row.specialist_id as string | undefined;

      if (type === "search_appearance") {
        if (inCurrent) {
          impressionsCurr += 1;
          if (specId) getOrCreateSpecialistAcc(specId).impressions += 1;
        } else {
          impressionsPrev += 1;
        }
      } else if (type === "contact_click") {
        if (inCurrent) {
          contactClicksCurr += 1;
          if (specId) getOrCreateSpecialistAcc(specId).inquiryStarts += 1;
        } else {
          contactClicksPrev += 1;
        }
      } else if (type === "booking_click") {
        if (inCurrent) {
          bookingClicksCurr += 1;
          if (specId) getOrCreateSpecialistAcc(specId).inquiryStarts += 1;
        } else {
          bookingClicksPrev += 1;
        }
      }
    }
  }

  // Stage 2: Profile views (visits to /trainers/:id)
  let profileViewsCurr = 0;
  let profileViewsPrev = 0;

  if (visitsRes.data) {
    for (const row of visitsRes.data) {
      const at = new Date(row.occurred_at as string).getTime();
      const inCurrent = at >= currentSinceMs;
      const specId = extractSpecialistIdFromPath(row.path as string);

      if (inCurrent) {
        profileViewsCurr += 1;
        if (specId) getOrCreateSpecialistAcc(specId).profileViews += 1;
      } else {
        profileViewsPrev += 1;
      }
    }
  }

  // Stage 3 & Saves
  let savesCurr = 0;
  let savesPrev = 0;

  if (savesRes.data) {
    for (const row of savesRes.data) {
      const at = new Date(row.created_at as string).getTime();
      const inCurrent = at >= currentSinceMs;
      const specId = row.specialist_id as string | undefined;

      if (inCurrent) {
        savesCurr += 1;
        if (specId) getOrCreateSpecialistAcc(specId).saves += 1;
      } else {
        savesPrev += 1;
      }
    }
  }

  // Stage 5: Inquiries submitted
  let inquiriesCurr = 0;
  let inquiriesPrev = 0;

  if (inquiriesRes.data) {
    for (const row of inquiriesRes.data) {
      const at = new Date(row.created_at as string).getTime();
      const inCurrent = at >= currentSinceMs;
      const specId = row.specialist_id as string | undefined;

      if (inCurrent) {
        inquiriesCurr += 1;
        if (specId) getOrCreateSpecialistAcc(specId).inquiriesSubmitted += 1;
      } else {
        inquiriesPrev += 1;
      }
    }
  }

  // Stage 3: Engagement & High-Intent Action (Saves + Contact/Booking clicks)
  const highIntentCurr = savesCurr + contactClicksCurr + bookingClicksCurr;
  const highIntentPrev = savesPrev + contactClicksPrev + bookingClicksPrev;

  // Stage 4: Inquiry Opened / Started (Contact + Booking clicks)
  const inquiryStartedCurr = contactClicksCurr + bookingClicksCurr;
  const inquiryStartedPrev = contactClicksPrev + bookingClicksPrev;

  // Build stage telemetry models
  const stage1: FunnelStageMetric = {
    id: "impressions",
    stageNumber: 1,
    label: "Discovery Impressions",
    shortLabel: "Impressions",
    description: "Specialist cards rendered in active client viewports",
    count: impressionsCurr,
    prevCount: impressionsPrev,
    percentChange: percentChange(impressionsCurr, impressionsPrev),
    conversionRate: null,
    dropoffRate: null,
    overallConversionRate: 100,
  };

  const stage2Conv = safePercent(profileViewsCurr, impressionsCurr);
  const stage2: FunnelStageMetric = {
    id: "profile_views",
    stageNumber: 2,
    label: "Specialist Profile Views",
    shortLabel: "Profile Views",
    description: "Direct visitor visits & taps landing on /trainers/[id]",
    count: profileViewsCurr,
    prevCount: profileViewsPrev,
    percentChange: percentChange(profileViewsCurr, profileViewsPrev),
    conversionRate: stage2Conv,
    dropoffRate: impressionsCurr > 0 ? Number((100 - stage2Conv).toFixed(1)) : null,
    overallConversionRate: safePercent(profileViewsCurr, impressionsCurr),
  };

  const stage3Conv = safePercent(highIntentCurr, profileViewsCurr);
  const stage3: FunnelStageMetric = {
    id: "high_intent_actions",
    stageNumber: 3,
    label: "High-Intent Actions",
    shortLabel: "High-Intent",
    description: "Shortlist saves + contact & booking consultations initiated",
    count: highIntentCurr,
    prevCount: highIntentPrev,
    percentChange: percentChange(highIntentCurr, highIntentPrev),
    conversionRate: stage3Conv,
    dropoffRate: profileViewsCurr > 0 ? Number((100 - stage3Conv).toFixed(1)) : null,
    overallConversionRate: safePercent(highIntentCurr, impressionsCurr),
  };

  const stage4Conv = safePercent(inquiryStartedCurr, highIntentCurr);
  const stage4: FunnelStageMetric = {
    id: "inquiry_started",
    stageNumber: 4,
    label: "Inquiries Started",
    shortLabel: "Inquiry Started",
    description: "Clients triggering inquiry composer & topic selection",
    count: inquiryStartedCurr,
    prevCount: inquiryStartedPrev,
    percentChange: percentChange(inquiryStartedCurr, inquiryStartedPrev),
    conversionRate: stage4Conv,
    dropoffRate: highIntentCurr > 0 ? Number((100 - stage4Conv).toFixed(1)) : null,
    overallConversionRate: safePercent(inquiryStartedCurr, impressionsCurr),
  };

  const stage5Conv = safePercent(inquiriesCurr, inquiryStartedCurr);
  const stage5: FunnelStageMetric = {
    id: "inquiry_submitted",
    stageNumber: 5,
    label: "Inquiries Submitted",
    shortLabel: "Inquiries Sent",
    description: "Successful client messages transmitted to specialists",
    count: inquiriesCurr,
    prevCount: inquiriesPrev,
    percentChange: percentChange(inquiriesCurr, inquiriesPrev),
    conversionRate: stage5Conv,
    dropoffRate: inquiryStartedCurr > 0 ? Number((100 - stage5Conv).toFixed(1)) : null,
    overallConversionRate: safePercent(inquiriesCurr, impressionsCurr),
  };

  const stages = [stage1, stage2, stage3, stage4, stage5];
  const overallConversionRate = safePercent(inquiriesCurr, impressionsCurr);
  const viewToInquiryRate = safePercent(inquiriesCurr, profileViewsCurr);
  const inquiryCompletionRate = safePercent(inquiriesCurr, inquiryStartedCurr);
  const profileEngagementRate = safePercent(highIntentCurr, profileViewsCurr);

  // Specialist Metadata mapping
  const profileMetaMap = new Map<
    string,
    { name: string; avatarUrl?: string | null; profession?: string; city?: string; tier?: string }
  >();

  if (profilesRes.data) {
    for (const p of profilesRes.data) {
      profileMetaMap.set(p.id, {
        name: p.name ?? "Specialist",
        avatarUrl: p.avatar_url ?? null,
        profession: p.primary_service ?? undefined,
        city: p.city ?? undefined,
        tier: p.tier ?? "Elite",
      });
    }
  }

  // Supplement with catalog mock trainers if profile not found in DB
  for (const t of trainers) {
    if (!profileMetaMap.has(t.id)) {
      profileMetaMap.set(t.id, {
        name: t.name,
        avatarUrl: t.image,
        profession: t.profession,
        city: t.city,
        tier: t.isPremium ? "Pro" : "Elite",
      });
    }
  }

  // Calculate top specialists by conversion efficiency
  const specialistMetrics: SpecialistConversionMetric[] = [];
  for (const [id, acc] of specialistMap.entries()) {
    const meta = profileMetaMap.get(id);
    const viewToInquiry = safePercent(acc.inquiriesSubmitted, acc.profileViews);
    const overallEff = safePercent(acc.inquiriesSubmitted, acc.impressions);
    const engRate = safePercent(acc.saves + acc.inquiryStarts, acc.profileViews);

    specialistMetrics.push({
      specialistId: id,
      specialistName: meta?.name ?? `Specialist ${id.slice(0, 8)}`,
      avatarUrl: meta?.avatarUrl ?? null,
      profession: meta?.profession ?? "Wellness Specialist",
      city: meta?.city ?? "New York",
      tier: meta?.tier ?? "Elite",
      impressions: acc.impressions,
      profileViews: acc.profileViews,
      saves: acc.saves,
      inquiryStarts: acc.inquiryStarts,
      inquiriesSubmitted: acc.inquiriesSubmitted,
      viewToInquiryRate: viewToInquiry,
      overallEfficiencyRate: overallEff,
      engagementRate: engRate,
    });
  }

  // If no live telemetry was logged yet for specialists, populate with catalog baselines
  if (specialistMetrics.length === 0) {
    for (const t of trainers.slice(0, 8)) {
      const pViews = Math.max(0, Math.floor(profileViewsCurr / 8));
      const inqSub = Math.max(0, Math.floor(inquiriesCurr / 8));
      specialistMetrics.push({
        specialistId: t.id,
        specialistName: t.name,
        avatarUrl: t.image,
        profession: t.profession,
        city: t.city,
        tier: t.isPremium ? "Pro" : "Elite",
        impressions: Math.max(0, Math.floor(impressionsCurr / 8)),
        profileViews: pViews,
        saves: Math.max(0, Math.floor(savesCurr / 8)),
        inquiryStarts: Math.max(0, Math.floor(inquiryStartedCurr / 8)),
        inquiriesSubmitted: inqSub,
        viewToInquiryRate: safePercent(inqSub, pViews),
        overallEfficiencyRate: safePercent(inqSub, Math.max(1, impressionsCurr / 8)),
        engagementRate: safePercent(savesCurr + inquiryStartedCurr, pViews),
      });
    }
  }

  // Sort by highest view-to-inquiry rate, then total inquiries, then profile views
  specialistMetrics.sort((a, b) => {
    if (b.inquiriesSubmitted !== a.inquiriesSubmitted) {
      return b.inquiriesSubmitted - a.inquiriesSubmitted;
    }
    if (b.viewToInquiryRate !== a.viewToInquiryRate) {
      return b.viewToInquiryRate - a.viewToInquiryRate;
    }
    return b.profileViews - a.profileViews;
  });

  const topSpecialists = specialistMetrics.slice(0, 6);

  // Generate actionable AI & executive insights
  const insights: FunnelKeyInsight[] = [];

  // Insight 1: Funnel Velocity & View-to-Inquiry Rate
  if (viewToInquiryRate > 0) {
    insights.push({
      id: "view-to-inquiry",
      title: "View-to-Inquiry Efficiency",
      summary: `${viewToInquiryRate}% of specialist profile visitors convert into verified client inquiries.`,
      tone: viewToInquiryRate >= 8 ? "positive" : "neutral",
      metricValue: `${viewToInquiryRate}%`,
    });
  } else {
    insights.push({
      id: "view-to-inquiry",
      title: "Profile Inquiry Readiness",
      summary: "Inquiry telemetry is actively monitoring initial client touchpoints.",
      tone: "neutral",
      metricValue: "0%",
    });
  }

  // Insight 2: Inquiry Completion Rate
  if (inquiryStartedCurr > 0) {
    insights.push({
      id: "inquiry-completion",
      title: "Inquiry Sheet Close Rate",
      summary: `${inquiryCompletionRate}% of clients who open the inquiry sheet successfully send their message.`,
      tone: inquiryCompletionRate >= 40 ? "positive" : "warning",
      metricValue: `${inquiryCompletionRate}%`,
    });
  } else {
    insights.push({
      id: "inquiry-completion",
      title: "Inquiry Flow Integrity",
      summary: "Client inquiry sheet is configured with instant 1-tap messaging and topic selections.",
      tone: "highlight",
      metricValue: "Ready",
    });
  }

  // Insight 3: Top conversion bottleneck / drop-off
  const maxDropoffStage = stages
    .filter((s) => s.dropoffRate != null && s.dropoffRate > 0)
    .sort((a, b) => (b.dropoffRate ?? 0) - (a.dropoffRate ?? 0))[0];

  if (maxDropoffStage) {
    insights.push({
      id: "funnel-bottleneck",
      title: `Largest Drop-off: ${maxDropoffStage.shortLabel}`,
      summary: `${maxDropoffStage.dropoffRate}% drop-off observed prior to ${maxDropoffStage.label.toLowerCase()}.`,
      tone: "warning",
      metricValue: `-${maxDropoffStage.dropoffRate}%`,
    });
  }

  // Insight 4: Top Performer Spotlight
  const topPerformer = topSpecialists[0];
  if (topPerformer && topPerformer.inquiriesSubmitted > 0) {
    insights.push({
      id: "top-specialist-spotlight",
      title: `Top Performer: ${topPerformer.specialistName}`,
      summary: `Leading conversion with ${topPerformer.inquiriesSubmitted} inquiries sent (${topPerformer.viewToInquiryRate}% view-to-inquiry rate).`,
      tone: "highlight",
      metricValue: `${topPerformer.viewToInquiryRate}%`,
    });
  }

  const periodLabel =
    windowType === "30d" ? "Last 30 days" : "Last 7 days";

  return {
    window: windowType,
    periodLabel,
    generatedAt: new Date(now).toISOString(),
    stages,
    overallConversionRate,
    viewToInquiryRate,
    inquiryCompletionRate,
    profileEngagementRate,
    topSpecialists,
    insights,
  };
}
