import type { Intent } from "./intent";
import type { Rule, RuleTrigger } from "./settings";

export interface RuleEvent {
  when: RuleTrigger;
  text: string;
  characterId: string | null;
}

const MAX_REGEX_INPUT = 20_000;

export function compileMatcher(match: string): (text: string) => boolean {
  const trimmed = match.trim();
  if (!trimmed) return () => true;
  const regex = /^\/(.+)\/([gimsuy]*)$/s.exec(trimmed);
  if (regex) {
    try {
      const re = new RegExp(regex[1]!, regex[2]!.replace("g", ""));
      return (text) => re.test(text.slice(0, MAX_REGEX_INPUT));
    } catch {
      return () => false;
    }
  }
  const keywords = trimmed
    .split(",")
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);
  return (text) => {
    const lower = text.toLowerCase();
    return keywords.some((k) => new RegExp(`(^|[^\\p{L}\\p{N}])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "u").test(lower));
  };
}

/** Intents of enabled rules matching the event, in rule order. */
export function matchRules(rules: readonly Rule[], event: RuleEvent): Intent[] {
  return rules
    .filter((r) => r.enabled && r.when === event.when && (r.characterId === null || r.characterId === event.characterId))
    .filter((r) => compileMatcher(r.match)(event.text))
    .map((r) => r.then);
}
