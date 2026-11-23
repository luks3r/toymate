import type { SpindleAPI } from "lumiverse-spindle-types";
import { withAwareness } from "./backend/awareness";
import { Planner } from "./backend/planner";
import { parseSettings, type Settings } from "./shared/settings";
import { parseFrontendMessage, type BackendMessage } from "./shared/wire";

declare const spindle: SpindleAPI;

const SETTINGS_PATH = "settings.json";
const settingsCache = new Map<string, Settings>();
/** Latest scene/reaction line per user and chat, reported by the frontend. */
const statusCache = new Map<string, { chatId: string | null; status: string }>();

async function loadSettings(userId: string): Promise<Settings> {
  const cached = settingsCache.get(userId);
  if (cached) return cached;
  const raw = await spindle.userStorage.getJson<unknown>(SETTINGS_PATH, { fallback: null, userId }).catch(() => null);
  const settings = parseSettings(raw);
  settingsCache.set(userId, settings);
  return settings;
}

async function saveSettings(userId: string, raw: unknown): Promise<Settings> {
  const settings = parseSettings(raw);
  await spindle.userStorage.setJson(SETTINGS_PATH, settings, { indent: 2, userId });
  settingsCache.set(userId, settings);
  return settings;
}

const planner = new Planner(
  (input) => spindle.generate.raw(input),
  (input) => spindle.generate.quiet(input),
);

spindle.onFrontendMessage(async (raw, userId, frontendSessionId) => {
  const reply = (message: BackendMessage) =>
    spindle.sendToFrontend(message, userId, frontendSessionId ? { frontendSessionId } : undefined);
  const message = parseFrontendMessage(raw);
  if (!message) return;
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
          if (error instanceof Error && error.name === "AbortError") return;
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
