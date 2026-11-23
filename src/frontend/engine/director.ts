import { ALL_ZONES, clampLevel, type Accent, type Feel, type Intent, type Tempo } from "../../shared/intent";
import { namedSceneKey } from "./devices";
import { TEMPO_PERIOD_MS, wander, type SceneSample } from "./renderers";

export type Source = "manual" | "auto";

interface Base {
  target: number;
  feel: Feel;
  tempo: Tempo;
  spread: number;
  startedAt: number;
}

interface Scene extends Base {
  current: number;
  touchedAt: number;
  accent: { accent: Accent; until: number } | null;
  ramp: { from: number; to: number; start: number; end: number } | null;
  /** A temporary change (`forSec`) puts back what it replaced at `at`. */
  restore: { at: number; base: Base } | null;
  seed: number;
}

interface ScheduledCue {
  at: number;
  intent: Intent;
  groupId: string;
}

const ACCENT_MS: Record<Accent, number> = { spike: 1500, pause: 2000, flutter: 2000 };
/** Level change per second while gliding toward a new target. */
const GLIDE_PER_SECOND = 80;
const DEFAULT_RAMP_SEC = 8;

const seedOf = (key: string) => [...key].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261) >>> 0;

export interface SceneView {
  zone: string;
  level: number;
  target: number;
  feel: Feel;
  tempo: Tempo;
  accent: Accent | null;
  spread: number;
  rampTo: number | null;
  locked: boolean;
}

/**
 * Owns scenes per zone, accents, scheduled cues, and the hold timeout.
 * Pure state machine: callers pass time in.
 */
export class Director {
  private scenes = new Map<string, Scene>();
  private locked = new Set<string>();
  private cues: ScheduledCue[] = [];
  private lastTick: number | null = null;

  constructor(
    private zones: readonly string[],
    private holdTimeoutMs: number,
  ) {}

  configure(zones: readonly string[], holdTimeoutMs: number) {
    this.zones = zones;
    this.holdTimeoutMs = holdTimeoutMs;
    for (const key of [...this.scenes.keys()]) {
      if (!zones.some((z) => key === z || key === namedSceneKey(z))) this.scenes.delete(key);
    }
  }

  private scene(key: string, now: number): Scene {
    let s = this.scenes.get(key);
    if (!s) {
      s = { target: 0, current: 0, feel: "steady", tempo: "medium", spread: 0, startedAt: now, touchedAt: now, accent: null, ramp: null, restore: null, seed: seedOf(key) };
      this.scenes.set(key, s);
    }
    return s;
  }

  /** `all` reaches every zone's normal scene; a named zone also reaches its named-only scene. */
  private keysFor(zone: string): string[] {
    if (zone === ALL_ZONES) return [...this.zones];
    return this.zones.includes(zone) ? [zone, namedSceneKey(zone)] : [];
  }

  apply(intent: Intent, now: number, source: Source): void {
    for (const key of this.keysFor(intent.zone)) {
      const zone = key.replace(/:named$/, "");
      if (source === "auto" && this.locked.has(zone)) continue;
      const s = this.scene(key, now);
      s.touchedAt = now;
      if (intent.kind === "stop") {
        clearScene(s);
      } else if (intent.kind === "accent") {
        s.accent = { accent: intent.accent, until: now + ACCENT_MS[intent.accent] };
      } else {
        const before: Base = { target: s.ramp ? s.ramp.to : s.target, feel: s.feel, tempo: s.tempo, spread: s.spread, startedAt: s.startedAt };
        s.ramp = null;
        s.restore = null;
        if (intent.level !== undefined) s.target = clampLevel(intent.level);
        if (intent.delta !== undefined) s.target = clampLevel(s.target + intent.delta);
        if (intent.to !== undefined) {
          const over = (intent.overSec ?? DEFAULT_RAMP_SEC) * 1000;
          s.ramp = { from: s.target, to: clampLevel(intent.to), start: now, end: now + over };
        }
        if (intent.spread !== undefined) s.spread = intent.spread;
        if ((intent.feel && intent.feel !== s.feel) || (intent.tempo && intent.tempo !== s.tempo)) s.startedAt = now;
        if (intent.feel) s.feel = intent.feel;
        if (intent.tempo) s.tempo = intent.tempo;
        if (intent.forSec) s.restore = { at: now + intent.forSec * 1000, base: before };
      }
    }
  }

