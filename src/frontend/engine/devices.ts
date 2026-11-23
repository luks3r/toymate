import { prefsFor, type Settings } from "../../shared/settings";

export const OUTPUT_KINDS = [
  "Vibrate",
  "Rotate",
  "Oscillate",
  "Constrict",
  "Inflate",
  "HwPositionWithDuration",
  "Position",
  "Temperature",
  "Spray",
  "Led",
] as const;
export type OutputKind = (typeof OUTPUT_KINDS)[number];

/**
 * Output kinds Toymate never drives. `Position` jumps to a set point at device
 * speed, which we cannot limit; strokers are driven through HwPositionWithDuration.
 */
export const UNDRIVEN = new Set<OutputKind>(["Spray", "Led", "Position"]);
/** Output kinds driven only when their zone is named, never by `all`. */
export const NAMED_ZONE_ONLY = new Set<OutputKind>(["Temperature"]);

export interface OutputInfo {
  /** Stable across connections: device name, ordinal among same-named devices, feature, kind. */
  key: string;
  deviceIndex: number;
  deviceName: string;
  featureIndex: number;
  kind: OutputKind;
  range: readonly [number, number];
  durationRange?: readonly [number, number];
  timingGapMs: number;
}

export interface DeviceInfo {
  index: number;
  name: string;
  outputs: OutputInfo[];
  battery: number | null;
}

export function outputKey(deviceName: string, ordinal: number, featureIndex: number, kind: OutputKind): string {
  return `${deviceName}${ordinal > 1 ? ` (${ordinal})` : ""}#${featureIndex}#${kind}`;
}

/**
 * Director scene an output follows, or null if never driven. Named-only kinds
 * follow a separate scene that `all` intents do not touch.
 */
export function sceneKeyFor(output: OutputInfo, settings: Settings): string | null {
  if (UNDRIVEN.has(output.kind)) return null;
  const zone = prefsFor(settings, output.key).zone;
  return NAMED_ZONE_ONLY.has(output.kind) ? namedSceneKey(zone) : zone;
}

export const namedSceneKey = (zone: string) => `${zone}:named`;

export function describeKind(kind: OutputKind): string {
  switch (kind) {
    case "HwPositionWithDuration":
    case "Position":
      return "stroke";
    default:
      return kind.toLowerCase();
  }
}
