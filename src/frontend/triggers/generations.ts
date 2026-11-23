import { isRecord } from "../../shared/intent";

export interface LiveGeneration {
  id: string;
  chatId: string;
  characterId: string | null;
  startedAt: number;
  /** When the first visible token arrived; reading starts here. */
  firstTokenAt: number | null;
  text: string;
  tokens: number;
}

const CHAT_TURNS = new Set(["normal", "regenerate", "swipe", "continue"]);
const MAX_TEXT = 40_000;

const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/**
 * Tracks generations this document saw start. Only these can move hardware:
 * history and re-renders never produce a GENERATION_STARTED here.
 */
export class GenerationTracker {
  private live = new Map<string, LiveGeneration>();

  /** Returns the new live generation and ids of generations in the same chat it supersedes. */
  started(payload: unknown, activeChatId: string | null, now: number): { generation: LiveGeneration; superseded: string[] } | null {
    if (!isRecord(payload)) return null;
    const id = str(payload.generationId);
    const chatId = str(payload.chatId);
    if (!id || !chatId || chatId !== activeChatId) return null;
    if (payload.extensionId || payload.backgroundSwipe === true) return null;
    const type = typeof payload.generationType === "string" ? payload.generationType : "normal";
    if (!CHAT_TURNS.has(type)) return null;
    const superseded = [...this.live.values()].filter((g) => g.chatId === chatId).map((g) => g.id);
    for (const s of superseded) this.live.delete(s);
    const generation: LiveGeneration = {
      id,
      chatId,
      characterId: str(payload.characterId),
      startedAt: now,
      firstTokenAt: null,
      text: "",
      tokens: 0,
    };
    this.live.set(id, generation);
    return { generation, superseded };
  }

  token(payload: unknown, now: number): LiveGeneration | null {
    if (!isRecord(payload) || payload.type === "reasoning" || typeof payload.token !== "string") return null;
    const g = this.live.get(String(payload.generationId));
    if (!g) return null;
    g.firstTokenAt ??= now;
    g.tokens++;
    if (g.text.length < MAX_TEXT) g.text += payload.token;
    return g;
  }

  /** Ends a live generation; content prefers the host's final text. */
  ended(payload: unknown): { generation: LiveGeneration; content: string } | null {
    if (!isRecord(payload)) return null;
    const g = this.live.get(String(payload.generationId));
    if (!g) return null;
    this.live.delete(g.id);
    if (payload.error) return null;
    const content = typeof payload.content === "string" && payload.content ? payload.content : g.text;
    return { generation: g, content };
  }

  stopped(payload: unknown): LiveGeneration | null {
    if (!isRecord(payload)) return null;
    const g = this.live.get(String(payload.generationId));
    if (g) this.live.delete(g.id);
    return g ?? null;
  }

  clear(): string[] {
    const ids = [...this.live.keys()];
    this.live.clear();
    return ids;
  }
}
