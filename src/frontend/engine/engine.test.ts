import { describe, expect, it } from "bun:test";
import { parseSettings, type Settings } from "../../shared/settings";
import { outputKey, type DeviceInfo, type OutputInfo, type OutputKind } from "./devices";
import { Director } from "./director";
import { Engine } from "./engine";
import { FakeLink } from "./fake-link.test-helper";
import { Governor } from "./governor";
import { envelope, renderStroke } from "./renderers";

function output(kind: OutputKind, over: Partial<OutputInfo> = {}): OutputInfo {
  return {
    key: outputKey("Toy", 1, 0, kind),
    deviceIndex: 0,
    deviceName: "Toy",
    featureIndex: 0,
    kind,
    range: kind === "Rotate" ? [-20, 20] : [0, 100],
    timingGapMs: 100,
    ...over,
  };
}

const settings = (over: object = {}): Settings =>
  parseSettings({ limits: { maxLevel: 100, rampPerSecond: 1000 }, outputs: {}, ...over });

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("Governor", () => {
  function setup(limits: object = {}, prefs = { zone: "main", floor: 0, ceiling: 100 }) {
    const link = new FakeLink([]);
    const faults: unknown[] = [];
    const s = settings({ limits: { maxLevel: 100, rampPerSecond: 1000, ...limits } });
    const g = new Governor(link, s.limits, () => prefs, (e) => faults.push(e));
    return { link, g, faults };
  }

  /** Applies each [time, value] step, letting sends settle in between. */
  async function run(g: Governor, o: OutputInfo, steps: readonly (readonly [number, number])[]) {
    g.apply(o, { kind: "value", value: 0 }, steps[0]![0] - 1000);
    for (const [t, v] of steps) {
      g.apply(o, { kind: "value", value: v }, t);
      await flush();
    }
  }

  it("maps level onto floor..ceiling and caps at max level", async () => {
    const { link, g } = setup({ maxLevel: 50 }, { zone: "main", floor: 20, ceiling: 80 });
    await run(g, output("Vibrate"), [[0, 1], [1000, 0.25], [2000, 0]]);
    // level 100 → capped 50 → 20 + 60·0.5 = 50; level 25 → 20 + 60·0.25 = 35; 0 is off, not floor
    expect(link.sent.map((s) => s.value)).toEqual([50, 35, 0]);
  });

  it("limits rise rate but stops instantly", async () => {
    const { link, g } = setup({ rampPerSecond: 50 });
    await run(g, output("Vibrate", { timingGapMs: 0 }), [[0, 0], [100, 1], [200, 1], [300, 1], [400, 0]]);
    expect(link.sent.map((s) => s.value)).toEqual([5, 10, 15, 0]);
  });

  it("respects the device timing gap and dedupes", async () => {
    const { link, g } = setup();
    await run(g, output("Vibrate", { timingGapMs: 100 }), [[0, 0.5], [50, 0.6], [100, 0.6], [200, 0.6], [300, 0.7]]);
    expect(link.sent.map((s) => s.value)).toEqual([50, 60, 70]);
  });

  it("releases constrict after max hold", async () => {
    const { link, g } = setup({ constrictMaxHoldSec: 2 });
    const steps = Array.from({ length: 17 }, (_, i) => [i * 500, 1] as const);
    await run(g, output("Constrict", { timingGapMs: 0 }), steps);
    expect(link.sent.map((s) => s.value)).toEqual([100, 0, 100]);
  });

  it("rate-limits rotation direction swaps", async () => {
    const { link, g } = setup({ rotateSwapMinMs: 1000 });
    await run(g, output("Rotate", { timingGapMs: 0 }), [[0, 0.5], [200, -0.5], [1200, -0.5]]);
    expect(link.sent.map((s) => s.value)).toEqual([10, -10]);
  });

  it("slows strokes to the max speed and sends each stroke once", async () => {
    const { link, g } = setup({ strokeMaxSpeed: 1 });
    const o = output("HwPositionWithDuration", { timingGapMs: 0 });
    g.apply(o, { kind: "stroke", stroke: { id: 0, position: 1, durationMs: 200 } }, 0);
    await flush();
    g.apply(o, { kind: "stroke", stroke: { id: 0, position: 1, durationMs: 200 } }, 100);
    g.apply(o, { kind: "stroke", stroke: { id: 1, position: 0, durationMs: 2000 } }, 200);
    await flush();
    expect(link.sent).toEqual([
      { key: o.key, value: 100, durationMs: 1000 },
      { key: o.key, value: 0, durationMs: 2000 },
    ]);
  });

  it("refuses output after stopAll until resume, and reports send failures", async () => {
    const { link, g, faults } = setup();
    const o = output("Vibrate", { timingGapMs: 0 });
    await g.stopAll();
    await run(g, o, [[0, 1]]);
    expect(link.sent).toEqual([]);
    expect(link.stops).toBe(1);
    g.resume();
    link.failNext = true;
    await run(g, o, [[2000, 1]]);
    expect(faults).toHaveLength(1);
  });

  it("never drives undriven kinds", async () => {
    const { link, g } = setup();
    for (const kind of ["Spray", "Led", "Position"] as const) await run(g, output(kind), [[0, 1]]);
    expect(link.sent).toEqual([]);
  });
});

