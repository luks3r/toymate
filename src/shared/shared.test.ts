import { describe, expect, it } from "bun:test";
import { cueOffsetsMs, parsePlan, splitSentences } from "./plan";
import { matchRules } from "./rules";
import { matchSafeword } from "./safewords";
import { DEFAULT_SETTINGS, modeFor, parseSettings, type Rule } from "./settings";
import { parseFrontendMessage } from "./wire";

describe("matchSafeword", () => {
  const words = { stop: "red", ease: "yellow" };
  it.each([
    ["red", "stop"],
    ["  Red. ", "stop"],
    ["*red*", "stop"],
    ["(red)", "stop"],
    ["I need a moment ((red))", "stop"],
    ["[red] sorry", "stop"],
    ["OOC: red", "stop"],
    ["yellow", "ease"],
    ["(yellow) slow down", "ease"],
    ["her red lips part", null],
    ["Red is my favourite colour", null],
    ["the yellow moon", null],
    ["reddish", null],
  ] as const)("%p → %p", (text, hit) => {
    expect(matchSafeword(text, words)).toBe(hit);
  });

  it("ignores empty safewords", () => {
    expect(matchSafeword("", { stop: "", ease: "" })).toBeNull();
  });
});

describe("matchRules", () => {
  const rule = (over: Partial<Rule>): Rule => ({
    id: "r",
    enabled: true,
    when: "character_message",
    match: "",
    characterId: null,
    then: { kind: "scene", zone: "all", level: 50 },
    ...over,
  });

  it.each([
    [{ match: "kiss, touch" }, "She leans in to KISS you.", 1],
    [{ match: "kiss" }, "kissing", 0],
    [{ match: "/tou?ch(es)?/i" }, "He touches your hand", 1],
    [{ match: "/[/" }, "anything", 0],
    [{ match: "" }, "anything", 1],
    [{ enabled: false }, "anything", 0],
    [{ when: "user_message" }, "anything", 0],
    [{ characterId: "other" }, "anything", 0],
    [{ characterId: "c1" }, "anything", 1],
  ] as const)("%p on %p → %p intents", (over, text, count) => {
    expect(matchRules([rule(over)], { when: "character_message", text, characterId: "c1" })).toHaveLength(count);
  });
});

describe("plan", () => {
  const reply = 'She smiles. "Ready?" she asks!\n\nThen she waits… and waits.';

  it("splits sentences with stable offsets", () => {
    const s = splitSentences(reply);
    expect(s.map((x) => x.text)).toEqual(["She smiles.", '"Ready?"', "she asks!", "Then she waits…", "and waits."]);
    for (const x of s) expect(reply.slice(x.start, x.start + x.text.length)).toBe(x.text);
  });

  it("splits text without terminal punctuation", () => {
    expect(splitSentences("no punctuation here").map((x) => x.text)).toEqual(["no punctuation here"]);
    expect(splitSentences("...")).toEqual([]);
  });

  it("validates, clamps, drops invalid cues, and sorts", () => {
    const cues = parsePlan(
      {
        cues: [
          { sentence: 3, action: "set", level: 95, feel: "wave", zone: "clit" },
          { sentence: 1, action: "accent", accent: "spike" },
          { sentence: 9, action: "stop" },
          { sentence: 2, action: "set" },
          { sentence: 2, action: "accent", accent: "explode" },
          { sentence: 2, action: "set", level: 10, zone: "unknown" },
          "junk",
        ],
      },
      { sentenceCount: 5, zones: ["clit"], maxLevel: 70 },
    );
    expect(cues).toEqual([
      { sentence: 1, intent: { kind: "accent", zone: "all", accent: "spike" } },
      { sentence: 2, intent: { kind: "scene", zone: "all", level: 10 } },
      { sentence: 3, intent: { kind: "scene", zone: "clit", level: 70, feel: "wave" } },
    ]);
  });

  it("rejects malformed plans whole", () => {
    expect(parsePlan(null, { sentenceCount: 1, zones: [], maxLevel: 100 })).toBeNull();
    expect(parsePlan({ cues: "x" }, { sentenceCount: 1, zones: [], maxLevel: 100 })).toBeNull();
  });

  it("offsets cues by reading position", () => {
    const sentences = splitSentences("Aaaa aaaa. Bbbbb.");
    const offsets = cueOffsetsMs(sentences, [{ sentence: 1, intent: { kind: "stop", zone: "all" } }, { sentence: 2, intent: { kind: "stop", zone: "all" } }], 10);
    expect(offsets).toEqual([0, 1100]);
  });
});

describe("settings", () => {
  it("falls back to defaults for garbage", () => {
    expect(parseSettings("nope")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ intifaceUrl: "http://x", limits: { maxLevel: 500 } }).limits.maxLevel).toBe(100);
    expect(parseSettings({ intifaceUrl: "http://x" }).intifaceUrl).toBe(DEFAULT_SETTINGS.intifaceUrl);
  });

  it("normalizes zones and output prefs", () => {
    const s = parseSettings({ zones: ["Clit", "all", "clit", " Back Door "], outputs: { k: { zone: "nope", floor: 30, ceiling: 10 } } });
    expect(s.zones).toEqual(["clit", "back-door"]);
    expect(s.outputs.k).toEqual({ zone: "clit", floor: 30, ceiling: 30 });
  });

  it("drops invalid rules", () => {
    const s = parseSettings({ rules: [{ when: "character_message", then: { kind: "scene", zone: "all", level: 40 } }, { when: "x", then: {} }] });
    expect(s.rules).toHaveLength(1);
  });

  it("chat mode wins over character default", () => {
    const s = parseSettings({ chatModes: { c: "story", d: "bogus" }, characterModes: { ch: "reactive" } });
    expect(modeFor(s, "c", "ch")).toBe("story");
    expect(modeFor(s, "d", "ch")).toBe("reactive");
    expect(modeFor(s, "e", null)).toBe("off");
  });
});

describe("parseFrontendMessage", () => {
  it("rejects incomplete plan requests", () => {
    expect(parseFrontendMessage({ type: "plan_request", requestId: "r" })).toBeNull();
    expect(parseFrontendMessage({ type: "plan_request", requestId: "r", chatId: "c", content: "x" })).toMatchObject({ characterId: null, status: "" });
    expect(parseFrontendMessage({ type: "evil" })).toBeNull();
  });
});
