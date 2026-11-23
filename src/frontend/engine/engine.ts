import { ALL_ZONES, type Intent } from "../../shared/intent";
import { prefsFor, type Settings } from "../../shared/settings";
import { sceneKeyFor, type DeviceInfo, type OutputInfo } from "./devices";
import { Director, type SceneView, type Source } from "./director";
import { Governor, type OutputSink } from "./governor";
import { renderContinuous, renderStroke } from "./renderers";

/** Device connection the engine drives. ButtplugAdapter in the app, a recording fake in tests. */
export interface DeviceLink extends OutputSink {
  readonly connected: boolean;
  list(): readonly DeviceInfo[];
  connect(url: string): Promise<void>;
  disconnect(): Promise<void>;
  startScanning(): Promise<void>;
  stopScanning(): Promise<void>;
  readBatteries(): Promise<void>;
}

export type ConnectionState = "disconnected" | "connecting" | "connected";
export type Reaction = "more" | "less" | "hold" | "stop" | "ease";

export interface EngineView {
  connection: ConnectionState;
  scanning: boolean;
  paused: boolean;
  error: string | null;
  devices: readonly DeviceInfo[];
  scenes: SceneView[];
  values: Record<string, number | null>;
  pendingCues: number;
  active: boolean;
}

export const TICK_MS = 100;
const TEST_MS = 2000;
const REACTION_STEP = 15;

/**
 * Owns the live session: connection, director, governor, tick loop, and every
 * stop path. UI and triggers call into it; nothing else reaches the link.
 */
export class Engine {
  private director: Director;
  private governor: Governor;
  private connection: ConnectionState = "disconnected";
  private scanning = false;
  private paused = false;
  private error: string | null = null;
  private tests = new Map<string, { level: number; until: number }>();
  private reactions: Reaction[] = [];
  private listeners = new Set<() => void>();
  private deviceNames = new Set<string>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastNotify = 0;

  constructor(
    private link: DeviceLink,
    private settings: Settings,
    private now: () => number = () => Date.now(),
  ) {
    this.director = new Director(settings.zones, settings.limits.holdTimeoutSec * 1000);
    this.governor = new Governor(
      link,
      settings.limits,
      (key) => prefsFor(this.settings, key),
      (e) => this.fault(e),
      (output) => this.warn(`Intiface is not confirming commands for ${output.deviceName}. The toy may be out of Bluetooth range or low on battery.`),
    );
  }

  // ── lifecycle ──────────────────────────────────────────────────────────

  start() {
    this.timer ??= setInterval(() => this.tick(this.now()), TICK_MS);
  }

  /** Teardown: stop every device, then disconnect. */
  async dispose(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.stopEverything({ pause: true });
    await this.link.disconnect().catch(() => {});
    this.listeners.clear();
  }

  configure(settings: Settings) {
    this.settings = settings;
    this.director.configure(settings.zones, settings.limits.holdTimeoutSec * 1000);
    this.governor.configure(settings.limits, (key) => prefsFor(this.settings, key));
    this.notify(true);
  }