describe("Director", () => {
  it("glides toward targets and fades after the hold timeout", () => {
    const d = new Director(["main"], 10_000);
    d.tick(0);
    d.apply({ kind: "scene", zone: "all", level: 80 }, 0, "auto");
    d.tick(500);
    expect(d.sample("main", 0)!.level).toBe(40);
    d.tick(1000);
    expect(d.sample("main", 0)!.level).toBe(80);
    d.tick(11_001);
    d.tick(12_000);
    expect(d.sample("main", 0)!.level).toBeLessThan(80);
    d.tick(13_000);
    expect(d.sample("main", 0)!.level).toBe(0);
  });

  it("stop is immediate, locks ignore auto sources, deltas are relative", () => {
    const d = new Director(["main", "b"], 60_000);
    d.apply({ kind: "scene", zone: "main", level: 50 }, 0, "manual");
    d.apply({ kind: "scene", zone: "main", delta: 15 }, 0, "auto");
    d.tick(0);
    d.tick(2000);
    expect(d.sample("main", 0)!.level).toBe(65);
    d.setLocked("main", true);
    d.apply({ kind: "stop", zone: "all" }, 2000, "auto");
    expect(d.sample("main", 0)!.level).toBe(65);
    d.apply({ kind: "stop", zone: "main" }, 2000, "manual");
    expect(d.sample("main", 0)!.level).toBe(0);
  });

  it("all does not reach named-only scenes; a named zone does", () => {
    const d = new Director(["main"], 60_000);
    d.apply({ kind: "scene", zone: "all", level: 50 }, 0, "auto");
    expect(d.sample("main:named", 0)).toBeNull();
    d.apply({ kind: "scene", zone: "main", level: 30 }, 0, "auto");
    expect(d.sample("main:named", 0)).not.toBeNull();
  });

  it("runs scheduled cues at their time and cancels by group", () => {
    const d = new Director(["main"], 60_000);
    d.schedule("g1", [{ at: 1000, intent: { kind: "scene", zone: "all", level: 40 } }]);
    d.schedule("g2", [{ at: 1500, intent: { kind: "scene", zone: "all", level: 90 } }]);
    d.cancel("g2");
    d.tick(999);
    expect(d.sample("main", 0)).toBeNull();
    d.tick(1000);
    d.tick(3000);
    expect(d.sample("main", 0)!.level).toBe(40);
    expect(d.pending()).toHaveLength(0);
  });

  it("ramps from level to `to` over the given time", () => {
    const d = new Director(["main"], 60_000);
    d.tick(0);
    d.apply({ kind: "scene", zone: "main", level: 20, to: 80, overSec: 10 }, 0, "auto");
    for (let t = 0; t <= 5000; t += 100) d.tick(t);
    expect(d.views()[0]!.target).toBe(50);
    expect(d.views()[0]!.rampTo).toBe(80);
    for (let t = 5100; t <= 12_000; t += 100) d.tick(t);
    expect(d.views()[0]).toMatchObject({ target: 80, rampTo: null });
  });

  it("a temporary change returns to what it replaced", () => {
    const d = new Director(["main"], 60_000);
    d.apply({ kind: "scene", zone: "main", level: 30, feel: "wave" }, 0, "auto");
    d.apply({ kind: "scene", zone: "main", level: 70, feel: "pulse", forSec: 5 }, 1000, "auto");
    d.tick(1000);
    expect(d.views()[0]).toMatchObject({ target: 70, feel: "pulse" });
    d.tick(6000);
    expect(d.views()[0]).toMatchObject({ target: 30, feel: "wave" });
  });

  it("a newer change cancels a pending return", () => {
    const d = new Director(["main"], 60_000);
    d.apply({ kind: "scene", zone: "main", level: 30 }, 0, "auto");
    d.apply({ kind: "scene", zone: "main", level: 70, forSec: 5 }, 1000, "auto");
    d.apply({ kind: "scene", zone: "main", level: 50 }, 2000, "auto");
    d.tick(7000);
    expect(d.views()[0]!.target).toBe(50);
  });

  it("spread wanders within ± range around the level and stays off when stopped", () => {
    const d = new Director(["main"], 600_000);
    d.apply({ kind: "scene", zone: "main", level: 50, spread: 20, tempo: "fast" }, 0, "auto");
    d.tick(0);
    d.tick(2000);
    const levels = Array.from({ length: 200 }, (_, i) => d.sample("main", 2000 + i * 150)!.level);
    expect(Math.min(...levels)).toBeGreaterThanOrEqual(30);
    expect(Math.max(...levels)).toBeLessThanOrEqual(70);
    expect(Math.max(...levels) - Math.min(...levels)).toBeGreaterThan(10);
    d.apply({ kind: "stop", zone: "main" }, 3000, "auto");
    expect(d.sample("main", 3000)!.level).toBe(0);
  });

  it("accents overlay then expire", () => {
    const d = new Director(["main"], 60_000);
    d.apply({ kind: "scene", zone: "main", level: 40 }, 0, "auto");
    d.tick(0);
    d.tick(1000);
    d.apply({ kind: "accent", zone: "all", accent: "pause" }, 1000, "auto");
    expect(d.sample("main", 0)!.level).toBe(0);
    d.tick(3100);
    expect(d.sample("main", 0)!.level).toBe(40);
  });
});

