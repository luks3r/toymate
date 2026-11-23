import { isRecord } from "./intent";
import type { PlannedCue } from "./plan";
import type { Settings } from "./settings";

export interface PlanRequest {
  type: "plan_request";
  requestId: string;
  chatId: string;
  characterId: string | null;
  content: string;
  previousUserMessage: string;
  /** One-line summary of the live scene and recent reactions. */
  status: string;
}

export interface ConnectionSummary {
  id: string;
  name: string;
  model: string;
}

export type FrontendMessage =
  | { type: "hello" }
  | { type: "save_settings"; settings: unknown }
  | PlanRequest
  | { type: "plan_last"; requestId: string; chatId: string; characterId: string | null; status: string }
  | { type: "plan_cancel"; requestId: string }
  | { type: "status"; chatId: string | null; status: string }
  | { type: "list_connections" };

export type BackendMessage =
  | { type: "settings"; settings: Settings }
  /** `content` is set when the backend read the reply itself (plan_last). */
  | { type: "plan_result"; requestId: string; cues: PlannedCue[]; content?: string }
  | { type: "plan_error"; requestId: string; error: string }
  | { type: "connections"; connections: ConnectionSummary[] };

const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);

export function parseFrontendMessage(raw: unknown): FrontendMessage | null {
  if (!isRecord(raw)) return null;
  switch (raw.type) {
    case "hello":
    case "list_connections":
      return { type: raw.type };
    case "save_settings":
      return { type: "save_settings", settings: raw.settings };
    case "plan_last": {
      const requestId = text(raw.requestId, 64);
      const chatId = text(raw.chatId, 128);
      if (!requestId || !chatId) return null;
      return { type: "plan_last", requestId, chatId, characterId: text(raw.characterId, 128), status: text(raw.status, 1000) ?? "" };
    }
    case "plan_cancel": {
      const requestId = text(raw.requestId, 64);
      return requestId ? { type: "plan_cancel", requestId } : null;
    }
    case "status":
      return { type: "status", chatId: text(raw.chatId, 128), status: text(raw.status, 1000) ?? "" };
    case "plan_request": {
      const requestId = text(raw.requestId, 64);
      const chatId = text(raw.chatId, 128);
      const content = text(raw.content, 40_000);
      if (!requestId || !chatId || content === null) return null;
      return {
        type: "plan_request",
        requestId,
        chatId,
        characterId: text(raw.characterId, 128),
        content,
        previousUserMessage: text(raw.previousUserMessage, 8_000) ?? "",
        status: text(raw.status, 1000) ?? "",
      };
    }
    default:
      return null;
  }
}

/** Backend messages are trusted host output; this only narrows the type. */
export function asBackendMessage(raw: unknown): BackendMessage | null {
  return isRecord(raw) && typeof raw.type === "string" ? (raw as unknown as BackendMessage) : null;
}