  // ── connection ─────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    // A second connect would tear down the first mid-handshake and leave this state wrong.
    if (this.connection !== "disconnected") return;
    this.connection = "connecting";
    this.error = null;
    this.notify(true);
    try {
      await this.link.connect(this.settings.intifaceUrl);
      // Devices may still run a value from an earlier session.
      await this.link.stopAll();
      this.governor.reset();
      this.deviceNames = new Set(this.link.list().map((d) => d.name));
      this.connection = "connected";
      await this.link.readBatteries();
    } catch (error) {
      this.connection = "disconnected";
      this.error = `Could not connect to ${this.settings.intifaceUrl}: ${String(error).slice(0, 160)}`;
    }
    this.notify(true);
  }

  async disconnect(): Promise<void> {
    await this.stopEverything({ pause: false });
    await this.link.disconnect();
    this.connection = "disconnected";
    this.scanning = false;
    this.notify(true);
  }

  /** Link reported a disconnect we did not ask for. Never reconnects or resumes on its own. */
  handleDisconnected() {
    this.director.stopAll(this.now());
    this.tests.clear();
    if (this.connection === "connected")
      this.error = "Intiface closed the connection (its server stopped or restarted, or the connection dropped). All output stopped; connect again when ready.";
    this.connection = "disconnected";
    this.scanning = false;
    this.notify(true);
  }

  handleDevicesChanged() {
    const names = new Set(this.link.list().map((d) => d.name));
    const lost = [...this.deviceNames].filter((n) => !names.has(n));
    if (this.connection === "connected" && lost.length)
      this.warn(`${lost.join(", ")} dropped out of Intiface (Bluetooth). Its output stopped. Check its battery and range, then reconnect it in Intiface.`);
    this.deviceNames = names;
    const keys = new Set(this.link.list().flatMap((d) => d.outputs.map((o) => o.key)));
    this.governor.retain(keys);
    for (const key of [...this.tests.keys()]) if (!keys.has(key)) this.tests.delete(key);
    this.notify(true);
  }

  handleScanningFinished() {
    this.scanning = false;
    this.notify(true);
  }

  async toggleScan(): Promise<void> {
    if (this.scanning) {
      await this.link.stopScanning();
      this.scanning = false;
    } else {
      this.scanning = true;
      this.notify(true);
      try {
        await this.link.startScanning();
      } catch (error) {
        this.scanning = false;
        this.error = `Scan failed: ${String(error).slice(0, 160)}`;
      }
    }
    this.notify(true);
  }

  // ── sources ────────────────────────────────────────────────────────────

  /** Applies an intent now. Ignored while paused, except stop. */
  apply(intent: Intent, source: Source): void {
    if (this.paused && intent.kind !== "stop") return;
    this.director.apply(intent, this.now(), source);
    this.notify(true);
  }

  schedule(groupId: string, cues: readonly { at: number; intent: Intent }[]) {
    if (this.paused) return;
    this.director.schedule(groupId, cues);
    this.notify(true);
  }

  cancel(groupId: string) {
    this.director.cancel(groupId);
    this.notify(true);
  }

  setLocked(zone: string, locked: boolean) {
    this.director.setLocked(zone, locked);
    this.notify(true);
  }

  isLocked(zone: string) {
    return this.director.isLocked(zone);
  }

  /** Short time-limited test of one output at a level, through the governor. */
  test(key: string, level: number) {
    if (this.paused) return;
    this.tests.set(key, { level, until: this.now() + TEST_MS });
  }

  react(reaction: Exclude<Reaction, "ease">) {
    this.reactions.push(reaction);
    if (reaction === "stop") this.apply({ kind: "stop", zone: ALL_ZONES }, "manual");
    else this.apply({ kind: "scene", zone: ALL_ZONES, delta: reaction === "more" ? REACTION_STEP : reaction === "less" ? -REACTION_STEP : 0 }, "manual");
  }

  /** The slow-down safeword: halve every active scene. */
  ease() {
    this.reactions.push("ease");
    const now = this.now();
    for (const v of this.director.views())
      if (v.target > 0) this.director.apply({ kind: "scene", zone: v.zone, level: Math.floor(v.target / 2) }, now, "manual");
    this.notify(true);
  }

  peekReactions(): readonly Reaction[] {
    return this.reactions;
  }

  /** Reactions since the last call, for the next planner request. */
  takeReactions(): Reaction[] {
    const r = this.reactions;
    this.reactions = [];
    return r;
  }

  // ── stopping ───────────────────────────────────────────────────────────

  async stopEverything({ pause }: { pause: boolean }): Promise<void> {
    if (pause) this.paused = true;
    this.director.stopAll(this.now());
    this.tests.clear();
    try {
      await this.governor.stopAll();
    } catch (error) {
      this.error = `Stop command failed: ${String(error).slice(0, 160)}`;
    }
    if (!this.paused) this.governor.resume();
    this.notify(true);
  }

  panic() {
    return this.stopEverything({ pause: true });
  }

  resume() {
    this.paused = false;
    this.governor.resume();
    this.notify(true);
  }

  private warn(message: string) {
    this.error = message;
    this.notify(true);
  }

  private fault(error: unknown) {
    this.error = `Device command failed, all output stopped: ${String(error).slice(0, 160)}`;
    void this.stopEverything({ pause: false });
  }

  // ── tick ───────────────────────────────────────────────────────────────

  tick(now: number): void {
    try {
      this.director.tick(now);
      if (this.connection !== "connected") return;
      const outputs = this.link.list().flatMap((d) => d.outputs);
      const groups = new Map<string, OutputInfo[]>();
      for (const o of outputs) {
        const key = sceneKeyFor(o, this.settings);
        if (key) groups.set(key, [...(groups.get(key) ?? []), o]);
      }
      for (const [sceneKey, group] of groups) {
        const sample = this.director.sample(sceneKey, now);
        group.forEach((output, i) => {
          const test = this.tests.get(output.key);
          if (test && now < test.until) {
            const s = { level: test.level, feel: "steady" as const, tempo: "medium" as const, startedAt: now };
            this.governor.apply(output, output.kind === "HwPositionWithDuration" ? { kind: "stroke", stroke: renderStroke({ ...s, startedAt: test.until - TEST_MS }, now) } : { kind: "value", value: test.level / 100 }, now);
            return;
          }
          if (test) this.tests.delete(output.key);
          const s = sample ?? { level: 0, feel: "steady" as const, tempo: "medium" as const, startedAt: now };
          if (output.kind === "HwPositionWithDuration") this.governor.apply(output, { kind: "stroke", stroke: renderStroke(s, now) }, now);
          else this.governor.apply(output, { kind: "value", value: renderContinuous(output.kind, s, now, i / group.length) }, now);
        });
      }
      this.notify(false);
    } catch (error) {
      this.fault(error);
    }
  }

  // ── view ───────────────────────────────────────────────────────────────

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(force: boolean) {
    const now = this.now();
    if (!force && now - this.lastNotify < 250) return;
    this.lastNotify = now;
    for (const l of this.listeners) l();
  }

  view(): EngineView {
    const devices = this.link.list();
    const values: Record<string, number | null> = {};
    for (const d of devices) for (const o of d.outputs) values[o.key] = this.governor.sentValue(o.key);
    return {
      connection: this.connection,
      scanning: this.scanning,
      paused: this.paused,
      error: this.error,
      devices,
      scenes: this.director.views(),
      values,
      pendingCues: this.director.pending().length,
      active: this.director.isActive() || this.tests.size > 0,
    };
  }

  summary(): string {
    return this.paused ? "stopped by the user (paused)" : this.director.summary();
  }
}
