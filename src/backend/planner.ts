import type { GenerationRequestDTO, GenerationResponseDTO, LlmMessageDTO } from "lumiverse-spindle-types";
import { isRecord } from "../shared/intent";
import { PLAN_TOOL_NAME, parsePlan, planTool, splitSentences, type PlannedCue } from "../shared/plan";
import type { Settings } from "../shared/settings";
import type { PlanRequest } from "../shared/wire";

const JSON_ANSWER =
  'Answer with only JSON, no prose: {"cues":[{"sentence":1,"action":"set","zone":"all","level":30,"feel":"wave","tempo":"slow"}]}. ' +
  'action is "set", "accent" (with "accent") or "stop". Omit fields you do not change.';

/** `withTools` false asks for JSON in text, for providers without tool calling. */
export function buildPlannerMessages(req: PlanRequest, settings: Settings, withTools = true): LlmMessageDTO[] {
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
    `Respect what the user asked for in the state line. ${withTools ? "Do not write prose; only call the tool." : JSON_ANSWER}`,
  ].join("\n");
  const user = [
    req.previousUserMessage ? `User's last message:\n${req.previousUserMessage.slice(0, 2000)}\n` : "",
    `State: ${req.status}\n`,
    "Reply, numbered by sentence:",
    ...sentences.map((s) => `[${s.index}] ${s.text}`),
  ].join("\n");
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/** Providers without tool calling answer with JSON in text, often fenced, sometimes a bare array. */
function jsonFromText(text: string): unknown {
  const candidates = [
    [text.indexOf("{"), text.lastIndexOf("}")],
    [text.indexOf("["), text.lastIndexOf("]")],
  ].filter(([start, end]) => start! >= 0 && end! > start!).sort((a, b) => a[0]! - b[0]!);
  for (const [start, end] of candidates) {
    try {
      return JSON.parse(text.slice(start, end! + 1));
    } catch {
      // try the next shape
    }
  }
  return null;
}

export function planFromResponse(response: unknown, req: PlanRequest, settings: Settings): PlannedCue[] | null {
  if (!isRecord(response)) return null;
  const r = response as Partial<GenerationResponseDTO>;
  const call = r.tool_calls?.find((c) => c.name === PLAN_TOOL_NAME);
  const args = call ? call.args : jsonFromText(typeof r.content === "string" ? r.content : "");
  return parsePlan(args, {
    sentenceCount: splitSentences(req.content).length,
    zones: settings.zones,
    maxLevel: settings.limits.maxLevel,
  });
}

type Generate = (input: GenerationRequestDTO) => Promise<unknown>;

/** Runs planner calls and lets a newer reply or a stop abort an older one. */
export class Planner {
  private inFlight = new Map<string, AbortController>();

  constructor(private raw: Generate, private quiet: Generate) {}

  /** `userId` is required on operator-scoped installs. */
  async plan(req: PlanRequest, settings: Settings, userId: string): Promise<PlannedCue[]> {
    const controller = new AbortController();
    this.inFlight.set(req.requestId, controller);
    const call = (withTools: boolean) => {
      const input: GenerationRequestDTO = {
        type: settings.story.connectionId ? "raw" : "quiet",
        messages: buildPlannerMessages(req, settings, withTools),
        ...(withTools ? { tools: [planTool(settings.zones)] } : {}),
        parameters: { temperature: 0.4, max_tokens: 800 },
        reasoning: { source: "off" },
        signal: controller.signal,
        userId,
        ...(settings.story.connectionId ? { connection_id: settings.story.connectionId } : {}),
      };
      return settings.story.connectionId ? this.raw(input) : this.quiet(input);
    };
    try {
      let response: unknown;
      try {
        response = await call(true);
      } catch (error) {
        // Many local models reject the `tools` field outright; ask for JSON instead.
        if (controller.signal.aborted || !/tool/i.test(String(error))) throw error;
        response = await call(false);
      }
      const cues = planFromResponse(response, req, settings);
      if (!cues) throw new Error("The planner did not return a usable plan (it may have refused).");
      return cues;
    } finally {
      this.inFlight.delete(req.requestId);
    }
  }

  cancel(requestId: string) {
    this.inFlight.get(requestId)?.abort();
    this.inFlight.delete(requestId);
  }
}
