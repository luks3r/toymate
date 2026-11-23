import { describe, expect, it } from "bun:test";
import { parseSettings, type Settings } from "../../shared/settings";
import type { FrontendMessage } from "../../shared/wire";
import { outputKey } from "../engine/devices";
import { Engine } from "../engine/engine";
import { FakeLink } from "../engine/fake-link.test-helper";
import { Triggers } from "./wiring";

function setup(over: object = {}) {
  let settings: Settings = parseSettings({
    limits: { maxLevel: 100, rampPerSecond: 1000 },
    story: { readingCps: 10 },
    chatModes: { story: "story", reactive: "reactive" },
    rules: [
      { id: "kiss", when: "character_message", match: "kiss", then: { kind: "scene", zone: "all", level: 40 } },
      { id: "user", when: "user_message", match: "please", then: { kind: "scene", zone: "all", level: 25 } },
      { id: "moan", when: "streaming", match: "moan", then: { kind: "accent", zone: "all", accent: "spike" } },
    ],
    ...over,
  });
  const handlers = new Map<string, (p: unknown) => void>();
  const sent: FrontendMessage[] = [];
  let chat = { chatId: "story" as string | null, characterId: "c1" as string | null };
  let now = 1000;
  const link = new FakeLink([
    {
      index: 0,
      name: "Toy",
      battery: null,
      outputs: [{ key: outputKey("Toy", 1, 0, "Vibrate"), deviceIndex: 0, deviceName: "Toy", featureIndex: 0, kind: "Vibrate", range: [0, 100], timingGapMs: 0 }],
    },
  ]);
  const engine = new Engine(link, settings, () => now);
  const triggers = new Triggers(
    {
      on: (e, h) => (handlers.set(e, h), () => handlers.delete(e)),
      activeChat: () => chat,
      send: (m) => sent.push(m),
      settings: () => settings,
      saveSettings: (s) => (settings = s),
    },
    engine,
    () => now,
  );
  triggers.start();
  const emit = (event: string, payload: object) => handlers.get(event)!(payload);
  const target = () => engine.view().scenes[0]!.target;
  return {
    emit,
    sent,
    engine,
    triggers,
    target,
    settings: () => settings,
    setChat: (c: typeof chat) => (chat = c),
    setNow: (t: number) => (now = t),
    reply(id: string, content: string, extra: object = {}) {
      emit("GENERATION_STARTED", { generationId: id, chatId: chat.chatId, characterId: chat.characterId, generationType: "normal", ...extra });
      emit("STREAM_TOKEN_RECEIVED", { generationId: id, chatId: chat.chatId, token: content, seq: 0 });
      emit("GENERATION_ENDED", { generationId: id, chatId: chat.chatId, content });
    },
  };
}

const planRequests = (sent: FrontendMessage[]) => sent.filter((m) => m.type === "plan_request");

describe("which replies request a plan", () => {
  it.each([
    ["normal reply", {}, 1],
    ["regenerate", { generationType: "regenerate" }, 1],
    ["impersonate", { generationType: "impersonate" }, 0],
    ["quiet", { generationType: "quiet" }, 0],
    ["extension generation", { extensionId: "other_ext" }, 0],
    ["background swipe", { backgroundSwipe: true }, 0],
  ] as const)("%s", (_, extra, count) => {
    const t = setup();
    t.reply("g1", "Hello there.", extra);
    expect(planRequests(t.sent)).toHaveLength(count);
  });

  it("ignores generations in another chat and ends it never saw start", () => {
    const t = setup();
    t.emit("GENERATION_STARTED", { generationId: "g1", chatId: "elsewhere", generationType: "normal" });
    t.emit("GENERATION_ENDED", { generationId: "g1", chatId: "elsewhere", content: "x" });
    t.emit("GENERATION_ENDED", { generationId: "history", chatId: "story", content: "old reply" });
    expect(planRequests(t.sent)).toHaveLength(0);
  });

  it("chats in Off mode do nothing", () => {
    const t = setup();
    t.setChat({ chatId: "plain", characterId: null });
    t.reply("g1", "She leans in to kiss you.");
    expect(t.sent).toHaveLength(0);
    expect(t.target()).toBe(0);
  });
});

