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

export function select<T extends string>(value: T, options: readonly (T | readonly [T, string])[], onChange: (v: T) => void, label?: string) {
  return h(
    "select",
    { class: "tm-input", "aria-label": label, onchange: (e) => onChange((e.target as HTMLSelectElement).value as T) },
    ...options.map((o) => {
      const [v, text] = typeof o === "string" ? [o, o] : o;
      return h("option", { value: v, selected: v === value }, text);
    }),
  );
}

export function slider(label: string, value: number, min: number, max: number, step: number, onCommit: (v: number) => void, unit = "") {
  const out = h("span", { class: "tm-dim" }, `${value}${unit}`);
  const input = h("input", {
    type: "range",
    min,
    max,
    step,
    value,
    "aria-label": label,
    oninput: (e) => (out.textContent = `${(e.target as HTMLInputElement).value}${unit}`),
    onchange: (e) => onCommit(Number((e.target as HTMLInputElement).value)),
  });
  return h("label", { class: "tm-field" }, h("span", {}, label), input, out);
}

export function numberField(label: string, value: number, min: number, max: number, onCommit: (v: number) => void) {
  return h(
    "label",
    { class: "tm-field" },
    h("span", {}, label),
    h("input", { class: "tm-input tm-num", type: "number", min, max, value, onchange: (e) => onCommit(Number((e.target as HTMLInputElement).value)) }),
  );
}

export function toggle(label: string, checked: boolean, onChange: (v: boolean) => void) {
  return h(
    "label",
    { class: "tm-toggle" },
    h("input", { type: "checkbox", checked, onchange: (e) => onChange((e.target as HTMLInputElement).checked) }),
    h("span", {}, label),
  );
}

export function textField(label: string, value: string, onCommit: (v: string) => void, placeholder = "") {
  return h(
    "label",
    { class: "tm-field tm-field-wide" },
    h("span", {}, label),
    h("input", { class: "tm-input", type: "text", value, placeholder, onchange: (e) => onCommit((e.target as HTMLInputElement).value) }),
  );
}

export function button(text: string, onClick: () => void, cls = "", title?: string) {
  return h("button", { type: "button", class: `tm-btn ${cls}`, title, onclick: onClick }, text);
}

export function section(title: string, open: boolean, onToggle: (open: boolean) => void, body: HTMLElement) {
  const d = h("details", { class: "tm-section", open }, h("summary", {}, title), body);
  d.addEventListener("toggle", () => onToggle(d.open));
  return d;
}
