/**
 * cleanMathText.ts
 *
 * Converts LaTeX-flavoured strings into clean, readable plain text by:
 *   1. Stripping $$ ... $$ block math delimiters
 *   2. Stripping $ ... $ inline math delimiters
 *   3. Converting common LaTeX commands to Unicode equivalents
 *   4. Removing remaining backslash commands that have no Unicode equivalent
 *   5. Collapsing extra whitespace
 *
 * Use this on ANY plain <Text> component that may receive AI-generated content
 * (quiz questions, explanations, hints, answers, history items, etc.)
 *
 * For full rich-text rendering with proper math layout use AIResponseRenderer instead.
 */

// ─── LaTeX → Unicode conversion table ────────────────────────────────────────
type Replacement = string | ((...args: string[]) => string);
const LATEX_REPLACEMENTS: [RegExp, Replacement][] = [
  // Fractions → (a)/(b)
  [/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)'],
  // Square roots
  [/\\sqrt\{([^}]+)\}/g, '√($1)'],
  [/\\sqrt/g, '√'],
  // Superscripts: x^{n} → xⁿ (simple single digit/letter) else x^(n)
  [/\^{([^}]+)}/g, (_: string, e: string) => toSuperscript(e)],
  [/\^([0-9a-zA-Z])/g, (_: string, e: string) => toSuperscript(e)],
  // Subscripts: x_{n} → x_n
  [/_{([^}]+)}/g, '_$1'],
  [/_([0-9a-zA-Z])/g, '_$1'],
  // Greek letters
  [/\\alpha/g, 'α'], [/\\beta/g, 'β'], [/\\gamma/g, 'γ'], [/\\delta/g, 'δ'],
  [/\\epsilon/g, 'ε'], [/\\zeta/g, 'ζ'], [/\\eta/g, 'η'], [/\\theta/g, 'θ'],
  [/\\iota/g, 'ι'], [/\\kappa/g, 'κ'], [/\\lambda/g, 'λ'], [/\\mu/g, 'μ'],
  [/\\nu/g, 'ν'], [/\\xi/g, 'ξ'], [/\\pi/g, 'π'], [/\\rho/g, 'ρ'],
  [/\\sigma/g, 'σ'], [/\\tau/g, 'τ'], [/\\upsilon/g, 'υ'], [/\\phi/g, 'φ'],
  [/\\chi/g, 'χ'], [/\\psi/g, 'ψ'], [/\\omega/g, 'ω'],
  [/\\Alpha/g, 'Α'], [/\\Beta/g, 'Β'], [/\\Gamma/g, 'Γ'], [/\\Delta/g, 'Δ'],
  [/\\Theta/g, 'Θ'], [/\\Lambda/g, 'Λ'], [/\\Pi/g, 'Π'], [/\\Sigma/g, 'Σ'],
  [/\\Phi/g, 'Φ'], [/\\Psi/g, 'Ψ'], [/\\Omega/g, 'Ω'],
  // Operators and symbols
  [/\\times/g, '×'], [/\\div/g, '÷'], [/\\pm/g, '±'], [/\\mp/g, '∓'],
  [/\\cdot/g, '·'], [/\\cdots/g, '···'], [/\\ldots/g, '...'],
  [/\\infty/g, '∞'], [/\\partial/g, '∂'], [/\\nabla/g, '∇'],
  [/\\int/g, '∫'], [/\\oint/g, '∮'], [/\\sum/g, 'Σ'], [/\\prod/g, 'Π'],
  [/\\lim/g, 'lim'], [/\\log/g, 'log'], [/\\ln/g, 'ln'], [/\\sin/g, 'sin'],
  [/\\cos/g, 'cos'], [/\\tan/g, 'tan'], [/\\cot/g, 'cot'], [/\\sec/g, 'sec'],
  [/\\csc/g, 'csc'], [/\\arcsin/g, 'arcsin'], [/\\arccos/g, 'arccos'],
  [/\\arctan/g, 'arctan'], [/\\exp/g, 'exp'], [/\\max/g, 'max'], [/\\min/g, 'min'],
  // Comparison / logic
  [/\\leq/g, '≤'], [/\\geq/g, '≥'], [/\\neq/g, '≠'], [/\\approx/g, '≈'],
  [/\\equiv/g, '≡'], [/\\sim/g, '~'], [/\\propto/g, '∝'],
  [/\\in/g, '∈'], [/\\notin/g, '∉'], [/\\subset/g, '⊂'], [/\\supset/g, '⊃'],
  [/\\cup/g, '∪'], [/\\cap/g, '∩'], [/\\emptyset/g, '∅'],
  [/\\forall/g, '∀'], [/\\exists/g, '∃'], [/\\neg/g, '¬'],
  [/\\land/g, '∧'], [/\\lor/g, '∨'],
  // Arrows
  [/\\rightarrow/g, '→'], [/\\leftarrow/g, '←'], [/\\Rightarrow/g, '⇒'],
  [/\\Leftarrow/g, '⇐'], [/\\leftrightarrow/g, '↔'], [/\\Leftrightarrow/g, '⇔'],
  [/\\to/g, '→'],
  // Brackets / delimiters
  [/\\left\s*\(/g, '('], [/\\right\s*\)/g, ')'],
  [/\\left\s*\[/g, '['], [/\\right\s*\]/g, ']'],
  [/\\left\s*\{/g, '{'], [/\\right\s*\}/g, '}'],
  [/\\left\s*\|/g, '|'], [/\\right\s*\|/g, '|'],
  [/\\left/g, ''], [/\\right/g, ''],
  [/\\langle/g, '⟨'], [/\\rangle/g, '⟩'],
  // Text wrappers
  [/\\text\{([^}]+)\}/g, '$1'],
  [/\\mathrm\{([^}]+)\}/g, '$1'],
  [/\\mathbf\{([^}]+)\}/g, '$1'],
  [/\\mathit\{([^}]+)\}/g, '$1'],
  [/\\mathbb\{([^}]+)\}/g, '$1'],
  [/\\mathcal\{([^}]+)\}/g, '$1'],
  [/\\operatorname\{([^}]+)\}/g, '$1'],
  [/\\overline\{([^}]+)\}/g, '$1̄'],
  [/\\hat\{([^}]+)\}/g, '$1̂'],
  [/\\vec\{([^}]+)\}/g, '$1⃗'],
  [/\\bar\{([^}]+)\}/g, '$1̄'],
  [/\\tilde\{([^}]+)\}/g, '$1̃'],
  // Misc
  [/\\degree/g, '°'], [/\\circ/g, '°'],
  [/\\%/g, '%'],
  [/\\\\/g, ' '],  // line break in LaTeX → space
  [/\\,/g, ' '], [/\\;/g, ' '], [/\\:/g, ' '], [/\\!/g, ''],
  [/\\quad/g, '  '], [/\\qquad/g, '    '],
  // Remove remaining unknown \commands (but keep the argument if present)
  [/\\[a-zA-Z]+\{([^}]+)\}/g, '$1'],
  [/\\[a-zA-Z]+/g, ''],
  // Remove stray curly braces left over
  [/\{([^}]*)\}/g, '$1'],
  [/[{}]/g, ''],
];

