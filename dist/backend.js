// @bun
// src/shared/intent.ts
var FEELS = ["steady", "pulse", "wave", "tease", "build", "throb", "random"];
var TEMPOS = ["slow", "medium", "fast"];
var ACCENTS = ["spike", "pause", "flutter"];
var ALL_ZONES = "all";
var isFeel = (value) => FEELS.includes(value);
var isTempo = (value) => TEMPOS.includes(value);
var isAccent = (value) => ACCENTS.includes(value);
function clampLevel(value, max = 100) {
  if (!Number.isFinite(value))
    return 0;
  return Math.max(0, Math.min(max, Math.round(value)));
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function parseIntent(raw, zones, maxLevel = 100) {
  if (!isRecord(raw))
    return null;
  const zone = typeof raw.zone === "string" && zones.includes(raw.zone) ? raw.zone : ALL_ZONES;
  const action = raw.kind ?? raw.action;
  if (action === "stop")
    return { kind: "stop", zone };
  if (action === "accent")
    return isAccent(raw.accent) ? { kind: "accent", zone, accent: raw.accent } : null;
  if (action !== "scene" && action !== "set")
    return null;
  const intent = { kind: "scene", zone };
  if (typeof raw.level === "number" && Number.isFinite(raw.level))
    intent.level = clampLevel(raw.level, maxLevel);
  if (typeof raw.delta === "number" && Number.isFinite(raw.delta))
    intent.delta = Math.max(-100, Math.min(100, Math.round(raw.delta)));
  if (isFeel(raw.feel))
    intent.feel = raw.feel;
  if (isTempo(raw.tempo))
    intent.tempo = raw.tempo;
  if (intent.level === undefined && intent.delta === undefined && !intent.feel && !intent.tempo)
    return null;
  return intent;
}

// src/shared/settings.ts
var MODES = ["off", "reactive", "story"];
var isMode = (value) => MODES.includes(value);
var RULE_TRIGGERS = ["character_message", "user_message", "streaming"];
var DEFAULT_ZONE = "main";
var DEFAULT_SETTINGS = {
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
    rotateSwapMinMs: 1500
  },
  zones: [DEFAULT_ZONE],
  outputs: {},
  rules: [],
  streamPulse: false,
  safewords: { stop: "red", ease: "yellow" },
  story: { connectionId: null, readingCps: 15, awareness: false },
  chatModes: {},
  characterModes: {}
};
var DEFAULT_OUTPUT_PREFS = { zone: DEFAULT_ZONE, floor: 0, ceiling: 70 };
function num(value, fallback, min, max) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}
var bool = (value, fallback) => typeof value === "boolean" ? value : fallback;
function str(value, fallback, maxLength = 200) {
  return typeof value === "string" ? value.slice(0, maxLength) : fallback;
}
function zoneLabel(value) {
  if (typeof value !== "string")
    return null;
  const label = value.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 32);
  return label && label !== "all" ? label : null;
}
function parseLimits(raw) {
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
    rotateSwapMinMs: num(r.rotateSwapMinMs, d.rotateSwapMinMs, 200, 60000)
  };
}
function parseRule(raw, zones) {
  if (!isRecord(raw))
    return null;
  const then = parseIntent(raw.then, zones);
  const when = RULE_TRIGGERS.find((t) => t === raw.when);
  if (!then || !when)
    return null;
  return {
    id: str(raw.id, crypto.randomUUID(), 64),
    enabled: bool(raw.enabled, true),
    when,
    match: str(raw.match, "", 500),
    characterId: typeof raw.characterId === "string" ? raw.characterId : null,
    then
  };
}
function parseModes(raw, keepOff) {
  const out = {};
  if (!isRecord(raw))
    return out;
  for (const [id, mode] of Object.entries(raw))
    if (isMode(mode) && (keepOff || mode !== "off"))
      out[id] = mode;
  return out;
}
function parseSettings(raw) {
  const r = isRecord(raw) ? raw : {};
  const d = DEFAULT_SETTINGS;
  const zones = [...new Set((Array.isArray(r.zones) ? r.zones : d.zones).map(zoneLabel).filter((z) => z !== null))];
  if (zones.length === 0)
    zones.push(DEFAULT_ZONE);
  const outputs = {};
  if (isRecord(r.outputs)) {
    for (const [key, value] of Object.entries(r.outputs)) {
      if (!isRecord(value))
        continue;
      const floor = num(value.floor, DEFAULT_OUTPUT_PREFS.floor, 0, 100);
      const zone = zoneLabel(value.zone);
      outputs[key.slice(0, 200)] = {
        zone: zone && zones.includes(zone) ? zone : zones[0],
        floor,
        ceiling: num(value.ceiling, DEFAULT_OUTPUT_PREFS.ceiling, floor, 100)
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
      ease: str(safewords.ease, d.safewords.ease, 40).trim().toLowerCase()
    },
    story: {
      connectionId: typeof story.connectionId === "string" && story.connectionId ? story.connectionId : null,
      readingCps: num(story.readingCps, d.story.readingCps, 3, 100),
      awareness: bool(story.awareness, d.story.awareness)
    },
    chatModes: parseModes(r.chatModes, true),
    characterModes: parseModes(r.characterModes, false)
  };
}
function modeFor(settings, chatId, characterId) {
  return (chatId ? settings.chatModes[chatId] : undefined) ?? (characterId ? settings.characterModes[characterId] : undefined) ?? "off";
}

// src/backend/awareness.ts
function withAwareness(messages, ctx, settings, status) {
  if (!settings.story.awareness || modeFor(settings, ctx.chatId, ctx.characterId) !== "story")
    return messages;
  const zones = settings.zones.join(", ");
  const note = {
    role: "system",
    content: `[Toymate] The user is wearing haptic devices (zones: ${zones}) that follow the physical intensity of your writing as they read. ` + `You may shape what they feel through what happens in the story. ${status ?? ""} ` + "Never mention devices out of character and never write markup or commands for them."
  };
  const last = messages.at(-1);
  const index = last?.role === "assistant" ? messages.length - 1 : messages.length;
  const out = [...messages.slice(0, index), note, ...messages.slice(index)];
  return { messages: out, breakdown: [{ messageIndex: index, name: "Toymate" }] };
}

// src/shared/plan.ts
var MAX_CUES = 24;
function splitSentences(text) {
  const sentences = [];
  const re = /[^.!?\u2026\n]+(?:[.!?\u2026]+["'\u201D\u2019)\]*_]*|\n+|$)/g;
  for (const m of text.matchAll(re)) {
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const body = raw.trim();
    if (!/[\p{L}\p{N}]/u.test(body))
      continue;
    sentences.push({ index: sentences.length + 1, start: (m.index ?? 0) + lead, text: body });
  }
  return sentences;
}
var PLAN_TOOL_NAME = "plan_cues";
function planTool(zones) {
  return {
    name: PLAN_TOOL_NAME,
    description: "Schedule haptic cues that follow the reply. Each cue changes the scene when the reader reaches its sentence. Use few cues: only where the physical intensity of the scene changes.",
    parameters: {
      type: "object",
      properties: {
        cues: {
          type: "array",
          maxItems: MAX_CUES,
          items: {
            type: "object",
            properties: {
              sentence: { type: "integer", minimum: 1, description: "Sentence number where the cue starts." },
              action: { type: "string", enum: ["set", "accent", "stop"] },
              zone: { type: "string", enum: ["all", ...zones] },
              level: { type: "integer", minimum: 0, maximum: 100, description: "For set: strength 0-100." },
              feel: { type: "string", enum: [...FEELS], description: "For set: texture." },
              tempo: { type: "string", enum: [...TEMPOS], description: "For set: speed of the texture." },
              accent: { type: "string", enum: [...ACCENTS], description: "For accent: brief overlay." }
            },
            required: ["sentence", "action"]
          }
        }
      },
      required: ["cues"]
    }
  };
}
function parsePlan(args, opts) {
  const list = Array.isArray(args) ? args : isRecord(args) && Array.isArray(args.cues) ? args.cues : null;
  if (!list)
    return null;
  const cues = [];
  for (const raw of list.slice(0, MAX_CUES)) {
    if (!isRecord(raw))
      continue;
    const sentence = typeof raw.sentence === "number" ? Math.round(raw.sentence) : NaN;
    if (!(sentence >= 1 && sentence <= opts.sentenceCount))
      continue;
    const intent = parseIntent(raw, opts.zones, opts.maxLevel);
    if (intent)
      cues.push({ sentence, intent });
  }
  return cues.sort((a, b) => a.sentence - b.sentence);
}

// src/backend/planner.ts
var JSON_ANSWER = 'Answer with only JSON, no prose: {"cues":[{"sentence":1,"action":"set","zone":"all","level":30,"feel":"wave","tempo":"slow"}]}. ' + 'action is "set", "accent" (with "accent") or "stop". Omit fields you do not change.';
function buildPlannerMessages(req, settings, withTools = true) {
  const sentences = splitSentences(req.content);
  const zones = settings.zones.join(", ");
  const system = [
    "You choreograph haptic devices worn by the user while they read an interactive story.",
    `Read the numbered reply and ${withTools ? `call ${PLAN_TOOL_NAME} once with` : "list"} cues for the moments where what the user's character physically feels changes.`,
    "Each cue takes effect when the reader reaches its sentence and lasts until the next cue.",
    `Zones: ${zones} (or "all"). Levels are 0-100; never exceed ${settings.limits.maxLevel}.`,
    "Feels: steady, pulse, wave, tease (on/off with pauses), build (rises over time), throb (slow deep pulses), random. Tempos: slow, medium, fast.",
    "Accents are brief overlays: spike (surge), pause (brief stop), flutter (fast flicker). Use stop when contact ends.",
    "Follow the story: calm or non-physical passages get low levels or a stop; escalate only when the prose does. Usually 0 to 6 cues. An empty list is fine.",
    `Respect what the user asked for in the state line. ${withTools ? "Do not write prose; only call the tool." : JSON_ANSWER}`
  ].join(`
`);
  const user = [
    req.previousUserMessage ? `User's last message:
${req.previousUserMessage.slice(0, 2000)}
` : "",
    `State: ${req.status}
`,
    "Reply, numbered by sentence:",
    ...sentences.map((s) => `[${s.index}] ${s.text}`)
  ].join(`
`);
  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}
function jsonFromText(text) {
  const candidates = [
    [text.indexOf("{"), text.lastIndexOf("}")],
    [text.indexOf("["), text.lastIndexOf("]")]
  ].filter(([start, end]) => start >= 0 && end > start).sort((a, b) => a[0] - b[0]);
  for (const [start, end] of candidates) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {}
  }
  return null;
}
function planFromResponse(response, req, settings) {
  if (!isRecord(response))
    return null;
  const r = response;
  const call = r.tool_calls?.find((c) => c.name === PLAN_TOOL_NAME);
  const args = call ? call.args : jsonFromText(typeof r.content === "string" ? r.content : "");
  return parsePlan(args, {
    sentenceCount: splitSentences(req.content).length,
    zones: settings.zones,
    maxLevel: settings.limits.maxLevel
  });
}

class Planner {
  raw;
  quiet;
  inFlight = new Map;
  constructor(raw, quiet) {
    this.raw = raw;
    this.quiet = quiet;
  }
  async plan(req, settings, userId) {
    const controller = new AbortController;
    this.inFlight.set(req.requestId, controller);
    const call = (withTools) => {
      const input = {
        type: settings.story.connectionId ? "raw" : "quiet",
        messages: buildPlannerMessages(req, settings, withTools),
        ...withTools ? { tools: [planTool(settings.zones)] } : {},
        parameters: { temperature: 0.4, max_tokens: 800 },
        reasoning: { source: "off" },
        signal: controller.signal,
        userId,
        ...settings.story.connectionId ? { connection_id: settings.story.connectionId } : {}
      };
      return settings.story.connectionId ? this.raw(input) : this.quiet(input);
    };
    try {
      let response;
      try {
        response = await call(true);
      } catch (error) {
        if (controller.signal.aborted || !/tool/i.test(String(error)))
          throw error;
        response = await call(false);
      }
      const cues = planFromResponse(response, req, settings);
      if (!cues)
        throw new Error("The planner did not return a usable plan (it may have refused).");
      return cues;
    } finally {
      this.inFlight.delete(req.requestId);
    }
  }
  cancel(requestId) {
    this.inFlight.get(requestId)?.abort();
    this.inFlight.delete(requestId);
  }
}

// src/shared/wire.ts
var text = (v, max) => typeof v === "string" ? v.slice(0, max) : null;
function parseFrontendMessage(raw) {
  if (!isRecord(raw))
    return null;
  switch (raw.type) {
    case "hello":
    case "list_connections":
      return { type: raw.type };
    case "save_settings":
      return { type: "save_settings", settings: raw.settings };
    case "plan_cancel": {
      const requestId = text(raw.requestId, 64);
      return requestId ? { type: "plan_cancel", requestId } : null;
    }
    case "status":
      return { type: "status", chatId: text(raw.chatId, 128), status: text(raw.status, 1000) ?? "" };
    case "plan_request": {
      const requestId = text(raw.requestId, 64);
      const chatId = text(raw.chatId, 128);
      const content = text(raw.content, 40000);
      if (!requestId || !chatId || content === null)
        return null;
      return {
        type: "plan_request",
        requestId,
        chatId,
        characterId: text(raw.characterId, 128),
        content,
        previousUserMessage: text(raw.previousUserMessage, 8000) ?? "",
        status: text(raw.status, 1000) ?? ""
      };
    }
    default:
      return null;
  }
}

// src/backend.ts
var SETTINGS_PATH = "settings.json";
var settingsCache = new Map;
var statusCache = new Map;
async function loadSettings(userId) {
  const cached = settingsCache.get(userId);
  if (cached)
    return cached;
  const raw = await spindle.userStorage.getJson(SETTINGS_PATH, { fallback: null, userId }).catch(() => null);
  const settings = parseSettings(raw);
  settingsCache.set(userId, settings);
  return settings;
}
async function saveSettings(userId, raw) {
  const settings = parseSettings(raw);
  await spindle.userStorage.setJson(SETTINGS_PATH, settings, { indent: 2, userId });
  settingsCache.set(userId, settings);
  return settings;
}
var planner = new Planner((input) => spindle.generate.raw(input), (input) => spindle.generate.quiet(input));
spindle.onFrontendMessage(async (raw, userId, frontendSessionId) => {
  const reply = (message) => spindle.sendToFrontend(message, userId, frontendSessionId ? { frontendSessionId } : undefined);
  const message = parseFrontendMessage(raw);
  if (!message)
    return;
  try {
    switch (message.type) {
      case "hello":
        reply({ type: "settings", settings: await loadSettings(userId) });
        break;
      case "save_settings":
        reply({ type: "settings", settings: await saveSettings(userId, message.settings) });
        break;
      case "status":
        statusCache.set(userId, { chatId: message.chatId, status: message.status });
        break;
      case "list_connections": {
        const connections = await spindle.connections.list(userId);
        reply({ type: "connections", connections: connections.map((c) => ({ id: c.id, name: c.name, model: c.model })) });
        break;
      }
      case "plan_cancel":
        planner.cancel(message.requestId);
        break;
      case "plan_request": {
        const settings = await loadSettings(userId);
        try {
          const cues = await planner.plan(message, settings, userId);
          reply({ type: "plan_result", requestId: message.requestId, cues });
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError")
            return;
          reply({ type: "plan_error", requestId: message.requestId, error: String(error instanceof Error ? error.message : error).slice(0, 300) });
        }
        break;
      }
    }
  } catch (error) {
    spindle.log.warn(`Toymate: ${message.type} failed: ${String(error).slice(0, 200)}`);
  }
});
spindle.registerInterceptor(async (messages, ctx) => {
  const settings = await loadSettings(ctx.userId);
  const status = statusCache.get(ctx.userId);
  return withAwareness(messages, ctx, settings, status?.chatId === ctx.chatId ? status.status : null);
}, 150);
spindle.log.info("Toymate backend started");
