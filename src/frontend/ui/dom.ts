type Child = Node | string | null | undefined | false;
type Props = Record<string, string | number | boolean | null | undefined | ((e: Event) => void)>;

/** Tiny element builder: props starting with `on` become listeners. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === null || v === undefined || v === false) continue;
    if (typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "value" && "value" in el) (el as HTMLInputElement).value = String(v);
    else if (k === "checked" && el instanceof HTMLInputElement) el.checked = Boolean(v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

const ICONS = {
  stop: '<rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" stroke="none"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  plug: '<path d="M9 7V3M15 7V3M7 7h10v4a5 5 0 0 1-10 0zM12 16v5"/>',
  scan: '<path d="M5 12a7 7 0 0 1 14 0M8 12a4 4 0 0 1 8 0"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  minus: '<path d="M6 12h12"/>',
  plus: '<path d="M12 6v12M6 12h12"/>',
  hold: '<path d="M9 6v12M15 6v12"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
  battery: '<rect x="3" y="8" width="16" height="9" rx="2"/><path d="M21 11v3"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  vibrate: '<path d="M3 12c2-4 3 4 5 0s3 4 5 0 3 4 5 0 2 4 3 0"/>',
  rotate: '<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/>',
  stroke: '<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>',
  air: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/>',
  heat: '<path d="M12 3v11"/><circle cx="12" cy="17" r="3.5"/>',
  dot: '<circle cx="12" cy="12" r="3" fill="currentColor"/>',
} as const;
export type IconName = keyof typeof ICONS;

export function icon(name: IconName, cls = "") {
  const span = h("span", { class: `tm-icon ${cls}`, "aria-hidden": "true" });
  // Static, extension-owned SVG markup only.
  span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
  return span;
}

export function button(content: Child | Child[], onClick: () => void, cls = "", title?: string) {
  const b = h("button", { type: "button", class: `tm-btn ${cls}`, title, "aria-label": title, onclick: onClick });
  b.append(...(Array.isArray(content) ? content : [content]).filter((c): c is Node | string => !!c));
  return b;
}

/** One-of-many buttons; the active one is filled. */
export function segmented<T extends string>(value: T, options: readonly (readonly [T, string])[], onChange: (v: T) => void, label: string, cls = "") {
  return h(
    "div",
    { class: `tm-seg ${cls}`, role: "radiogroup", "aria-label": label },
    ...options.map(([v, text]) =>
      h("button", { type: "button", role: "radio", "aria-checked": String(v === value), class: v === value ? "on" : "", onclick: () => v !== value && onChange(v) }, text),
    ),
  );
}

export function chips<T extends string>(value: T, options: readonly T[], onChange: (v: T) => void, label: string) {
  return h(
    "div",
    { class: "tm-chips", role: "radiogroup", "aria-label": label },
    ...options.map((v) => h("button", { type: "button", role: "radio", "aria-checked": String(v === value), class: v === value ? "on" : "", onclick: () => onChange(v) }, v)),
  );
}

export function select<T extends string>(value: T, options: readonly (T | readonly [T, string])[], onChange: (v: T) => void, label: string) {
  return h(
    "select",
    { class: "tm-input", "aria-label": label, onchange: (e) => onChange((e.target as HTMLSelectElement).value as T) },
    ...options.map((o) => {
      const [v, text] = typeof o === "string" ? [o, o] : o;
      return h("option", { value: v, selected: v === value }, text);
    }),
  );
}

export function range(value: number, min: number, max: number, step: number, onCommit: (v: number) => void, label: string, format = (v: number) => `${v}`) {
  const out = h("output", { class: "tm-range-value" }, format(value));
  const paint = (v: number) => input.style.setProperty("--tm-fill", `${((v - min) / (max - min || 1)) * 100}%`);
  const input = h("input", {
    type: "range",
    min,
    max,
    step,
    value,
    "aria-label": label,
    oninput: (e) => {
      const v = Number((e.target as HTMLInputElement).value);
      out.textContent = format(v);
      paint(v);
    },
    onchange: (e) => onCommit(Number((e.target as HTMLInputElement).value)),
  });
  paint(value);
  return h("div", { class: "tm-range" }, input, out);
}

export function number(value: number, min: number, max: number, onCommit: (v: number) => void, label: string) {
  return h("input", { class: "tm-input tm-num", type: "number", min, max, value, "aria-label": label, onchange: (e) => onCommit(Number((e.target as HTMLInputElement).value)) });
}

/** Number input where empty means "not set". */
export function optNumber(value: number | undefined, min: number, max: number, onCommit: (v: number | undefined) => void, label: string, placeholder = "–") {
  return h("input", {
    class: "tm-input tm-num",
    type: "number",
    min,
    max,
    value: value ?? "",
    placeholder,
    "aria-label": label,
    onchange: (e) => {
      const raw = (e.target as HTMLInputElement).value.trim();
      onCommit(raw === "" ? undefined : Number(raw));
    },
  });
}

export function text(value: string, onCommit: (v: string) => void, label: string, placeholder = "") {
  return h("input", { class: "tm-input", type: "text", value, placeholder, "aria-label": label, onchange: (e) => onCommit((e.target as HTMLInputElement).value) });
}

export function toggle(checked: boolean, onChange: (v: boolean) => void, label: string) {
  return h(
    "label",
    { class: "tm-switch", title: label },
    h("input", { type: "checkbox", role: "switch", checked, "aria-label": label, onchange: (e) => onChange((e.target as HTMLInputElement).checked) }),
    h("span", { class: "tm-switch-track" }),
  );
}

/** Labelled settings row: label (and hint) on the left, control on the right or below. */
export function field(label: string, control: Node, hint?: string, stacked = false) {
  return h(
    "div",
    { class: `tm-field${stacked ? " tm-stacked" : ""}` },
    h("div", { class: "tm-field-label" }, h("span", {}, label), hint ? h("small", {}, hint) : null),
    control,
  );
}

export function group(title: string, ...children: Child[]) {
  return h("section", { class: "tm-group" }, h("h3", {}, title), ...children);
}
