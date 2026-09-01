import type { AdminPlatformPulse } from "@/types/admin-platform-pulse";
import { smoacRevenueTotalCents } from "@/types/admin-platform-pulse";
import { formatBillingCents } from "@/lib/admin-specialist-billing-service";

export interface EngineQueryResult {
  reply: string;
  suggestedFollowUps: string[];
}

/**
 * Smart contextual NLP intelligence engine for SMOAC Admin Portal.
 * Delivers concise, data-grounded, executive-grade answers using live telemetry.
 * Strictly emoji-free, direct, professional tone.
 */
export function generateCopilotTelemetryResponse(
  prompt: string,
  pulse: AdminPlatformPulse | null
): EngineQueryResult {
  const cleanPrompt = prompt.toLowerCase().trim();

  // Extract pulse metrics safely
  const specialistsTotal = pulse?.specialists?.total ?? 0;
  const specialistsDelta = pulse?.specialists?.delta ?? 0;
  const clientsTotal = pulse?.clients?.total ?? 0;
  const pendingApps = pulse?.pendingApplications ?? 0;

  const views = pulse?.traffic?.views ?? 0;
  const uniqueVisitors = pulse?.traffic?.uniqueVisitors ?? 0;
  const newVisitors = pulse?.traffic?.newVisitors ?? 0;
  const visitorPctChange = pulse?.traffic?.uniqueVisitorsPercentChange ?? null;
  const topSources = pulse?.traffic?.topSources ?? [];
  const topSource = topSources[0]?.source ?? "Direct";
  const topSourceShare = topSources[0]?.sharePercent ?? 0;
  const devices = pulse?.traffic?.devices ?? { mobile: 0, desktop: 0, unknown: 0 };
  const totalDevices = devices.mobile + devices.desktop + devices.unknown || 1;
  const mobilePct = Math.round((devices.mobile / totalDevices) * 100);
  const desktopPct = Math.round((devices.desktop / totalDevices) * 100);

  const earnings = pulse?.earnings;
  const membershipCents = earnings?.subscriberRevenueCents ?? 0;
  const adCents = earnings?.adRevenueCents ?? 0;
  const paidCount = earnings?.paidSubscriberCount ?? 0;
  const totalCents = smoacRevenueTotalCents(earnings);
  const mrrFormatted = formatBillingCents(membershipCents, { decimals: 0 });
  const adFormatted = formatBillingCents(adCents, { decimals: 0 });
  const totalFormatted = formatBillingCents(totalCents, { decimals: 0 });

  const funnel = pulse?.conversionFunnel;
  const viewToInquiryRate = funnel?.viewToInquiryRate ?? 0;
  const inquiryCompletionRate = funnel?.inquiryCompletionRate ?? 0;
  const topSpecialists = funnel?.topSpecialists ?? [];
  const stages = funnel?.stages ?? [];

  // Identify bottleneck stage
  const highestDropoff = [...stages]
    .filter((s) => s.dropoffRate != null && s.dropoffRate > 0)
    .sort((a, b) => (b.dropoffRate ?? 0) - (a.dropoffRate ?? 0))[0];

  const topPerformer = topSpecialists[0];

  // =========================================================================
  // INTENT ROUTING (Concise, executive, emoji-free)
  // =========================================================================

  // 1. Conversion & Drop-off Intent
  if (
    cleanPrompt.includes("drop") ||
    cleanPrompt.includes("conversion") ||
    cleanPrompt.includes("bottleneck") ||
    cleanPrompt.includes("funnel") ||
    cleanPrompt.includes("inquiry rate") ||
    cleanPrompt.includes("why are people leaving") ||
    cleanPrompt.includes("not inquiring") ||
    cleanPrompt.includes("lose clients")
  ) {
    let reply = `### Conversion Funnel & Drop-off Analysis\n\n`;
    reply += `Current telemetry shows a **${viewToInquiryRate}% view-to-inquiry rate** and a **${inquiryCompletionRate}% inquiry form completion rate**.\n\n`;

    if (highestDropoff) {
      reply += `- **Primary Friction Point**: **${highestDropoff.label}** (${highestDropoff.dropoffRate}% drop-off).\n`;
      if (highestDropoff.id === "profile_views") {
        reply += `- **Diagnosis**: Visitors browse Explore cards but do not click into full profiles. Adding clearer specialty tags, verified badges, and pricing hints will increase tap-throughs.\n`;
      } else if (highestDropoff.id === "inquiry_started") {
        reply += `- **Diagnosis**: Visitors view full profiles but hesitate to start an inquiry. Adding prominent verified reviews and concise hero bios will build instant trust.\n`;
      } else {
        reply += `- **Diagnosis**: Visitors open the inquiry drawer but abandon before submitting. Pre-filled 1-tap starter questions reduce message friction.\n`;
      }
    } else {
      reply += `- **Funnel Health**: The inquiry pipeline is balanced across all stages.\n`;
    }

    if (topPerformer) {
      reply += `- **Benchmark**: **${topPerformer.specialistName}** leads with a **${topPerformer.viewToInquiryRate}% conversion efficiency** across ${topPerformer.inquiriesSubmitted} inquiries.\n`;
    }

    return {
      reply,
      suggestedFollowUps: [
        "How can I scale specialist signups?",
        "Who are the highest-converting specialists?",
        "Where is visitor traffic coming from?",
      ],
    };
  }

  // 2. Growth & Specialist / Client Acquisition Intent
  if (
    cleanPrompt.includes("double") ||
    cleanPrompt.includes("growth") ||
    cleanPrompt.includes("more specialist") ||
    cleanPrompt.includes("more client") ||
    cleanPrompt.includes("acquisition") ||
    cleanPrompt.includes("marketing") ||
    cleanPrompt.includes("scale") ||
    cleanPrompt.includes("signups") ||
    cleanPrompt.includes("grow")
  ) {
    let reply = `### Marketplace Growth Strategy\n\n`;
    reply += `With **${specialistsTotal} active specialists**, **${clientsTotal} clients**, and **${uniqueVisitors.toLocaleString()} weekly visitors**, here are your highest-leverage growth actions:\n\n`;
    reply += `1. **Founding 50 Campaign**: Invite elite regional trainers via \`/founding-50\` with complimentary 30-day Pro Badges to rapidly deepen local catalog density.\n`;
    if (topSource && topSource !== "Direct") {
      reply += `2. **Channel Amplification**: ${topSource} drives **${topSourceShare}%** of your traffic. Distribute specialist transformation spotlights directly on this channel.\n`;
    } else {
      reply += `2. **Targeted Inquiries**: Promote curated private trainer collections in affluent metropolitan hubs to capture high-ticket private clients.\n`;
    }
    if (pendingApps > 0) {
      reply += `3. **Clear Application Queue**: You have **${pendingApps} pending application(s)** waiting in the queue. Reviewing them immediately adds fresh supply.\n`;
    } else {
      reply += `3. **Trainer Referral Links**: Encourage active specialists to link their direct profile on social bios for zero-friction bookings.\n`;
    }

    return {
      reply,
      suggestedFollowUps: [
        "Why are visitors dropping off before inquiring?",
        "What is the current monthly revenue breakdown?",
        "What operational tasks should be prioritized?",
      ],
    };
  }

  // 3. Revenue, Billing, MRR & Monetization Intent
  if (
    cleanPrompt.includes("revenue") ||
    cleanPrompt.includes("money") ||
    cleanPrompt.includes("mrr") ||
    cleanPrompt.includes("billing") ||
    cleanPrompt.includes("stripe") ||
    cleanPrompt.includes("pricing") ||
    cleanPrompt.includes("earning") ||
    cleanPrompt.includes("monetiz") ||
    cleanPrompt.includes("tier")
  ) {
    let reply = `### Revenue & Monetization Snapshot\n\n`;
    reply += `- **Stripe MRR**: **${mrrFormatted}/month** across **${paidCount} paying subscriber(s)**.\n`;
    reply += `- **Active Boosts**: **${adFormatted}** in promotional visibility packages.\n`;
    reply += `- **Roster**: **${specialistsTotal} approved specialists** on platform.\n\n`;
    reply += `**Recommended Revenue Action**:\n`;
    if (paidCount === 0 && specialistsTotal > 0) {
      reply += `Offer a 14-day Pro tier trial ($299/mo) to your top 3 most-viewed specialists to initiate recurring software subscription revenue.\n`;
    } else {
      reply += `Encourage specialists with high inquiry volume to upgrade to Platinum ($599/mo) for category exclusivity and homepage spotlight placement.\n`;
    }

    return {
      reply,
      suggestedFollowUps: [
        "Who are the top performing specialists?",
        "How can I scale specialist signups?",
        "Where is visitor traffic coming from?",
      ],
    };
  }

  // 4. Traffic, Visitors & Device Breakdown Intent
  if (
    cleanPrompt.includes("traffic") ||
    cleanPrompt.includes("visitor") ||
    cleanPrompt.includes("view") ||
    cleanPrompt.includes("device") ||
    cleanPrompt.includes("mobile") ||
    cleanPrompt.includes("where is traffic") ||
    cleanPrompt.includes("source") ||
    cleanPrompt.includes("referrer") ||
    cleanPrompt.includes("who is visiting")
  ) {
    let reply = `### Visitor Traffic & Audience Breakdown\n\n`;
    reply += `- **Page Views**: **${views.toLocaleString()} views** over the last 7 days.\n`;
    reply += `- **Unique Visitors**: **${uniqueVisitors.toLocaleString()} people** (${newVisitors.toLocaleString()} new, ${
      visitorPctChange != null
        ? visitorPctChange >= 0
          ? `+${visitorPctChange.toFixed(1)}% vs last week`
          : `${visitorPctChange.toFixed(1)}% vs last week`
        : "baseline"
    }).\n`;
    reply += `- **Devices**: **${mobilePct}% Mobile** vs **${desktopPct}% Desktop**.\n`;
    if (topSources.length > 0) {
      reply += `- **Top Channels**: ${topSources
        .slice(0, 3)
        .map((s) => `${s.source} (${s.sharePercent}%)`)
        .join(", ")}.\n`;
    }

    return {
      reply,
      suggestedFollowUps: [
        "Why are visitors dropping off before inquiring?",
        "What is the current revenue breakdown?",
        "Who are the highest-converting specialists?",
      ],
    };
  }

  // 5. Top Specialists & Roster Performance Intent
  if (
    cleanPrompt.includes("specialist") ||
    cleanPrompt.includes("trainer") ||
    cleanPrompt.includes("top performer") ||
    cleanPrompt.includes("roster") ||
    cleanPrompt.includes("who is best") ||
    cleanPrompt.includes("leader")
  ) {
    let reply = `### Specialist Roster & Conversion Performance\n\n`;
    reply += `- **Active Specialists**: **${specialistsTotal}** (${
      specialistsDelta > 0 ? `+${specialistsDelta} added this week` : "stable"
    }).\n`;
    reply += `- **Pending Applications**: **${pendingApps}** awaiting review.\n\n`;

    if (topSpecialists.length > 0) {
      reply += `**Top Performers by Inquiries**:\n`;
      topSpecialists.slice(0, 4).forEach((spec, idx) => {
        reply += `${idx + 1}. **${spec.specialistName}** (${spec.city || "New York"}) — **${spec.inquiriesSubmitted} inquiries** (${spec.viewToInquiryRate}% conversion rate)\n`;
      });
    } else {
      reply += `Top specialist rankings will populate automatically as inquiries are submitted.\n`;
    }

    return {
      reply,
      suggestedFollowUps: [
        "What operational tasks should be prioritized?",
        "Why are visitors dropping off before inquiring?",
        "How can I scale specialist signups?",
      ],
    };
  }

  // 6. Action Items / Priority Operations
  if (
    cleanPrompt.includes("do next") ||
    cleanPrompt.includes("action") ||
    cleanPrompt.includes("tackle") ||
    cleanPrompt.includes("priority") ||
    cleanPrompt.includes("task") ||
    cleanPrompt.includes("todo") ||
    cleanPrompt.includes("operation")
  ) {
    let reply = `### Priority Action Items\n\n`;
    let step = 1;

    if (pendingApps > 0) {
      reply += `${step}. **Review ${pendingApps} Pending Application${pendingApps > 1 ? "s" : ""}**: Clear the applicant queue in the Applications tab to expand catalog coverage.\n`;
      step++;
    }

    if (highestDropoff && highestDropoff.dropoffRate && highestDropoff.dropoffRate > 40) {
      reply += `${step}. **Optimize ${highestDropoff.label}**: Address the ${highestDropoff.dropoffRate}% drop-off stage by adding badges and streamlined inquiry prompts.\n`;
      step++;
    } else if (topSource && topSource !== "Direct") {
      reply += `${step}. **Amplify ${topSource}**: Post featured trainer spotlights to drive traffic from your top channel (${topSourceShare}% share).\n`;
      step++;
    }

    if (paidCount === 0 && specialistsTotal > 0) {
      reply += `${step}. **Activate First Pro Subscribers**: Offer a Pro trial to top-converting trainers to seed subscription MRR.\n`;
    } else {
      reply += `${step}. **Curate Homepage Spotlights**: Feature top-rated specialists to maintain fresh catalog discovery.\n`;
    }

    return {
      reply,
      suggestedFollowUps: [
        "Why are visitors dropping off before inquiring?",
        "Where is visitor traffic coming from?",
        "What is the current monthly revenue breakdown?",
      ],
    };
  }

  // 7. How-to & Admin Portal Usage Intent
  if (
    cleanPrompt.includes("how do i") ||
    cleanPrompt.includes("how to use") ||
    cleanPrompt.includes("how does") ||
    cleanPrompt.includes("portal") ||
    cleanPrompt.includes("feature a trainer") ||
    cleanPrompt.includes("verified badge") ||
    cleanPrompt.includes("admin help")
  ) {
    let reply = `### Admin Portal Operations Guide\n\n`;
    reply += `- **Reviewing Applications**: Open the Applications tab to approve, request edits, or archive specialist applicants with one click.\n`;
    reply += `- **Featuring Specialists**: In the Specialists tab, toggle Featured, Sponsored, or Tier badges to adjust search priority.\n`;
    reply += `- **Managing Clients**: Access the Clients tab to view registered accounts and contact histories.\n`;
    reply += `- **Tracking Revenue**: The Revenue tab displays Stripe settlements, active tiers, and ad boost earnings.\n`;

    return {
      reply,
      suggestedFollowUps: [
        "What operational tasks should be prioritized?",
        "Why are visitors dropping off before inquiring?",
        "How can I scale specialist signups?",
      ],
    };
  }

  // 8. Default Executive Summary
  let reply = `### Executive Summary\n\n`;
  reply += `- **Supply**: **${specialistsTotal} active specialists** (${pendingApps > 0 ? `${pendingApps} pending in queue` : "queue clear"}).\n`;
  reply += `- **Demand**: **${clientsTotal} registered clients**, **${uniqueVisitors.toLocaleString()} weekly visitors**.\n`;
  reply += `- **Conversions**: **${viewToInquiryRate}% view-to-inquiry rate**, **${inquiryCompletionRate}% form completion rate**.\n`;
  reply += `- **Revenue**: **${totalFormatted}/mo** all SMOAC payments (${paidCount} paid subscribers).\n`;
  reply += `- **Audience**: **${mobilePct}% Mobile**, led by **${topSource}** (${topSourceShare}% share).\n`;

  return {
    reply,
    suggestedFollowUps: [
      "Why are visitors dropping off before inquiring?",
      "How can I scale specialist signups?",
      "Where is visitor traffic coming from?",
      "What is the current monthly revenue breakdown?",
    ],
  };
}
