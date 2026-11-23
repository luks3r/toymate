# Buttplug

## Library choice

We use the official client, [`buttplug`](https://www.npmjs.com/package/buttplug) v5 (Buttplug spec v4), in the frontend only, with `ButtplugBrowserWebsocketClientConnector`. It has two small dependencies and tracks the spec author's server. The community client `@zendrex/buttplug.js` is a reasonable fallback if the official one falls behind; switching is contained to the client adapter.

Source for reference: `.repos/buttplug-js` (`bun run sync:repos`). Protocol docs: <https://docs.buttplug.io/docs/spec>.

## Traps

- **Root import pulls the Node connector.** `buttplug`'s root entry re-exports `ButtplugNodeWebsocketClientConnector`, which imports `ws`. Verified: `bun build --target browser` resolves `ws` to its browser stub; a client-plus-connector bundle is about 34 KB minified. Recheck if the bundle grows suddenly.
- **Ranges are per output and validated client-side.** Spec v4 vibrate on Intiface's simulated device is `[0, 100]`, not the v3 `0..20`. The library rejects out-of-range values with an error, so convert and clamp before building a command. Use `DeviceOutput.<Type>.percent()` only after the governor has applied calibration.
- **Spec v4 is feature-based.** A device exposes features; each feature exposes outputs with their own value ranges. Convert levels to each output's range in one place (the governor). Do not assume one device equals one motor.
- **Device indexes are per connection.** Persisted targets must key on something stable (device name plus feature index, with the user able to remap), and must tolerate the device not being present.
- **Message timing gap.** Devices report a minimum gap between messages (`messageTimingGap`, 100 ms on the simulated device). Intiface acknowledges commands in about a millisecond regardless (20 back-to-back commands acked in 4 ms), so acks do not mean the device received anything and the server does not throttle for us. The governor must enforce the gap; flooding causes lag that outlives a stop.
- **Stop is a command, not a state.** After disconnect, devices may keep running their last value until Intiface stops them. Always send stop before disconnecting, and treat Intiface's own "stop on disconnect" as a backup, not the plan.
- **Simulated devices.** Intiface Central can expose simulated devices (names start with `Simulated`). They accept output commands like real ones and are the default target for manual integration passes.
- **Scanning is explicit.** Devices appear only after `startScanning()` (or if Intiface already knows them). Scanning stops on its own after a while on some platforms.
- **Mixed content.** An `https://` Lumiverse page may open `ws://127.0.0.1` and `ws://localhost` in Chromium and Firefox because loopback counts as potentially trustworthy. Safari and WKWebView (Lumiverse Desktop on macOS) must be verified. A LAN address (`ws://192.168.x.x`) from an `https://` page is blocked everywhere; document the workaround instead of building one.
