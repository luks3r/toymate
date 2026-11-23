import type { SpindleFrontendContext } from "lumiverse-spindle-types";
import { DEFAULT_SETTINGS, parseSettings, type Settings } from "./shared/settings";
import { asBackendMessage, type ConnectionSummary, type FrontendMessage } from "./shared/wire";
import { ButtplugAdapter } from "./frontend/engine/adapter";
import { Engine } from "./frontend/engine/engine";
import { Triggers } from "./frontend/triggers/wiring";
import { mountPanel } from "./frontend/ui/panel";
import { PANEL_CSS } from "./frontend/ui/styles";

const ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h3l2-5 3 10 3-8 2 3h7"/></svg>';
const STOP_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
const STATUS_INTERVAL_MS = 2000;

export function setup(ctx: SpindleFrontendContext) {
  let settings: Settings = DEFAULT_SETTINGS;
  let settingsLoaded = false;
  let connections: ConnectionSummary[] | null = null;
  const send = (m: FrontendMessage) => ctx.sendToBackend(m);

  const adapter = new ButtplugAdapter({
    onDevicesChanged: () => engine.handleDevicesChanged(),
    onDisconnected: () => engine.handleDisconnected(),
    onScanningFinished: () => engine.handleScanningFinished(),
  });
  const engine = new Engine(adapter, settings);

  const update = (mutate: (s: Settings) => Settings) => {
    settings = parseSettings(mutate(settings));
    engine.configure(settings);
    panel.settingsChanged();
    send({ type: "save_settings", settings });
  };

  const triggers = new Triggers(
    {
      on: (event, handler) => ctx.events.on(event, handler),
      activeChat: () => ctx.getActiveChat(),
      send,
      settings: () => settings,
      saveSettings: (s) => update(() => s),
    },
    engine,
  );

  ctx.dom.addStyle(PANEL_CSS);
  const tab = ctx.ui.registerDrawerTab({
    id: "toymate",
    title: "Toymate",
    shortName: "Toymate",
    headerTitle: "Toymate",
    description: "Control Buttplug.io / Intiface devices from your chats",
    keywords: ["intiface", "buttplug", "toy", "haptics", "device"],
    iconSvg: ICON,
  });
  const panel = mountPanel(tab.root, {
    engine,
    triggers,
    settings: () => settings,
    update,
    activeChat: () => ctx.getActiveChat(),
    connections: () => connections,
    requestConnections: () => send({ type: "list_connections" }),
  });

  const stopAction = ctx.ui.registerInputBarAction({ id: "toymate-stop", label: "Toymate: stop all devices", iconSvg: STOP_ICON });
  const offStop = stopAction.onClick(() => void engine.panic());

  let badge: string | null = null;
  const offBadge = engine.subscribe(() => {
    const v = engine.view();
    const next = v.error && v.connection !== "connected" ? "!" : v.paused ? "II" : v.active ? "●" : null;
    if (next !== badge) tab.setBadge((badge = next));
  });

  const offChat = ctx.events.on("CHAT_SWITCHED", () => panel.chatChanged());
  const offBackend = ctx.onBackendMessage((raw) => {
    const m = asBackendMessage(raw);
    if (!m) return;
    switch (m.type) {
      case "settings": {
        const first = !settingsLoaded;
        settingsLoaded = true;
        settings = parseSettings(m.settings);
        engine.configure(settings);
        panel.settingsChanged();
        if (first && settings.autoConnect) void engine.connect();
        break;
      }
      case "plan_result":
        triggers.onPlanResult(m.requestId, m.cues, m.content);
        break;
      case "plan_error":
        triggers.onPlanError(m.requestId, m.error);
        break;
      case "connections":
        connections = m.connections;
        panel.settingsChanged();
        break;
    }
  });

  // Status for the optional awareness note; only sent when it changes.
  let lastStatus = "";
  const statusTimer = setInterval(() => {
    const chatId = ctx.getActiveChat().chatId;
    const status = triggers.statusLine(false);
    if (`${chatId}|${status}` === lastStatus) return;
    lastStatus = `${chatId}|${status}`;
    send({ type: "status", chatId, status });
  }, STATUS_INTERVAL_MS);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape" && e.shiftKey) void engine.panic();
  };
  // Best effort: the page may die before the stop reaches Intiface; Intiface's own
  // stop-on-disconnect is the backup.
  const onHide = () => void engine.panic();
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("pagehide", onHide);

  engine.start();
  triggers.start();
  ctx.ready();
  send({ type: "hello" });
  send({ type: "list_connections" });

  return async () => {
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("pagehide", onHide);
    clearInterval(statusTimer);
    offBackend();
    offChat();
    offBadge();
    offStop();
    triggers.dispose();
    await engine.dispose();
    panel.dispose();
    stopAction.destroy();
    tab.destroy();
  };
}
