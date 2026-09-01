import type { AdminPlatformPulse } from "@/types/admin-platform-pulse";
import { formatBillingCents } from "@/lib/admin-specialist-billing-service";

export type AiSentiment = "positive" | "steady" | "attention";

export interface AiExecutiveHeadline {
  title: string;
  text: string;
  sentiment: AiSentiment;
  sentimentLabel: string;
}

export interface AiTrafficBriefing {
  title: string;
  summaryText: string;
  visitorCountLabel: string;
  topSourceLabel: string;
  topSourceShare: string;
  mobileShareLabel: string;
  newVsReturningLabel: string;
  health: "growing" | "steady" | "quiet" | "new";
}

export interface AiConversionBriefing {
  title: string;
  summaryText: string;
  ratioHeadline: string;
  viewToInquiryRate: string;
  inquiryCompletionRate: string;
  bottleneckSummary: string;
  topPerformerNote: string | null;
}

export interface AiSpecialistsRevenueBriefing {
  title: string;
  summaryText: string;
  rosterCountLabel: string;
  pendingCountLabel: string;
  hasPending: boolean;
  mrrFormatted: string;
  payingCountLabel: string;
  adBoostFormatted: string;
}

export interface AiActionItem {
  id: string;
  emoji?: string;
  priority: "high" | "medium" | "low";
  priorityLabel: string;
  title: string;
  description: string;
  category: "growth" | "operations" | "monetization" | "experience";
}

export interface AiExecutiveBriefing {
  generatedAt: string;
  isLive: boolean;
  headline: AiExecutiveHeadline;
  traffic: AiTrafficBriefing;
  conversion: AiConversionBriefing;
  rosterAndRevenue: AiSpecialistsRevenueBriefing;
  actionItems: AiActionItem[];
}

/**
 * Generates a concise, conversational 2-3 sentence executive briefing
 * tailored for Jarvis to deliver when Jordan / admin loads the dashboard.
 * Zero emojis, clean executive tone.
 */
export function generateJarvisGreetingBriefing(
  pulse: AdminPlatformPulse | null,
  adminName: string = "Jordan"
): {
  greeting: string;
  summary: string;
  focusPrompt: string;
} {
  const hour = new Date().getHours();
  let timeGreeting = "Good evening";
  if (hour >= 5 && hour < 12) {
    timeGreeting = "Good morning";
  } else if (hour >= 12 && hour < 17) {
    timeGreeting = "Good afternoon";
  }

  const greeting = `${timeGreeting}, ${adminName}.`;
  const focusPrompt = "What would you like to focus on today?";

  if (!pulse || pulse.dataSource !== "live") {
    return {
      greeting,
      summary:
        "Connecting to live telemetry. Monitoring visitor traffic, application queue, and Stripe settlement data.",
      focusPrompt,
    };
  }

  const visitors = pulse.traffic?.uniqueVisitors ?? 0;
  const topSource = pulse.traffic?.topSources?.[0]?.source ?? null;
  const pending = pulse.pendingApplications ?? 0;
  const specialists = pulse.specialists?.total ?? 0;
  const mrrCents = pulse.earnings?.subscriberRevenueCents ?? 0;
  const mrrFormatted = formatBillingCents(mrrCents, { decimals: 0 });

  const sentences: string[] = [];

  if (visitors > 0) {
    if (topSource && topSource !== "Direct") {
      sentences.push(
        `You have ${visitors.toLocaleString()} unique visitor${visitors === 1 ? "" : "s"} this week, led by ${topSource}.`
      );
    } else {
      sentences.push(
        `You have ${visitors.toLocaleString()} unique visitor${visitors === 1 ? "" : "s"} exploring the platform this week.`
      );
    }
  } else {
    sentences.push(
      `Your marketplace has ${specialists} active specialist${specialists === 1 ? "" : "s"} on roster.`
    );
  }

  if (pending > 0) {
    sentences.push(
      `${pending} specialist application${pending === 1 ? " is" : "s are"} awaiting your review.`
    );
  } else {
    sentences.push(
      `The application queue is clear with 0 pending reviews.`
    );
  }

  if (mrrCents > 0) {
    sentences.push(
      `Platform revenue is generating ${mrrFormatted}/month in recurring subscriptions.`
    );
  }

  const summary = sentences.join(" ");

  return {
    greeting,
    summary,
    focusPrompt,
  };
}

