/**
 * AI Response Processing Pipeline
 * Strips LaTeX, Markdown, special chars, em/en dashes, dollar signs.
 */

function normalizeLineEndings(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

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

function removeAIArtifacts(text: string): string {
  return text
    .replace(/^(Sure[,!]?\s+|Of course[,!]?\s+|Certainly[,!]?\s+|Absolutely[,!]?\s+|Great[,!]?\s+|Here(?:\'s| is) (?:the |a )?(?:solution|answer|explanation|response)[:\s]*\n*)/i, '')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/\[PLACEHOLDER[^\]]*\]/g, '')
    .replace(/\[AI_RESPONSE_START\]|\[AI_RESPONSE_END\]/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\n+(?:Is there anything else|Would you like me to|Feel free to ask|Let me know if)[^.]*\.\s*$/i, '');
}

function stripLaTeX(text: string): string {
  let r = text;
  r = r.replace(/\$\$((?:.|\n)*?)\$\$/g, (_: string, i: string) => i.trim());
  r = r.replace(/\\\[\s*((?:.|\n)*?)\s*\\\]/g, (_: string, i: string) => i.trim());
  r = r.replace(/\$([^$\n]{1,200}?)\$/g, (_: string, i: string) => i.trim());
  r = r.replace(/\\\(\s*((?:.|\n)*?)\s*\\\)/g, (_: string, i: string) => i.trim());
  r = r.replace(/\\begin\{[^}]*\}((?:.|\n)*?)\\end\{[^}]*\}/g, (_: string, i: string) => i.trim());
  const cmds: [RegExp, string][] = [
    [/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1 / $2'],
    [/\\sqrt\{([^}]*)\}/g, 'sqrt($1)'],
    [/\\sqrt/g, 'sqrt'],
    [/\\cdot/g, 'times'], [/\\times/g, 'times'], [/\\div/g, 'divided by'],
    [/\\pm/g, 'plus or minus'], [/\\mp/g, 'minus or plus'],
    [/\\neq/g, 'not equal to'], [/\\approx/g, 'approximately'],
    [/\\leq|\\le/g, 'less than or equal to'], [/\\geq|\\ge/g, 'greater than or equal to'],
    [/\\lt/g, 'less than'], [/\\gt/g, 'greater than'],
    [/\\infty/g, 'infinity'], [/\\alpha/g, 'alpha'], [/\\beta/g, 'beta'],
    [/\\gamma/g, 'gamma'], [/\\delta/g, 'delta'], [/\\theta/g, 'theta'],
    [/\\lambda/g, 'lambda'], [/\\mu/g, 'mu'], [/\\pi/g, 'pi'],
    [/\\sigma/g, 'sigma'], [/\\omega/g, 'omega'],
    [/\\sum/g, 'sum of'], [/\\prod/g, 'product of'], [/\\int/g, 'integral of'],
    [/\\lim/g, 'limit of'], [/\\log/g, 'log'], [/\\ln/g, 'ln'],
    [/\\sin/g, 'sin'], [/\\cos/g, 'cos'], [/\\tan/g, 'tan'],
    [/\\rightarrow|\\to/g, 'to'], [/\\leftarrow/g, 'from'],
    [/\\Rightarrow/g, 'implies'], [/\\Leftrightarrow/g, 'if and only if'],
    [/\\forall/g, 'for all'], [/\\exists/g, 'there exists'],
    [/\\in\b/g, 'in'], [/\\notin/g, 'not in'],
    [/\\subset/g, 'subset of'], [/\\cup/g, 'union'], [/\\cap/g, 'intersection'],
    [/\\emptyset/g, 'empty set'],
    [/\\mathbb\{([^}]*)\}/g, '$1'], [/\\mathbf\{([^}]*)\}/g, '$1'],
    [/\\mathrm\{([^}]*)\}/g, '$1'], [/\\mathit\{([^}]*)\}/g, '$1'],
    [/\\text\{([^}]*)\}/g, '$1'], [/\\textbf\{([^}]*)\}/g, '$1'],
    [/\\textit\{([^}]*)\}/g, '$1'],
    [/\\left[\(\[\{|]/g, ''], [/\\right[\)\]\}|]/g, ''],
    [/\\left\./g, ''], [/\\right\./g, ''],
    [/\^\{([^}]*)\}/g, '^$1'], [/_\{([^}]*)\}/g, '_$1'],
    [/\\[a-zA-Z]+\{([^}]*)\}/g, '$1'],
    [/\\[a-zA-Z]+/g, ''],
    [/\\\\/g, '\n'], [/\\/g, ''],
  ];
  for (const [pat, rep] of cmds) r = r.replace(pat, rep as any);
  return r;
}

