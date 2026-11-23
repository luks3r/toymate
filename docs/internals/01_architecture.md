# Architecture

```
Lumiverse server (anywhere)          User's browser (Lumiverse tab)                    User's machine
┌──────────────────────────┐        ┌───────────────────────────────────────┐         ┌──────────────────┐
│ backend.ts (Spindle)     │ spindle│ frontend.ts (Spindle)                 │  WS     │ Intiface Central │
│  settings (userStorage)  │◄──────►│  triggers: live generations, rules,   │◄───────►│ 127.0.0.1:12345  │
│  planner call (Story)    │  msgs  │            cues, safewords, reactions │ Buttplug│   ▼ BLE/USB      │
│  awareness interceptor   │        │  engine: director → renderers →       │   v4    │  devices         │
│                          │        │          governor → adapter           │         └──────────────────┘
└──────────────────────────┘        │  ui: sidebar drawer tab, Extras action│
                                    └───────────────────────────────────────┘
```

The interaction model (intent vocabulary, scenes, modes, planner, cue timing) is in [06_interaction.md](06_interaction.md). This page covers where code and state live.

## The browser owns the device connection

Devices and Intiface sit next to the user, not next to the Lumiverse server, which may be remote. The browser can reach the user's loopback interface; a remote server cannot. So the Buttplug client and the whole engine run in the frontend module, and the backend never talks to Intiface.

Consequences:

- Device state is per browser document. Lumiverse allows one primary tab per account and browser; a blocked tab unloads the extension, which must stop all output on teardown.
- The backend learns about zones and the live scene only from what the frontend reports (for the planner and the awareness note). That report is a summary, not a command channel.
- In Story mode the backend computes a cue sheet; the frontend schedules and executes it. The backend never commands hardware.
- A desktop floating-widget entry, if added, must not open a second Buttplug connection.

A backend-side connection (server, Intiface, and devices on one machine with no browser open) is a non-goal until someone needs it.

## Modules

```
src/
  backend.ts, frontend.ts      entries; wiring only
  shared/                      pure, no I/O, used by both sides
    settings                   schema, defaults, validation, version migration
    intent                     level/feel/tempo/zone/accent types
    plan                       cue sheet schema, sentence splitting, validation + clamping
    rules                      rule types and matching
    safewords                  matching
    wire                       frontend ⇄ backend message types
  frontend/
    engine/
      adapter                  buttplug client: connect, scan, devices, send, stop. Only code that imports buttplug
      devices                  device → feature → output model, stable keys, zone assignment
      director                 scene per zone, accents, cue schedule, hold timeout
      renderers                intent → value per output type (vibrate, rotate, oscillate, position, constrict, …)
      governor                 calibration, limits, slew, timing gap, dedupe, stop-all
    triggers/
      generations              live generation tracker (STARTED → tokens → ENDED/STOPPED), filters
      wiring                   events → rules / plans / safewords → director
    ui/                        sidebar tab sections, Extras action; reads engine state, calls engine methods
  backend/
    settings                   load/save in userStorage, push to frontend
    planner                    Story mode: builds the planner request, calls generate.raw, validates the plan
    awareness                  optional interceptor note for the roleplay prompt
```

`renderers`, `director`, plan validation, sentence splitting, rules, and safewords are pure functions of state and time, so tests drive them with explicit time. `adapter` is the only impure engine piece. Engine tests use a recording fake in place of the adapter; integration passes use Intiface's simulated devices.

## Tick and timing

The engine runs one tick loop (100 ms). Each tick: director advances scenes and cue schedule, renderers produce a target value per output, governor decides what to send. The governor sends only changed values and never faster than the device's `messageTimingGap`. Position outputs are event-driven instead: the renderer emits the next stroke target with a duration when the current one ends.

The tick uses `setInterval` in the main document. Browsers throttle timers in background tabs to about once per second, which would make output coarse while the user is in another tab. Acceptable for v1; a dedicated worker timer fixes it if needed.

## Live generations

The frontend `ctx.events` stream delivers `GENERATION_STARTED`, `STREAM_TOKEN_RECEIVED`, `GENERATION_ENDED`, and `GENERATION_STOPPED` without the `generation` permission. The generation tracker keys everything by `generationId`:

- **Accept** generations for the active chat with `generationType` `normal`, `regenerate`, `swipe`, or `continue`, and no `extensionId` (extension-fired generations are not chat turns; that includes Toymate's own planner calls).
- **Ignore** `impersonate` (the model writes the user's message) and `quiet`, `reasoning` tokens, and background swipes.
- A generation is live only in the document that saw it start. History and re-renders never produce a generation, so nothing old can replay.
- `GENERATION_ENDED` for a tracked generation in Story mode requests a plan. A newer tracked generation or `GENERATION_STOPPED` aborts the in-flight plan request and drops its pending cues; stop also stops all outputs while "stop on generation stop" is on (default).

User-message triggers and safewords use `MESSAGE_SENT` with `is_user`.

## Where state lives

| State | Owner | Why |
| --- | --- | --- |
| Limits, calibration, zone assignments, rules, safewords, reading speed, planner connection and model, Intiface URL | Backend `userStorage`, one settings document | Survives browser changes; per user on multi-user servers |
| Per-chat mode, per-character defaults and consent | Backend `userStorage`, keyed by chat and character | Same; consent must not reset on reload |
| Connection, devices, scenes, cue schedule, panic state, reactions since last reply | Frontend memory (reactions and scene summary are sent with each plan request) | Live state; dies with the document |

The frontend loads settings on setup and sends changes back; both sides validate with `shared/settings`. Devices are matched to saved calibration and zones by a stable key (device name plus feature index), and saved entries for absent devices are kept.

## Sidebar UI

One drawer tab, **Toymate** (sidebar icon, also in the command palette). The tab badge shows the live state: nothing when idle, a dot while any output runs, `II` while paused, `!` after an unexpected disconnect.

Always visible above the tabs: connection status with Connect/Disconnect and Scan, and the red **STOP** button. While paused, STOP is replaced by a Paused banner with **Resume**, so the stopped state is impossible to miss. Stop is also on Shift+Esc and in the chat input bar's Extras menu.

Four tabs, ordered by how often they are needed:

1. **Play** – this chat's mode as a three-way switch (Off / Reactive / Story) with a one-line explanation and a shortcut to the planner or rules, an optional "use for every chat with this character" switch, per-zone meters with lock, reactions (Less, Hold, More, Stop), the Story cue timeline with ▶ resume, and play-by-hand controls (feel chips, tempo switch, level, accents).
2. **Devices** – each toy with battery; each output with a live bar, zone, a "Not calibrated" badge until calibrated, and a Calibrate disclosure (floor, ceiling, 2-second tests). Zones are edited here as chips.
3. **Rules** – rules written as sentences ("When a reply finishes with kiss, touch then play wave slow at 40 on all zones"), an example rule for empty lists, and stream pulse. Warns when the current chat is not in Reactive mode.
4. **Settings** – safety limits, safewords, Story planner (connection, reading speed, awareness), stroker and other-toy limits, connection.

The UI is plain DOM styled with Lumiverse theme variables. The header, zone meters, device bars, and cue status are built once and updated in place on every engine change; other parts rebuild only when settings, the device list, or the plan change, never on a timer. A floating mini-remote (needs `ui_panels`) is a later option.

## Permissions

| Permission | Needed for | Milestone |
| --- | --- | --- |
| none | Sidebar tab, Extras action, events, storage, frontend messaging | M1–M3 |
| `generation` | Planner call (`generate.raw`) and listing connection profiles | M4 |
| `interceptor` | Optional character awareness note | M4 |