describe("Story mode plans", () => {
  it("schedules cues at reading position, not before the plan arrives", () => {
    const t = setup();
    t.reply("g1", "Aaaa aaaa. Bbbbb.");
    t.setNow(1500);
    t.triggers.onPlanResult("g1", [
      { sentence: 1, intent: { kind: "scene", zone: "all", level: 30 } },
      { sentence: 2, intent: { kind: "scene", zone: "all", level: 60 } },
    ]);
    // reading started at 1000; sentence 2 starts at char 11 → 1100 ms at 10 cps
    expect(t.triggers.plan.cues.map((c) => c.atMs)).toEqual([1500, 2100]);
  });

  it("starts a late plan at the cue the reader reached and skips earlier ones", () => {
    const t = setup();
    t.reply("g1", "Aaaa aaaa. Bbbbb. Ccc.");
    t.setNow(2500);
    t.triggers.onPlanResult("g1", [
      { sentence: 1, intent: { kind: "scene", zone: "all", level: 30 } },
      { sentence: 2, intent: { kind: "scene", zone: "all", level: 60 } },
      { sentence: 3, intent: { kind: "scene", zone: "all", level: 20 } },
    ]);
    // sentences start at 0, 1100, 1800 ms after reading began at 1000
    expect(t.triggers.plan.cues.map((c) => c.atMs)).toEqual([null, 2500, 2800]);
    expect(t.engine.view().pendingCues).toBe(2);
  });

  it("resumes from a chosen cue at reading pace and lifts a pause", async () => {
    const t = setup();
    t.reply("g1", "Aaaa aaaa. Bbbbb. Ccc.");
    t.triggers.onPlanResult("g1", [
      { sentence: 1, intent: { kind: "scene", zone: "all", level: 30 } },
      { sentence: 2, intent: { kind: "scene", zone: "all", level: 60 } },
      { sentence: 3, intent: { kind: "scene", zone: "all", level: 20 } },
    ]);
    await t.engine.panic();
    expect(t.engine.view().pendingCues).toBe(0);
    t.setNow(10_000);
    t.triggers.resumeFrom(1);
    expect(t.engine.view().paused).toBe(false);
    expect(t.triggers.plan.cues.map((c) => c.atMs)).toEqual([null, 10_000, 10_700]);
    expect(t.engine.view().pendingCues).toBe(2);
    t.triggers.resumeFrom(0);
    expect(t.engine.view().pendingCues).toBe(3);
  });

  it("has nothing to resume after a chat switch or a safeword", () => {
    const t = setup();
    t.reply("g1", "One.");
    t.triggers.onPlanResult("g1", [{ sentence: 1, intent: { kind: "scene", zone: "all", level: 30 } }]);
    t.emit("CHAT_SWITCHED", { chatId: "story" });
    t.triggers.resumeFrom(0);
    expect(t.engine.view().pendingCues).toBe(0);

    t.reply("g2", "Two.");
    t.triggers.onPlanResult("g2", [{ sentence: 1, intent: { kind: "scene", zone: "all", level: 30 } }]);
    t.emit("MESSAGE_SENT", { chatId: "story", message: { is_user: true, content: "(red)" } });
    t.triggers.resumeFrom(0);
    expect(t.engine.view().paused).toBe(true);
  });

  it("drops plans for superseded or stopped replies", () => {
    const t = setup();
    t.reply("g1", "First.");
    t.reply("g2", "Second.");
    expect(t.sent.some((m) => m.type === "plan_cancel" && m.requestId === "g1")).toBe(true);
    t.triggers.onPlanResult("g1", [{ sentence: 1, intent: { kind: "scene", zone: "all", level: 50 } }]);
    expect(t.engine.view().pendingCues).toBe(0);

    t.emit("GENERATION_STARTED", { generationId: "g3", chatId: "story", generationType: "swipe" });
    t.emit("GENERATION_STOPPED", { generationId: "g3", chatId: "story" });
    t.triggers.onPlanResult("g3", [{ sentence: 1, intent: { kind: "scene", zone: "all", level: 50 } }]);
    expect(t.engine.view().pendingCues).toBe(0);
  });

  it("sends reactions with the next request once", () => {
    const t = setup();
    t.engine.react("more");
    t.reply("g1", "One.");
    t.reply("g2", "Two.");
    const [first, second] = planRequests(t.sent);
    expect(first!.type === "plan_request" && first!.status).toContain("asked for more");
    expect(second!.type === "plan_request" && second!.status).not.toContain("asked for more");
  });
});

describe("Reactive mode", () => {
  it("applies character, user, and streaming rules", () => {
    const t = setup();
    t.setChat({ chatId: "reactive", characterId: "c1" });
    t.reply("g1", "She leans in to kiss you.");
    expect(t.target()).toBe(40);
    t.emit("MESSAGE_SENT", { chatId: "reactive", message: { is_user: true, content: "please" } });
    expect(t.target()).toBe(25);
  });

  it("ignores reasoning tokens and fires a streaming rule once per reply", () => {
    const t = setup();
    t.setChat({ chatId: "reactive", characterId: "c1" });
    t.emit("GENERATION_STARTED", { generationId: "g1", chatId: "reactive", generationType: "normal" });
    t.emit("STREAM_TOKEN_RECEIVED", { generationId: "g1", token: "moan", type: "reasoning" });
    expect(t.engine.view().scenes[0]!.accent).toBeNull();
    t.emit("STREAM_TOKEN_RECEIVED", { generationId: "g1", token: "a soft moan" });
    expect(t.engine.view().scenes[0]!.accent).toBe("spike");
  });
});

describe("safewords", () => {
  it("stop pauses everything and leaves Story mode", async () => {
    const t = setup();
    t.engine.apply({ kind: "scene", zone: "all", level: 50 }, "manual");
    t.emit("MESSAGE_SENT", { chatId: "story", message: { is_user: true, content: "(red)" } });
    await Promise.resolve();
    expect(t.engine.view().paused).toBe(true);
    expect(t.target()).toBe(0);
    expect(t.settings().chatModes.story).toBeUndefined();
  });

  it("stop leaves Story mode even when it comes from the character default", () => {
    const t = setup({ chatModes: {}, characterModes: { c1: "story" } });
    t.emit("MESSAGE_SENT", { chatId: "story", message: { is_user: true, content: "red" } });
    expect(t.settings().chatModes.story).toBe("off");
  });

  it("ease halves the scene; in-story words do nothing", () => {
    const t = setup();
    t.engine.apply({ kind: "scene", zone: "all", level: 60 }, "manual");
    t.emit("MESSAGE_SENT", { chatId: "story", message: { is_user: true, content: "her red lips" } });
    expect(t.target()).toBe(60);
    t.emit("MESSAGE_SENT", { chatId: "story", message: { is_user: true, content: "yellow" } });
    expect(t.target()).toBe(30);
  });

  it("character messages never trigger safewords", () => {
    const t = setup();
    t.engine.apply({ kind: "scene", zone: "all", level: 60 }, "manual");
    t.emit("MESSAGE_SENT", { chatId: "story", message: { is_user: false, content: "red" } });
    expect(t.engine.view().paused).toBe(false);
  });
});
