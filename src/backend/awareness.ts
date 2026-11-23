import type { InterceptorContextDTO, InterceptorResultDTO, LlmMessageDTO } from "lumiverse-spindle-types";
import { modeFor, type Settings } from "../shared/settings";

/**
 * Optional note for the roleplay prompt in Story mode, so the character can
 * act on the devices deliberately. Never asks for markup.
 */
export function withAwareness(
  messages: LlmMessageDTO[],
  ctx: Pick<InterceptorContextDTO, "chatId" | "characterId">,
  settings: Settings,
  status: string | null,
): LlmMessageDTO[] | InterceptorResultDTO {
  if (!settings.story.awareness || modeFor(settings, ctx.chatId, ctx.characterId) !== "story") return messages;
  const zones = settings.zones.join(", ");
  const note: LlmMessageDTO = {
    role: "system",
    content:
      `[Toymate] The user is wearing haptic devices (zones: ${zones}) that follow the physical intensity of your writing as they read. ` +
      `You may shape what they feel through what happens in the story. ${status ?? ""} ` +
      "Never mention devices out of character and never write markup or commands for them.",
  };
  const last = messages.at(-1);
  const index = last?.role === "assistant" ? messages.length - 1 : messages.length;
  const out = [...messages.slice(0, index), note, ...messages.slice(index)];
  return { messages: out, breakdown: [{ messageIndex: index, name: "Toymate" }] };
}
