import { isRecord, parseIntent, type Intent } from "./intent";

export const MODES = ["off", "reactive", "story"] as const;
export type Mode = (typeof MODES)[number];
const isMode = (value: unknown): value is Mode => MODES.includes(value as Mode);

export const RULE_TRIGGERS = ["character_message", "user_message", "streaming"] as const;
export type RuleTrigger = (typeof RULE_TRIGGERS)[number];

export interface Rule {
  id: string;
  enabled: boolean;
  when: RuleTrigger;
  /** Keywords separated by commas, or `/regex/flags`. Empty matches every message. */
  match: string;
  /** Character id the rule is limited to; null for any character. */
  characterId: string | null;
  then: Intent;
}

export interface OutputPrefs {
  zone: string;
  /** Lowest level of the device range the user can feel, 0–100. */
  floor: number;
  /** Strongest level of the device range the user wants, 0–100. */
  ceiling: number;
}

export interface Limits {
  maxLevel: number;
  /** Fastest rise, in levels per second. Falls are never limited. */
  rampPerSecond: number;
  holdTimeoutSec: number;
  stopOnGenerationStop: boolean;
  /** Fastest stroke, in full strokes of the allowed range per second. */
  strokeMaxSpeed: number;
  strokeMin: number;
  strokeMax: number;
  constrictMaxHoldSec: number;
  temperatureMax: number;
  rotateSwapMinMs: number;
}

export interface StorySettings {
  /** Connection profile for the planner call; null uses the active connection. */
  connectionId: string | null;
  readingCps: number;
  minReplySec: number;
  maxReplySec: number;
  /** What happens when a reply's cues run out: keep the last scene, or fade it out. */
  afterReply: "hold" | "fade";
  awareness: boolean;
}

export interface Settings {
  version: 1;
  intifaceUrl: string;
  autoConnect: boolean;
  limits: Limits;
  zones: string[];
  outputs: Record<string, OutputPrefs>;
  rules: Rule[];
  streamPulse: boolean;
  safewords: { stop: string; ease: string };
  story: StorySettings;
  chatModes: Record<string, Mode>;
  characterModes: Record<string, Mode>;
}

export const DEFAULT_ZONE = "main";

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  intifaceUrl: "ws://127.0.0.1:12345",
  autoConnect: false,
  limits: {
    maxLevel: 70,
    rampPerSecond: 60,
    holdTimeoutSec: 180,
    stopOnGenerationStop: true,
    strokeMaxSpeed: 1.5,
    strokeMin: 0,
    strokeMax: 100,
    constrictMaxHoldSec: 30,
    temperatureMax: 50,
    rotateSwapMinMs: 1500,
  },
  zones: [DEFAULT_ZONE],
  outputs: {},
  rules: [],
  streamPulse: false,
  safewords: { stop: "red", ease: "yellow" },
  story: { connectionId: null, readingCps: 15, minReplySec: 30, maxReplySec: 300, afterReply: "hold", awareness: false },
  chatModes: {},
  characterModes: {},
};

export const DEFAULT_OUTPUT_PREFS: OutputPrefs = { zone: DEFAULT_ZONE, floor: 0, ceiling: 70 };

function num(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}
const bool = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);
function str(value: unknown, fallback: string, maxLength = 200): string {
  return typeof value === "string" ? value.slice(0, maxLength) : fallback;
}
function zoneLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const label = value.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 32);
  return label && label !== "all" ? label : null;
}

function parseLimits(raw: unknown): Limits {
  const d = DEFAULT_SETTINGS.limits;
  const r = isRecord(raw) ? raw : {};
  const strokeMin = num(r.strokeMin, d.strokeMin, 0, 100);
  return {
    maxLevel: num(r.maxLevel, d.maxLevel, 0, 100),
    rampPerSecond: num(r.rampPerSecond, d.rampPerSecond, 5, 1000),
    holdTimeoutSec: num(r.holdTimeoutSec, d.holdTimeoutSec, 10, 3600),
    stopOnGenerationStop: bool(r.stopOnGenerationStop, d.stopOnGenerationStop),
    strokeMaxSpeed: num(r.strokeMaxSpeed, d.strokeMaxSpeed, 0.1, 5),
    strokeMin,
    strokeMax: num(r.strokeMax, d.strokeMax, strokeMin, 100),
    constrictMaxHoldSec: num(r.constrictMaxHoldSec, d.constrictMaxHoldSec, 2, 600),
    temperatureMax: num(r.temperatureMax, d.temperatureMax, 0, 100),
    rotateSwapMinMs: num(r.rotateSwapMinMs, d.rotateSwapMinMs, 200, 60_000),
  };
}