export function generateAiExecutiveBriefing(
  pulse: AdminPlatformPulse | null
): AiExecutiveBriefing {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateStr = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const generatedAt = `${dateStr} at ${timeStr}`;

  if (!pulse || pulse.dataSource !== "live") {
    return generateBaselineBriefing(generatedAt);
  }

  const { specialists, clients, pendingApplications, traffic, earnings, conversionFunnel } = pulse;

  // 1. Traffic insights
  const views = traffic?.views ?? 0;
  const uniqueVisitors = traffic?.uniqueVisitors ?? 0;
  const newVisitors = traffic?.newVisitors ?? 0;
  const visitorPctChange = traffic?.uniqueVisitorsPercentChange ?? null;
  const topSources = traffic?.topSources ?? [];
  const topSource = topSources[0]?.source ?? "Direct";
  const topSourceShare = topSources[0]?.sharePercent ?? 0;
  const secondSource = topSources[1]?.source ?? null;
  const secondSourceShare = topSources[1]?.sharePercent ?? 0;

  const totalDevices =
    (traffic?.devices.mobile ?? 0) +
    (traffic?.devices.desktop ?? 0) +
    (traffic?.devices.unknown ?? 0) || 1;
  const mobileShare = Math.round(((traffic?.devices.mobile ?? 0) / totalDevices) * 100);
  const newVisitorPct =
    uniqueVisitors > 0
      ? Math.round((newVisitors / uniqueVisitors) * 100)
      : 0;
  const returningPct = Math.max(0, 100 - newVisitorPct);

  let trafficHealth: AiTrafficBriefing["health"] = "steady";
  if (visitorPctChange != null && visitorPctChange > 5) {
    trafficHealth = "growing";
  } else if (uniqueVisitors === 0) {
    trafficHealth = "new";
  } else if (visitorPctChange != null && visitorPctChange < -10) {
    trafficHealth = "quiet";
  }

  // 2. Conversion insights
  const viewToInquiry = conversionFunnel?.viewToInquiryRate ?? 0;
  const inquiryCompletion = conversionFunnel?.inquiryCompletionRate ?? 0;
  const inquiriesSubmitted =
    conversionFunnel?.stages?.find((s) => s.id === "inquiry_submitted")?.count ??
    (conversionFunnel?.topSpecialists?.reduce((sum, s) => sum + s.inquiriesSubmitted, 0) || 0);

  const topPerformer = conversionFunnel?.topSpecialists?.[0] ?? null;

  const outOf100Inquiries = Math.max(0, Math.round(viewToInquiry));

  // Bottleneck
  let bottleneckStageName = "profile discovery";
  let bottleneckDropoff = 0;
  if (conversionFunnel?.stages && conversionFunnel.stages.length > 0) {
    const sortedDropoffs = [...conversionFunnel.stages]
      .filter((s) => s.dropoffRate != null && s.dropoffRate > 0)
      .sort((a, b) => (b.dropoffRate ?? 0) - (a.dropoffRate ?? 0));
    if (sortedDropoffs[0]) {
      bottleneckStageName = sortedDropoffs[0].shortLabel;
      bottleneckDropoff = sortedDropoffs[0].dropoffRate ?? 0;
    }
  }

  // 3. Roster & Revenue
  const totalSpecialists = specialists.total;
  const specDelta = specialists.delta;
  const specDeltaStr =
    specDelta > 0
      ? `+${specDelta} newly approved this week`
      : specDelta < 0
      ? `${specDelta} this week`
      : "stable from last week";

  const totalClients = clients.total;

  const mrrCents = earnings?.subscriberRevenueCents ?? 0;
  const adCents = earnings?.adRevenueCents ?? 0;
  const payingCount = earnings?.paidSubscriberCount ?? 0;
  const mrrFormatted = formatBillingCents(mrrCents, { decimals: 0 });
  const adFormatted = formatBillingCents(adCents, { decimals: 0 });

  // 4. Headline & Sentiment
  let sentiment: AiSentiment = "steady";
  let sentimentLabel = "Steady Performance";
  let headlineTitle = "Marketplace Overview";
  let headlineText = "";

  const isGrowingTraffic = visitorPctChange != null && visitorPctChange > 0;
  const hasStrongConversion = viewToInquiry >= 6;
  const hasPendingBacklog = pendingApplications >= 3;

  if (isGrowingTraffic && hasStrongConversion) {
    sentiment = "positive";
    sentimentLabel = "Growth Momentum";
    headlineTitle = "High Engagement & Traffic Expansion";
    headlineText = `Platform momentum is strong with ${uniqueVisitors.toLocaleString()} unique visitors (${visitorPctChange != null ? `+${visitorPctChange.toFixed(0)}%` : "growing"}) and a ${viewToInquiry}% view-to-inquiry rate.`;
  } else if (hasPendingBacklog) {
    sentiment = "attention";
    sentimentLabel = "Action Needed";
    headlineTitle = "Pending Applications Awaiting Decision";
    headlineText = `You have ${pendingApplications} specialist applications waiting in the review queue. Catalog traffic is active with ${views.toLocaleString()} page views over the last 7 days.`;
  } else if (isGrowingTraffic) {
    sentiment = "positive";
    sentimentLabel = "Audience Expanding";
    headlineTitle = "Visitor Traffic on the Rise";
    headlineText = `Audience reach grew ${visitorPctChange != null ? `+${visitorPctChange.toFixed(0)}%` : ""} this week across ${views.toLocaleString()} total page views, driven primarily by mobile visitors.`;
  } else {
    sentiment = "steady";
    sentimentLabel = "Stable Baseline";
    headlineTitle = "Steady Marketplace Activity";
    headlineText = `Your marketplace is operating smoothly with ${totalSpecialists} active specialists, ${totalClients} registered clients, and ${inquiriesSubmitted} inquiries processed.`;
  }

  // 5. Plain English Sections
  let trafficSummary = "";
  if (uniqueVisitors > 0) {
    trafficSummary = `You had ${uniqueVisitors.toLocaleString()} visitors this week across ${views.toLocaleString()} total page views (${mobileShare}% mobile, ${100 - mobileShare}% desktop). ${
      topSources.length > 0
        ? `Top channel is ${topSource} (${topSourceShare}% of all traffic)${
            secondSource ? `, followed by ${secondSource} (${secondSourceShare}%)` : ""
          }.`
        : "Direct visits and search engines accounted for most incoming traffic."
    }`;
  } else {
    trafficSummary =
      "Traffic recording has initialized. Real-time referral channels and device splits will populate here as visits log.";
  }

  let conversionSummary = "";
  let ratioHeadline = "";
  if (viewToInquiry > 0 || inquiriesSubmitted > 0) {
    ratioHeadline = `${outOf100Inquiries} inquiries per 100 profile views`;
    conversionSummary = `Approximately ${outOf100Inquiries} out of every 100 visitors who view a profile initiate an inquiry. ${inquiryCompletion}% of opened inquiry sheets are successfully submitted.`;
  } else {
    ratioHeadline = "Inquiry Telemetry Active";
    conversionSummary =
      "Inquiry telemetry is active. Ratios will update continuously as visitors message specialists.";
  }

  const bottleneckSummary =
    bottleneckDropoff > 0
      ? `Primary drop-off point is ${bottleneckStageName} (${bottleneckDropoff}% drop-off). Enhancing bio previews and specialty tags will improve click-throughs.`
      : "The inquiry funnel is balanced with steady progression.";

  const topPerformerNote =
    topPerformer && topPerformer.inquiriesSubmitted > 0
      ? `${topPerformer.specialistName} leads the roster with ${topPerformer.inquiriesSubmitted} inquiries sent (${topPerformer.viewToInquiryRate}% conversion rate).`
      : null;

  let specRevSummary = "";
  if (mrrCents > 0 || totalSpecialists > 0) {
    specRevSummary = `Roster includes ${totalSpecialists} active specialists (${specDeltaStr}) and ${totalClients} registered clients. ${
      pendingApplications > 0
        ? `${pendingApplications} pending application(s) awaiting review.`
        : "Application inbox is clear."
    } Monthly recurring revenue is ${mrrFormatted}/mo across ${payingCount} subscriber(s).`;
  } else {
    specRevSummary = `You have ${totalSpecialists} active specialists on roster and ${pendingApplications} pending applications.`;
  }

  // 6. Action Items
  const actionItems: AiActionItem[] = [];

  if (pendingApplications > 0) {
    actionItems.push({
      id: "action-apps",
      priority: "high",
      priorityLabel: "Immediate Action",
      title: `Review ${pendingApplications} Pending Application${pendingApplications > 1 ? "s" : ""}`,
      description: `Review candidates waiting in the Applications tab to expand catalog coverage.`,
      category: "operations",
    });
  }

  if (topSource && topSource !== "Direct" && topSourceShare >= 15) {
    actionItems.push({
      id: "action-traffic-source",
      priority: "medium",
      priorityLabel: "Growth Opportunity",
      title: `Double Down on ${topSource} Channel`,
      description: `${topSource} drives ${topSourceShare}% of all visitor traffic. Share featured specialist profiles on this channel.`,
      category: "growth",
    });
  } else if (mobileShare >= 75) {
    actionItems.push({
      id: "action-mobile",
      priority: "medium",
      priorityLabel: "Mobile Experience",
      title: "Optimize for Mobile Clients",
      description: `${mobileShare}% of clients browse on mobile devices. Keep headlines concise and imagery fast-loading.`,
      category: "experience",
    });
  }

  if (payingCount === 0 && totalSpecialists > 0) {
    actionItems.push({
      id: "action-monetization",
      priority: "medium",
      priorityLabel: "Revenue Unlock",
      title: "Activate Pro & Platinum Tiers",
      description: `Invite top-performing specialists to upgrade to Pro ($299/mo) or Platinum ($599/mo) for verified badges and priority ranking.`,
      category: "monetization",
    });
  } else if (inquiryCompletion < 35 && inquiryCompletion > 0) {
    actionItems.push({
      id: "action-inquiry-rate",
      priority: "medium",
      priorityLabel: "Funnel Optimization",
      title: "Streamline Inquiry Form Experience",
      description: `Add pre-filled consultation topics to reduce form abandonment.`,
      category: "experience",
    });
  } else {
    actionItems.push({
      id: "action-featured-spots",
      priority: "low",
      priorityLabel: "Catalog Growth",
      title: "Feature High-Converting Specialists on Homepage",
      description: `Place top converting trainers in the Homepage Spotlight rail to drive inquiries.`,
      category: "growth",
    });
  }

  return {
    generatedAt,
    isLive: true,
    headline: {
      title: headlineTitle,
      text: headlineText,
      sentiment,
      sentimentLabel,
    },
    traffic: {
      title: "Who's Visiting",
      summaryText: trafficSummary,
      visitorCountLabel: `${uniqueVisitors.toLocaleString()} unique visitors`,
      topSourceLabel: topSource,
      topSourceShare: `${topSourceShare}%`,
      mobileShareLabel: `${mobileShare}% Mobile`,
      newVsReturningLabel: `${newVisitorPct}% new · ${returningPct}% returning`,
      health: trafficHealth,
    },
    conversion: {
      title: "How People Are Converting",
      summaryText: conversionSummary,
      ratioHeadline,
      viewToInquiryRate: `${viewToInquiry}%`,
      inquiryCompletionRate: `${inquiryCompletion}%`,
      bottleneckSummary,
      topPerformerNote,
    },
    rosterAndRevenue: {
      title: "Specialists & Revenue",
      summaryText: specRevSummary,
      rosterCountLabel: `${totalSpecialists} specialists`,
      pendingCountLabel: `${pendingApplications} pending`,
      hasPending: pendingApplications > 0,
      mrrFormatted,
      payingCountLabel: `${payingCount} subscribers`,
      adBoostFormatted: adFormatted,
    },
    actionItems: actionItems.slice(0, 3),
  };
}