  schedule(groupId: string, cues: readonly { at: number; intent: Intent }[]): void {
    this.cues.push(...cues.map((c) => ({ ...c, groupId })));
    this.cues.sort((a, b) => a.at - b.at);
  }

  cancel(groupId: string): void {
    this.cues = this.cues.filter((c) => c.groupId !== groupId);
  }

  pending(): readonly { at: number; intent: Intent; groupId: string }[] {
    return this.cues;
  }

  setLocked(zone: string, locked: boolean) {
    if (locked) this.locked.add(zone);
    else this.locked.delete(zone);
  }

  isLocked(zone: string) {
    return this.locked.has(zone);
  }

  /** Stops every scene and drops scheduled cues. */
  stopAll(now: number): void {
    this.cues = [];
    for (const s of this.scenes.values()) {
      clearScene(s);
      s.touchedAt = now;
    }
  }

  tick(now: number): void {
    while (this.cues.length && this.cues[0]!.at <= now) this.apply(this.cues.shift()!.intent, now, "auto");
    const dt = this.lastTick === null ? 0 : Math.max(0, now - this.lastTick);
    this.lastTick = now;
    for (const s of this.scenes.values()) {
      if (s.restore && now >= s.restore.at) {
        Object.assign(s, s.restore.base);
        s.restore = null;
        s.ramp = null;
        s.touchedAt = now;
      }
      if (s.ramp) {
        const p = Math.min(1, (now - s.ramp.start) / Math.max(1, s.ramp.end - s.ramp.start));
        s.target = Math.round(s.ramp.from + (s.ramp.to - s.ramp.from) * p);
        s.touchedAt = now;
        if (p >= 1) s.ramp = null;
      }
      if (s.target > 0 && now - s.touchedAt > this.holdTimeoutMs) {
        s.target = 0;
        s.restore = null;
      }
      if (s.accent && now >= s.accent.until) s.accent = null;
      const step = (GLIDE_PER_SECOND * dt) / 1000;
      s.current = s.current < s.target ? Math.min(s.target, s.current + step) : Math.max(s.target, s.current - step);
    }
  }

  sample(key: string, now: number): SceneSample | null {
    const s = this.scenes.get(key);
    if (!s) return null;
    const level = s.current > 0 && s.spread > 0 ? Math.max(1, Math.min(100, s.current + s.spread * wander(now, TEMPO_PERIOD_MS[s.tempo] * 2, s.seed))) : s.current;
    switch (s.accent?.accent) {
      case "pause":
        return { level: 0, feel: s.feel, tempo: s.tempo, startedAt: s.startedAt };
      case "spike":
        return { level: Math.min(100, Math.max(level, 20) + 35), feel: "steady", tempo: s.tempo, startedAt: s.startedAt };
      case "flutter":
        return { level: Math.max(level, 30), feel: "pulse", tempo: "fast", startedAt: s.startedAt };
      default:
        return { level, feel: s.feel, tempo: s.tempo, startedAt: s.startedAt };
    }
  }

  views(): SceneView[] {
    return this.zones.map((zone) => {
      const s = this.scenes.get(zone);
      return {
        zone,
        level: Math.round(s?.current ?? 0),
        target: s?.target ?? 0,
        feel: s?.feel ?? "steady",
        tempo: s?.tempo ?? "medium",
        accent: s?.accent?.accent ?? null,
        spread: s?.spread ?? 0,
        rampTo: s?.ramp?.to ?? null,
        locked: this.locked.has(zone),
      };
    });
  }

  isActive(): boolean {
    return [...this.scenes.values()].some((s) => s.current > 0 || s.target > 0 || s.accent?.accent === "spike" || s.accent?.accent === "flutter");
  }

  /** One-line summary for the planner and the awareness note. */
  summary(): string {
    const active = this.views().filter((v) => v.target > 0);
    if (active.length === 0) return "all devices idle";
    return active
      .map((v) => `${v.zone}: ${v.feel}, ${v.tempo}, level ${v.target}${v.rampTo !== null ? ` rising/falling to ${v.rampTo}` : ""}${v.spread ? ` ±${v.spread}` : ""}`)
      .join("; ");
  }
}

function clearScene(s: Scene) {
  s.target = 0;
  s.current = 0;
  s.accent = null;
  s.ramp = null;
  s.restore = null;
  s.spread = 0;
}
