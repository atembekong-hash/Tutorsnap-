/**
 * AI Response Processing Pipeline
 *
 * Every AI-generated response must pass through this pipeline before rendering.
 * It sanitizes artifacts, normalizes formatting, and repairs malformed content
 * so that EnrichedMarkdownText always receives clean, well-formed Markdown.
 *
 * Usage:
 *   import { processAIResponse } from '@/lib/ai-response-pipeline';
 *   const clean = processAIResponse(rawAIText);
 *   <AIResponseRenderer markdown={clean} />
 */

// ─── Phase 1: Normalize line endings ────────────────────────────────────────

function normalizeLineEndings(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

// ─── Phase 2: Remove invisible / zero-width Unicode characters ───────────────

function removeInvisibleCharacters(text: string): string {
  return text
    // Zero-width space, zero-width non-joiner, zero-width joiner
    .replace(/[\u200B\u200C\u200D]/g, '')
    // Zero-width no-break space (BOM when not at start)
    .replace(/\uFEFF/g, '')
    // Soft hyphen
    .replace(/\u00AD/g, '')
    // Non-breaking space → regular space (preserve layout intent)
    .replace(/\u00A0/g, ' ')
    // Left-to-right / right-to-left marks
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
    // Object replacement character, replacement character
    .replace(/[\uFFFC\uFFFD]/g, '')
    // Null bytes and other control characters (except tab, LF)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// ─── Phase 3: Remove AI generation artifacts ─────────────────────────────────

function removeAIArtifacts(text: string): string {
  return text
    // Common AI preamble patterns
    .replace(/^(Sure[,!]?\s+|Of course[,!]?\s+|Certainly[,!]?\s+|Absolutely[,!]?\s+|Great[,!]?\s+|Here(?:'s| is) (?:the |a )?(?:solution|answer|explanation|response)[:\s]*\n*)/i, '')
    // Template placeholders like {{variable}}, [PLACEHOLDER], <PLACEHOLDER>
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/\[PLACEHOLDER[^\]]*\]/g, '')
    // AI generation markers
    .replace(/\[AI_RESPONSE_START\]|\[AI_RESPONSE_END\]/g, '')
    .replace(/<!--\s*AI[^>]*-->/g, '')
    // Trailing "Is there anything else..." patterns
    .replace(/\n+(?:Is there anything else|Would you like me to|Feel free to ask|Let me know if)[^.]*\.\s*$/i, '');
}

// ─── Phase 4: Normalize LaTeX delimiters ─────────────────────────────────────
// EnrichedMarkdownText expects $...$ for inline and $$...$$ for block math.
// Some AI models output \(...\) or \[...\] instead.

function normalizeLaTeXDelimiters(text: string): string {
  return text
    // \[...\] → $$...$$  (block math)
    .replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (_, inner) => `$$${inner.trim()}$$`)
    // \(...\) → $...$  (inline math)
    .replace(/\\\(\s*([\s\S]*?)\s*\\\)/g, (_, inner) => `$${inner.trim()}$`)
    // Escaped dollar signs that are not math: \$ → DOLLAR_PLACEHOLDER
    // (restore after math normalization)
    .replace(/\\\$/g, '\x01DOLLAR\x01');
}

function restoreEscapedDollars(text: string): string {
  return text.replace(/\x01DOLLAR\x01/g, '\\$');
}

// ─── Phase 5: Repair malformed LaTeX ─────────────────────────────────────────

function repairLaTeX(text: string): string {
  // Remove raw LaTeX commands that are not inside math delimiters
  // and would appear as literal text (e.g. stray \frac outside $...$)
  // Strategy: only strip if clearly outside a math block
  // We do this conservatively — only remove known dangerous bare commands
  // that would render as raw text if not inside math delimiters.
  const dangerousCommands = [
    '\\\\begin\\{[^}]*\\}',
    '\\\\end\\{[^}]*\\}',
  ];
  // Only strip if they appear outside math delimiters
  // Simple heuristic: if line contains no $ at all, strip bare \begin/\end
  const lines = text.split('\n');
  const repaired = lines.map(line => {
    const hasMath = /\$/.test(line) || /\$\$/.test(line);
    if (!hasMath) {
      for (const cmd of dangerousCommands) {
        line = line.replace(new RegExp(cmd, 'g'), '');
      }
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

// ─── Phase 7: Normalize spacing and punctuation ───────────────────────────────

function normalizeSpacing(text: string): string {
  return text
    // Collapse 3+ consecutive blank lines to 2
    .replace(/\n{3,}/g, '\n\n')
    // Remove trailing spaces on each line
    .replace(/[ \t]+$/gm, '')
    // Normalize multiple spaces to single (but not inside code blocks)
    // We do a simple pass — code blocks are preserved by EnrichedMarkdownText
    .replace(/[ \t]{2,}(?![\t])/g, ' ')
    // Fix broken quotation marks (smart quotes to straight)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Fix em-dash artifacts
    .replace(/\s*\u2014\s*/g, ' — ')
    // Normalize ellipsis
    .replace(/\.{3,}/g, '…')
    // Remove duplicate punctuation (!! → !, ?? → ?)
    .replace(/([!?])\1+/g, '$1')
    .trim();
}

// ─── Phase 8: Validate — detect remaining raw artifacts ──────────────────────

export interface PipelineValidationResult {
  passed: boolean;
  issues: string[];
}

export function validateRenderedContent(text: string): PipelineValidationResult {
  const issues: string[] = [];

  // Raw LaTeX commands outside math delimiters
  const bareLatex = /(?<!\$)\\(frac|sqrt|pm|neq|left|right|begin|end|text|cdot|sum|prod|int|alpha|beta|gamma|theta|pi|lambda|rightarrow|Rightarrow|times|ge|le)\b/;
  if (bareLatex.test(text)) {
    issues.push('Raw LaTeX commands detected outside math delimiters');
  }

  // Raw Markdown headings (# at start of line not inside code)
  if (/^#{1,6}\s/m.test(text) && !text.includes('```')) {
    // This is actually valid Markdown — EnrichedMarkdownText will render it
    // Only flag if it appears to be unrendered in a context where it shouldn't
  }

  // Template placeholders
  if (/\{\{[^}]+\}\}/.test(text)) {
    issues.push('Template placeholders detected');
  }

  // Null bytes
  if (/\x00/.test(text)) {
    issues.push('Null bytes detected');
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

// ─── Main pipeline export ─────────────────────────────────────────────────────

/**
 * Process an AI response through the full sanitization pipeline.
 * Returns clean Markdown ready for EnrichedMarkdownText.
 *
 * @param raw - The raw AI response string
 * @param options - Optional processing options
 */
export function processAIResponse(
  raw: string,
  options: {
    /** Strip common AI preamble phrases. Default: true */
    stripPreamble?: boolean;
    /** Normalize LaTeX delimiters (\[...\] → $$...$$). Default: true */
    normalizeLaTeX?: boolean;
  } = {}
): string {
  if (!raw || typeof raw !== 'string') return '';

  const { stripPreamble = true, normalizeLaTeX = true } = options;

  let text = raw;

  // Phase 1: Line endings
  text = normalizeLineEndings(text);

  // Phase 2: Invisible characters
  text = removeInvisibleCharacters(text);

  // Phase 3: AI artifacts
  if (stripPreamble) {
    text = removeAIArtifacts(text);
  }

  // Phase 4: LaTeX delimiter normalization
  if (normalizeLaTeX) {
    text = normalizeLaTeXDelimiters(text);
  }

  // Phase 5: Repair malformed LaTeX
  text = repairLaTeX(text);

  // Phase 6: Repair malformed Markdown
  text = repairMarkdown(text);

  // Phase 7: Normalize spacing
  text = normalizeSpacing(text);

  // Phase 8: Restore escaped dollars
  if (normalizeLaTeX) {
    text = restoreEscapedDollars(text);
  }

  return text;
}

/**
 * Process a streaming chunk — lighter pipeline for incremental updates.
 * Does not strip preamble (incomplete at chunk time) and skips heavy repair.
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