function parseRule(raw: unknown, zones: string[]): Rule | null {
  if (!isRecord(raw)) return null;
  const then = parseIntent(raw.then, zones);
  const when = RULE_TRIGGERS.find((t) => t === raw.when);
  if (!then || !when) return null;
  return {
    id: str(raw.id, crypto.randomUUID(), 64),
    enabled: bool(raw.enabled, true),
    when,
    match: str(raw.match, "", 500),
    characterId: typeof raw.characterId === "string" ? raw.characterId : null,
    then,
  };
}

/** Chat modes keep "off" so a chat can opt out of its character's default. */
function parseModes(raw: unknown, keepOff: boolean): Record<string, Mode> {
  const out: Record<string, Mode> = {};
  if (!isRecord(raw)) return out;
  for (const [id, mode] of Object.entries(raw)) if (isMode(mode) && (keepOff || mode !== "off")) out[id] = mode;
  return out;
}

/** Validates settings from storage or the frontend. Invalid fields fall back to defaults. */
export function parseSettings(raw: unknown): Settings {
  const r = isRecord(raw) ? raw : {};
  const d = DEFAULT_SETTINGS;

  const zones = [...new Set((Array.isArray(r.zones) ? r.zones : d.zones).map(zoneLabel).filter((z) => z !== null))];
  if (zones.length === 0) zones.push(DEFAULT_ZONE);

  const outputs: Record<string, OutputPrefs> = {};
  if (isRecord(r.outputs)) {
    for (const [key, value] of Object.entries(r.outputs)) {
      if (!isRecord(value)) continue;
      const floor = num(value.floor, DEFAULT_OUTPUT_PREFS.floor, 0, 100);
      const zone = zoneLabel(value.zone);
      outputs[key.slice(0, 200)] = {
        zone: zone && zones.includes(zone) ? zone : zones[0]!,
        floor,
        ceiling: num(value.ceiling, DEFAULT_OUTPUT_PREFS.ceiling, floor, 100),
      };
    }
  }

  const safewords = isRecord(r.safewords) ? r.safewords : {};
  const story = isRecord(r.story) ? r.story : {};

  return {
    version: 1,
    intifaceUrl: /^wss?:\/\/\S+$/.test(String(r.intifaceUrl)) ? String(r.intifaceUrl) : d.intifaceUrl,
    autoConnect: bool(r.autoConnect, d.autoConnect),
    limits: parseLimits(r.limits),
    zones,
    outputs,
    rules: (Array.isArray(r.rules) ? r.rules : []).slice(0, 100).map((x) => parseRule(x, zones)).filter((x) => x !== null),
    streamPulse: bool(r.streamPulse, d.streamPulse),
    safewords: {
      stop: str(safewords.stop, d.safewords.stop, 40).trim().toLowerCase(),
      ease: str(safewords.ease, d.safewords.ease, 40).trim().toLowerCase(),
    },
    story: {
      connectionId: typeof story.connectionId === "string" && story.connectionId ? story.connectionId : null,
      readingCps: num(story.readingCps, d.story.readingCps, 3, 100),
      minReplySec: num(story.minReplySec, d.story.minReplySec, 0, 1800),
      maxReplySec: num(story.maxReplySec, d.story.maxReplySec, Math.max(5, num(story.minReplySec, d.story.minReplySec, 0, 1800)), 3600),
      afterReply: story.afterReply === "fade" ? "fade" : "hold",
      awareness: bool(story.awareness, d.story.awareness),
    },
    chatModes: parseModes(r.chatModes, true),
    characterModes: parseModes(r.characterModes, false),
  };
}

/** A chat's own mode wins; otherwise the character's default applies. */
export function modeFor(settings: Settings, chatId: string | null, characterId: string | null): Mode {
  return (chatId ? settings.chatModes[chatId] : undefined) ?? (characterId ? settings.characterModes[characterId] : undefined) ?? "off";
}

/** Sets a chat's mode, storing nothing when it matches what the character default would give. */
export function withChatMode(settings: Settings, chatId: string, characterId: string | null, mode: Mode): Settings {
  const chatModes = { ...settings.chatModes };
  const inherited = (characterId ? settings.characterModes[characterId] : undefined) ?? "off";
  if (mode === inherited) delete chatModes[chatId];
  else chatModes[chatId] = mode;
  return { ...settings, chatModes };
}

export function prefsFor(settings: Settings, key: string): OutputPrefs {
  return settings.outputs[key] ?? { ...DEFAULT_OUTPUT_PREFS, zone: settings.zones[0] ?? DEFAULT_ZONE };
}
