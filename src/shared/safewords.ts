export type SafewordHit = "stop" | "ease";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function matches(text: string, word: string): boolean {
  if (!word) return false;
  const w = escape(word);
  const whole = new RegExp(`^[\\s*_~"'(\\[]*${w}[\\s*_~"'.!)\\]]*$`, "i");
  const outOfCharacter = new RegExp(`\\(\\(?\\s*${w}\\s*\\)?\\)|\\[\\s*${w}\\s*\\]|\\booc\\s*[:\\-]\\s*${w}\\b`, "i");
  return whole.test(text.trim()) || outOfCharacter.test(text);
}

/**
 * A safeword counts only as the whole message or written out of character,
 * so in-story uses ("her red lips") never trigger it.
 */
export function matchSafeword(text: string, words: { stop: string; ease: string }): SafewordHit | null {
  if (matches(text, words.stop)) return "stop";
  if (matches(text, words.ease)) return "ease";
  return null;
}
