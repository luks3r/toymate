import { ACCENTS, ALL_ZONES, FEELS, TEMPOS, type Feel, type Intent, type SceneIntent, type Tempo } from "../../shared/intent";
import { DEFAULT_OUTPUT_PREFS, RULE_TRIGGERS, modeFor, prefsFor, withChatMode, type Mode, type Rule, type Settings } from "../../shared/settings";
import type { ConnectionSummary } from "../../shared/wire";
import { UNDRIVEN, type DeviceInfo, type OutputInfo, type OutputKind } from "../engine/devices";
import type { Engine } from "../engine/engine";
import type { Triggers } from "../triggers/wiring";
import { button, chips, field, group, h, icon, number, optNumber, range, segmented, select, text, toggle, type IconName } from "./dom";

export interface PanelDeps {
  engine: Engine;
  triggers: Triggers;
  settings(): Settings;
  update(mutate: (s: Settings) => Settings): void;
  activeChat(): { chatId: string | null; characterId: string | null };
  connections(): ConnectionSummary[] | null;
  requestConnections(): void;
}

type Tab = "play" | "devices" | "rules" | "settings";
const TABS: readonly (readonly [Tab, string])[] = [
  ["play", "Play"],
  ["devices", "Devices"],
  ["rules", "Rules"],
  ["settings", "Settings"],
];

const MODE_HINT: Record<Mode, string> = {
  off: "Nothing moves on its own. You can still play by hand below.",
  reactive: "Your rules react to new replies and messages.",
  story: "After each reply, a planner reads it and plays cues as you read.",
};
const TRIGGER_LABELS = { character_message: "a reply finishes", user_message: "I send a message", streaming: "a reply is streaming" } as const;

const KIND: Record<OutputKind, { label: string; icon: IconName }> = {
  Vibrate: { label: "Vibrate", icon: "vibrate" },
  Rotate: { label: "Rotate", icon: "rotate" },
  Oscillate: { label: "Thrust", icon: "stroke" },
  Constrict: { label: "Squeeze", icon: "air" },
  Inflate: { label: "Inflate", icon: "air" },
  HwPositionWithDuration: { label: "Stroke", icon: "stroke" },
  Position: { label: "Position", icon: "stroke" },
  Temperature: { label: "Warmth", icon: "heat" },
  Spray: { label: "Spray", icon: "dot" },
  Led: { label: "Light", icon: "dot" },
};

const pct = (v: number) => `${v}%`;

/** Sets or clears one optional scene field. */
function withField<K extends "to" | "overSec" | "spread" | "forSec">(t: SceneIntent, key: K, value: number | undefined): SceneIntent {
  const next = { ...t };
  if (value === undefined || !Number.isFinite(value)) delete next[key];
  else next[key] = value;
  return next;
}
const present = (...children: (Node | null)[]) => children.filter((c): c is Node => c !== null);

/**
 * Sidebar UI. Header, zone meters, device values, and cue status are built once
 * and updated in place; everything else rebuilds only when settings, devices,
 * or the plan change, so controls never move under a click.
 */
