import { ACCENTS, FEELS, TEMPOS, isRecord, parseIntent, type Intent } from "./intent";

export interface Sentence {
  /** 1-based, as shown to the planner. */
  index: number;
  start: number;
  text: string;
}

export interface PlannedCue {
  sentence: number;
  intent: Intent;
}

export const MAX_CUES = 24;

/** Splits prose into sentences. Frontend and backend must split identically, so both use this. */
export function splitSentences(text: string): Sentence[] {
  const sentences: Sentence[] = [];
  const re = /[^.!?…\n]+(?:[.!?…]+["'”’)\]*_]*|\n+|$)/g;
  for (const m of text.matchAll(re)) {
    const raw = m[0];
    const lead = raw.length - raw.trimStart().length;
    const body = raw.trim();
    if (!/[\p{L}\p{N}]/u.test(body)) continue;
    sentences.push({ index: sentences.length + 1, start: (m.index ?? 0) + lead, text: body });
  }
  return sentences;
}

export const PLAN_TOOL_NAME = "plan_cues";

export function planTool(zones: readonly string[]) {
  return {
    name: PLAN_TOOL_NAME,
    description:
      "Schedule haptic cues that follow the reply. Each cue changes the scene when the reader reaches its sentence. Use few cues: only where the physical intensity of the scene changes.",
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
              level: { type: "integer", minimum: 0, maximum: 100, description: "For set: strength 0-100 at the start of the cue." },
              to: { type: "integer", minimum: 0, maximum: 100, description: "For set: ramp gradually from level to this strength." },
              over: { type: "number", minimum: 0.5, description: "For set with to: ramp length in seconds (default: until the next cue)." },
              spread: { type: "integer", minimum: 0, maximum: 50, description: "For set: random variation ± around the level, for unpredictability." },
              for: { type: "number", minimum: 1, description: "For set: temporary change; after this many seconds it returns to what was before." },
              feel: { type: "string", enum: [...FEELS], description: "For set: texture." },
              tempo: { type: "string", enum: [...TEMPOS], description: "For set: speed of the texture." },
              accent: { type: "string", enum: [...ACCENTS], description: "For accent: brief overlay." },
            },
            required: ["sentence", "action"],
          },
        },
      },
      required: ["cues"],
    },
  };
}

/**
 * Validates planner output. Returns null when the shape is wrong; drops
 * individual invalid cues; clamps levels to the user's maximum.
 */
export function parsePlan(args: unknown, opts: { sentenceCount: number; zones: readonly string[]; maxLevel: number }): PlannedCue[] | null {
  const list = Array.isArray(args) ? args : isRecord(args) && Array.isArray(args.cues) ? args.cues : null;
  if (!list) return null;
  const cues: PlannedCue[] = [];
  for (const raw of list.slice(0, MAX_CUES)) {
    if (!isRecord(raw)) continue;
    const sentence = typeof raw.sentence === "number" ? Math.round(raw.sentence) : NaN;
    if (!(sentence >= 1 && sentence <= opts.sentenceCount)) continue;
    const intent = parseIntent(raw, opts.zones, opts.maxLevel);
    if (intent) cues.push({ sentence, intent });
  }
  return cues.sort((a, b) => a.sentence - b.sentence);
}

export interface Pace {
  readingCps: number;
  /** Short replies stretch to at least this long. */
  minReplySec: number;
  /** Long replies compress to at most this long. */
  maxReplySec: number;
}

/** How long a reply's cues play: reading time, clamped to the user's min and max. */
export function playbackMs(textLength: number, pace: Pace): number {
  const reading = textLength / pace.readingCps;
  return Math.round(Math.min(pace.maxReplySec, Math.max(pace.minReplySec, reading)) * 1000);
}

/** Cues closer than this are spread apart, so short neighbouring sentences do not fire together. */
const MAX_CUE_GAP_MS = 3000;

/**
 * Milliseconds from the start of playback to each cue's sentence, spread over
 * the playback length, with consecutive cues at least a small gap apart.
 */
export function cueOffsetsMs(sentences: readonly Sentence[], cues: readonly PlannedCue[], textLength: number, pace: Pace): number[] {
  const total = playbackMs(textLength, pace);
  const offsets = cues.map((cue) => {
    const s = sentences[cue.sentence - 1];
    return s ? Math.round((s.start / Math.max(1, textLength)) * total) : 0;
  });
  // n cues fit in the playback window: n × gap ≤ total.
  const gap = Math.min(MAX_CUE_GAP_MS, Math.floor(total / Math.max(1, offsets.length)));
  for (let i = 1; i < offsets.length; i++) offsets[i] = Math.max(offsets[i]!, offsets[i - 1]! + gap);
  for (let i = offsets.length - 1; i >= 0; i--) {
    const limit = i === offsets.length - 1 ? total : offsets[i + 1]! - gap;
    offsets[i] = Math.max(0, Math.min(offsets[i]!, limit));
  }
  return offsets;
}

/**
 * Where in the playback window to start, given how long the user has been
 * reading. Still reading: the matching point of playback. Done reading (short
 * replies, slow planners): the start, so the whole stretched playback plays.
 */
export function playbackPositionMs(elapsedReadingMs: number, textLength: number, pace: Pace): number {
  const readingMs = (textLength / pace.readingCps) * 1000;
  if (elapsedReadingMs <= 0 || elapsedReadingMs >= readingMs) return 0;
  return Math.round((elapsedReadingMs / readingMs) * playbackMs(textLength, pace));
}
