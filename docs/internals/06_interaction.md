# Interaction model

How chat turns into sensation. This page holds the design reasons; the code holds the details.

## The problem with "message → pattern"

A roleplay turn arrives every 30 seconds to a few minutes, streams in 5–20 seconds, and takes the user a minute or more to read. A naive mapping (each message fires a 5-second pattern) leaves the devices idle most of the time and fires all at once while the text streams. Raw device commands are also the wrong vocabulary for rules and for the model: a stroker, a two-motor vibrator, and an air pump need different commands for the same moment in the story.

So Toymate separates **what the scene wants** from **how each device expresses it**.

```
sources ──► director ──► renderers ──► governor ──► adapter ──► Intiface
manual       scene per     intent →      calibration,  buttplug
rules        zone +        output value  limits, slew,  client
plans        accents       per output    timing gap
reactions                  type
```

## Intent vocabulary

Every source (manual controls, rules, planner cues) speaks the same small vocabulary:

- **level** `0–100` – how strong the scene is right now.
- **to** and **over** – ramp from `level` (or the current level) to `to` over `over` seconds. Planner cues without `over` ramp until the next cue.
- **spread** `0–50` – random wander of ± `spread` around the level, smooth, paced by tempo. Adds unpredictability without the source inventing numbers each time.
- **for** – seconds a change lasts before the zone returns to what it replaced. A newer change cancels the return.
- **feel** – the texture: `steady`, `pulse`, `wave`, `tease` (on/off with pauses), `build` (rises over the cue), `throb` (slow deep pulses), `random`.
- **tempo** – `slow`, `medium`, `fast`. Drives pulse rate, stroke rate, direction changes.
- **zone** – a user-assigned label for a group of outputs (for example "clit", "internal", "stroker"), or `all`.
- **accent** – a short overlay on top of the scene: `spike` (brief surge), `pause` (brief stop), `flutter` (fast flicker).
- **stop**.

The vocabulary is small on purpose: models follow small grammars reliably, rules stay readable, and every word has a defined meaning on every device type. Ramps, spread, and durations are optional modifiers on a scene change, not new kinds of intent, so rules, manual play, and the planner all get them the same way.

## Scene, not one-shots

The **director** keeps a scene per zone: current level, feel, and tempo, plus active accents. Sources change the scene; the scene keeps running between messages. Changes glide (level transitions over about a second) instead of jumping.

A scene never runs unattended forever. If no source touches it for the **hold timeout** (user setting, default a few minutes), it fades to zero. Story plans and rules renew it naturally with each new reply.

Overlapping sources combine per zone: the newest base change wins, accents overlay on top, and manual control can lock the zone so automatic sources are ignored until the user releases it.

## How each output type expresses intent

Renderers turn the scene into a value per output on each tick. Buttplug output types and what they mean physically:

| Output | Typical devices | Level | Feel and tempo | Notes |
| --- | --- | --- | --- | --- |
| Vibrate | Most toys; multi-motor toys expose one feature per motor | Amplitude | Amplitude envelope (pulse rate, wave period) | Motors have a dead zone at low values; calibration fixes it. Multi-motor toys can alternate motors for `wave`. |
| Rotate | Rotating heads and beads | Speed | `pulse` and `wave` modulate speed; tempo sets direction swaps for `wave`/`random` | Negative values reverse direction. Direction swaps are rate-limited for the mechanism. |
| Oscillate | Thrusting and tapping toys | Oscillation speed | Envelope on speed | The device produces the motion; we only set its rate. |
| HwPositionWithDuration | Strokers, linear machines | Stroke length within the user's range | Tempo sets strokes per minute; feel shapes the stroke (`tease` = short shallow strokes with pauses, `build` = speeding up) | Not tick-driven: send the next target with a duration when the current move ends. Max speed is a hard limit. Plain `Position` (jump to a set point at device speed) is not driven, because its speed cannot be limited. |
| Constrict, Inflate | Air-pump and squeeze toys | Target pressure | Only `pulse`/`throb` matter, as slow squeeze-release cycles | Seconds-long time constants. Max hold time, then release. |
| Temperature | Warming toys | Target warmth within the user cap | Ignored | Never part of `all`; only driven when its zone is named. |
| Spray, Led | Rare | — | — | Not driven in v1. |

Inputs: **Battery** shows in the UI and warns when low. **RSSI** warns about a weak link (Bluetooth drops can leave a motor stuck on its last value). **Button** presses on devices can map to reactions. **Pressure** readings can feed back into the prompt (later).

## Calibration

Perceived strength is not linear and differs per device and per person. Each output has a **floor** (lowest value the user can feel), a **ceiling** (strongest the user wants), and an optional curve. The governor maps level `1–100` onto `floor..ceiling`, and `0` stays off. A short guided calibration in the device panel sets floor and ceiling with a live slider. Uncalibrated outputs start with a conservative ceiling.

