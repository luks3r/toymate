# Roadmap

Design reasons are in [06_interaction.md](internals/06_interaction.md) and [01_architecture.md](internals/01_architecture.md). Every slice keeps the invariants in [02_safety.md](internals/02_safety.md).

## Built (M0–M4)

- **Bootstrap:** agent instructions, docs, build, tests, verified dev loop (`test-toymate` skill).
- **Connection and manual control:** adapter, device model, governor (calibration, max level, ramp, timing gap, dedupe, constrict hold, rotation swaps, stroke speed and range), sidebar tab, Stop all (button, Shift+Esc, Extras action), every stop path.
- **Scenes:** director (glide, accents, hold timeout, lock), renderers for vibrate, rotate, oscillate, constrict/inflate, HwPositionWithDuration, temperature; zones; calibration UI.
- **Reactive mode:** live generation tracker with filters, rules (character reply, user message, while streaming), stream pulse, safewords.
- **Dynamic scenes:** ramps (`to`/`over`), variation (`spread`), and temporary changes (`for`) in manual play, rules, and planner cues.
- **Story mode:** planner call with `plan_cues` tool and JSON fallback, playback length that follows reply size within user bounds, fade or hold after the cues, Plan last reply / Re-plan, late plans start at the cue the reader reached, resume from any cue of the latest plan, stale-plan dropping, optional character awareness note, Story section.

Verified: unit tests (`bun run check`); engine against Intiface's simulated vibrator; full flow in an isolated Lumiverse with a local Ollama model (reply → plan → cues → device, Stop all, Shift+Esc, generation stop, safeword).

## Next

- **Real hardware pass** (developer only): calibrate, then each feel and tempo on a real toy; check that the ramp and timing gap feel right.
- **More device shapes:** integration pass with simulated two-motor vibrator, rotator, oscillator, stroker, and air pump. Renderers for these are unit-tested only.
- **Lumiverse Desktop on macOS:** confirm WKWebView allows `ws://127.0.0.1` from the app page.
- **Planner quality:** small models over-cue (13 cues for one reply in testing). The dynamic-fields prompt was checked on gemma3:4b only; local thinking models (qwen3, gemma 12B) were too slow or returned nothing. Tune the prompt on two or more models, consider merging consecutive identical cues, and measure latency; plan the first paragraph while the rest streams if late plans are common.

## Later (not scheduled)

- Device buttons mapped to reactions; pressure and battery in the feedback line.
- Cue timing that follows TTS playback when TTS is on.
- Funscript import for position devices.
- Floating mini-remote (needs `ui_panels`).
- Worker-based tick for background tabs.
- Zone presets in character card extension data.
- Backend-side connection for setups with no browser open.
