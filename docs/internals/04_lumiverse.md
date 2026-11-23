# Lumiverse Spindle

Reference: `.repos/Lumiverse/developer-docs/docs` and the `lumiverse-spindle-types` package. Read the doc page for an API before using it; this page lists only the traps that matter for Toymate.

## Extension shape

- `spindle.json` declares permissions. Adding a permission later makes users re-grant it, so add each one in the milestone that needs it, not earlier. Story mode needs `generation` (planner), `interceptor` for character awareness, and `chats` plus `chat_mutation` for planning an earlier reply. Each is optional at runtime: a missing grant disables only its feature.
- The backend runs in a separate Bun process (default `process` runtime mode, `sandbox` on macOS if the operator enables it). Do not assume network or filesystem access beyond Spindle APIs. The backend never needs to reach Intiface.
- The install scanner inspects the backend bundle and blocks patterns such as `eval`, `new Function`, and base64 decoding. Keep backend dependencies minimal and check new ones.
- Settings use `spindle.userStorage` (per user, even on operator-scoped installs).

## Frontend/backend messaging

- `spindle.sendToFrontend(payload, userId)` without `userId` broadcasts to every user on operator-scoped installs. Always pass `userId`, and pass `{ frontendSessionId }` when replying to one document.
- Messages are untrusted JSON on both sides. Validate with the schemas in `src/shared/`.

## Live generations

- Frontend `ctx.events.on` is a raw subscription to the Lumiverse WebSocket; it is not permission-gated. Generation events (`GENERATION_STARTED`, `STREAM_TOKEN_RECEIVED`, `GENERATION_ENDED`, `GENERATION_STOPPED`) arrive in the frontend without the `generation` permission, which only gates backend subscriptions.
- Events are keyed by `generationId`. `GENERATION_STARTED` carries `chatId`, `characterId`, `generationType` (`normal`, `continue`, `regenerate`, `swipe`, `impersonate`, `quiet`), `extensionId` when an extension fired it, and `backgroundSwipe`. Token events carry `seq` and `type: 'reasoning'` for reasoning tokens.
- Generations fired by other extensions (quiet, council, summaries) also stream. Filter them out; see [01_architecture.md](01_architecture.md#live-generations).

## Planner call (`spindle.generate.raw`)

- Needs the `generation` permission. Pass `userId` (required on operator-scoped installs, which local imports are), `connection_id` for the user's chosen profile, `tools` for structured output (`plan_cues`), and `signal` to abort the upstream request.
- Many local models (Ollama, for example gemma3) reject the `tools` field with a 400. The planner retries once without tools and asks for JSON in text; small models often answer with a bare array in a code fence, which the parser accepts.
- Toymate's own planner generations stream over the WebSocket like any other extension generation (with `extensionId`). The generation tracker must ignore them.
- Read the reply text from `GENERATION_ENDED.content` relayed by the frontend. For **Plan last reply**, the backend reads the chat with `spindle.chat.getMessages(chatId, { tail, light: true, includeExtra: false })`.
- `spindle.chat.getMessages` resolves the chat's owner itself and does not restrict operator-scoped extensions to the caller. The chat id comes from the browser, so check ownership with `spindle.chats.get(chatId, userId)` first (`src/backend/last-reply.ts`); otherwise one user could read another user's chat.
- The frontend cannot read message text on current hosts: `ctx.messages.get` is optional and not implemented.
- `MESSAGE_SENT` carries `inserted: true` when a row was inserted into history rather than appended; ignore those. Lumiverse saves the reply row before a thinking model produces content, so never read reply text from the message row early; use `GENERATION_ENDED.content`.
- `CHARACTER_MESSAGE_RENDERED` and `USER_MESSAGE_RENDERED` are render events; they fire for history. Swipe navigation (`MESSAGE_SWIPED` with `action: 'navigated'`) shows an existing variant. Neither may trigger anything.

## Sidebar

- `ctx.ui.registerDrawerTab` is free (no permission), appears in the sidebar and command palette, and supports a badge. Max 8 tabs per extension; Toymate uses one.
- `ctx.ui.registerInputBarAction` (free) adds an entry to the chat input bar's Extras popover; used for Stop all.
- `ctx.getActiveChat()` gives the active chat and character; `CHAT_SWITCHED` signals changes.
- Theme variables (`--lumiverse-text`, `--lumiverse-primary`, `--lumiverse-border`, `--lumiverse-danger`, …) style extension DOM to match the user's theme.

## Tabs and windows

- Lumiverse keeps one primary tab per account and browser. Opening another tab blocks and unloads the old one, so teardown must stop all output.
- Native floating-widget windows load the frontend separately. Only the main document may own a Buttplug connection.
