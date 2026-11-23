---
name: test-toymate
description: Run Toymate in an isolated Lumiverse instance against Intiface simulated devices, for an integrated pass of user-visible changes. Use before handing back UI, trigger, planner, or engine changes.
---

# Test Toymate in Lumiverse

Never use the developer's live Lumiverse data (`~/Projects/Lumiverse/data`). Everything below lives in `.dev/` (git-ignored).

## 1. Build

```sh
bun run check && bun run build
```

## 2. Start an isolated Lumiverse (first time creates the owner)

Run in the background from your own shell so it exits with your session; stop it when done.

```sh
mkdir -p .dev/lumiverse-data
cd ~/Projects/Lumiverse && DATA_DIR="$HOME/Projects/toymate/.dev/lumiverse-data" PORT=7870 \
  FRONTEND_DIR="$HOME/Projects/Lumiverse/frontend/dist" OWNER_USERNAME=dev OWNER_PASSWORD=toymate-dev-pass \
  bun run src/index.ts > ~/Projects/toymate/.dev/lumiverse.log 2>&1
```

It listens on all interfaces. Keep the session short and stop it afterwards.

## 3. Install or update the extension

```sh
D=.dev/lumiverse-data/extensions/toymate/repo; mkdir -p $D && cp -R spindle.json dist package.json $D/
cd .dev
curl -s -c cookies.txt -H 'Content-Type: application/json' -H 'Origin: http://127.0.0.1:7870' \
  -d '{"username":"dev","password":"toymate-dev-pass"}' http://127.0.0.1:7870/api/auth/sign-in/username >/dev/null
O=(-b cookies.txt -H 'Origin: http://127.0.0.1:7870' -H 'Content-Type: application/json')
ID=$(curl -s "${O[@]}" http://127.0.0.1:7870/api/v1/spindle | python3 -c "import json,sys;print(next(e['id'] for e in json.load(sys.stdin) if e['identifier']=='toymate'))" 2>/dev/null \
  || curl -s "${O[@]}" -X POST http://127.0.0.1:7870/api/v1/spindle/import-local | python3 -c "import json,sys;print(json.load(sys.stdin)['imported'][0]['id'])")
curl -s "${O[@]}" -X POST -d '{"grant":["generation","interceptor"]}' http://127.0.0.1:7870/api/v1/spindle/$ID/permissions
curl -s "${O[@]}" -X POST http://127.0.0.1:7870/api/v1/spindle/$ID/enable
```

After a rebuild: copy `dist/` again, `POST /api/v1/spindle/$ID/restart`, and reload the page (the frontend bundle loads on page load). Routes take the extension's UUID, not its identifier.

## 4. Models for Story mode

Prefer the developer's local Ollama (`http://127.0.0.1:11434/v1`) so no chat text leaves the machine. Create a `custom` connection with `POST /api/v1/connections` (`{"name","provider":"custom","api_url","model","is_default":true}`). Use a non-thinking model (`gemma3:4b` answered in about 15 s; thinking models took minutes). gemma3 rejects tools, which exercises the JSON fallback.

Create a test character (`POST /api/v1/characters`) and chat (`POST /api/v1/chats` with `character_id`), then open `/chat/<id>`.

## 5. Drive it

Open `http://localhost:7870`, sign in as `dev`, open the Toymate sidebar tab, Connect. Send output only when every Intiface device is simulated (see [00_development.md](../../../docs/operations/00_development.md#intiface-and-simulated-devices)).

Checks worth repeating: Play a scene and watch "now N / 100"; Stop all and Shift+Esc pause; Resume; set the chat to Story, regenerate, and wait for the cue list; send `(red)` and confirm pause and mode Off; stop a generation.

`.tm-panel` holds the UI; the first `.tm-zone .tm-dim` is the zone readout and the device card shows the last sent value. Plain-DOM queries in `preview_evaluate` are the fastest way to read state.

## 6. Clean up

Stop the Lumiverse process you started (by the PID you captured or your harness's stop), close preview tabs you opened. `.dev/` can stay for next time.
