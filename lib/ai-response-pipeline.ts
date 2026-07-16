/**
 * AI Response Processing Pipeline
 *
 * Every AI-generated response must pass through this pipeline before rendering.
 * It sanitizes artifacts, normalizes formatting, and repairs malformed content
 * so that AIResponseRenderer always receives clean, well-formed Markdown.
 */

// ─── Phase 1: Normalize line endings ────────────────────────────────────────

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

// ─── Phase 2: Remove invisible / zero-width Unicode characters ───────────────

function removeInvisibleCharacters(text: string): string {
  return text
    .replace(/[\u200B\u200C\u200D]/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/\u00AD/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/[\uFFFC\uFFFD]/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// ─── Phase 3: Remove AI generation artifacts ─────────────────────────────────

function removeAIArtifacts(text: string): string {
  return text
    .replace(/^(Sure[,!]?\s+|Of course[,!]?\s+|Certainly[,!]?\s+|Absolutely[,!]?\s+|Great[,!]?\s+|Here(?:'s| is) (?:the |a )?(?:solution|answer|explanation|response)[:\s]*\n*)/i, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/\[PLACEHOLDER[^\]]*\]/g, '')
    .replace(/\[AI_RESPONSE_START\]|\[AI_RESPONSE_END\]/g, '')
    .replace(/<!--\s*AI[^>]*-->/g, '')
    .replace(/\n+(?:Is there anything else|Would you like me to|Feel free to ask|Let me know if)[^.]*\.\s*$/i, '');
}

// ─── Phase 4: Normalize LaTeX delimiters ─────────────────────────────────────
// AIResponseRenderer expects $...$ for inline and $$...$$ for block math.

function normalizeLaTeXDelimiters(text: string): string {
  // Protect escaped dollar signs first
  let result = text.replace(/\\\$/g, '\x01DOLLAR\x01');
  // \[...\] → $$...$$  (block math)
  result = result.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_, inner) => `\n\n$$${inner.trim()}$$\n\n`);
  // \(...\) → $...$  (inline math)
  result = result.replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_, inner) => `$${inner.trim()}$`);
  return result;
}

function restoreEscapedDollars(text: string): string {
  return text.replace(/\x01DOLLAR\x01/g, '\\$');
}

// ─── Phase 5: Repair malformed LaTeX ─────────────────────────────────────────

function repairLaTeX(text: string): string {
  const lines = text.split('\n');
  const repaired = lines.map(line => {
    const hasMath = /\$/.test(line);
    if (!hasMath) {
      line = line.replace(/\\begin\{[^}]*\}/g, '');
      line = line.replace(/\\end\{[^}]*\}/g, '');
    }
    return line;
  });
  return repaired.join('\n');
}

// ─── Phase 6: Repair malformed Markdown ──────────────────────────────────────

function repairMarkdown(text: string): string {
  const lines = text.split('\n');
  const repaired: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Fix headings missing space after #: "#Title" → "# Title"
    line = line.replace(/^(#{1,6})([^#\s])/, '$1 $2');

    // Fix list items missing space after marker: "-item" → "- item", "1.item" → "1. item"
    line = line.replace(/^(\s*[-*+])([^\s])/, '$1 $2');
    line = line.replace(/^(\s*\d+\.)([^\s])/, '$1 $2');

    repaired.push(line);
  }

  return repaired.join('\n');
}

// ─── Phase 7: Normalize spacing (CONSERVATIVE — preserve punctuation) ────────

function normalizeSpacing(text: string): string {
  return text
    // Collapse 4+ consecutive blank lines to 2 (keep double-newlines for paragraphs)
    .replace(/\n{4,}/g, '\n\n\n')
    // Remove trailing spaces on each line
    .replace(/[ \t]+$/gm, '')
    // Collapse 3+ spaces to 1 (but not inside code blocks — handled by renderer)
    .replace(/[ \t]{3,}(?![\t])/g, ' ')
    // Remove duplicate punctuation (!! → !, ?? → ?)
    .replace(/([!?])\1+/g, '$1')
    .trim();
  // NOTE: We intentionally do NOT convert em-dashes, smart quotes, or ellipsis —
  // these are valid typographic characters that should render as-is.
}

// ─── Phase 8: Validate — detect remaining raw artifacts ──────────────────────

export interface PipelineValidationResult {
  passed: boolean;
  issues: string[];
}

export function validateRenderedContent(text: string): PipelineValidationResult {
  const issues: string[] = [];

  const bareLatex = /(?<!\$)\\(frac|sqrt|pm|neq|left|right|begin|end|text|cdot|sum|prod|int|alpha|beta|gamma|theta|pi|lambda|rightarrow|Rightarrow|times|ge|le)\b/;
  if (bareLatex.test(text)) {
    issues.push('Raw LaTeX commands detected outside math delimiters');
  }

  if (/\{\{[^}]+\}\}/.test(text)) {
    issues.push('Template placeholders detected');
  }

  if (/\x00/.test(text)) {
    issues.push('Null bytes detected');
  }

  return { passed: issues.length === 0, issues };
}

// ─── Main pipeline export ─────────────────────────────────────────────────────

export function processAIResponse(
  raw: string,
  options: {
    stripPreamble?: boolean;
    normalizeLaTeX?: boolean;
  } = {}
): string {
  if (!raw || typeof raw !== 'string') return '';

  const { stripPreamble = true, normalizeLaTeX = true } = options;

  let text = raw;

  text = normalizeLineEndings(text);
  text = removeInvisibleCharacters(text);

  if (stripPreamble) {
    text = removeAIArtifacts(text);
  }

  if (normalizeLaTeX) {
    text = normalizeLaTeXDelimiters(text);
  }

  text = repairLaTeX(text);
  text = repairMarkdown(text);
  text = normalizeSpacing(text);

  if (normalizeLaTeX) {
    text = restoreEscapedDollars(text);
  }

  return text;
}

/**
 * Process a streaming chunk — lighter pipeline for incremental updates.
 */
export function processStreamingChunk(chunk: string): string {
  if (!chunk || typeof chunk !== 'string') return '';

  let text = chunk;
  text = normalizeLineEndings(text);
  text = removeInvisibleCharacters(text);
  text = normalizeLaTeXDelimiters(text);
  text = restoreEscapedDollars(text);
  return text;
}
