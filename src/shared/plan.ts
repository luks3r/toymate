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
              level: { type: "integer", minimum: 0, maximum: 100, description: "For set: strength 0-100." },
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

/** Milliseconds from the start of reading until the reader reaches each cue's sentence. */
export function cueOffsetsMs(sentences: readonly Sentence[], cues: readonly PlannedCue[], readingCps: number): number[] {
  return cues.map((cue) => {
    const s = sentences[cue.sentence - 1];
    return s ? Math.round((s.start / readingCps) * 1000) : 0;
  });
}