describe("renderers", () => {
  it("envelopes stay within 0..1", () => {
    for (const feel of ["steady", "pulse", "wave", "tease", "build", "throb", "random"] as const)
      for (let t = 0; t < 70_000; t += 333) {
        const v = envelope(feel, "medium", t, 0, 0.5);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
  });

  it("strokes alternate between top and bottom", () => {
    const s = { level: 80, feel: "steady" as const, tempo: "medium" as const, startedAt: 0 };
    expect([0, 500, 1000].map((t) => renderStroke(s, t)!.position)).toEqual([0.8, 0, 0.8]);
    expect(renderStroke({ ...s, level: 0 }, 0)).toBeNull();
  });
});

describe("Engine stop paths", () => {
  async function setup() {
    const vibe = output("Vibrate", { timingGapMs: 0 });
    const link = new FakeLink([{ index: 0, name: "Toy", outputs: [vibe], battery: null }]);
    let now = 0;
    const engine = new Engine(link, settings(), () => now);
    const at = async (t: number) => {
      now = t;
      engine.tick(t);
      await flush();
    };
    await engine.connect();
    expect(link.stops).toBe(1);
    engine.apply({ kind: "scene", zone: "all", level: 50 }, "manual");
    await at(0);
    await at(100);
    await at(1000);
    // Uncalibrated outputs use the conservative default ceiling of 70: 50 → 35.
    expect(link.sent.at(-1)!.value).toBe(35);
    return { link, engine, at };
  }

  it("panic stops every device and pauses all sources until resume", async () => {
    const { link, engine, at } = await setup();
    await engine.panic();
    expect(link.stops).toBe(2);
    engine.apply({ kind: "scene", zone: "all", level: 90 }, "manual");
    engine.schedule("g", [{ at: 1100, intent: { kind: "scene", zone: "all", level: 90 } }]);
    const before = link.sent.length;
    await at(1100);
    await at(3000);
    expect(link.sent.length).toBe(before);
    engine.resume();
    engine.apply({ kind: "scene", zone: "all", level: 30 }, "manual");
    await at(3100);
    await at(5000);
    expect(link.sent.at(-1)!.value).toBe(21);
  });

  it("an unexpected disconnect stops scenes and a reconnect starts idle", async () => {
    const { link, engine, at } = await setup();
    link.connected = false;
    engine.handleDisconnected();
    expect(engine.view().error).toContain("disconnected");
    await engine.connect();
    expect(link.stops).toBe(2);
    const before = link.sent.length;
    await at(1100);
    await at(3000);
    expect(link.sent.length).toBe(before);
  });

  it("a failing send stops everything", async () => {
    const { link, engine, at } = await setup();
    engine.apply({ kind: "scene", zone: "all", level: 60 }, "manual");
    link.failNext = true;
    await at(1100);
    await flush();
    expect(link.stops).toBe(2);
    expect(engine.view().scenes[0]!.target).toBe(0);
    expect(engine.view().error).toContain("ble gone");
  });

  it("dispose stops devices then disconnects", async () => {
    const { link, engine } = await setup();
    await engine.dispose();
    expect(link.stops).toBe(2);
    expect(link.connected).toBe(false);
  });
});
