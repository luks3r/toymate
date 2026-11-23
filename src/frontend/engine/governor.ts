import type { Limits, OutputPrefs } from "../../shared/settings";
import { UNDRIVEN, type OutputInfo } from "./devices";
import type { StrokeTarget } from "./renderers";

/** The only interface through which output reaches hardware. */
export interface OutputSink {
  send(output: OutputInfo, value: number, durationMs?: number): Promise<void>;
  stopAll(): Promise<void>;
}

export type Desired = { kind: "value"; value: number } | { kind: "stroke"; stroke: StrokeTarget | null };

interface OutputState {
  /** Device-range fraction after ramp limiting, 0–1. */
  fraction: number;
  sign: 1 | -1;
  lastSwapAt: number;
  lastTickAt: number | null;
  lastSent: number;
  lastSentAt: number;
  inFlight: boolean;
  onSince: number | null;
  releaseUntil: number;
  lastStrokeId: number | null;
  lastPosition: number;
}

const RELEASE_MIN_MS = 5000;

/**
 * Single choke point between renderers and hardware: calibration, limits,
 * ramp, per-type safety, timing gap, dedupe, and stop-all.
 */
export class Governor {
  private states = new Map<string, OutputState>();
  private stopped = false;

  constructor(
    private sink: OutputSink,
    private limits: Limits,
    private prefs: (key: string) => OutputPrefs,
    private onFault: (error: unknown) => void,
  ) {}

  configure(limits: Limits, prefs: (key: string) => OutputPrefs) {
    this.limits = limits;
    this.prefs = prefs;
  }

  /** Forget outputs that disappeared. */
  retain(keys: ReadonlySet<string>) {
    for (const key of [...this.states.keys()]) if (!keys.has(key)) this.states.delete(key);
  }

  private state(key: string): OutputState {
    let s = this.states.get(key);
    if (!s) {
      s = {
        fraction: 0,
        sign: 1,
        lastSwapAt: -Infinity,
        lastTickAt: null,
        // Connect sends stop-all, so every output starts known at 0.
        lastSent: 0,
        lastSentAt: -Infinity,
        inFlight: false,
        onSince: null,
        releaseUntil: 0,
        lastStrokeId: null,
        lastPosition: 0,
      };
      this.states.set(key, s);
    }
    return s;
  }

  /** Fresh connection: forget per-output state. */
  reset() {
    this.states.clear();
    this.stopped = false;
  }

  /** Resumes sending after stopAll. */
  resume() {
    this.stopped = false;
  }

  apply(output: OutputInfo, desired: Desired, now: number): void {
    if (this.stopped || UNDRIVEN.has(output.kind)) return;
    const s = this.state(output.key);
    const dt = s.lastTickAt === null ? 0 : Math.max(0, now - s.lastTickAt);
    s.lastTickAt = now;
    if (desired.kind === "stroke") this.applyStroke(output, s, desired.stroke, now);
    else this.applyValue(output, s, desired.value, now, dt);
  }

  private targetFraction(output: OutputInfo, normalized: number): number {
    const level = Math.min(Math.abs(normalized) * 100, this.limits.maxLevel);
    if (!(level > 0)) return 0;
    const { floor, ceiling } = this.prefs(output.key);
    let fraction = (floor + ((ceiling - floor) * level) / 100) / 100;
    if (output.kind === "Temperature") fraction = Math.min(fraction, this.limits.temperatureMax / 100);
    return Math.min(1, Math.max(0, fraction));
  }

  private applyValue(output: OutputInfo, s: OutputState, normalized: number, now: number, dt: number) {
    const target = this.targetFraction(output, normalized);
    const maxRise = ((this.limits.rampPerSecond / 100) * dt) / 1000;
    const wasIdle = s.fraction === 0;
    s.fraction = target > s.fraction ? Math.min(target, s.fraction + maxRise) : target;
    if (wasIdle && s.fraction > 0) s.lastSwapAt = now;

    if (output.kind === "Constrict" || output.kind === "Inflate") {
      if (now < s.releaseUntil) s.fraction = 0;
      else if (s.fraction > 0) {
        s.onSince ??= now;
        const maxHold = this.limits.constrictMaxHoldSec * 1000;
        if (now - s.onSince > maxHold) {
          s.releaseUntil = now + Math.max(RELEASE_MIN_MS, maxHold / 2);
          s.onSince = null;
          s.fraction = 0;
        }
      } else s.onSince = null;
    }

    if (output.kind === "Rotate") {
      const wanted = normalized < 0 ? -1 : normalized > 0 ? 1 : s.sign;
      if (wanted !== s.sign && now - s.lastSwapAt >= this.limits.rotateSwapMinMs) {
        s.sign = wanted;
        s.lastSwapAt = now;
      }
    }

    const [min, max] = output.range;
    const value =
      min < 0 ? Math.round(s.sign * s.fraction * max) : Math.round(min + (max - min) * s.fraction);
    this.send(output, s, value, now);
  }

  private applyStroke(output: OutputInfo, s: OutputState, stroke: StrokeTarget | null, now: number) {
    if (!stroke || stroke.id === s.lastStrokeId) return;
    const { strokeMin, strokeMax, strokeMaxSpeed, maxLevel } = this.limits;
    const ceiling = this.prefs(output.key).ceiling;
    const position = Math.min(stroke.position, maxLevel / 100, ceiling / 100);
    const minDuration = (Math.abs(position - s.lastPosition) / strokeMaxSpeed) * 1000;
    let duration = Math.max(stroke.durationMs, minDuration);
    if (output.durationRange) duration = Math.min(Math.max(duration, output.durationRange[0]), output.durationRange[1]);
    const [min, max] = output.range;
    const lo = min + ((max - min) * strokeMin) / 100;
    const hi = min + ((max - min) * strokeMax) / 100;
    const value = Math.round(lo + (hi - lo) * position);
    if (this.send(output, s, value, now, Math.round(duration), true)) {
      s.lastStrokeId = stroke.id;
      s.lastPosition = position;
    }
  }

  private send(output: OutputInfo, s: OutputState, value: number, now: number, durationMs?: number, force = false): boolean {
    if (!force && value === s.lastSent) return false;
    if (s.inFlight || now - s.lastSentAt < output.timingGapMs) return false;
    s.inFlight = true;
    s.lastSent = value;
    s.lastSentAt = now;
    this.sink.send(output, value, durationMs).then(
      () => (s.inFlight = false),
      (error) => {
        s.inFlight = false;
        this.onFault(error);
      },
    );
    return true;
  }

  /** Stops every device and refuses output until resume(). */
  async stopAll(): Promise<void> {
    this.stopped = true;
    for (const s of this.states.values()) {
      s.fraction = 0;
      s.lastSent = 0;
      s.lastStrokeId = null;
      s.onSince = null;
    }
    await this.sink.stopAll();
  }

  /** Last value sent per output, for the UI. */
  sentValue(key: string): number | null {
    return this.states.get(key)?.lastSent ?? null;
  }
}
