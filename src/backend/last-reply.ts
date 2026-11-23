import type { SpindleAPI } from "lumiverse-spindle-types";
import type { FrontendMessage, PlanRequest } from "../shared/wire";

export type ChatReadApi = {
  chats: Pick<SpindleAPI["chats"], "get">;
  chat: { getMessages(chatId: string, options: { tail: number; light: true; includeExtra: false }): Promise<{ role: string; content: string; hidden: boolean }[]> };
};

/**
 * Reads the chat's last character reply for "Plan the last reply". The chat id
 * comes from the browser, so ownership is checked first: on operator-scoped
 * installs the host does not limit chat reads to the calling user.
 */
export async function lastReplyRequest(api: ChatReadApi, m: Extract<FrontendMessage, { type: "plan_last" }>, userId: string): Promise<PlanRequest> {
  let chat: unknown;
  let messages: { role: string; content: string; hidden: boolean }[];
  try {
    chat = await api.chats.get(m.chatId, userId);
    messages = chat ? await api.chat.getMessages(m.chatId, { tail: 12, light: true, includeExtra: false }) : [];
  } catch (error) {
    if (/permission/i.test(String(error)))
      throw new Error("Planning an earlier reply needs the chats and chat_mutation permissions. Grant them to Toymate in the Extensions panel.");
    throw error;
  }
  if (!chat) throw new Error("Chat not found.");
  const visible = messages.filter((x) => !x.hidden);
  const lastIndex = visible.findLastIndex((x) => x.role === "assistant" && x.content.trim());
  if (lastIndex < 0) throw new Error("This chat has no character reply to plan yet.");
  const previousUser = visible.slice(0, lastIndex).findLast((x) => x.role === "user");
  return {
    type: "plan_request",
    requestId: m.requestId,
    chatId: m.chatId,
    characterId: m.characterId,
    content: visible[lastIndex]!.content.slice(0, 40_000),
    previousUserMessage: previousUser?.content.slice(0, 8_000) ?? "",
    status: m.status,
  };
}
