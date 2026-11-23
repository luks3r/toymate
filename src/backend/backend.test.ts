import { describe, expect, it } from "bun:test";
import { parseSettings } from "../shared/settings";
import type { PlanRequest } from "../shared/wire";
import { withAwareness } from "./awareness";
import { lastReplyRequest } from "./last-reply";
import { Planner, buildPlannerMessages, planFromResponse } from "./planner";

const settings = parseSettings({ zones: ["clit"], limits: { maxLevel: 60 }, chatModes: { c: "story" }, story: { awareness: true } });
const req: PlanRequest = {
  type: "plan_request",
  requestId: "r",
  chatId: "c",
  characterId: null,
  content: "She smiles. She reaches for you.",
  previousUserMessage: "",
  status: "Now: all devices idle.",
};

describe("planner", () => {
  it("numbers sentences for the model", () => {
    expect(buildPlannerMessages(req, settings)[1]!.content).toContain("[1] She smiles.\n[2] She reaches for you.");
  });

  it("reads the tool call, falls back to JSON in text, and rejects anything else", () => {
    const cue = { sentence: 2, action: "set", level: 90, zone: "clit" };
    const expected = [{ sentence: 2, intent: { kind: "scene" as const, zone: "clit", level: 60 } }];
    expect(planFromResponse({ content: "", tool_calls: [{ name: "plan_cues", args: { cues: [cue] }, call_id: "x" }] }, req, settings)).toEqual(expected);
    expect(planFromResponse({ content: "```json\n" + JSON.stringify({ cues: [cue] }) + "\n```" }, req, settings)).toEqual(expected);
    expect(planFromResponse({ content: "Sure:\n```json\n[" + JSON.stringify(cue) + "]\n```" }, req, settings)).toEqual(expected);
    expect(planFromResponse({ content: "I can't help with that." }, req, settings)).toBeNull();
  });

  it("retries without tools when the provider rejects them", async () => {
    const seen: boolean[] = [];
    const p = new Planner(
      async (input) => {
        seen.push(Boolean(input.tools));
        if (input.tools) throw new Error("stream failed (400): model does not support tools");
        return { content: '{"cues":[{"sentence":1,"action":"stop"}]}' };
      },
      async () => null,
    );
    const cues = await p.plan(req, parseSettings({ story: { connectionId: "c" } }), "u1");
    expect(seen).toEqual([true, false]);
    expect(cues).toEqual([{ sentence: 1, intent: { kind: "stop", zone: "all" } }]);
  });

  it("uses the chosen connection, and aborts on cancel", async () => {
    const calls: string[] = [];
    let signal: AbortSignal | undefined;
    const p = new Planner(
      async (input) => {
        calls.push(`raw:${input.connection_id}:${input.userId}`);
        signal = input.signal;
        return new Promise((_, reject) => input.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
      },
      async () => calls.push("quiet"),
    );
    const s = parseSettings({ story: { connectionId: "conn1" } });
    const pending = p.plan(req, s, "u1");
    p.cancel("r");
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(calls).toEqual(["raw:conn1:u1"]);
    expect(signal?.aborted).toBe(true);
  });
});

describe("awareness", () => {
  const messages = [
    { role: "system" as const, content: "sys" },
    { role: "user" as const, content: "hi" },
  ];

  it("adds a note only in Story mode with awareness on", () => {
    const result = withAwareness(messages, { chatId: "c", characterId: null }, settings, "Now: idle.");
    expect(Array.isArray(result)).toBe(false);
    if (Array.isArray(result)) return;
    expect(result.messages).toHaveLength(3);
    expect(result.messages[2]!.content).toContain("zones: clit");
    expect(withAwareness(messages, { chatId: "other", characterId: null }, settings, null)).toBe(messages);
  });

  it("goes before an assistant prefill", () => {
    const result = withAwareness([...messages, { role: "assistant", content: "Sure" }], { chatId: "c", characterId: null }, settings, null);
    if (Array.isArray(result)) throw new Error("expected a note");
    expect(result.messages.map((m) => m.role)).toEqual(["system", "user", "system", "assistant"]);
  });
});

describe("lastReplyRequest", () => {
  const msg = { type: "plan_last" as const, requestId: "r", chatId: "c1", characterId: null, status: "Now: idle." };
  const api = (owner: string | null, messages: { role: string; content: string; hidden: boolean }[], fail?: string) => ({
    chats: {
      get: async (chatId: string, userId?: string) => {
        if (fail) throw new Error(fail);
        return owner === userId ? ({ id: chatId } as never) : null;
      },
    },
    chat: { getMessages: async () => messages },
  });

  it("returns the last visible character reply and the user message before it", async () => {
    const req = await lastReplyRequest(
      api("u1", [
        { role: "user", content: "hi", hidden: false },
        { role: "assistant", content: "Hello there.", hidden: false },
        { role: "assistant", content: "secret", hidden: true },
        { role: "user", content: "next", hidden: false },
      ]),
      msg,
      "u1",
    );
    expect(req).toMatchObject({ content: "Hello there.", previousUserMessage: "hi", chatId: "c1" });
  });

  it("refuses chats owned by someone else", async () => {
    await expect(lastReplyRequest(api("u2", [{ role: "assistant", content: "x", hidden: false }]), msg, "u1")).rejects.toThrow("Chat not found");
  });

  it("explains missing permissions and empty chats", async () => {
    await expect(lastReplyRequest(api("u1", [], "PERMISSION_DENIED chats"), msg, "u1")).rejects.toThrow("chat_mutation");
    await expect(lastReplyRequest(api("u1", [{ role: "user", content: "hi", hidden: false }]), msg, "u1")).rejects.toThrow("no character reply");
  });
});
