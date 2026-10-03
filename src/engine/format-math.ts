/**
 * Math-notation formatting + question-text hygiene for display.
 *
 * formatMath: caret/unit ASCII → Unicode (x^2 → x², sqrt → √, pi → π …).
 * Fractions keep their slash: x^3/3 → x³/3.
 * sanitizeStem: strips meta-prefixes ("Drill · X — …", "Practice drill: …")
 * so the card shows a real exam stem. Metadata lives in JSON fields and
 * the tag pill, never in the text. Both are idempotent.
 */

const SUPERSCRIPT: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
  "+": "⁺",
  n: "ⁿ",
  i: "ⁱ",
  x: "ˣ",
};

const SUBSCRIPT: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "-": "₋",
  "+": "₊",
  a: "ₐ",
  e: "ₑ",
  h: "ₕ",
  i: "ᵢ",
  k: "ₖ",
  l: "ₗ",
  m: "ₘ",
  n: "ₙ",
  o: "ₒ",
  p: "ₚ",
  r: "ᵣ",
  s: "ₛ",
  t: "ₜ",
  u: "ᵤ",
  v: "ᵥ",
  x: "ₓ",
};

/** Common LaTeX commands → Unicode / plain function names. */
const LATEX_COMMANDS: Record<string, string> = {
  int: "∫",
  sum: "∑",
  prod: "∏",
  sqrt: "√",
  pi: "π",
  theta: "θ",
  alpha: "α",
  beta: "β",
  infty: "∞",
  infinity: "∞",
  pm: "±",
  times: "×",
  cdot: "·",
  div: "÷",
  to: "→",
  leq: "≤",
  geq: "≥",
  neq: "≠",
  approx: "≈",
  ln: "ln",
  log: "log",
  lg: "lg",
  sin: "sin",
  cos: "cos",
  tan: "tan",
  sec: "sec",
  csc: "csc",
  cot: "cot",
  arcsin: "arcsin",
  arccos: "arccos",
  arctan: "arctan",
  lim: "lim",
  exp: "exp",
};

function supMap(s: string): string {
  return [...s].map((ch) => SUPERSCRIPT[ch] ?? ch).join("");
}

function subMap(s: string): string {
  return [...s].map((ch) => SUBSCRIPT[ch] ?? ch).join("");
}

/**
 * LaTeX → Unicode: strips \( \) delimiters, converts \frac, \sqrt,
 * ^{…} / _{…} groups and \commands. Unmapped commands keep their name.
 */
function latexToUnicode(text: string): string {
  let out = text;
  out = out.replace(/\\[()[\]]/g, "");
  out = out.replace(/\\[,;:! ]/g, " ");
  for (let i = 0; i < 4; i++) {
    const next = out.replace(/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1/($2)");
    if (next === out) break;
    out = next;
  }
  out = out.replace(/\\sqrt\{([^{}]*)\}/g, "√($1)");
  // Named commands BEFORE ^{…}/_{…} groups so \to inside _{…} still matches.
  out = out.replace(/\\([a-zA-Z]+)/g, (_m, cmd: string) => LATEX_COMMANDS[cmd] ?? cmd);
  out = out.replace(/\^\{([^{}]*)\}/g, (_m, s: string) => supMap(s));
  out = out.replace(/_\{([^{}]*)\}/g, (_m, s: string) => subMap(s));
  out = out.replace(/[$]/g, "").replace(/[{}]/g, "");
  // Normalize exotic spaces models emit (nbsp, narrow nbsp, etc.).
  out = out.replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, " ").replace(/ +/g, " ");
  return out.trim();
}

export function formatMath(text: string): string {
  if (!text) return text;
  // LaTeX first: \(…\), \frac, ^{…}, \commands → Unicode/plain.
  let out = latexToUnicode(text);
  // Multi-char operators first so <=, >=, !=, -> never half-convert.
  out = out.replace(/!=/g, "≠");
  out = out.replace(/<=/g, "≤");
  out = out.replace(/>=/g, "≥");
  out = out.replace(/\+\/-/g, "±");
  out = out.replace(/->/g, "→");
  out = out.replace(/\binfinity\b/gi, "∞");
  out = out.replace(/\bsqrt\b/gi, "√");
  out = out.replace(/\btheta\b/gi, "θ");
  out = out.replace(/\balpha\b/gi, "α");
  out = out.replace(/\bbeta\b/gi, "β");
  out = out.replace(/\bpi\b/gi, "π");
  // Caret powers: x^2 → x², x^n handled for digits plus ⁻ ⁺. Slash kept.
  out = out.replace(/\^([0-9+\-]+)/g, (_, exp: string) =>
    [...exp].map((ch) => SUPERSCRIPT[ch] ?? ch).join(""),
  );
  // Bare asterisk → multiplication sign (no markdown in stems).
  out = out.replace(/\*/g, "×");
  return out;
}

const DRILL_PREFIX = /^\s*drill\s*[·•:―—–-]\s*/i;
const DRILL_TAG_PREFIX = /^\s*drill\s*[·•]\s*[^―—–\-:]+?\s*[―—–\-:]\s*/i;
const PRACTICE_PREFIX = /^\s*practice\s*drill\s*:\s*/i;
// Stored seed-bank form: "Stand-in drill Q12 — <stem>".
const STANDIN_PREFIX = /^\s*stand[\s-]*in\s+drill\s+Q\d+\s*[―—–\-:]\s*/i;

/** Strip leading "Drill · … —" / "Practice drill:" meta-prefixes, if any. */
export function sanitizeStem(text: string): string {
  if (!text) return text;
  let out = text;
  for (let i = 0; i < 4; i++) {
    const next = out
      .replace(STANDIN_PREFIX, "")
      .replace(DRILL_TAG_PREFIX, "")
      .replace(PRACTICE_PREFIX, "")
      .replace(DRILL_PREFIX, "")
      .trim();
    if (next === out || next.length === 0) break;
    out = next;
  }
  return out;
}

/**
 * Display-ready question/option text: sanitized, then Unicode math.
 *
 * SECURITY: the returned string must ONLY ever render via React text
 * interpolation ({displayMath(...)} — React escapes it). Never use
 * dangerouslySetInnerHTML, innerHTML, or a markdown renderer on Groq
 * output, bank text, options, or explanations. If HTML rendering is ever
 * needed, sanitize first (allowlist, no scripts/handlers) — no exceptions.
 */
export function displayMath(text: string): string {
  return formatMath(sanitizeStem(text));
}