function generateBaselineBriefing(generatedAt: string): AiExecutiveBriefing {
  return {
    generatedAt,
    isLive: false,
    headline: {
      title: "AI Executive Briefing Connecting",
      text: "Synchronizing real-time telemetry from Supabase, Stripe billing, and visitor session logs.",
      sentiment: "steady",
      sentimentLabel: "Initializing",
    },
    traffic: {
      title: "Who's Visiting",
      summaryText:
        "Monitoring visitor sessions and referral origins. Breakdown of mobile vs desktop visitors and top channels will appear once traffic records.",
      visitorCountLabel: "Connecting…",
      topSourceLabel: "Direct",
      topSourceShare: "—",
      mobileShareLabel: "—",
      newVsReturningLabel: "—",
      health: "new",
    },
    conversion: {
      title: "How People Are Converting",
      summaryText:
        "Funnel analytics is tracking impressions, trainer card taps, profile visits, and client inquiry completions in real-time.",
      ratioHeadline: "Telemetry Initializing",
      viewToInquiryRate: "—",
      inquiryCompletionRate: "—",
      bottleneckSummary: "Awaiting visitor session data to pinpoint drop-off stages.",
      topPerformerNote: null,
    },
    rosterAndRevenue: {
      title: "Specialists & Revenue",
      summaryText:
        "Querying specialist roster counts, pending application submissions, and live Stripe monthly recurring revenue.",
      rosterCountLabel: "—",
      pendingCountLabel: "—",
      hasPending: false,
      mrrFormatted: "$0",
      payingCountLabel: "0 subscribers",
      adBoostFormatted: "$0",
    },
    actionItems: [
      {
        id: "action-init-1",
        priority: "medium",
        priorityLabel: "System Ready",
        title: "Marketplace Intelligence Active",
        description: "AI telemetry is running. Visitor sessions and inquiry conversions are captured automatically across all devices.",
        category: "operations",
      },
    ],
  };
}
