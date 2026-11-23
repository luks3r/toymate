# Development

## Setup

```sh
bun install
bun run sync:repos   # read-only references in .repos/ (Lumiverse, buttplug-js)
bun run check        # typecheck + tests
bun run build        # dist/backend.js, dist/frontend.js
```

## Isolated Lumiverse instance

Never use the developer's live data directory (`~/Projects/Lumiverse/data`). The verified loop (isolated `DATA_DIR` under `.dev/`, owner created from env, local import, permission grant, restart after rebuild, local Ollama for Story mode) is the [`test-toymate` skill](../../.agents/skills/test-toymate/SKILL.md).

## Intiface and simulated devices

The developer runs Intiface Central on `ws://127.0.0.1:12345` with simulated devices enabled. Agents may use it for experiments and integration passes:

- Read-only use (connect, list devices, read battery) is always fine.
- Send output commands only when every connected device's name starts with `Simulated`. If a real device is connected, stop and ask; it may be attached to a person.
- Throwaway probe scripts go in your scratchpad, not the repo. Use `ButtplugNodeWebsocketClientConnector` from Bun.

Useful simulated set for full coverage: single-motor vibrator, two-motor vibrator, rotator, oscillator, linear stroker (position), and an air-pump (constrict/inflate). Ask the developer to add any that are missing in Intiface Central.

## Real hardware

Only the developer runs real-hardware passes. Connect devices in Intiface Central first, set low limits and calibrate in Toymate before the first test.