export function mountPanel(root: HTMLElement, deps: PanelDeps) {
  const { engine, triggers } = deps;
  let tab: Tab = "play";

  // ── header ─────────────────────────────────────────────────────────────
  const dot = h("span", { class: "tm-dot" });
  const connTitle = h("b", {});
  const connSub = h("small", {});
  const scanBtn = button(icon("scan"), () => void engine.toggleScan(), "ghost icon-only", "Scan for devices");
  const connectBtn = button("Connect", () => void (engine.view().connection === "connected" ? engine.disconnect() : engine.connect()), "primary sm");
  const stopBtn = button([icon("stop"), "STOP", h("small", {}, "Shift+Esc")], () => void engine.panic(), "tm-stop", "Stop every device and pause Toymate");
  const paused = h(
    "div",
    { class: "tm-paused", role: "status" },
    h("div", {}, h("b", {}, "Paused"), h("small", {}, "Every device is stopped. Nothing runs until you resume.")),
    button([icon("play"), "Resume"], () => engine.resume(), "primary"),
  );
  const alert = h("div", { class: "tm-alert", role: "alert" });
  const tabButtons = TABS.map(([id, label]) => h("button", { type: "button", role: "tab", onclick: () => setTab(id) }, label));
  const bodies: Record<Tab, HTMLElement> = {
    play: h("div", { class: "tm-tab", role: "tabpanel" }),
    devices: h("div", { class: "tm-tab", role: "tabpanel" }),
    rules: h("div", { class: "tm-tab", role: "tabpanel" }),
    settings: h("div", { class: "tm-tab", role: "tabpanel" }),
  };

  root.replaceChildren(
    h(
      "div",
      { class: "tm" },
      h(
        "div",
        { class: "tm-top" },
        h("div", { class: "tm-conn" }, dot, h("div", { class: "tm-conn-text" }, connTitle, connSub), scanBtn, connectBtn),
        stopBtn,
        paused,
        alert,
      ),
      h("div", { class: "tm-tabs", role: "tablist" }, ...tabButtons),
      ...Object.values(bodies),
    ),
  );

  function setTab(next: Tab) {
    tab = next;
    TABS.forEach(([id], i) => {
      tabButtons[i]!.className = id === tab ? "on" : "";
      tabButtons[i]!.setAttribute("aria-selected", String(id === tab));
      bodies[id].hidden = id !== tab;
    });
  }

  function renderHeader() {
    const v = engine.view();
    const outputs = v.devices.reduce((n, d) => n + d.outputs.length, 0);
    dot.dataset.state = v.connection;
    dot.dataset.active = String(v.active && !v.paused);
    connTitle.textContent =
      v.connection === "connected"
        ? v.devices.length
          ? `${v.devices.length} ${v.devices.length === 1 ? "toy" : "toys"} connected`
          : "Connected, no toys yet"
        : v.connection === "connecting"
          ? "Connecting…"
          : "Not connected";
    connSub.textContent =
      v.connection === "connected"
        ? v.scanning
          ? "Scanning for toys…"
          : v.devices.length
            ? `${outputs} output${outputs === 1 ? "" : "s"}${v.active && !v.paused ? " · running" : ""}`
            : "Turn a toy on, then scan"
        : deps.settings().intifaceUrl;
    connectBtn.textContent = v.connection === "connected" ? "Disconnect" : "Connect";
    connectBtn.className = `tm-btn sm ${v.connection === "connected" ? "" : "primary"}`;
    connectBtn.disabled = v.connection === "connecting";
    scanBtn.hidden = v.connection !== "connected";
    scanBtn.setAttribute("aria-pressed", String(v.scanning));
    stopBtn.hidden = v.paused;
    paused.hidden = !v.paused;
    alert.hidden = !v.error;
    alert.textContent = v.error ?? "";
    connectHint.hidden = v.connection === "connected";
  }

  // ── play tab ───────────────────────────────────────────────────────────
  const connectHint = h(
    "div",
    { class: "tm-empty" },
    icon("plug"),
    h("div", {}, h("b", {}, "Connect to Intiface"), h("p", { class: "tm-hint" }, "Open Intiface Central on this device, press Start Server, then connect.")),
    button("Connect", () => void engine.connect(), "primary"),
  );
  const modeBox = h("div", {});
  const zoneList = h("div", { class: "tm-zones" });
  const reactions = h(
    "div",
    { class: "tm-reactions" },
    button([icon("minus"), "Less"], () => engine.react("less"), "sm", "Less intense"),
    button([icon("hold"), "Hold"], () => engine.react("hold"), "sm", "Keep it like this"),
    button([icon("plus"), "More"], () => engine.react("more"), "sm", "More intense"),
    button([icon("stop"), "Stop"], () => engine.react("stop"), "sm", "Stop the scene (not a pause)"),
  );
  const handBox = h("div", {});
  const cueBox = h("div", {});
  bodies.play.append(
    connectHint,
    modeBox,
    group("Now", zoneList, reactions, h("p", { class: "tm-hint" }, "Reactions change things right away; in Story mode the next plan hears about them too.")),
    cueBox,
    handBox,
  );

  function renderMode() {
    const s = deps.settings();
    const { chatId, characterId } = deps.activeChat();
    if (!chatId) {
      modeBox.replaceChildren(group("This chat", h("p", { class: "tm-hint" }, "Open a chat to choose how it drives your toys.")));
      return;
    }
    const own = s.chatModes[chatId];
    const effective = modeFor(s, chatId, characterId);
    const setChat = (mode: Mode) => deps.update((x) => withChatMode(x, chatId, characterId, mode));
    const setDefault = (on: boolean) =>
      deps.update((x) => {
        if (!characterId) return x;
        const characterModes = { ...x.characterModes };
        if (on && effective !== "off") characterModes[characterId] = effective;
        else delete characterModes[characterId];
        return { ...x, characterModes };
      });
    const conn = deps.connections()?.find((c) => c.id === s.story.connectionId);
    modeBox.replaceChildren(
      group(
        "This chat",
        segmented(effective, [["off", "Off"], ["reactive", "Reactive"], ["story", "Story"]], setChat, "Mode for this chat", "big"),
        h("p", { class: "tm-hint" }, MODE_HINT[effective], own === undefined && effective !== "off" ? " (this character's default)" : ""),
        effective === "story"
          ? h(
              "div",
              { class: "tm-row" },
              h("span", { class: "tm-hint tm-grow" }, `Planner: ${conn ? `${conn.name} · ${conn.model}` : "your active connection"}`),
              button("Change", () => setTab("settings"), "ghost sm"),
            )
          : effective === "reactive"
            ? h(
                "div",
                { class: "tm-row" },
                h("span", { class: "tm-hint tm-grow" }, `${s.rules.filter((r) => r.enabled).length} active rule${s.rules.filter((r) => r.enabled).length === 1 ? "" : "s"}`),
                button("Edit rules", () => setTab("rules"), "ghost sm"),
              )
            : null,
        characterId && effective !== "off"
          ? field("Use for every chat with this character", toggle(s.characterModes[characterId] === effective, setDefault, "Use this mode for every chat with this character"))
          : null,
      ),
    );
  }

  let zoneSig = "";
  const zoneRefs = new Map<string, { root: HTMLElement; fill: HTMLElement; mark: HTMLElement; level: HTMLElement; sub: HTMLElement; lock: HTMLButtonElement }>();
  function renderZones() {
    const views = engine.view().scenes;
    const sig = views.map((v) => v.zone).join("|");
    if (sig !== zoneSig) {
      zoneSig = sig;
      zoneRefs.clear();
      zoneList.replaceChildren(
        ...views.map((v) => {
          const fill = h("i", {});
          const mark = h("b", {});
          const level = h("span", { class: "tm-zone-level" });
          const sub = h("small", {});
          const lock = button(icon("unlock"), () => engine.setLocked(v.zone, !engine.isLocked(v.zone)), "ghost icon-only tm-lock", "Lock: rules and planner leave this zone alone");
          const el = h("div", { class: "tm-zone" }, h("div", { class: "tm-zone-name" }, v.zone, sub), h("div", { class: "tm-row" }, level, lock), h("div", { class: "tm-bar" }, fill, mark));
          zoneRefs.set(v.zone, { root: el, fill, mark, level, sub, lock });
          return el;
        }),
      );
    }
    for (const v of views) {
      const r = zoneRefs.get(v.zone);
      if (!r) continue;
      const idle = v.level === 0 && v.target === 0 && !v.accent;
      r.root.dataset.idle = String(idle);
      r.fill.style.width = `${v.level}%`;
      r.mark.style.left = `calc(${v.target}% - 1px)`;
      r.mark.hidden = idle;
      r.level.textContent = String(v.level);
      r.sub.textContent = idle ? "idle" : v.accent ? v.accent : `${v.feel} · ${v.tempo}`;
      r.lock.setAttribute("aria-pressed", String(v.locked));
      r.lock.replaceChildren(icon(v.locked ? "lock" : "unlock"));
    }
  }

  const draft: { zone: string; level: number; feel: Feel; tempo: Tempo; ramp: boolean; to: number; overSec: number; spread: number; forSec: number } = {
    zone: ALL_ZONES,
    level: 30,
    feel: "wave",
    tempo: "medium",
    ramp: false,
    to: 60,
    overSec: 20,
    spread: 0,
    forSec: 0,
  };
  function renderHand() {
    const s = deps.settings();
    if (draft.zone !== ALL_ZONES && !s.zones.includes(draft.zone)) draft.zone = ALL_ZONES;
    const send = (intent: Intent) => engine.apply(intent, "manual");
    const play = () =>
      send({
        kind: "scene",
        zone: draft.zone,
        level: draft.level,
        feel: draft.feel,
        tempo: draft.tempo,
        spread: draft.spread,
        ...(draft.ramp ? { to: draft.to, overSec: draft.overSec } : {}),
        ...(draft.forSec > 0 ? { forSec: draft.forSec } : {}),
      });
    handBox.replaceChildren(
      group(
        "Play by hand",
        s.zones.length > 1 ? field("Zone", select(draft.zone, [[ALL_ZONES, "All zones"] as const, ...s.zones.map((z) => [z, z] as const)], (z) => ((draft.zone = z), renderHand()), "Zone")) : null,
        chips(draft.feel, FEELS, (f) => ((draft.feel = f), renderHand()), "Feel"),
        segmented(draft.tempo, TEMPOS.map((t) => [t, t] as const), (t) => ((draft.tempo = t), renderHand()), "Tempo"),
        segmented(draft.ramp ? "ramp" : "set", [["set", "Fixed level"], ["ramp", "Ramp"]], (v) => ((draft.ramp = v === "ramp"), renderHand()), "Fixed level or ramp"),
        field(draft.ramp ? "From" : "Level", range(draft.level, 0, 100, 1, (v) => (draft.level = v), draft.ramp ? "Ramp from" : "Level")),
        draft.ramp ? field("To", range(draft.to, 0, 100, 1, (v) => (draft.to = v), "Ramp to")) : null,
        draft.ramp ? field("Over", number(draft.overSec, 1, 600, (v) => (draft.overSec = v), "Ramp length in seconds"), "Seconds") : null,
        field("Variation", range(draft.spread, 0, 50, 1, (v) => (draft.spread = v), "Variation", (v) => (v ? `±${v}` : "none")), "Random wander around the level", true),
        field("Lasts", number(draft.forSec, 0, 600, (v) => (draft.forSec = v), "Lasts seconds"), "Seconds, then back to before · 0 = until changed"),
        h(
          "div",
          { class: "tm-row" },
          button([icon("play"), "Play"], play, "primary tm-grow"),
          button([icon("stop"), "Stop"], () => send({ kind: "stop", zone: draft.zone }), "", "Stop this zone (not a pause)"),
        ),
        h(
          "div",
          { class: "tm-row" },
          h("span", { class: "tm-hint tm-grow" }, "Add a moment:"),
          ...ACCENTS.map((a) => button(a, () => send({ kind: "accent", zone: draft.zone, accent: a }), "sm", `Brief ${a} on top of what is playing`)),
        ),
        h("p", { class: "tm-hint" }, `Capped at level ${s.limits.maxLevel} and each toy's ceiling. Fades after ${Math.round(s.limits.holdTimeoutSec)} s without activity.`),
      ),
    );
  }

  // Built when the plan changes; the timer only rewrites status, so resume buttons stay put.
  let cueRefs: { li: HTMLElement; state: HTMLElement; atMs: number | null }[] = [];
  function renderCues() {
    const p = triggers.plan;
    const { chatId, characterId } = deps.activeChat();
    const story = chatId !== null && modeFor(deps.settings(), chatId, characterId) === "story";
    cueRefs = [];
    if (p.state === "idle" && !p.detail && !story) {
      cueBox.replaceChildren();
      return;
    }
    const items = p.cues.map((c, i) => {
      const state = h("span", { class: "tm-cue-state" });
      const li = h("li", { class: "tm-cue" }, button(icon("play"), () => triggers.resumeFrom(i), "ghost icon-only", "Play from this cue"), h("b", {}, c.label), state, h("q", {}, c.sentence));
      cueRefs.push({ li, state, atMs: c.atMs });
      return li;
    });
    const planLast = button(
      triggers.hasLastPlan() ? "Re-plan" : "Plan last reply",
      () => triggers.requestLastPlan(),
      "sm",
      "Ask the planner for cues for the chat's last character reply",
    );
    planLast.disabled = p.state === "planning" || chatId === null;
    const heading = h("div", { class: "tm-row" }, h("span", { class: "tm-hint tm-grow" }, p.detail || "No cues yet. Cues arrive after the next reply, or plan the last one now."), planLast);
    if (p.state === "failed") heading.firstElementChild!.className = "tm-alert tm-grow";
    cueBox.replaceChildren(
      group(
        "Story cues",
        heading,
        items.length ? h("ol", { class: "tm-cues" }, ...items) : null,
        items.length ? h("p", { class: "tm-hint" }, "Press ▶ on a cue to play the reply again from there. It also ends a pause.") : null,
      ),
    );
    updateCues();
  }

  function updateCues() {
    const now = Date.now();
    const v = engine.view();
    const scheduled = v.pendingCues > 0;
    let current = -1;
    cueRefs.forEach((c, i) => c.atMs !== null && c.atMs <= now && (current = i));
    if (!v.active || v.paused) current = -1;
    cueRefs.forEach((c, i) => {
      const state =
        c.atMs === null ? "skipped" : i === current ? "current" : c.atMs <= now ? "played" : scheduled ? "upcoming" : "stopped";
      c.li.dataset.state = state;
      c.state.textContent =
        state === "upcoming" ? `in ${Math.ceil((c.atMs! - now) / 1000)} s` : state === "current" ? "now" : state;
    });
  }

  // ── devices tab ────────────────────────────────────────────────────────
  const openCalibration = new Set<string>();
  let deviceSig = "";
  const valueRefs = new Map<string, { fill: HTMLElement; output: OutputInfo }>();
  function renderDevices(force = false) {
    const v = engine.view();
    const s = deps.settings();
    const sig = JSON.stringify([v.devices.map((d) => [d.name, d.battery, d.outputs.map((o) => o.key)]), s.zones, s.outputs, v.connection, [...openCalibration]]);
    if (sig === deviceSig && !force) {
      for (const { fill, output } of valueRefs.values()) {
        const value = v.values[output.key] ?? 0;
        const [min, max] = output.range;
        fill.style.width = `${Math.round((Math.abs(value) / Math.max(Math.abs(min), Math.abs(max), 1)) * 100)}%`;
      }
      return;
    }
    deviceSig = sig;
    valueRefs.clear();
    const setPrefs = (key: string, patch: Partial<typeof DEFAULT_OUTPUT_PREFS>) =>
      deps.update((x) => ({ ...x, outputs: { ...x.outputs, [key]: { ...prefsFor(x, key), ...patch } } }));

    const outputRow = (d: DeviceInfo, o: OutputInfo) => {
      const kind = KIND[o.kind];
      const sameKind = d.outputs.filter((x) => x.kind === o.kind).length > 1;
      const label = `${kind.label}${sameKind ? ` ${o.featureIndex + 1}` : ""}`;
      if (UNDRIVEN.has(o.kind))
        return h("div", { class: "tm-output" }, h("div", { class: "tm-output-head" }, h("span", { class: "tm-kind" }, icon(kind.icon), label), h("span", { class: "tm-hint" }, "not used by Toymate")));
      const p = prefsFor(s, o.key);
      const fill = h("i", {});
      valueRefs.set(o.key, { fill, output: o });
      const isOpen = openCalibration.has(o.key);
      const toggleOpen = () => {
        if (isOpen) openCalibration.delete(o.key);
        else openCalibration.add(o.key);
        renderDevices(true);
      };
      const disclose = button([icon("chevron"), "Calibrate"], toggleOpen, "ghost sm tm-disclose");
      disclose.setAttribute("aria-expanded", String(isOpen));
      return h(
        "div",
        { class: "tm-output" },
        h(
          "div",
          { class: "tm-output-head" },
          h("span", { class: "tm-kind" }, icon(kind.icon), label),
          h("span", { class: "tm-mini" }, fill),
          s.zones.length > 1 ? select(p.zone, s.zones, (zone) => setPrefs(o.key, { zone }), `Zone for ${label}`) : null,
        ),
        h("div", { class: "tm-row" }, s.outputs[o.key] ? h("span", { class: "tm-hint tm-grow" }, `Feels ${p.floor}–${p.ceiling}%`) : h("span", { class: "tm-grow" }, h("span", { class: "tm-badge" }, "Not calibrated")), disclose),
        isOpen
          ? h(
              "div",
              { class: "tm-calibrate" },
              field("Floor", range(p.floor, 0, 100, 1, (floor) => setPrefs(o.key, { floor, ceiling: Math.max(floor, p.ceiling) }), "Floor", pct), "Lowest you can feel", true),
              field("Ceiling", range(p.ceiling, 0, 100, 1, (ceiling) => setPrefs(o.key, { ceiling, floor: Math.min(p.floor, ceiling) }), "Ceiling", pct), "Strongest you want", true),
              h(
                "div",
                { class: "tm-row" },
                h("span", { class: "tm-hint tm-grow" }, "Try it for 2 s:"),
                button("Floor", () => engine.test(o.key, 1), "sm"),
                button("Middle", () => engine.test(o.key, 50), "sm"),
                button("Ceiling", () => engine.test(o.key, 100), "sm"),
              ),
            )
          : null,
      );
    };

    const empty = (title: string, body: string, action: HTMLElement) =>
      h("div", { class: "tm-empty" }, icon("plug"), h("div", {}, h("b", {}, title), h("p", { class: "tm-hint" }, body)), action);

    bodies.devices.replaceChildren(
      ...present(
      v.connection !== "connected"
        ? empty("Not connected", "Start the server in Intiface Central, then connect.", button("Connect", () => void engine.connect(), "primary"))
        : v.devices.length === 0
          ? empty("No toys yet", "Turn your toy on and pair it in Intiface Central, or scan from here.", button([icon("scan"), "Scan"], () => void engine.toggleScan(), "primary"))
          : null,
      ),
      ...v.devices.map((d) =>
        h(
          "div",
          { class: "tm-device" },
          h("div", { class: "tm-device-head" }, d.name, d.battery === null ? null : h("small", {}, icon("battery"), `${d.battery}%`)),
          ...d.outputs.map((o) => outputRow(d, o)),
        ),
      ),
      zonesGroup(s),
    );
  }

  function zonesGroup(s: Settings) {
    const setZones = (zones: string[]) => deps.update((x) => ({ ...x, zones }));
    const add = text("", (z) => z.trim() && setZones([...s.zones, z]), "New zone", "+ add zone");
    return group(
      "Zones",
      h(
        "div",
        { class: "tm-zone-chips" },
        ...s.zones.map((z) =>
          h("span", { class: "tm-zone-chip" }, z, s.zones.length > 1 ? button("×", () => setZones(s.zones.filter((x) => x !== z)), "", `Remove zone ${z}`) : null),
        ),
        add,
      ),
      h("p", { class: "tm-hint" }, "Group outputs by where you wear them, like clit, internal, or stroker. Rules and the planner use zones, never toy names."),
    );
  }

  // ── rules tab ──────────────────────────────────────────────────────────
  function renderRules() {
    const s = deps.settings();
    const { chatId, characterId } = deps.activeChat();
    const setRules = (rules: Rule[]) => deps.update((x) => ({ ...x, rules }));
    const patch = (i: number, r: Partial<Rule>) => setRules(s.rules.map((x, j) => (j === i ? { ...x, ...r } : x)));
    const newRule = (over: Partial<Rule> = {}): Rule => ({
      id: crypto.randomUUID(),
      enabled: true,
      when: "character_message",
      match: "",
      characterId: null,
      then: { kind: "scene", zone: ALL_ZONES, level: 30, feel: "wave", tempo: "medium" },
      ...over,
    });
    const zoneOpts = [[ALL_ZONES, "all zones"] as const, ...s.zones.map((z) => [z, z] as const)];

    const thenRow = (rule: Rule, i: number) => {
      const t = rule.then;
      const setThen = (then: Intent) => patch(i, { then });
      const kind = select(
        t.kind,
        [["scene", "play"], ["accent", "accent"], ["stop", "stop"]] as const,
        (k) =>
          setThen(
            k === "scene"
              ? { kind: "scene", zone: t.zone, level: 40, feel: "wave", tempo: "medium" }
              : k === "accent"
                ? { kind: "accent", zone: t.zone, accent: "spike" }
                : { kind: "stop", zone: t.zone },
          ),
        "Action",
      );
      const zone = select(t.zone, zoneOpts, (z) => setThen({ ...t, zone: z }), "Zone");
      const what =
        t.kind === "scene"
          ? [select(t.feel ?? "steady", FEELS, (feel) => setThen({ ...t, feel }), "Feel"), select(t.tempo ?? "medium", TEMPOS, (tempo) => setThen({ ...t, tempo }), "Tempo")]
          : t.kind === "accent"
            ? [select(t.accent, ACCENTS, (accent) => setThen({ ...t, accent }), "Accent")]
            : [];
      const dynamic =
        t.kind === "scene"
          ? h(
              "div",
              { class: "tm-dyn" },
              h("span", { class: "tm-word" }, "ramp to"),
              optNumber(t.to, 0, 100, (to) => setThen(withField(t, "to", to)), "Ramp to level"),
              h("span", { class: "tm-word" }, "over s"),
              optNumber(t.overSec, 1, 600, (overSec) => setThen(withField(t, "overSec", overSec)), "Ramp seconds"),
              h("span", { class: "tm-word" }, "±"),
              optNumber(t.spread, 0, 50, (spread) => setThen(withField(t, "spread", spread || undefined)), "Variation"),
              h("span", { class: "tm-word" }, "for s"),
              optNumber(t.forSec, 1, 600, (forSec) => setThen(withField(t, "forSec", forSec)), "Lasts seconds"),
            )
          : null;
      return [
        h("div", { class: "tm-then" }, h("span", { class: "tm-word" }, "then"), kind, ...what),
        h(
          "div",
          { class: "tm-then tm-then-where" },
          ...(t.kind === "scene" ? [h("span", { class: "tm-word" }, "at"), number(t.level ?? 0, 0, 100, (level) => setThen({ ...t, level }), "Level")] : [h("span", {}), h("span", {})]),
          h("span", { class: "tm-word" }, "on"),
          zone,
        ),
        dynamic,
      ];
    };

    const mode = modeFor(s, chatId, characterId);
    bodies.rules.replaceChildren(
      ...present(chatId && mode !== "reactive"
        ? h(
            "div",
            { class: "tm-empty" },
            h("p", { class: "tm-hint" }, `Rules only run in chats set to Reactive. This chat is ${mode === "story" ? "in Story mode" : "Off"}.`),
            button("Use Reactive here", () => deps.update((x) => withChatMode(x, chatId, characterId, "reactive")), "sm"),
          )
        : null),
      group(
        "Rules",
        ...(s.rules.length
          ? s.rules.map((rule, i) =>
              h(
                "div",
                { class: "tm-rule", "data-off": String(!rule.enabled) },
                h(
                  "div",
                  { class: "tm-row tm-nowrap" },
                  toggle(rule.enabled, (enabled) => patch(i, { enabled }), "Rule on or off"),
                  h("span", { class: "tm-word" }, "When"),
                  select(rule.when, RULE_TRIGGERS.map((w) => [w, TRIGGER_LABELS[w]] as const), (when) => patch(i, { when }), "When"),
                  button(icon("trash"), () => setRules(s.rules.filter((_, j) => j !== i)), "ghost icon-only danger-text", "Delete rule"),
                ),
                h("div", { class: "tm-row" }, h("span", { class: "tm-word" }, "with"), text(rule.match, (match) => patch(i, { match }), "Match", "any text · or: kiss, touch · or /moan(s|ed)?/i")),
                ...thenRow(rule, i).filter((x) => x !== null),
              ),
            )
          : [h("p", { class: "tm-hint" }, "No rules yet. A rule like “when a reply mentions kiss, play a slow wave at 40” is a good start.")]),
        h(
          "div",
          { class: "tm-row" },
          button([icon("plus"), "Add rule"], () => setRules([...s.rules, newRule()]), "sm"),
          s.rules.length ? null : button("Add the example", () => setRules([newRule({ match: "kiss, touch, caress", then: { kind: "scene", zone: ALL_ZONES, level: 40, feel: "wave", tempo: "slow" } })]), "ghost sm"),
        ),
      ),
      group("While replies stream", field("Stream pulse", toggle(s.streamPulse, (streamPulse) => deps.update((x) => ({ ...x, streamPulse })), "Stream pulse"), "Pulse along with the text as it is written")),
    );
  }

  // ── settings tab ───────────────────────────────────────────────────────
  function renderSettings() {
    const s = deps.settings();
    const L = s.limits;
    const setL = (p: Partial<Settings["limits"]>) => deps.update((x) => ({ ...x, limits: { ...x.limits, ...p } }));
    const setStory = (p: Partial<Settings["story"]>) => deps.update((x) => ({ ...x, story: { ...x.story, ...p } }));
    const conns = deps.connections();
    const connOpts: (readonly [string, string])[] = [["", "Active connection"], ...(conns ?? []).map((c) => [c.id, `${c.name} · ${c.model}`] as const)];
    if (s.story.connectionId && !connOpts.some(([id]) => id === s.story.connectionId)) connOpts.push([s.story.connectionId, "Saved connection (missing)"]);

    bodies.settings.replaceChildren(
      group(
        "Safety",
        field("Max level", range(L.maxLevel, 0, 100, 1, (maxLevel) => setL({ maxLevel }), "Max level"), "Nothing goes above this", true),
        field("Ramp speed", range(L.rampPerSecond, 5, 200, 5, (rampPerSecond) => setL({ rampPerSecond }), "Ramp", (v) => `${v}/s`), "How fast intensity may rise", true),
        field("Fade after", number(L.holdTimeoutSec, 10, 3600, (holdTimeoutSec) => setL({ holdTimeoutSec }), "Fade after seconds"), "Seconds without new activity"),
        field("Stop when I stop a reply", toggle(L.stopOnGenerationStop, (stopOnGenerationStop) => setL({ stopOnGenerationStop }), "Stop when I stop a reply")),
      ),
      group(
        "Safewords",
        field("Stop everything", text(s.safewords.stop, (stop) => deps.update((x) => ({ ...x, safewords: { ...x.safewords, stop } })), "Stop safeword")),
        field("Slow down", text(s.safewords.ease, (ease) => deps.update((x) => ({ ...x, safewords: { ...x.safewords, ease } })), "Slow-down safeword")),
        h("p", { class: "tm-hint" }, `Send one as the whole message or out of character, like “(${s.safewords.stop})” or “OOC: ${s.safewords.stop}”. Stop pauses Toymate and turns Story mode off for the chat.`),
      ),
      group(
        "Story planner",
        field("Connection", select(s.story.connectionId ?? "", connOpts, (id) => setStory({ connectionId: id || null }), "Planner connection"), undefined, true),
        conns === null ? button("Load connections", () => deps.requestConnections(), "ghost sm") : null,
        h("p", { class: "tm-hint" }, "Each reply is sent to this connection. Use the provider you already roleplay with, or a local model. A small, fast, non-thinking model works best."),
        field("Reading speed", number(s.story.readingCps, 3, 100, (readingCps) => setStory({ readingCps }), "Reading speed"), "Characters per second"),
        field("Shortest playback", number(s.story.minReplySec, 0, 1800, (minReplySec) => setStory({ minReplySec }), "Shortest playback seconds"), "Seconds; short replies stretch to this"),
        field("Longest playback", number(s.story.maxReplySec, 5, 3600, (maxReplySec) => setStory({ maxReplySec }), "Longest playback seconds"), "Seconds; long replies compress to this"),
        field(
          "When the cues run out",
          segmented(s.story.afterReply, [["hold", "Keep going"], ["fade", "Fade out"]], (afterReply) => setStory({ afterReply }), "When the cues run out"),
          undefined,
          true,
        ),
        h("p", { class: "tm-hint" }, `A reply plays for its reading time at ${s.story.readingCps} chars/s, but never less than ${s.story.minReplySec} s or more than ${s.story.maxReplySec} s.`),
        field("Character awareness", toggle(s.story.awareness, (awareness) => setStory({ awareness }), "Character awareness"), "Tell the roleplay model about your toys"),
      ),
      group(
        "Strokers",
        field("Max speed", range(L.strokeMaxSpeed, 0.1, 5, 0.1, (strokeMaxSpeed) => setL({ strokeMaxSpeed }), "Max stroke speed", (v) => `${v}/s`), "Full strokes per second", true),
        field("Lowest point", range(L.strokeMin, 0, 100, 1, (strokeMin) => setL({ strokeMin, strokeMax: Math.max(strokeMin, L.strokeMax) }), "Stroke range min", pct), undefined, true),
        field("Highest point", range(L.strokeMax, 0, 100, 1, (strokeMax) => setL({ strokeMax, strokeMin: Math.min(L.strokeMin, strokeMax) }), "Stroke range max", pct), undefined, true),
      ),
      group(
        "Other toys",
        field("Air pump max hold", number(L.constrictMaxHoldSec, 2, 600, (constrictMaxHoldSec) => setL({ constrictMaxHoldSec }), "Air pump max hold"), "Seconds before it releases"),
        field("Warmth cap", range(L.temperatureMax, 0, 100, 1, (temperatureMax) => setL({ temperatureMax }), "Warmth cap", pct), undefined, true),
        field("Direction change gap", number(L.rotateSwapMinMs, 200, 60000, (rotateSwapMinMs) => setL({ rotateSwapMinMs }), "Rotation direction change gap"), "Milliseconds between reversals"),
      ),
      group(
        "Connection",
        field("Intiface address", text(s.intifaceUrl, (intifaceUrl) => deps.update((x) => ({ ...x, intifaceUrl: intifaceUrl.trim() })), "Intiface address", "ws://127.0.0.1:12345"), undefined, true),
        field("Connect automatically", toggle(s.autoConnect, (autoConnect) => deps.update((x) => ({ ...x, autoConnect })), "Connect automatically"), "When Lumiverse opens"),
      ),
    );
  }

  // ── wiring ─────────────────────────────────────────────────────────────
  const settingsChanged = () => {
    renderMode();
    renderCues();
    renderHand();
    renderDevices(true);
    renderRules();
    renderSettings();
    renderHeader();
  };

  setTab(tab);
  settingsChanged();
  renderZones();
  renderCues();

  const unsubEngine = engine.subscribe(() => {
    renderHeader();
    renderZones();
    renderDevices();
  });
  const unsubPlan = triggers.onPlanChange(renderCues);
  const cueTimer = setInterval(updateCues, 1000);

  return {
    settingsChanged,
    chatChanged() {
      renderMode();
      renderRules();
      renderCues();
    },
    dispose() {
      unsubEngine();
      unsubPlan();
      clearInterval(cueTimer);
      root.replaceChildren();
    },
  };
}

