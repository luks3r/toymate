export const PANEL_CSS = `
.tm-panel { display: flex; flex-direction: column; gap: 10px; padding: 10px; color: var(--lumiverse-text); font-size: calc(13px * var(--lumiverse-font-scale, 1)); }
.tm-panel * { box-sizing: border-box; }
.tm-head { display: flex; flex-direction: column; gap: 8px; padding: 10px; border: 1px solid var(--lumiverse-border); border-radius: var(--lumiverse-radius, 8px); background: var(--lumiverse-bg-elevated, var(--lumiverse-fill-subtle)); }
.tm-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.tm-row.tm-spread { justify-content: space-between; }
.tm-status { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
.tm-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--lumiverse-text-muted); }
.tm-dot[data-state="connected"] { background: var(--lumiverse-success, #3fb950); }
.tm-dot[data-state="connecting"] { background: var(--lumiverse-warning); }
.tm-dot[data-active="true"] { box-shadow: 0 0 0 3px var(--lumiverse-primary-020); background: var(--lumiverse-primary); }
.tm-btn { padding: 5px 10px; border-radius: var(--lumiverse-radius, 6px); border: 1px solid var(--lumiverse-border); background: var(--lumiverse-fill); color: var(--lumiverse-text); cursor: pointer; font: inherit; }
.tm-btn:hover:not(:disabled) { background: var(--lumiverse-fill-hover); border-color: var(--lumiverse-border-hover); }
.tm-btn:disabled { opacity: .5; cursor: default; }
.tm-btn.tm-primary { background: var(--lumiverse-primary); color: var(--lumiverse-primary-contrast, #fff); border-color: transparent; }
.tm-btn.tm-stop { width: 100%; padding: 10px; font-size: 1.1em; font-weight: 700; letter-spacing: .04em; background: var(--lumiverse-danger); color: #fff; border-color: transparent; }
.tm-btn.tm-small { padding: 2px 8px; font-size: .9em; }
.tm-btn.tm-danger-text { color: var(--lumiverse-danger); }
.tm-error { color: var(--lumiverse-danger); font-size: .92em; }
.tm-dim { color: var(--lumiverse-text-dim); font-size: .92em; }
.tm-hint { color: var(--lumiverse-text-muted); font-size: .88em; line-height: 1.35; }
.tm-mode[data-mode="story"], .tm-mode[data-mode="reactive"] { color: var(--lumiverse-primary-text, var(--lumiverse-primary)); font-weight: 600; }
.tm-section { border: 1px solid var(--lumiverse-border); border-radius: var(--lumiverse-radius, 8px); background: var(--lumiverse-fill-subtle); }
.tm-section > summary { cursor: pointer; padding: 8px 10px; font-weight: 600; }
.tm-section > div { display: flex; flex-direction: column; gap: 8px; padding: 0 10px 10px; }
.tm-field { display: grid; grid-template-columns: 9em 1fr auto; align-items: center; gap: 6px; }
.tm-field-wide { grid-template-columns: 9em 1fr; }
.tm-field input[type="range"] { width: 100%; accent-color: var(--lumiverse-primary); }
.tm-toggle { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.tm-toggle input { accent-color: var(--lumiverse-primary); }
.tm-input { padding: 4px 6px; border-radius: 6px; border: 1px solid var(--lumiverse-border); background: var(--lumiverse-bg); color: var(--lumiverse-text); font: inherit; min-width: 0; }
.tm-num { width: 5.5em; }
.tm-card { display: flex; flex-direction: column; gap: 6px; padding: 8px; border: 1px solid var(--lumiverse-border-light, var(--lumiverse-border)); border-radius: 6px; background: var(--lumiverse-bg); }
.tm-meter { position: relative; height: 8px; border-radius: 4px; background: var(--lumiverse-fill); overflow: hidden; flex: 1; min-width: 60px; }
.tm-meter > i { position: absolute; inset: 0 auto 0 0; background: var(--lumiverse-primary); }
.tm-meter > b { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--lumiverse-text-dim); }
.tm-zone { display: grid; grid-template-columns: 6em 1fr auto auto; align-items: center; gap: 8px; }
.tm-cues { margin: 0; padding-left: 1.2em; display: flex; flex-direction: column; gap: 3px; }
.tm-resume { padding: 0 6px; margin-right: 2px; }
.tm-rule { display: flex; flex-direction: column; gap: 6px; padding: 8px; border-radius: 6px; border: 1px solid var(--lumiverse-border-light, var(--lumiverse-border)); }
`;
