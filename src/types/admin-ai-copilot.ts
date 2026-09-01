import type { AdminPlatformPulse } from "./admin-platform-pulse";

export type CopilotEngineSource = "openai" | "telemetry_engine";

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  source?: CopilotEngineSource;
  model?: string;
  suggestedFollowUps?: string[];
}

export interface AdminAiCopilotRequest {
  prompt: string;
  context?: AdminPlatformPulse | null;
  conversationHistory?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export interface AdminAiCopilotResponse {
  ok: boolean;
  reply: string;
  source: CopilotEngineSource;
  model?: string;
  suggestedFollowUps?: string[];
  error?: string;
}
