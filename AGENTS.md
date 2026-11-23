# Toymate

Toymate is a [Lumiverse](https://github.com/prolix-oc/Lumiverse) Spindle extension that connects roleplay chats to intimate hardware through [Buttplug.io](https://buttplug.io) and [Intiface Central](https://intiface.com/central). Chat events drive output patterns on any combination of the user's devices, and in opt-in Story mode a separate planner call turns each reply into cues timed to the user's reading.

## What we never compromise on

### 1. Safety and consent

This software moves hardware that touches people. Every output path goes through one safety governor (in `src/frontend/engine/`) that clamps intensity and duration to the user's limits, rate-limits commands, and can stop everything at once. There is never an output that runs without a known end. The user can always stop everything with one action, and every failure, disconnect, teardown, or doubt resolves to "stop all devices". Story mode is off until the user turns it on for a specific chat or character. Read [02_safety.md](docs/internals/02_safety.md) before touching output, triggers, or Story mode.

### 2. Private and local

Device names, chat content, and usage stay on the user's machines. No telemetry, no third-party network calls, no logging of message content or device names at info level or above. The Buttplug connection goes from the user's browser to their own Intiface instance.

### 3. Only live events move hardware

Opening an old chat, scrolling, re-rendering, editing, or swiping between existing variants never replays outputs. Only a new message or a live stream fires a trigger. Lumiverse re-renders messages often, so this needs active deduplication, not hope.

### 4. Works wherever Lumiverse runs

The Lumiverse server can be local, in Docker, on a VPS, or on Hugging Face. The browser, Intiface, and the devices are on the user's side. Features must work when the server is remote.

## A note on approach

Prefer the smallest model that makes correct behavior unsurprising. Fight scope creep and do not build machinery because it looks impressive. Honor the developer's intent in a minimal and realistic way. These are good defaults, not hard rules; the developer's preferences override anything here.

## Terminology

- **you** = the agent reading this file. **developer** = the person who owns this repo. **user** = a person running Lumiverse with Toymate installed.
- Domain terms (device, feature, output, zone, scene, cue, director, governor, mode): [00_glossary.md](docs/internals/00_glossary.md).

## The ways to hurt yourself

1. **Moving real hardware.** The developer's Intiface (`ws://127.0.0.1:12345`) is available for experiments, but send output commands only when every connected device's name starts with `Simulated`. If a real device is connected, stop and ask; it may be attached to a person. Automated tests never connect to Intiface. See [00_development.md](docs/operations/00_development.md#intiface-and-simulated-devices).
2. **Writing to the live Lumiverse install.** `~/Projects/Lumiverse/data` is the developer's real Lumiverse data directory. Reading from it is fine. Never start a server against it, never install or import extensions into it, never clean it up. Use an isolated `DATA_DIR` (see [00_development.md](docs/operations/00_development.md)).
3. **Killing by pattern.** Never `pkill -f` or kill a PID found by name or path. Lumiverse, Intiface, and other dev servers run on this machine. Kill only a PID you started.
4. **Leaking private content.** Never paste chat content, device names, or user settings into issues, commits, test fixtures, or requests to external services. Use synthetic fixtures.

## Hit every surface

The common defect is a change that works on the path you tested and is missing everywhere else. Before calling work done, walk this list and say which entries applied:

- **Stop paths.** Panic button, disconnect, extension disable, tab teardown (Lumiverse blocks older tabs), Intiface crash, device removal. Each must stop output and show the stopped state.
- **Event paths.** Normal send, regenerate, swipe-generate, continue, impersonate, stopped generation, extension-fired generations, group chats, edited messages, safewords. Each needs a decision about whether it fires.
- **Clients.** Desktop browser, Lumiverse Desktop (Tauri/WKWebView), mobile PWA. The desktop floating-widget window must never open its own Buttplug connection.
- **Server placement.** Local server and remote server. Device state lives in the browser; settings live in backend storage.
- **Device shapes.** Single and multi-motor vibrators, rotate, oscillate, constrict/inflate, position (linear) devices, temperature, and devices that disappear mid-scene. Each output type needs a renderer decision, even if it is "not driven".
- **Reverse states.** Every way in needs a way out and a way to see it (connect/disconnect, enable/disable Story mode, start/stop).
- **Docs.** Check whether the change makes existing guidance inaccurate.

## Verifying

- Run `bun run check` (typecheck + tests) before you hand work back.
- Iterate with `bun test <files>` and `bun run typecheck`.
- Follow [05_testing.md](docs/internals/05_testing.md): pure logic gets unit tests with explicit time; engine tests use a recording fake adapter; nothing waits on wall-clock sleeps.
- User-visible changes get one integrated pass in an isolated Lumiverse instance against Intiface simulated devices. Use the `test-toymate` skill ([.agents/skills/test-toymate](.agents/skills/test-toymate/SKILL.md)). Walk the flow as a user and fix anything rough before handing back.

## Pull requests and commits

- Never commit, push, or open a PR unless the developer asks.
- Every push bumps the version with `bun run bump <patch|minor|major>`, which keeps `spindle.json` and `package.json` in sync. Lumiverse shows the manifest version when it offers an update. Before 1.0: `minor` for user-visible features, `patch` for fixes and internal changes. One bump per push, in its own commit or the last commit of the push.
- `dist/` is committed: Lumiverse installs prebuilt bundles and does not rebuild on update when `dist/` exists. Run `bun run build` before committing source changes; `bun run check:dist` fails if `dist/` is stale.
- Conventional commit titles in plain language: `fix(engine): stop all outputs when Intiface disconnects`.
- PR body: the problem in a sentence or two, then how you fixed it. End with the model and harness that did the work.
- One request is one PR.

## Documentation

Most code changes do not need a doc change. Agents can read the code.

- `docs/internals/` holds decisions and their reasons, constraints that span components, and traps that are hard to discover from source. Before adding a paragraph, ask what a maintainer would get wrong without it.
- Do not enumerate fields, constants, or control flow. Do not append change logs. When a documented decision changes, rewrite or remove the affected text.
- A local reason the code cannot show goes in a short code comment. Default to no comment.
- `docs/user/` explains what a feature does and how to start, in the product's voice, without implementation details.
- `docs/operations/` holds developer runbooks.
- [docs/roadmap.md](docs/roadmap.md) holds milestones and acceptance criteria. Update a milestone when its scope changes; delete finished detail once the code records it.

## Where code lives

- `src/backend.ts` – Spindle backend entry (Bun runtime, `spindle` global). Thin: wires `src/backend/`.
- `src/frontend.ts` – Spindle frontend entry (browser, `setup(ctx)`). Thin: wires `src/frontend/`.
- `src/shared/` – pure logic and wire contracts used by both sides: settings, intent vocabulary, cue sheet schema, rules, safewords, frontend/backend messages. No I/O, no globals.
- `src/frontend/engine/` – adapter (the only `buttplug` import), device model, director, renderers, governor. The only code that sends device commands.
- `src/frontend/triggers/` – live generation tracking and wiring of events, rules, cues, and safewords into the director.
- `src/frontend/ui/` – sidebar drawer tab and Extras action. Dumb: reads engine state, calls engine methods.
- `src/backend/` – settings persistence, Story mode planner call, optional character awareness interceptor.
- `scripts/` – dev tooling.
- Module map and reasons: [01_architecture.md](docs/internals/01_architecture.md#modules).
- `.repos/` – read-only reference checkouts (Lumiverse, buttplug-js). Populate with `bun run sync:repos`. Never edit or import from them.

### Internal docs by area

Read the matching doc before changing code in that area.

| Area | Read first |
| --- | --- |
| Architecture, data flow, where state lives | [01_architecture.md](docs/internals/01_architecture.md) |
| Output, limits, stop paths, consent | [02_safety.md](docs/internals/02_safety.md) |
| Buttplug protocol and client library | [03_buttplug.md](docs/internals/03_buttplug.md) |
| Lumiverse Spindle APIs and their traps | [04_lumiverse.md](docs/internals/04_lumiverse.md) |
| Tests | [05_testing.md](docs/internals/05_testing.md) |
| Intent vocabulary, scenes, modes, planner call, cue timing, per-device behavior | [06_interaction.md](docs/internals/06_interaction.md) |

## Taste

- Complexity belongs at the adapter boundary (Buttplug client, Spindle APIs). The engine is plain state plus pure functions; the UI stays dumb.
- Everything the LLM or a chat message produces is untrusted input. Validate planner output against its schema, then pass it through the governor like any other output.
- The planner prompt and `plan_cues` tool schema are model-facing text. Change them with a before/after run on at least two models and keep the prompt short.
- Inferred types over annotations. `any` is the enemy. Validate data crossing a boundary (storage, frontend/backend messages, tag attributes) instead of casting it.
- Vanilla TypeScript UI: plain DOM styled with Lumiverse theme variables (`--lumiverse-*`). Build controls once and update them in place; never re-render a button that may be under the pointer (a re-render between mousedown and mouseup eats the click, and Stop all must never miss). Do not add a UI framework without developer sign-off.
- Add a dependency only when it removes real lifecycle cost. The backend bundle passes the Lumiverse install scanner; check before adding a backend dependency.
- If a rule here fights the task in front of you, say so loudly and get developer sign-off before breaking it.
