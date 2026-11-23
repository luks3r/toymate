export const FEELS = ["steady", "pulse", "wave", "tease", "build", "throb", "random"] as const;
export type Feel = (typeof FEELS)[number];

export const TEMPOS = ["slow", "medium", "fast"] as const;
export type Tempo = (typeof TEMPOS)[number];

export const ACCENTS = ["spike", "pause", "flutter"] as const;
export type Accent = (typeof ACCENTS)[number];

export const ALL_ZONES = "all";

/**
 * A scene change. Beyond a fixed level it can ramp (`level` → `to` over
 * `overSec`), wander (`spread` = ± random variation around the level), and be
 * temporary (`forSec`, after which the zone returns to what it was before).
 */
export interface SceneIntent {
  kind: "scene";
  zone: string;
  level?: number;
  delta?: number;
  to?: number;
  overSec?: number;
  spread?: number;
  forSec?: number;
  feel?: Feel;
  tempo?: Tempo;
}

export const MAX_SPREAD = 50;

export type Intent =
  | SceneIntent
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

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Validates an intent from untrusted input (settings, rules, planner output).
 * Accepts the planner's short names (`over`, `for`) and the stored ones.
 */
export function parseIntent(raw: unknown, zones: readonly string[], maxLevel = 100): Intent | null {
  if (!isRecord(raw)) return null;
  const zone = typeof raw.zone === "string" && zones.includes(raw.zone) ? raw.zone : ALL_ZONES;
  const action = raw.kind ?? raw.action;
  if (action === "stop") return { kind: "stop", zone };
  if (action === "accent") return isAccent(raw.accent) ? { kind: "accent", zone, accent: raw.accent } : null;
  if (action !== "scene" && action !== "set") return null;
  const intent: SceneIntent = { kind: "scene", zone };
  if (finite(raw.level)) intent.level = clampLevel(raw.level, maxLevel);
  if (finite(raw.delta)) intent.delta = Math.round(clamp(raw.delta, -100, 100));
  if (finite(raw.to)) intent.to = clampLevel(raw.to, maxLevel);
  const over = raw.overSec ?? raw.over;
  if (finite(over) && intent.to !== undefined) intent.overSec = Math.round(clamp(over, 0.5, 600) * 10) / 10;
  if (finite(raw.spread) && raw.spread > 0) intent.spread = Math.round(clamp(raw.spread, 0, MAX_SPREAD));
  const forSec = raw.forSec ?? raw.for;
  if (finite(forSec) && forSec > 0) intent.forSec = Math.round(clamp(forSec, 1, 600));
  if (isFeel(raw.feel)) intent.feel = raw.feel;
  if (isTempo(raw.tempo)) intent.tempo = raw.tempo;
  const { kind: _k, zone: _z, ...fields } = intent;
  return Object.keys(fields).length ? intent : null;
}

export function describeIntent(intent: Intent): string {
  const where = intent.zone === ALL_ZONES ? "" : ` @${intent.zone}`;
  if (intent.kind === "stop") return `stop${where}`;
  if (intent.kind === "accent") return `${intent.accent}${where}`;
  const parts: string[] = [];
  if (intent.to !== undefined) parts.push(`${intent.level ?? "now"}→${intent.to}${intent.overSec ? ` over ${intent.overSec}s` : ""}`);
  else if (intent.level !== undefined) parts.push(`${intent.level}`);
  if (intent.delta !== undefined) parts.push(`${intent.delta >= 0 ? "+" : ""}${intent.delta}`);
  if (intent.spread) parts.push(`±${intent.spread}`);
  if (intent.feel) parts.push(intent.feel);
  if (intent.tempo) parts.push(intent.tempo);
  if (intent.forSec) parts.push(`for ${intent.forSec}s`);
  return `${parts.join(" ")}${where}`;
}
