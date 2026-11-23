import type { Feel, Tempo } from "../../shared/intent";
import type { OutputKind } from "./devices";

/** What the director hands a renderer for one output on one tick. */
export interface SceneSample {
  /** 0–100, after glide and accents. */
  level: number;
  feel: Feel;
  tempo: Tempo;
  /** Time the current feel/tempo started, for shapes that evolve (build). */
  startedAt: number;
}

const PERIOD_MS: Record<Tempo, number> = { slow: 4000, medium: 2000, fast: 900 };
const BUILD_MS: Record<Tempo, number> = { slow: 60_000, medium: 30_000, fast: 15_000 };
const STROKES_PER_MINUTE: Record<Tempo, number> = { slow: 30, medium: 60, fast: 100 };

const frac = (x: number) => x - Math.floor(x);

/** Deterministic pseudo-random in [0, 1) per integer step, so tests are repeatable. */
function hash01(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 2 ** 32;
}

export const TEMPO_PERIOD_MS = PERIOD_MS;

/** Smooth deterministic wander in [-1, 1]; one new point per `periodMs`. */
export function wander(now: number, periodMs: number, seed: number): number {
  const t = now / periodMs;
  const i = Math.floor(t);
  const a = hash01(i * 7919 + seed) * 2 - 1;
  const b = hash01((i + 1) * 7919 + seed) * 2 - 1;
  const f = frac(t);
  return a + (b - a) * (f * f * (3 - 2 * f));
}

/**
 * Texture multiplier in [0, 1] at time `now`. `phase` (0–1) offsets outputs
 * in the same zone so multi-motor toys alternate.
 */
export function envelope(feel: Feel, tempo: Tempo, now: number, startedAt: number, phase = 0): number {
  const period = PERIOD_MS[tempo];
  const p = frac((now - startedAt) / period + phase);
  switch (feel) {
    case "steady":
      return 1;
    case "pulse":
      return p < 0.55 ? 1 : 0.15;
    case "wave":
      return 0.25 + 0.75 * (0.5 - 0.5 * Math.cos(2 * Math.PI * p));
    case "tease": {
      const q = frac((now - startedAt) / (period * 2) + phase);
      return q < 0.35 ? 1 : 0;
    }
    case "build":
      return 0.3 + 0.7 * Math.min(1, Math.max(0, (now - startedAt) / BUILD_MS[tempo]));
    case "throb": {
      const q = frac((now - startedAt) / (period * 1.5) + phase);
      return 0.2 + 0.8 * Math.sin(Math.PI * q) ** 4;
    }
    case "random": {
      const t = (now - startedAt) / (period / 2) + phase * 7;
      const i = Math.floor(t);
      const a = 0.3 + 0.7 * hash01(i);
      const b = 0.3 + 0.7 * hash01(i + 1);
      return a + (b - a) * frac(t);
    }
  }
}

/**
 * Normalized value for a continuous output: 0–1, or −1–1 for rotation
 * (sign is direction). Calibration and limits are the governor's job.
 */
export function renderContinuous(kind: OutputKind, s: SceneSample, now: number, phase: number): number {
  if (s.level <= 0) return 0;
  const base = s.level / 100;
  switch (kind) {
    case "Temperature":
      return base;
    case "Constrict":
    case "Inflate":
      // Air takes seconds to move; only slow squeeze-release textures make sense.
      return s.feel === "pulse" || s.feel === "throb"
        ? base * envelope("throb", "slow", now, s.startedAt, phase)
        : base;
    case "Rotate": {
      const speed = base * envelope(s.feel, s.tempo, now, s.startedAt, phase);
      const swaps = s.feel === "wave" || s.feel === "random";
      const direction = swaps && Math.floor((now - s.startedAt) / (PERIOD_MS[s.tempo] * 2)) % 2 === 1 ? -1 : 1;
      return speed * direction;
    }
    default:
      return base * envelope(s.feel, s.tempo, now, s.startedAt, phase);
  }
}

export interface StrokeTarget {
  /** Increments once per half-stroke; the governor sends each id once. */
  id: number;
  /** 0–1 within the user's stroke range. */
  position: number;
  durationMs: number;
}

/** Linear devices move between targets; each half-stroke is one command. */
export function renderStroke(s: SceneSample, now: number): StrokeTarget | null {
  if (s.level <= 0) return null;
  let spm = STROKES_PER_MINUTE[s.tempo];
  if (s.feel === "build") {
    const t = Math.min(1, (now - s.startedAt) / BUILD_MS[s.tempo]);
    spm = STROKES_PER_MINUTE.slow + (spm - STROKES_PER_MINUTE.slow) * t;
  }
  const half = 60_000 / spm / 2;
  const id = Math.floor((now - s.startedAt) / half);
  let length = s.level / 100;
  if (s.feel === "tease") {
    length *= 0.4;
    if (id % 6 >= 4) return { id, position: 0, durationMs: half };
  } else if (s.feel !== "steady" && s.feel !== "build") {
    length *= envelope(s.feel, "slow", now, s.startedAt);
  }
  return { id, position: id % 2 === 0 ? length : 0, durationMs: half };
}
