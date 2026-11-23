import { ACCENTS, ALL_ZONES, FEELS, TEMPOS, type Accent, type Feel, type Intent, type Tempo } from "../../shared/intent";
import { DEFAULT_OUTPUT_PREFS, MODES, RULE_TRIGGERS, prefsFor, type Mode, type Rule, type Settings } from "../../shared/settings";
import type { ConnectionSummary } from "../../shared/wire";
import { describeKind, type DeviceInfo, UNDRIVEN } from "../engine/devices";
import type { Engine } from "../engine/engine";
import type { Triggers } from "../triggers/wiring";
import { button, h, numberField, section, select, slider, textField, toggle } from "./dom";

export interface PanelDeps {
  engine: Engine;
  triggers: Triggers;
  settings(): Settings;
  update(mutate: (s: Settings) => Settings): void;
  activeChat(): { chatId: string | null; characterId: string | null };
  connections(): ConnectionSummary[] | null;
  requestConnections(): void;
}

const MODE_LABELS: Record<Mode, string> = { off: "Off", reactive: "Reactive (rules)", story: "Story (planner)" };
const TRIGGER_LABELS = { character_message: "Character reply finished", user_message: "User message sent", streaming: "While reply streams" } as const;

export function mountPanel(root: HTMLElement, deps: PanelDeps) {
  const { engine, triggers } = deps;
  const open = new Set(["live", "devices"]);
  const sec = (id: string, title: string, body: HTMLElement) =>
    section(title, open.has(id), (o) => (o ? open.add(id) : open.delete(id)), body);

  // ── header: built once, updated in place so buttons never move under a click ──
  const dot = h("span", { class: "tm-dot" });
  const statusText = h("span", {});
  const connectBtn = button("Connect", () => void (engine.view().connection === "connected" ? engine.disconnect() : engine.connect()), "tm-primary");
  const scanBtn = button("Scan", () => void engine.toggleScan());
  const stopBtn = button("STOP ALL", () => void engine.panic(), "tm-stop", "Stop every device and pause Toymate (Shift+Esc)");
  const resumeBtn = button("Resume Toymate", () => engine.resume(), "tm-primary");
  const errorLine = h("div", { class: "tm-error", hidden: true });
  const modeRow = h("div", { class: "tm-row" });
  const reactions = h(
    "div",
    { class: "tm-row" },
    h("span", { class: "tm-dim" }, "React:"),
    button("More", () => engine.react("more"), "tm-small"),
    button("Less", () => engine.react("less"), "tm-small"),
    button("Hold", () => engine.react("hold"), "tm-small"),
    button("Stop", () => engine.react("stop"), "tm-small"),
  );
  const head = h(
    "div",
    { class: "tm-head" },
    h("div", { class: "tm-row tm-spread" }, h("span", { class: "tm-status" }, dot, statusText), h("span", { class: "tm-row" }, scanBtn, connectBtn)),
    stopBtn,
    resumeBtn,
    errorLine,
    modeRow,
    reactions,
  );

  const liveBody = h("div", {});
  const meters = h("div", { style: "display:flex;flex-direction:column;gap:6px" });
  const manual = h("div", {});
  const planBox = h("div", {});
  liveBody.append(meters, manual, planBox);
  const devicesBody = h("div", {});
  const rulesBody = h("div", {});
  const storyBody = h("div", {});
  const safetyBody = h("div", {});
  const connectionBody = h("div", {});

  root.replaceChildren(
    h(
      "div",
      { class: "tm-panel" },
      head,
      sec("live", "Live", liveBody),
      sec("devices", "Devices & zones", devicesBody),
      sec("rules", "Reactive rules", rulesBody),
      sec("story", "Story mode", storyBody),
      sec("safety", "Safety & limits", safetyBody),
      sec("connection", "Connection", connectionBody),
    ),
  );

  function renderHeader() {
    const v = engine.view();
    dot.dataset.state = v.connection;
    dot.dataset.active = String(v.active);
    statusText.textContent =
      v.connection === "connected"
        ? `${v.devices.length} device${v.devices.length === 1 ? "" : "s"}${v.paused ? " · paused" : v.active ? " · running" : ""}`
        : v.connection === "connecting"
          ? "Connecting…"
          : "Not connected";
    connectBtn.textContent = v.connection === "connected" ? "Disconnect" : "Connect";
    connectBtn.disabled = v.connection === "connecting";
    scanBtn.textContent = v.scanning ? "Stop scan" : "Scan";
    scanBtn.disabled = v.connection !== "connected";
    stopBtn.hidden = v.paused;
    resumeBtn.hidden = !v.paused;
    errorLine.hidden = !v.error;
    errorLine.textContent = v.error ?? "";
  }

  function renderMode() {
    const s = deps.settings();
    const { chatId, characterId } = deps.activeChat();
    const setChat = (mode: Mode) =>
      deps.update((x) => {
        const chatModes = { ...x.chatModes };
        if (!chatId) return x;
        if (mode === "off") delete chatModes[chatId];
        else chatModes[chatId] = mode;
        return { ...x, chatModes };
      });
    const setCharacter = (mode: Mode) =>
      deps.update((x) => {
        const characterModes = { ...x.characterModes };
        if (!characterId) return x;
        if (mode === "off") delete characterModes[characterId];
        else characterModes[characterId] = mode;
        return { ...x, characterModes };
      });
    const effective = (chatId && s.chatModes[chatId]) || (characterId && s.characterModes[characterId]) || "off";
    modeRow.replaceChildren(
      ...(chatId
        ? [
            h("span", { class: "tm-dim" }, "Mode:"),
            h("span", { class: "tm-mode", "data-mode": effective }, MODE_LABELS[effective]),
            select((s.chatModes[chatId] ?? "off") as Mode, MODES.map((m) => [m, `This chat: ${MODE_LABELS[m]}`] as const), setChat, "Mode for this chat"),
            ...(characterId
              ? [select((s.characterModes[characterId] ?? "off") as Mode, MODES.map((m) => [m, `Character default: ${MODE_LABELS[m]}`] as const), setCharacter, "Default mode for this character")]
              : []),
          ]
        : [h("span", { class: "tm-hint" }, "Open a chat to choose its mode.")]),
    );
  }

  // ── live ──
  let meterZones = "";
  const meterRefs = new Map<string, { fill: HTMLElement; mark: HTMLElement; text: HTMLElement; lock: HTMLInputElement }>();
  function renderMeters() {
    const views = engine.view().scenes;
    const sig = views.map((v) => v.zone).join("|");
    if (sig !== meterZones) {
      meterZones = sig;
      meterRefs.clear();
      meters.replaceChildren(
        ...views.map((v) => {
          const fill = h("i", {});
          const mark = h("b", {});
          const text = h("span", { class: "tm-dim" });
          const lock = h("input", { type: "checkbox", title: "Lock: ignore rules and planner for this zone", onchange: (e) => engine.setLocked(v.zone, (e.target as HTMLInputElement).checked) });
          meterRefs.set(v.zone, { fill, mark, text, lock });
          return h("div", { class: "tm-zone" }, h("span", {}, v.zone), h("div", { class: "tm-meter" }, fill, mark), text, h("label", { class: "tm-toggle", title: "Lock zone" }, lock, h("span", { class: "tm-dim" }, "lock")));
        }),
      );
    }
    for (const v of views) {
      const r = meterRefs.get(v.zone);
      if (!r) continue;
      r.fill.style.width = `${v.level}%`;
      r.mark.style.left = `${v.target}%`;
      r.text.textContent = v.target > 0 || v.level > 0 ? `${v.level} · ${v.accent ?? `${v.feel}, ${v.tempo}`}` : "idle";
      r.lock.checked = v.locked;
    }
  }

  const draft: { zone: string; level: number; feel: Feel; tempo: Tempo } = { zone: ALL_ZONES, level: 30, feel: "wave", tempo: "medium" };
  function renderManual() {
    const s = deps.settings();
    if (draft.zone !== ALL_ZONES && !s.zones.includes(draft.zone)) draft.zone = ALL_ZONES;
    const send = (intent: Intent) => engine.apply(intent, "manual");
    manual.replaceChildren(
      h(
        "div",
        { class: "tm-card" },
        h("div", { class: "tm-row" }, select(draft.zone, [ALL_ZONES, ...s.zones], (z) => (draft.zone = z), "Zone"), select(draft.feel, FEELS, (f) => (draft.feel = f), "Feel"), select(draft.tempo, TEMPOS, (t) => (draft.tempo = t), "Tempo")),
        slider("Level", draft.level, 0, 100, 1, (v) => (draft.level = v)),
        h(
          "div",
          { class: "tm-row" },
          button("Play", () => send({ kind: "scene", zone: draft.zone, level: draft.level, feel: draft.feel, tempo: draft.tempo }), "tm-primary"),
          ...ACCENTS.map((a: Accent) => button(a, () => send({ kind: "accent", zone: draft.zone, accent: a }), "tm-small")),
          button("Stop zone", () => send({ kind: "stop", zone: draft.zone }), "tm-small"),
        ),
        h("div", { class: "tm-hint" }, `Levels are capped at ${s.limits.maxLevel} and mapped onto each output's calibration. Scenes fade after ${Math.round(s.limits.holdTimeoutSec)} s without activity.`),
      ),
    );
  }

  // Built when the plan changes; the timer only rewrites status text, so resume buttons never move under a click.
  let cueStatus: { el: HTMLElement; atMs: number | null }[] = [];
  function renderPlan() {
    const p = triggers.plan;
    cueStatus = [];
    if (p.state === "idle" && !p.detail) {
      planBox.replaceChildren();
      return;
    }
    const items = p.cues.map((c, i) => {
      const el = h("span", { class: "tm-dim" });
      cueStatus.push({ el, atMs: c.atMs });
      return h(
        "li",
        {},
        button("▶", () => triggers.resumeFrom(i), "tm-small tm-resume", "Resume from this cue"),
        " ",
        h("b", {}, c.label),
        " ",
        el,
        h("span", { class: "tm-dim" }, ` · “${c.sentence}”`),
      );
    });
    planBox.replaceChildren(
      h(
        "div",
        { class: "tm-card" },
        h("div", { class: p.state === "failed" ? "tm-error" : "tm-dim" }, p.detail),
        items.length ? h("ol", { class: "tm-cues" }, ...items) : null,
        items.length ? h("div", { class: "tm-hint" }, "▶ plays the reply's cues again from that point, at your reading speed. It also lifts a pause.") : null,
      ),
    );
    updateCueStatus();
  }

  function updateCueStatus() {
    const now = Date.now();
    const scheduled = engine.view().pendingCues > 0;
    for (const { el, atMs } of cueStatus)
      el.textContent = atMs === null ? "skipped" : atMs <= now ? "played" : scheduled ? `in ${Math.ceil((atMs - now) / 1000)} s` : "stopped";
  }

  // ── devices ──
  let deviceSig = "";
  const valueRefs = new Map<string, HTMLElement>();
  function renderDevices(force = false) {
    const v = engine.view();
    const s = deps.settings();
    const sig = JSON.stringify([v.devices.map((d) => [d.name, d.battery, d.outputs.map((o) => o.key)]), s.zones, s.outputs, v.connection]);
    if (sig === deviceSig && !force) {
      for (const [key, el] of valueRefs) el.textContent = `${v.values[key] ?? 0}`;
      return;
    }
    deviceSig = sig;
    valueRefs.clear();
    const setPrefs = (key: string, patch: Partial<typeof DEFAULT_OUTPUT_PREFS>) =>
      deps.update((x) => ({ ...x, outputs: { ...x.outputs, [key]: { ...prefsFor(x, key), ...patch } } }));
    const deviceCard = (d: DeviceInfo) =>
      h(
        "div",
        { class: "tm-card" },
        h("div", { class: "tm-row tm-spread" }, h("b", {}, d.name), h("span", { class: "tm-dim" }, d.battery === null ? "" : `battery ${d.battery}%`)),
        ...d.outputs.map((o) => {
          const p = prefsFor(s, o.key);
          const val = h("span", { class: "tm-dim" }, `${v.values[o.key] ?? 0}`);
          valueRefs.set(o.key, val);
          if (UNDRIVEN.has(o.kind)) return h("div", { class: "tm-hint" }, `Feature ${o.featureIndex}: ${describeKind(o.kind)} (not driven by Toymate)`);
          return h(
            "div",
            { class: "tm-rule" },
            h(
              "div",
              { class: "tm-row tm-spread" },
              h("span", {}, `Feature ${o.featureIndex} · ${describeKind(o.kind)} `, h("span", { class: "tm-dim" }, "now "), val, h("span", { class: "tm-dim" }, ` / ${o.range[1]}`)),
              select(p.zone, s.zones, (zone) => setPrefs(o.key, { zone }), "Zone"),
            ),
            slider("Floor (barely felt)", p.floor, 0, 100, 1, (floor) => setPrefs(o.key, { floor, ceiling: Math.max(floor, p.ceiling) }), "%"),
            slider("Ceiling (strongest)", p.ceiling, 0, 100, 1, (ceiling) => setPrefs(o.key, { ceiling, floor: Math.min(p.floor, ceiling) }), "%"),
            h(
              "div",
              { class: "tm-row" },
              button("Test floor", () => engine.test(o.key, 1), "tm-small", "Runs for 2 seconds at the floor"),
              button("Test middle", () => engine.test(o.key, 50), "tm-small"),
              button("Test ceiling", () => engine.test(o.key, 100), "tm-small", "Runs for 2 seconds at the ceiling (or the max level)"),
            ),
          );
        }),
      );
    devicesBody.replaceChildren(
      v.connection !== "connected"
        ? h("div", { class: "tm-hint" }, "Connect to Intiface to see devices.")
        : v.devices.length === 0
          ? h("div", { class: "tm-hint" }, "No devices yet. Connect them in Intiface, or press Scan.")
          : h("div", { style: "display:flex;flex-direction:column;gap:8px" }, ...v.devices.map(deviceCard)),
      textField("Zones", s.zones.join(", "), (text) => deps.update((x) => ({ ...x, zones: text.split(",") }))),
      h("div", { class: "tm-hint" }, "Zones group outputs (for example: clit, internal, stroker). Rules and the planner address zones, never device names. Temperature outputs only follow their zone by name, never “all”."),
    );
  }

  // ── rules ──
  function renderRules() {
    const s = deps.settings();
    const setRules = (rules: Rule[]) => deps.update((x) => ({ ...x, rules }));
    const patch = (i: number, r: Partial<Rule>) => setRules(s.rules.map((x, j) => (j === i ? { ...x, ...r } : x)));
    const thenEditor = (rule: Rule, i: number) => {
      const t = rule.then;
      const action = t.kind;
      const setThen = (then: Intent) => patch(i, { then });
      const zone = select(t.zone, [ALL_ZONES, ...s.zones], (zone) => setThen({ ...t, zone }), "Zone");
      const kindSel = select(action, ["scene", "accent", "stop"] as const, (k) =>
        setThen(k === "scene" ? { kind: "scene", zone: t.zone, level: 40, feel: "wave", tempo: "medium" } : k === "accent" ? { kind: "accent", zone: t.zone, accent: "spike" } : { kind: "stop", zone: t.zone }),
      );
      if (t.kind === "scene")
        return h(
          "div",
          { class: "tm-row" },
          kindSel,
          zone,
          h("input", { class: "tm-input tm-num", type: "number", min: -100, max: 100, value: t.level ?? t.delta ?? 0, title: "Level 0-100", onchange: (e) => setThen({ ...t, level: Number((e.target as HTMLInputElement).value) }) }),
          select(t.feel ?? "steady", FEELS, (feel) => setThen({ ...t, feel }), "Feel"),
          select(t.tempo ?? "medium", TEMPOS, (tempo) => setThen({ ...t, tempo }), "Tempo"),
        );
      if (t.kind === "accent") return h("div", { class: "tm-row" }, kindSel, zone, select(t.accent, ACCENTS, (accent) => setThen({ ...t, accent }), "Accent"));
      return h("div", { class: "tm-row" }, kindSel, zone);
    };
    rulesBody.replaceChildren(
      h("div", { class: "tm-hint" }, "Rules run in chats set to Reactive. Match: comma-separated keywords, or /regex/i. Empty matches everything."),
      ...s.rules.map((rule, i) =>
        h(
          "div",
          { class: "tm-rule" },
          h(
            "div",
            { class: "tm-row tm-spread" },
            toggle("Enabled", rule.enabled, (enabled) => patch(i, { enabled })),
            select(rule.when, RULE_TRIGGERS.map((w) => [w, TRIGGER_LABELS[w]] as const), (when) => patch(i, { when })),
            button("Delete", () => setRules(s.rules.filter((_, j) => j !== i)), "tm-small tm-danger-text"),
          ),
          textField("Match", rule.match, (match) => patch(i, { match }), "kiss, touch  or  /moan(s|ed)?/i"),
          thenEditor(rule, i),
        ),
      ),
      h(
        "div",
        { class: "tm-row" },
        button("Add rule", () =>
          setRules([...s.rules, { id: crypto.randomUUID(), enabled: true, when: "character_message", match: "", characterId: null, then: { kind: "scene", zone: ALL_ZONES, level: 30, feel: "wave", tempo: "medium" } }]),
        ),
      ),
      toggle("Stream pulse: pulse while the reply streams (Reactive chats)", s.streamPulse, (streamPulse) => deps.update((x) => ({ ...x, streamPulse }))),
    );
  }

  // ── story ──
  function renderStory() {
    const s = deps.settings();
    const conns = deps.connections();
    const options: (readonly [string, string])[] = [["", "Active connection"], ...(conns ?? []).map((c) => [c.id, `${c.name} (${c.model})`] as const)];
    if (s.story.connectionId && !options.some(([id]) => id === s.story.connectionId)) options.push([s.story.connectionId, "Saved connection (not found)"]);
    storyBody.replaceChildren(
      h("div", { class: "tm-hint" }, "In Story chats, a separate planner call reads each finished reply and schedules cues as you read. Messages stay clean."),
      h(
        "label",
        { class: "tm-field tm-field-wide" },
        h("span", {}, "Planner connection"),
        select(s.story.connectionId ?? "", options, (id) => deps.update((x) => ({ ...x, story: { ...x.story, connectionId: id || null } })), "Planner connection"),
      ),
      ...(conns === null ? [button("Load connections", () => deps.requestConnections(), "tm-small")] : []),
      h("div", { class: "tm-hint" }, "Each reply's text is sent to this connection's provider. Pick the provider you already use for roleplay, or a local model. A small fast model is enough; it must support tool calling or JSON output."),
      numberField("Reading speed (chars/s)", s.story.readingCps, 3, 100, (readingCps) => deps.update((x) => ({ ...x, story: { ...x.story, readingCps } }))),
      toggle("Character awareness: tell the roleplay model about the devices", s.story.awareness, (awareness) => deps.update((x) => ({ ...x, story: { ...x.story, awareness } }))),
    );
  }

  // ── safety ──
  function renderSafety() {
    const s = deps.settings();
    const L = s.limits;
    const setL = (patch: Partial<Settings["limits"]>) => deps.update((x) => ({ ...x, limits: { ...x.limits, ...patch } }));
    safetyBody.replaceChildren(
      slider("Max level", L.maxLevel, 0, 100, 1, (maxLevel) => setL({ maxLevel })),
      slider("Ramp (levels/s)", L.rampPerSecond, 5, 200, 5, (rampPerSecond) => setL({ rampPerSecond })),
      numberField("Fade after idle (s)", L.holdTimeoutSec, 10, 3600, (holdTimeoutSec) => setL({ holdTimeoutSec })),
      toggle("Stop all when a generation is stopped", L.stopOnGenerationStop, (stopOnGenerationStop) => setL({ stopOnGenerationStop })),
      h("b", {}, "Strokers"),
      slider("Max stroke speed", L.strokeMaxSpeed, 0.1, 5, 0.1, (strokeMaxSpeed) => setL({ strokeMaxSpeed }), "/s"),
      slider("Stroke range min", L.strokeMin, 0, 100, 1, (strokeMin) => setL({ strokeMin, strokeMax: Math.max(strokeMin, L.strokeMax) }), "%"),
      slider("Stroke range max", L.strokeMax, 0, 100, 1, (strokeMax) => setL({ strokeMax, strokeMin: Math.min(L.strokeMin, strokeMax) }), "%"),
      h("b", {}, "Other devices"),
      numberField("Air pump max hold (s)", L.constrictMaxHoldSec, 2, 600, (constrictMaxHoldSec) => setL({ constrictMaxHoldSec })),
      slider("Temperature cap", L.temperatureMax, 0, 100, 1, (temperatureMax) => setL({ temperatureMax }), "%"),
      numberField("Rotation swap min (ms)", L.rotateSwapMinMs, 200, 60000, (rotateSwapMinMs) => setL({ rotateSwapMinMs })),
      h("b", {}, "Safewords"),
      textField("Stop everything", s.safewords.stop, (stop) => deps.update((x) => ({ ...x, safewords: { ...x.safewords, stop } }))),
      textField("Slow down", s.safewords.ease, (ease) => deps.update((x) => ({ ...x, safewords: { ...x.safewords, ease } }))),
      h("div", { class: "tm-hint" }, `Send a safeword as the whole message or out of character, e.g. “(${s.safewords.stop})” or “OOC: ${s.safewords.stop}”. Stop pauses Toymate and leaves Story mode. Shift+Esc stops everything from anywhere.`),
    );
  }

  function renderConnection() {
    const s = deps.settings();
    connectionBody.replaceChildren(
      textField("Intiface URL", s.intifaceUrl, (intifaceUrl) => deps.update((x) => ({ ...x, intifaceUrl: intifaceUrl.trim() })), "ws://127.0.0.1:12345"),
      toggle("Connect automatically when Lumiverse opens", s.autoConnect, (autoConnect) => deps.update((x) => ({ ...x, autoConnect }))),
      h("div", { class: "tm-hint" }, "Toymate connects from this browser to Intiface Central on this device. Start the server in Intiface first."),
    );
  }

  const renderSettings = () => {
    renderMode();
    renderManual();
    renderDevices(true);
    renderRules();
    renderStory();
    renderSafety();
    renderConnection();
  };

  renderHeader();
  renderMeters();
  renderPlan();
  renderSettings();

  const unsubEngine = engine.subscribe(() => {
    renderHeader();
    renderMeters();
    renderDevices();
  });
  const unsubPlan = triggers.onPlanChange(renderPlan);
  const planTimer = setInterval(updateCueStatus, 1000);

  return {
    /** Settings changed (from the backend or locally). */
    settingsChanged: renderSettings,
    chatChanged: renderMode,
    dispose() {
      unsubEngine();
      unsubPlan();
      clearInterval(planTimer);
      root.replaceChildren();
    },
  };
}