function stripMarkdown(text: string): string {
  let r = text;
  r = r.replace(/```[\w]*\n?((?:.|\n)*?)```/g, (_: string, i: string) => i.trim());
  r = r.replace(/~~~[\w]*\n?((?:.|\n)*?)~~~/g, (_: string, i: string) => i.trim());
  r = r.replace(/`([^`\n]+)`/g, '$1');
  r = r.replace(/^#{1,6}\s+/gm, '');
  r = r.replace(/^[-*_]{3,}\s*$/gm, '');
  r = r.replace(/\*{3}([^*\n]+)\*{3}/g, '$1');
  r = r.replace(/_{3}([^_\n]+)_{3}/g, '$1');
  r = r.replace(/\*{2}([^*\n]+)\*{2}/g, '$1');
  r = r.replace(/_{2}([^_\n]+)_{2}/g, '$1');
  r = r.replace(/\*([^*\n]+)\*/g, '$1');
  r = r.replace(/(?<=\s|^)_([^_\n]+)_(?=\s|$)/gm, '$1');
  r = r.replace(/~~([^~\n]+)~~/g, '$1');
  r = r.replace(/^>\s*/gm, '');
  r = r.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  r = r.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  r = r.replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1');
  r = r.replace(/^\[[^\]]+\]:\s*\S+.*$/gm, '');
  r = r.replace(/^(\s*)[-*+]\s+/gm, '$1');
  r = r.replace(/^(\s*)(\d+)\.\s+/gm, '$1$2. ');
  r = r.replace(/^\|.*\|$/gm, (line: string) =>
    line.replace(/\|/g, ' ').replace(/[-:]+/g, '').trim());
  r = r.replace(/^\|?[-:| ]+\|$/gm, '');
  return r;
}

function replaceSpecialCharacters(text: string): string {
  return text
    .replace(/\u2014/g, ',').replace(/\u2013/g, '-')
    .replace(/\u2026/g, '...').replace(/[\u2018\u2019]/g, "\'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2022\u2023\u2024\u2025\u2043\u204C\u204D\u2219]/g, '')
    .replace(/\u2192/g, 'to').replace(/\u2190/g, 'from')
    .replace(/\u2194/g, 'to and from').replace(/\u21D2/g, 'implies')
    .replace(/\u21D4/g, 'if and only if').replace(/\u00D7/g, 'times')
    .replace(/\u00F7/g, 'divided by').replace(/\u00B1/g, 'plus or minus')
    .replace(/\u2260/g, 'not equal to').replace(/\u2264/g, 'less than or equal to')
    .replace(/\u2265/g, 'greater than or equal to').replace(/\u221E/g, 'infinity')
    .replace(/\u221A/g, 'sqrt').replace(/\u03C0/g, 'pi')
    .replace(/\u03B1/g, 'alpha').replace(/\u03B2/g, 'beta')
    .replace(/\u03B3/g, 'gamma').replace(/\u03B8/g, 'theta')
    .replace(/\u03BB/g, 'lambda').replace(/\u03BC/g, 'mu')
    .replace(/\u03C3/g, 'sigma').replace(/\u03A3/g, 'Sigma')
    .replace(/\$/g, '').replace(/(?<!^)#/gm, '')
    .replace(/~/g, '').replace(/\|/g, '');
}

function stripHTML(text: string): string {
  return text
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "\'").replace(/&#\d+;/g, '')
    .replace(/&[a-z]+;/g, '');
}

function normalizeSpacing(text: string): string {
  return text
    .replace(/\n{4,}/g, '\n\n\n').replace(/[ \t]+$/gm, '')
    .replace(/[ \t]{3,}/g, ' ').replace(/([!?])\1+/g, '$1')
    .replace(/\n{3,}/g, '\n\n').trim();
}

export interface PipelineOptions { stripPreamble?: boolean; }

export function processAIResponse(raw: string, options: PipelineOptions = {}): string {
  if (!raw || typeof raw !== 'string') return '';
  const { stripPreamble = true } = options;
  let text = raw;
  text = normalizeLineEndings(text);
  text = removeInvisibleCharacters(text);
  if (stripPreamble) text = removeAIArtifacts(text);
  text = stripLaTeX(text);
  text = stripMarkdown(text);
  text = replaceSpecialCharacters(text);
  text = stripHTML(text);
  text = normalizeSpacing(text);
  return text;
}

export function processStreamingChunk(chunk: string): string {
  if (!chunk || typeof chunk !== 'string') return '';
  let text = chunk;
  text = normalizeLineEndings(text);
  text = removeInvisibleCharacters(text);
  text = stripLaTeX(text);
  text = stripMarkdown(text);
  text = replaceSpecialCharacters(text);
  text = stripHTML(text);
  return text;
}

export interface PipelineValidationResult { passed: boolean; issues: string[]; }

export function validateRenderedContent(text: string): PipelineValidationResult {
  const issues: string[] = [];
  if (/\$/.test(text)) issues.push('Dollar sign detected');
  if (/\*\*|\*[^*]/.test(text)) issues.push('Markdown bold/italic detected');
  if (/^#{1,6}\s/m.test(text)) issues.push('Markdown heading detected');
  if (/\u2014|\u2013/.test(text)) issues.push('Em/en dash detected');
  if (/\\[a-zA-Z]/.test(text)) issues.push('LaTeX command detected');
  if (/`/.test(text)) issues.push('Backtick detected');
  return { passed: issues.length === 0, issues };
}