## Three modes

Each chat is in one mode: **Off**, **Reactive**, or **Story**. The mode is per chat, with an optional default per character.

### Reactive (rules)

Rules match live events and change the scene, with no extra LLM call:

- **When:** character message finished, user message sent, or while the character message streams.
- **If:** character, keyword or regex on the message text.
- **Then:** set scene (level, feel, tempo, zone), relative change (`+15`), accent, or stop.

A built-in "stream pulse" rule makes the level follow stream activity, so the device reacts while the reply is being written.

### Story (planner call)

The roleplay model writes normal prose. When a live reply finishes, a separate **planner call** reads it and returns a cue sheet. Messages stay clean, the roleplay model spends no attention on a control syntax, and the stored chat history never contains control markup.

**Flow.**

1. The frontend sees a live generation end (`GENERATION_ENDED` for a generation it tracked from the start) and asks the backend for a plan, passing the message id.
2. The backend splits the reply into numbered sentences and calls `spindle.generate.raw` on the connection profile the user picked for Toymate. Input: the numbered reply, the previous turn or two for context, the zones, the user's limits as words, the current scene, and the feedback since the last reply.
3. The model answers through one tool call, `plan_cues`, whose JSON schema is the intent vocabulary plus a sentence number per cue. A tool schema gives structured output on every provider that supports tools, without depending on `response_format`.
4. The backend validates and clamps the plan and sends it to the requesting document only (`frontendSessionId`). The frontend schedules it.

**Cue timing.** A reply plays over a length that follows its size but stays within the user's bounds, and each cue starts at its sentence's share of that length:

```
playback = clamp(characters ÷ reading speed, shortest, longest)
start    = max(plan arrival, reading start + playback × characters before the sentence ÷ characters)
```

Defaults: 15 characters per second, at least 30 s, at most 300 s. Short replies stretch so a two-line message still plays for half a minute; very long ones compress. A cue lasts until the next cue starts. When the cues run out, the last scene either keeps going until the next reply or the hold timeout, or fades out over a few seconds (user setting). The planner is told the playback length so its `over` and `for` values fit.

**Planning an earlier reply.** Only live replies are planned automatically. For a new chat's greeting, a chat opened later, or a fresh take on the current reply, the user presses **Plan last reply** (or **Re-plan**). The backend reads the chat's last visible character reply and the user message before it, after checking the chat belongs to the requesting user, and the plan plays from its arrival. This needs the `chats` and `chat_mutation` permissions; without them the button explains what to grant. Toymate only reads messages.

**Late plans and resuming.** A plan that arrives after the reader passed some cues starts at the latest cue already reached; earlier cues are marked skipped. The latest plan stays available until the next plan, a chat switch, or a safeword: picking any cue replays the plan from that cue at reading pace. This is an explicit user action, so it also lifts a pause; it never happens on its own.

**Latency.** The call starts when the reply ends, so the first cue is late by the planner's latency. Reading time hides most of it: the first sentences take several seconds to read, and a fast model answers in one to three. If that is not enough, a later option plans the first paragraph while the rest still streams.

**Superseded and stopped replies.** A new generation, a swipe, or a stop aborts the in-flight planner call (`AbortSignal`) and drops its pending cues. A plan that arrives for a reply that is no longer the latest live one is discarded.

**Which model.** The user picks the connection profile and model in Toymate settings. A small fast model is enough. The reply is sent to that provider, so the settings say so plainly, and recommend the same provider as the roleplay or a local model. Some providers refuse explicit content; a refusal or malformed answer yields no cues, never a guess.

**Character awareness (optional).** The planner works without the roleplay model knowing about the devices. If the user wants the character to act on them deliberately ("she turns it up"), an interceptor adds a short note to the roleplay prompt: the zones in plain words, the current scene, and the feedback line. It never asks for markup.

**Group chats.** A chat's own mode applies to every member. Without one, each member's character default applies to that member's replies.

### Feedback into the story

Interactivity needs a channel back to the story. The sidebar has quick **reaction** buttons (`more`, `less`, `hold`, `stop`) and device buttons can map to them. A reaction changes the scene immediately and is recorded. The next planner call receives it, and with character awareness on, the roleplay prompt gets one line, for example: `[Toymate] Since your last reply: the user asked for more twice. Now: wave, level 55.` Later: pressure and battery summaries in the same line.

## Safewords

Sending a configured safeword (default `red`) stops everything, pauses all automatic sources, and switches the chat out of Story mode until the user re-enables it. A second word (default `yellow`) halves the level and is reported in the feedback. This keeps safety inside the roleplay, where the user's attention already is.

A safeword matches only when it is the whole user message or is written out of character (`(red)`, `((red))`, `[red]`, `OOC: red`), so "her red lips" never triggers it. Detection runs on every user `MESSAGE_SENT`, independent of mode and rules, and does not wait for the generation.