// Superscript map for common characters
const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  'n': 'ⁿ', 'i': 'ⁱ',
};

function toSuperscript(s: string): string {
  // If every character has a superscript mapping, use it
  if ([...s].every(c => SUPERSCRIPT_MAP[c])) {
    return [...s].map(c => SUPERSCRIPT_MAP[c]).join('');
  }
  // Otherwise wrap in parens
  return s.length === 1 ? `^${s}` : `^(${s})`;
}

/**
 * Convert a LaTeX-flavoured string to clean readable plain text.
 * Strips $/$$ delimiters and converts common LaTeX commands to Unicode.
 *
 * @param text - Raw string that may contain LaTeX math
 * @returns Clean plain text suitable for a React Native <Text> component
 */
export function cleanMathText(text: string | null | undefined): string {
  if (!text) return '';
  let s = text;

  // 1. Strip block math delimiters $$...$$ → content only
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => inner.trim());

  // 2. Strip inline math delimiters $...$ → content only
  s = s.replace(/\$([^$\n]+?)\$/g, (_, inner) => inner.trim());

  // 3. Apply LaTeX → Unicode conversions
  for (const [pattern, replacement] of LATEX_REPLACEMENTS) {
    if (typeof replacement === 'string') {
      s = s.replace(pattern, replacement);
    } else {
      s = s.replace(pattern, replacement as (...args: string[]) => string);
    }
  }

  // 4. Clean up extra whitespace
  s = s.replace(/[ \t]{2,}/g, ' ').trim();

  return s;
}

/**
 * Convenience: clean math text and also strip Markdown formatting symbols
 * (*, **, #, >, -, etc.) for use in single-line preview text like history items.
 */
export function cleanMathTextPlain(text: string | null | undefined): string {
  const cleaned = cleanMathText(text);
  return cleaned
    .replace(/#{1,6}\s*/g, '')       // headings
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1')  // bold/italic
    .replace(/`([^`]+)`/g, '$1')     // inline code
    .replace(/^[-*+]\s+/gm, '')      // list bullets
    .replace(/^\d+\.\s+/gm, '')      // numbered lists
    .replace(/^>\s*/gm, '')          // blockquotes
    .replace(/\n+/g, ' ')            // newlines → space
    .trim();
}
