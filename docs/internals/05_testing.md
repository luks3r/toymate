# Testing

## What to test

- Test behavior that can hurt someone or break silently: governor limits and stop-all, renderers per output type, director timing (cue schedule, hold timeout), safeword matching, rule matching, generation filtering (history, impersonate, and extension generations must not fire), streaming cue parsing (tags split across tokens) and clamping, settings validation, and the engine's handling of connect, device add/remove, and disconnect.
- Skip tests for what types already guarantee, copy text, and UI wiring.
- Extend an existing test table before adding a new test. Test at the lowest layer that fails.
- A bug fix starts with a failing test for that bug.

## How

- `bun test`. Tests sit next to the code as `*.test.ts`.
- Pure logic in `src/shared/` and the engine takes time as an input (a tick or a clock parameter), so tests drive time explicitly. No sleeps, no polling, no `Date.now()` deltas.
- Engine and trigger tests replace the adapter with the recording fake in `src/frontend/engine/fake-link.test-helper.ts` and assert on recorded commands, especially that stop reaches every device on each stop path and that sends respect the timing gap.
- Automated tests never connect to Intiface. Manual integration passes use Intiface Central's simulated devices (see [00_development.md](../operations/00_development.md)).
- The adapter itself stays thin enough that a manual pass against simulated devices covers it. If it grows logic, give that logic a pure function and test it.
