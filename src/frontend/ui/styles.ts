export const PANEL_CSS = `
.tm { --tm-r: 10px; --tm-gap: 12px; --tm-ok: var(--lumiverse-success, #3fb950); display: flex; flex-direction: column; gap: var(--tm-gap); padding: 12px; color: var(--lumiverse-text); font-size: calc(13px * var(--lumiverse-font-scale, 1)); line-height: 1.4; }
.tm * { box-sizing: border-box; }
.tm [hidden] { display: none !important; }
.tm-icon { display: inline-flex; width: 1.15em; height: 1.15em; flex: none; }
.tm-icon svg { width: 100%; height: 100%; }

/* buttons */
.tm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 12px; border-radius: 8px; border: 1px solid var(--lumiverse-border); background: var(--lumiverse-fill); color: var(--lumiverse-text); font: inherit; font-weight: 500; cursor: pointer; transition: background var(--lumiverse-transition-fast, .12s), border-color var(--lumiverse-transition-fast, .12s); }
.tm-btn:hover:not(:disabled) { background: var(--lumiverse-fill-hover); border-color: var(--lumiverse-border-hover); }
.tm-btn:focus-visible, .tm-seg button:focus-visible, .tm-chips button:focus-visible, .tm-tabs button:focus-visible { outline: 2px solid var(--lumiverse-primary); outline-offset: 2px; }
.tm-btn:disabled { opacity: .45; cursor: default; }
.tm-btn.primary { background: var(--lumiverse-primary); border-color: transparent; color: var(--lumiverse-primary-contrast, #fff); }
.tm-btn.primary:hover:not(:disabled) { background: var(--lumiverse-primary); filter: brightness(1.08); }
.tm-btn.ghost { background: transparent; border-color: transparent; color: var(--lumiverse-text-dim); }
.tm-btn.ghost:hover:not(:disabled) { color: var(--lumiverse-text); background: var(--lumiverse-fill-subtle); }
.tm-btn.sm { padding: 3px 9px; font-size: .92em; border-radius: 7px; }
.tm-btn.icon-only { padding: 5px; }
.tm-btn.danger-text { color: var(--lumiverse-danger); }

/* header */
.tm-top { display: flex; flex-direction: column; gap: 10px; }
.tm-conn { display: flex; align-items: center; gap: 8px; }
.tm-conn-text { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.tm-conn-text b { font-weight: 600; }
.tm-conn-text small { color: var(--lumiverse-text-muted); font-size: .88em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tm-dot { width: 10px; height: 10px; border-radius: 50%; flex: none; background: var(--lumiverse-text-muted); transition: background .2s, box-shadow .2s; }
.tm-dot[data-state="connected"] { background: var(--tm-ok); box-shadow: 0 0 0 3px color-mix(in srgb, var(--tm-ok) 22%, transparent); }
.tm-dot[data-state="connecting"] { background: var(--lumiverse-warning); }
.tm-dot[data-active="true"] { background: var(--lumiverse-primary); box-shadow: 0 0 0 3px var(--lumiverse-primary-020); }
.tm-stop { width: 100%; padding: 12px; border-radius: var(--tm-r); border: none; background: var(--lumiverse-danger); color: #fff; font-size: 1.08em; font-weight: 700; letter-spacing: .06em; }
.tm-stop:hover:not(:disabled) { background: var(--lumiverse-danger); filter: brightness(1.08); }
.tm-stop small { font-weight: 500; letter-spacing: 0; opacity: .75; font-size: .78em; }
.tm-paused { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: var(--tm-r); background: color-mix(in srgb, var(--lumiverse-warning) 14%, transparent); border: 1px solid color-mix(in srgb, var(--lumiverse-warning) 45%, transparent); }
.tm-paused div { flex: 1; display: flex; flex-direction: column; }
.tm-paused small { color: var(--lumiverse-text-dim); }
.tm-alert { padding: 8px 10px; border-radius: 8px; font-size: .92em; color: var(--lumiverse-danger); background: color-mix(in srgb, var(--lumiverse-danger) 10%, transparent); }

/* tabs */
.tm-tabs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px; padding: 3px; border-radius: var(--tm-r); background: var(--lumiverse-fill-subtle); border: 1px solid var(--lumiverse-border); }
.tm-tabs button { padding: 6px 4px; border: none; border-radius: 7px; background: transparent; color: var(--lumiverse-text-dim); font: inherit; font-weight: 500; cursor: pointer; }
.tm-tabs button.on { background: var(--lumiverse-bg-elevated, var(--lumiverse-fill)); color: var(--lumiverse-text); box-shadow: 0 1px 2px rgb(0 0 0 / .18); }
.tm-tab { display: flex; flex-direction: column; gap: var(--tm-gap); }

/* groups and fields */
.tm-group { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: var(--tm-r); border: 1px solid var(--lumiverse-border); background: var(--lumiverse-fill-subtle); }
.tm-group > h3 { margin: 0; font-size: .78em; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--lumiverse-text-muted); display: flex; align-items: center; gap: 8px; }
.tm-group > h3 .tm-btn { margin-left: auto; text-transform: none; letter-spacing: 0; font-weight: 500; }
.tm-field { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.tm-field.tm-stacked { flex-direction: column; align-items: stretch; gap: 6px; }
.tm-field-label { display: flex; flex-direction: column; min-width: 0; }
.tm-field-label small, .tm-hint { color: var(--lumiverse-text-muted); font-size: .88em; }
.tm-hint { margin: 0; line-height: 1.45; }
.tm-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.tm-grow { flex: 1; min-width: 0; }

/* inputs */
.tm-input { padding: 6px 8px; border-radius: 8px; border: 1px solid var(--lumiverse-border); background: var(--lumiverse-bg); color: var(--lumiverse-text); font: inherit; min-width: 0; }
.tm-input:focus { outline: none; border-color: var(--lumiverse-primary); box-shadow: 0 0 0 3px var(--lumiverse-primary-015, transparent); }
.tm-num { width: 5.5em; text-align: right; }
.tm-range { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 120px; }
.tm .tm-range input[type="range"] { flex: 1; min-width: 0; height: 6px; min-height: 0; padding: 0; margin: 8px 0; border-radius: 3px; -webkit-appearance: none; appearance: none; cursor: pointer; background: linear-gradient(to right, var(--lumiverse-primary) var(--tm-fill, 0%), var(--lumiverse-fill-hover, var(--lumiverse-border)) var(--tm-fill, 0%)); }
.tm-range input::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--lumiverse-primary); border: 3px solid var(--lumiverse-bg); box-shadow: 0 0 0 1px var(--lumiverse-primary); }
.tm-range input::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: var(--lumiverse-primary); border: 3px solid var(--lumiverse-bg); box-shadow: 0 0 0 1px var(--lumiverse-primary); }
.tm-range input:focus-visible { outline: 2px solid var(--lumiverse-primary); outline-offset: 4px; }
.tm-range-value { min-width: 3.2em; text-align: right; font-variant-numeric: tabular-nums; color: var(--lumiverse-text-dim); }
.tm-switch { position: relative; display: inline-flex; flex: none; cursor: pointer; }
.tm-switch input { position: absolute; opacity: 0; inset: 0; margin: 0; cursor: pointer; }
.tm-switch-track { width: 36px; height: 20px; border-radius: 10px; background: var(--lumiverse-fill-hover, var(--lumiverse-border)); transition: background .15s; position: relative; }
.tm-switch-track::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform .15s; box-shadow: 0 1px 2px rgb(0 0 0 / .3); }
.tm-switch input:checked + .tm-switch-track { background: var(--lumiverse-primary); }
.tm-switch input:checked + .tm-switch-track::after { transform: translateX(16px); }
.tm-switch input:focus-visible + .tm-switch-track { outline: 2px solid var(--lumiverse-primary); outline-offset: 2px; }

/* segmented + chips */
.tm-seg { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 2px; padding: 3px; border-radius: 9px; background: var(--lumiverse-bg); border: 1px solid var(--lumiverse-border); }
.tm-seg button { padding: 6px 8px; border: none; border-radius: 6px; background: transparent; color: var(--lumiverse-text-dim); font: inherit; font-weight: 500; cursor: pointer; }
.tm-seg button.on { background: var(--lumiverse-primary); color: var(--lumiverse-primary-contrast, #fff); }
.tm-seg.big button { padding: 8px; font-weight: 600; }
.tm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.tm-chips button { padding: 4px 11px; border-radius: 999px; border: 1px solid var(--lumiverse-border); background: var(--lumiverse-bg); color: var(--lumiverse-text-dim); font: inherit; cursor: pointer; }
.tm-chips button:hover { border-color: var(--lumiverse-border-hover); color: var(--lumiverse-text); }
.tm-chips button.on { border-color: var(--lumiverse-primary); background: var(--lumiverse-primary); color: var(--lumiverse-primary-contrast, #fff); }

/* live zones */
.tm-zones { display: flex; flex-direction: column; gap: 8px; }
.tm-zone { display: grid; grid-template-columns: 1fr auto; grid-template-rows: auto auto; gap: 6px 10px; align-items: center; padding: 10px 12px; border-radius: var(--tm-r); background: var(--lumiverse-bg); border: 1px solid var(--lumiverse-border); }
.tm-zone-name { font-weight: 600; display: flex; align-items: baseline; gap: 8px; min-width: 0; }
.tm-zone-name small { font-weight: 400; color: var(--lumiverse-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tm-zone-level { font-size: 1.5em; font-weight: 700; font-variant-numeric: tabular-nums; text-align: right; line-height: 1; }
.tm-zone[data-idle="true"] .tm-zone-level { color: var(--lumiverse-text-muted); }
.tm-bar { grid-column: 1 / -1; position: relative; height: 8px; border-radius: 4px; background: var(--lumiverse-fill); overflow: hidden; }
.tm-bar > i { position: absolute; inset: 0 auto 0 0; border-radius: 4px; background: linear-gradient(90deg, var(--lumiverse-primary-050, var(--lumiverse-primary)), var(--lumiverse-primary)); transition: width .12s linear; }
.tm-bar > b { position: absolute; top: -2px; bottom: -2px; width: 2px; border-radius: 1px; background: var(--lumiverse-text); opacity: .55; transition: left .2s; }
.tm-zone .tm-lock[aria-pressed="true"] { color: var(--lumiverse-warning); }
.tm-reactions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.tm-reactions .tm-btn { padding: 7px 4px; }

/* cue timeline */
.tm-cues { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; max-height: 320px; overflow-y: auto; }
.tm-cue { display: grid; grid-template-columns: auto 1fr auto; gap: 2px 8px; align-items: center; padding: 6px 6px 6px 4px; border-radius: 8px; border-left: 3px solid transparent; }
.tm-cue .tm-btn { grid-row: span 2; }
.tm-cue b { font-weight: 600; font-size: .95em; }
.tm-cue q { grid-column: 2 / -1; color: var(--lumiverse-text-dim); font-size: .9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; quotes: "“" "”"; }
.tm-cue-state { font-size: .82em; color: var(--lumiverse-text-muted); font-variant-numeric: tabular-nums; }
.tm-cue[data-state="current"] { background: var(--lumiverse-primary-010, var(--lumiverse-fill-subtle)); border-left-color: var(--lumiverse-primary); }
.tm-cue[data-state="current"] .tm-cue-state { color: var(--lumiverse-primary-text, var(--lumiverse-primary)); font-weight: 600; }
.tm-cue[data-state="skipped"], .tm-cue[data-state="played"] { opacity: .55; }
.tm-cue[data-state="stopped"] .tm-cue-state { color: var(--lumiverse-warning); }

/* devices */
.tm-device { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-radius: var(--tm-r); border: 1px solid var(--lumiverse-border); background: var(--lumiverse-fill-subtle); }
.tm-device-head { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.tm-device-head small { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; font-weight: 400; color: var(--lumiverse-text-dim); }
.tm-output { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 8px; background: var(--lumiverse-bg); border: 1px solid var(--lumiverse-border-light, var(--lumiverse-border)); }
.tm-output-head { display: flex; align-items: center; gap: 8px; }
.tm-output-head .tm-kind { display: inline-flex; align-items: center; gap: 6px; font-weight: 500; }
.tm-output-head .tm-mini { flex: 1; height: 6px; border-radius: 3px; background: var(--lumiverse-fill); overflow: hidden; position: relative; min-width: 40px; }
.tm-output-head .tm-mini i { position: absolute; inset: 0 auto 0 0; background: var(--lumiverse-primary); transition: width .12s linear; }
.tm-badge { font-size: .78em; padding: 1px 7px; border-radius: 999px; background: color-mix(in srgb, var(--lumiverse-warning) 18%, transparent); color: var(--lumiverse-warning); white-space: nowrap; }
.tm-calibrate { display: flex; flex-direction: column; gap: 8px; padding-top: 4px; border-top: 1px dashed var(--lumiverse-border); }
.tm-disclose { display: inline-flex; align-items: center; gap: 4px; }
.tm-disclose .tm-icon { transition: transform .15s; }
.tm-disclose[aria-expanded="true"] .tm-icon { transform: rotate(90deg); }
.tm-zone-chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.tm-zone-chip { display: inline-flex; align-items: center; gap: 2px; padding: 2px 4px 2px 10px; border-radius: 999px; background: var(--lumiverse-bg); border: 1px solid var(--lumiverse-border); }
.tm-zone-chip .tm-btn { padding: 1px 4px; border: none; background: none; color: var(--lumiverse-text-muted); }
.tm-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 20px 12px; border-radius: var(--tm-r); border: 1px dashed var(--lumiverse-border); color: var(--lumiverse-text-dim); }
.tm-empty .tm-icon { width: 28px; height: 28px; color: var(--lumiverse-text-muted); }

/* rules */
.tm-rule { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 8px; background: var(--lumiverse-bg); border: 1px solid var(--lumiverse-border-light, var(--lumiverse-border)); }
.tm-rule[data-off="true"] { opacity: .6; }
.tm-rule .tm-word { color: var(--lumiverse-text-muted); font-size: .9em; min-width: 2.6em; }
.tm-rule input[type="text"] { flex: 1; }
.tm-rule .tm-num { width: 100%; }
.tm-then { display: grid; grid-template-columns: 2.6em 1fr 1fr 1fr; gap: 6px; align-items: center; }
.tm-then > select { width: 100%; }
.tm-then-where { grid-template-columns: 2.6em 1fr auto 2fr; }
.tm-dyn { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 6px; align-items: center; }
.tm-dyn .tm-num { width: 100%; }
.tm-then .tm-word { min-width: 0; }
.tm-nowrap { flex-wrap: nowrap; }
.tm-nowrap select.tm-input { flex: 1; min-width: 0; }
`;
