import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-api-auth";
import { generateCopilotTelemetryResponse } from "@/lib/admin-ai-copilot-engine";
import type { AdminAiCopilotRequest, AdminAiCopilotResponse } from "@/types/admin-ai-copilot";
import type { AdminPlatformPulse } from "@/types/admin-platform-pulse";

export async function POST(request: NextRequest) {
  const hasAdminAccess = await requireAdminApiAccess();
  if (!hasAdminAccess) {
    return NextResponse.json<AdminAiCopilotResponse>(
      {
        ok: false,
        reply: "Admin authorization required to access Jarvis.",
        source: "telemetry_engine",
        error: "Unauthorized",
      },
      { status: 403 }
    );
  }

  let body: AdminAiCopilotRequest;
  try {
    body = (await request.json()) as AdminAiCopilotRequest;
  } catch {
    return NextResponse.json<AdminAiCopilotResponse>(
      {
        ok: false,
        reply: "Invalid JSON request payload.",
        source: "telemetry_engine",
        error: "Bad Request",
      },
      { status: 400 }
    );
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json<AdminAiCopilotResponse>(
      {
        ok: false,
        reply: "Please provide a question or prompt.",
        source: "telemetry_engine",
        error: "Empty Prompt",
      },
      { status: 400 }
    );
  }

  const pulse: AdminPlatformPulse | null = body.context ?? null;
  const conversationHistory = body.conversationHistory ?? [];

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  // 1. If OpenAI API key is present, query OpenAI with strict guidelines
  if (apiKey) {
    try {
      const systemPrompt = `You are Jarvis, the executive operating intelligence for Jordan and the leadership of SMOAC (a luxury private wellness and personal trainer marketplace).

CORE RULES:
1. ZERO EMOJIS: Never use emojis anywhere in your response (no rockets, sparkles, charts, targets, faces, checkmarks, etc.).
2. ULTRA-CONCISE: Keep answers brief (1 to 3 direct sentences max unless explicitly asked for a detailed breakdown or list).
3. TONE: Calm, elegant, highly intelligent, direct, and executive. Speak as a trusted strategist.
4. TELEMETRY GROUND TRUTH: Ground all statements in the live telemetry below. Quote exact figures if relevant.

LIVE TELEMETRY SNAPSHOT:
${JSON.stringify(pulse, null, 2)}`;

      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        { role: "system", content: systemPrompt },
      ];

      // Append recent conversation history (up to last 6 messages)
      const recentHistory = conversationHistory.slice(-6);
      for (const msg of recentHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }

      // Add the latest user prompt
      messages.push({ role: "user", content: prompt });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          temperature: 0.5,
          max_tokens: 400,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (openAiRes.ok) {
        const data = await openAiRes.json();
        const aiReply = data.choices?.[0]?.message?.content?.trim();
        if (aiReply) {
          const suggestedFollowUps = extractOrGenerateFollowUps(prompt, pulse);
          return NextResponse.json<AdminAiCopilotResponse>({
            ok: true,
            reply: aiReply,
            source: "openai",
            model: "gpt-4o-mini",
            suggestedFollowUps,
          });
        }
      } else {
        const errText = await openAiRes.text().catch(() => "");
        console.warn("[SMOAC Jarvis] OpenAI API returned error, using telemetry engine fallback:", openAiRes.status, errText);
      }
    } catch (err) {
      console.warn("[SMOAC Jarvis] OpenAI call failed or timed out, using telemetry engine fallback:", err);
    }
  }

  // 2. Built-in Smart Telemetry Engine Fallback
  const engineResult = generateCopilotTelemetryResponse(prompt, pulse);

  return NextResponse.json<AdminAiCopilotResponse>({
    ok: true,
    reply: engineResult.reply,
    source: "telemetry_engine",
    suggestedFollowUps: engineResult.suggestedFollowUps,
  });
}

function extractOrGenerateFollowUps(prompt: string, _pulse: AdminPlatformPulse | null): string[] {
  const p = prompt.toLowerCase();
  if (p.includes("drop") || p.includes("conversion") || p.includes("funnel")) {
    return [
      "How can I scale specialist signups?",
      "Who are the highest-converting specialists?",
      "Where is visitor traffic coming from?",
    ];
  }
  if (p.includes("traffic") || p.includes("visitor") || p.includes("source")) {
    return [
      "Why are visitors dropping off before inquiring?",
      "What is the current revenue breakdown?",
      "What operational tasks should be prioritized?",
    ];
  }
  if (p.includes("revenue") || p.includes("money") || p.includes("mrr")) {
    return [
      "Who are the highest-converting specialists?",
      "How can I scale specialist signups?",
      "Why are visitors dropping off before inquiring?",
    ];
  }
  return [
    "Why are visitors dropping off before inquiring?",
    "How can I scale specialist signups?",
    "Where is visitor traffic coming from?",
    "What operational tasks should be prioritized?",
  ];
}
