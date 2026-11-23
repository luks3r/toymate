import { ALL_ZONES, clampLevel, describeIntent, isRecord } from "../../shared/intent";
import { cueOffsetsMs, splitSentences, type PlannedCue } from "../../shared/plan";
import { matchRules } from "../../shared/rules";
import { matchSafeword } from "../../shared/safewords";
import { modeFor, type Mode, type Settings } from "../../shared/settings";
import type { FrontendMessage } from "../../shared/wire";
import type { Engine, Reaction } from "../engine/engine";
import { GenerationTracker, type LiveGeneration } from "./generations";

interface PendingPlan {
  generation: LiveGeneration;
  content: string;
}

export interface TriggerHost {
  on(event: string, handler: (payload: unknown) => void): () => void;
  activeChat(): { chatId: string | null; characterId: string | null };
  send(message: FrontendMessage): void;
  settings(): Settings;
  saveSettings(settings: Settings): void;
}

export interface PlanView {
  state: "idle" | "planning" | "planned" | "failed";
  detail: string;
  cues: { atMs: number; label: string; sentence: string }[];
}

const STREAM_PULSE_MS = 500;

const describeReaction = (r: Reaction) =>
  r === "ease" ? "used the slow-down safeword" : r === "hold" ? "asked to hold" : `asked for ${r === "stop" ? "a stop" : r}`;

/**
 * Turns live Lumiverse events into engine intents: safewords, rules, stream
 * pulse, and Story mode planner requests.
 */
export class Triggers {
  private tracker = new GenerationTracker();
  private plans = new Map<string, PendingPlan>();
  private firedStreamRules = new Map<string, Set<string>>();
  private lastPulse = new Map<string, { at: number; tokens: number }>();
  private previousUserMessage = "";
  private disposers: (() => void)[] = [];
  private planListeners = new Set<() => void>();
  plan: PlanView = { state: "idle", detail: "", cues: [] };

  constructor(
    private host: TriggerHost,
    private engine: Engine,
    private now: () => number = () => Date.now(),
  ) {}

  start() {
    const on = (event: string, fn: (p: unknown) => void) => this.disposers.push(this.host.on(event, fn));
    on("GENERATION_STARTED", (p) => this.onStarted(p));
    on("STREAM_TOKEN_RECEIVED", (p) => this.onToken(p));
    on("GENERATION_ENDED", (p) => this.onEnded(p));
    on("GENERATION_STOPPED", (p) => this.onStopped(p));
    on("MESSAGE_SENT", (p) => this.onMessageSent(p));
    on("CHAT_SWITCHED", () => this.onChatSwitched());
  }

  dispose() {
    for (const d of this.disposers) d();
    this.disposers = [];
    for (const id of this.tracker.clear()) this.dropPlan(id);
  }

  onPlanChange(fn: () => void) {
    this.planListeners.add(fn);
    return () => this.planListeners.delete(fn);
  }

  private setPlan(plan: PlanView) {
    this.plan = plan;
    for (const l of this.planListeners) l();
  }

  private mode(chatId: string | null, characterId: string | null): Mode {
    return modeFor(this.host.settings(), chatId, characterId);
  }

  private dropPlan(id: string) {
    if (this.plans.delete(id)) this.host.send({ type: "plan_cancel", requestId: id });
    this.engine.cancel(id);
    this.firedStreamRules.delete(id);
    this.lastPulse.delete(id);
  }

  onStarted(payload: unknown) {
    const result = this.tracker.started(payload, this.host.activeChat().chatId, this.now());
    if (!result) return;
    for (const id of result.superseded) this.dropPlan(id);
    // A new reply replaces whatever the previous one had scheduled.
    for (const id of [...this.plans.keys()]) this.dropPlan(id);
  }

  onToken(payload: unknown) {
    const now = this.now();
    const g = this.tracker.token(payload, now);
    if (!g || this.mode(g.chatId, g.characterId) !== "reactive") return;
    const settings = this.host.settings();

    const fired = this.firedStreamRules.get(g.id) ?? new Set<string>();
    this.firedStreamRules.set(g.id, fired);
    for (const rule of settings.rules) {
      if (fired.has(rule.id)) continue;
      if (matchRules([rule], { when: "streaming", text: g.text, characterId: g.characterId }).length) {
        fired.add(rule.id);
        this.engine.apply(rule.then, "auto");
      }
    }

    if (settings.streamPulse) {
      const last = this.lastPulse.get(g.id) ?? { at: now, tokens: 0 };
      if (now - last.at >= STREAM_PULSE_MS) {
        const rate = ((g.tokens - last.tokens) * 1000) / (now - last.at);
        const level = clampLevel(20 + rate * 1.5, 70);
        this.engine.apply({ kind: "scene", zone: ALL_ZONES, level, feel: "pulse", tempo: rate > 25 ? "fast" : "medium" }, "auto");
        this.lastPulse.set(g.id, { at: now, tokens: g.tokens });
      } else if (!this.lastPulse.has(g.id)) this.lastPulse.set(g.id, last);
    }
  }

