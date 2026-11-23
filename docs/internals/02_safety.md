# Safety

Toymate drives hardware that is often attached to a person who may not be able to reach a keyboard quickly. The rules below are invariants, not features.

## One choke point

Only the governor calls the Buttplug client's output methods. Tests assert this by construction: the client adapter is not exported outside `src/frontend/engine/`. A new output path that bypasses the governor is a bug even if it clamps on its own.

The governor enforces, per output:

- **Max level** – global user limit, applied after everything else. Default is below full power.
- **Rate limit** – Bluetooth devices drop or queue commands sent too fast. The governor sends only changed values and caps the send rate per output.
- **Ramp limit** – cap on how fast intensity can rise, so a jump from 0 to max is smoothed.
- **Timing gap** – never send to a device faster than its reported `messageTimingGap`. Intiface acknowledges commands immediately and queues the rest, so the server does not protect us; a flood builds lag that outlives a stop.
- **Per-type limits** – stroke speed and stroke range for position outputs, maximum hold time for constrict and inflate (then release), a temperature cap, and a cap on rotation direction swaps.
- **Calibration** – level maps onto the user's floor..ceiling per output; nothing can exceed the ceiling.

The director adds one more: there is no "run forever". A scene that no source renews within the **hold timeout** fades to zero, and every cue and accent has a finite length.

## Stop paths

Each of these stops all outputs (sends stop to every device) and leaves the UI showing the stopped state:

- Panic stop (sidebar button, keyboard shortcut, Extras menu action). Also pauses all triggers until the user resumes.
- Safeword in a user message (see [06_interaction.md](06_interaction.md#safewords)). Also leaves Story mode.
- Extension disable, frontend teardown, page hide/unload, and Lumiverse blocking the tab.
- Intiface disconnect or connection error. Toymate never reconnects and resumes a scene on its own; a reconnect starts idle.
- Generation stopped by the user, while "stop on generation stop" is on (default). With it off, only that reply's pending cues are dropped.

A removed device has its outputs dropped from every scene; other devices keep running.
- Any uncaught error in the engine tick. Fail closed.

When in doubt, stop. A spurious stop is an annoyance; a missed stop is a harm.

## Consent

- Nothing moves until the user connects Intiface and enables at least one rule or mode.
- Story mode is opt-in per chat or per character, never global by default, and is visibly indicated while active. The user chooses which provider receives replies for planning.
- Limits set by the user cannot be raised by a rule, plan, or prompt. Planner output is untrusted: validated against the schema, clamped, and discarded whole if malformed.
- Old chats never replay. See the "only live events" invariant in [AGENTS.md](../../AGENTS.md).

## Privacy

Device names and chat content never leave the user's machines through Toymate. Logs at info level and above contain no message content or device names. The planner request and the awareness note use zone labels, never device names, unless the user opts in. Story mode sends reply text to the planner provider the user picked; that is the one place content leaves the user's chosen roleplay setup, and the settings say so.
