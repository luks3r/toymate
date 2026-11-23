export const FEELS = ["steady", "pulse", "wave", "tease", "build", "throb", "random"] as const;
export type Feel = (typeof FEELS)[number];

export const TEMPOS = ["slow", "medium", "fast"] as const;
export type Tempo = (typeof TEMPOS)[number];

export const ACCENTS = ["spike", "pause", "flutter"] as const;
export type Accent = (typeof ACCENTS)[number];

export const ALL_ZONES = "all";

export type Intent =
  | { kind: "scene"; zone: string; level?: number; delta?: number; feel?: Feel; tempo?: Tempo }
  | { kind: "accent"; zone: string; accent: Accent }
  | { kind: "stop"; zone: string };

export const isFeel = (value: unknown): value is Feel => FEELS.includes(value as Feel);
export const isTempo = (value: unknown): value is Tempo => TEMPOS.includes(value as Tempo);
export const isAccent = (value: unknown): value is Accent => ACCENTS.includes(value as Accent);

export function clampLevel(value: number, max = 100): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.round(value)));
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Validates an intent from untrusted input (settings, rules, planner output). */
export function parseIntent(raw: unknown, zones: readonly string[], maxLevel = 100): Intent | null {
  if (!isRecord(raw)) return null;
  const zone = typeof raw.zone === "string" && zones.includes(raw.zone) ? raw.zone : ALL_ZONES;
  const action = raw.kind ?? raw.action;
  if (action === "stop") return { kind: "stop", zone };
  if (action === "accent") return isAccent(raw.accent) ? { kind: "accent", zone, accent: raw.accent } : null;
  if (action !== "scene" && action !== "set") return null;
  const intent: Intent = { kind: "scene", zone };
  if (typeof raw.level === "number" && Number.isFinite(raw.level)) intent.level = clampLevel(raw.level, maxLevel);
  if (typeof raw.delta === "number" && Number.isFinite(raw.delta)) intent.delta = Math.max(-100, Math.min(100, Math.round(raw.delta)));
  if (isFeel(raw.feel)) intent.feel = raw.feel;
  if (isTempo(raw.tempo)) intent.tempo = raw.tempo;
  if (intent.level === undefined && intent.delta === undefined && !intent.feel && !intent.tempo) return null;
  return intent;
}

export function describeIntent(intent: Intent): string {
  const where = intent.zone === ALL_ZONES ? "" : ` @${intent.zone}`;
  if (intent.kind === "stop") return `stop${where}`;
  if (intent.kind === "accent") return `${intent.accent}${where}`;
  const parts: string[] = [];
  if (intent.level !== undefined) parts.push(`${intent.level}`);
  if (intent.delta !== undefined) parts.push(`${intent.delta >= 0 ? "+" : ""}${intent.delta}`);
  if (intent.feel) parts.push(intent.feel);
  if (intent.tempo) parts.push(intent.tempo);
  return `${parts.join(" ")}${where}`;
}