  onEnded(payload: unknown) {
    const result = this.tracker.ended(payload);
    if (!result) return;
    const { generation: g, content } = result;
    this.firedStreamRules.delete(g.id);
    this.lastPulse.delete(g.id);
    const mode = this.mode(g.chatId, g.characterId);
    if (mode === "reactive") {
      for (const intent of matchRules(this.host.settings().rules, { when: "character_message", text: content, characterId: g.characterId }))
        this.engine.apply(intent, "auto");
    } else if (mode === "story" && content.trim()) {
      this.plans.set(g.id, { generation: g, content });
      this.host.send({
        type: "plan_request",
        requestId: g.id,
        chatId: g.chatId,
        characterId: g.characterId,
        content,
        previousUserMessage: this.previousUserMessage,
        status: this.statusLine(true),
      });
      this.setPlan({ state: "planning", detail: "Planning cues for the latest reply…", cues: [] });
    }
  }

  onStopped(payload: unknown) {
    const g = this.tracker.stopped(payload);
    if (!g) return;
    this.dropPlan(g.id);
    if (this.host.settings().limits.stopOnGenerationStop) void this.engine.stopEverything({ pause: false });
  }

  onMessageSent(payload: unknown) {
    if (!isRecord(payload) || !isRecord(payload.message) || payload.inserted) return;
    const message = payload.message;
    if (message.is_user !== true || typeof message.content !== "string") return;
    const chatId = typeof payload.chatId === "string" ? payload.chatId : null;
    const settings = this.host.settings();

    const hit = matchSafeword(message.content, settings.safewords);
    if (hit === "stop") {
      void this.engine.stopEverything({ pause: true });
      for (const id of [...this.plans.keys()]) this.dropPlan(id);
      if (chatId && settings.chatModes[chatId] === "story") {
        const chatModes = { ...settings.chatModes };
        delete chatModes[chatId];
        this.host.saveSettings({ ...settings, chatModes });
      }
      this.setPlan({ state: "idle", detail: "Safeword: everything stopped.", cues: [] });
      return;
    }
    if (hit === "ease") {
      this.engine.ease();
      return;
    }

    this.previousUserMessage = message.content;
    if (chatId !== this.host.activeChat().chatId) return;
    if (this.mode(chatId, this.host.activeChat().characterId) === "reactive")
      for (const intent of matchRules(settings.rules, { when: "user_message", text: message.content, characterId: null }))
        this.engine.apply(intent, "auto");
  }

  private onChatSwitched() {
    for (const id of this.tracker.clear()) this.dropPlan(id);
    for (const id of [...this.plans.keys()]) this.dropPlan(id);
    this.previousUserMessage = "";
    this.setPlan({ state: "idle", detail: "", cues: [] });
    void this.engine.stopEverything({ pause: false });
  }

  /** Backend answered a plan request. Stale answers are dropped. */
  onPlanResult(requestId: string, cues: readonly PlannedCue[]) {
    const pending = this.plans.get(requestId);
    if (!pending) return;
    this.plans.delete(requestId);
    const now = this.now();
    const settings = this.host.settings();
    const sentences = splitSentences(pending.content);
    const offsets = cueOffsetsMs(sentences, cues, settings.story.readingCps);
    const readingStart = pending.generation.firstTokenAt ?? pending.generation.startedAt;
    const scheduled = cues.map((cue, i) => ({ at: Math.max(now, readingStart + offsets[i]!), intent: cue.intent }));
    this.engine.schedule(requestId, scheduled);
    this.setPlan({
      state: "planned",
      detail: cues.length ? `${cues.length} cue${cues.length === 1 ? "" : "s"} for the latest reply.` : "The planner chose no cues for this reply.",
      cues: cues.map((cue, i) => ({
        atMs: scheduled[i]!.at,
        label: describeIntent(cue.intent),
        sentence: sentences[cue.sentence - 1]?.text.slice(0, 80) ?? "",
      })),
    });
  }

  onPlanError(requestId: string, error: string) {
    if (!this.plans.delete(requestId)) return;
    this.setPlan({ state: "failed", detail: error, cues: [] });
  }

  /** Scene and reactions for the planner and the awareness note. `consume` clears reactions once reported. */
  statusLine(consume: boolean): string {
    const reactions = consume ? this.engine.takeReactions() : this.engine.peekReactions();
    const feedback = reactions.length ? ` Since the last reply the user ${[...new Set(reactions)].map(describeReaction).join(", ")}.` : "";
    return `Now: ${this.engine.summary()}.${feedback}`;
  }
}
