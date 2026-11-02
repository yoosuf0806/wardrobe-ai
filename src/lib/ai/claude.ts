import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const STYLIST_MODEL = process.env.STYLIST_MODEL || "claude-opus-5-5";
export const STYLIST_EFFORT = (process.env.STYLIST_EFFORT || "medium") as "low" | "medium" | "high" | "xhigh" | "max";

/** Server-side refusal fallback: if the model declines, the API retries on its recommended fallback model. */
export const FALLBACK: { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: "default" } = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
};

let client: Anthropic | null = null;

export function claudeEnabled(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export function getClaude(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export function describeClaudeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "Claude API key is invalid.";
  if (err instanceof Anthropic.RateLimitError) return "Claude is rate limited – try again shortly.";
  if (err instanceof Anthropic.BadRequestError) return `Claude rejected the request: ${err.message}`;
  if (err instanceof Anthropic.APIError) return `Claude API error ${err.status ?? ""}`.trim();
  return err instanceof Error ? err.message : "Unknown AI error";
}
