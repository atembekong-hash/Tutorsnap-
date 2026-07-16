/**
 * structured-blocks.ts
 *
 * Parses a cleaned AI response into an ordered list of StructuredBlock objects.
 * Each block has a type, optional title, and content (Markdown string).
 *
 * Block types (6 purposeful categories):
 *   direct-answer  — The bottom-line answer (first substantive paragraph)
 *   concept        — Definition, explanation, "what is X"
 *   formula        — Any equation, formula, or derivation
 *   steps          — Numbered step-by-step solution
 *   example        — Worked example, application, or illustration
 *   insight        — Key takeaway, common mistake, memory tip, summary
 *
 * Detection strategy:
 *   1. Split on Markdown headings (##, ###, ####)
 *   2. Classify each section by its heading text and content patterns
 *   3. The first non-heading paragraph becomes a "direct-answer" block
 *   4. Sections without a heading are classified by content heuristics
 */

export type BlockType =
  | 'direct-answer'
  | 'concept'
  | 'formula'
  | 'steps'
  | 'example'
  | 'insight';

export interface StructuredBlock {
  id: string;
  type: BlockType;
  title: string | null;
  content: string;
  /** For formula blocks: the raw LaTeX string if the content is a single equation */
  latex?: string;
}

// ─── Heading → block type mapping ────────────────────────────────────────────

const HEADING_TYPE_MAP: Array<{ pattern: RegExp; type: BlockType }> = [
  // Direct answer
  { pattern: /^(answer|result|solution|tldr|tl;dr|in short|in brief|bottom line)/i, type: 'direct-answer' },
  // Concept / definition
  { pattern: /^(definition|what is|what are|concept|overview|background|introduction|theory|explanation|meaning|understanding)/i, type: 'concept' },
  // Formula
  { pattern: /^(formula|equation|expression|notation|math|mathematics|calculation|derivation|proof|theorem|rule|law|property)/i, type: 'formula' },
  // Steps
  { pattern: /^(step|how to|method|procedure|process|approach|technique|algorithm|solution|solving|work(ed)?( out)?|working)/i, type: 'steps' },
  // Example
  { pattern: /^(example|illustration|application|real.?world|practice|try it|let'?s try|problem|exercise|sample|case)/i, type: 'example' },
  // Insight
  { pattern: /^(key insight|insight|tip|trick|note|important|warning|caution|common mistake|mistake|error|pitfall|remember|summary|takeaway|recap|conclusion|next step|further|related|memory|mnemonic|fun fact)/i, type: 'insight' },
];

function classifyByHeading(heading: string): BlockType {
  const h = heading.trim().toLowerCase().replace(/^[#\s]+/, '');
  for (const { pattern, type } of HEADING_TYPE_MAP) {
    if (pattern.test(h)) return type;
  }
  return 'concept'; // default for unrecognized headings
}

// ─── Content heuristics ───────────────────────────────────────────────────────

function classifyByContent(content: string): BlockType {
  const c = content.trim();

  // Formula: contains block math or multiple inline math expressions
  const blockMathCount = (c.match(/\$\$[\s\S]*?\$\$/g) ?? []).length;
  const inlineMathCount = (c.match(/\$[^$\n]+?\$/g) ?? []).length;
  if (blockMathCount >= 1 || inlineMathCount >= 3) return 'formula';

  // Steps: starts with numbered list
  if (/^(\d+\.|Step \d)/m.test(c)) return 'steps';

  // Example: contains "for example", "e.g.", "let's say", "suppose"
  if (/\b(for example|e\.g\.|for instance|let'?s say|suppose|consider|given that|imagine)\b/i.test(c)) return 'example';

  // Insight: short paragraph with key phrases
  if (/\b(remember|note that|important|key point|tip:|trick:|common mistake|don'?t forget|always|never|be careful)\b/i.test(c)) return 'insight';

  // Default: concept
  return 'concept';
}

// ─── Extract single LaTeX from a formula block ────────────────────────────────

function extractLatex(content: string): string | undefined {
  // Try block math first
  const blockMatch = content.match(/\$\$([\s\S]*?)\$\$/);
  if (blockMatch) return blockMatch[1].trim();
  // Try inline math
  const inlineMatch = content.match(/\$([^$\n]+?)\$/);
  if (inlineMatch) return inlineMatch[1].trim();
  return undefined;
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseStructuredBlocks(markdown: string): StructuredBlock[] {
  if (!markdown.trim()) return [];

  const blocks: StructuredBlock[] = [];
  let idCounter = 0;
  const makeId = () => `block-${++idCounter}`;

  // Split on Markdown headings (##, ###, ####, #####)
  // We keep the heading as part of the section
  const sectionPattern = /^(#{2,5}\s+.+)$/m;
  const parts = markdown.split(sectionPattern);

  // parts[0] is content before the first heading (if any)
  // parts[1], parts[3], ... are headings
  // parts[2], parts[4], ... are content after each heading

  let isFirstContent = true;

  // Process pre-heading content
  const preHeading = parts[0].trim();
  if (preHeading) {
    // First substantive paragraph → direct-answer
    // Remaining paragraphs → classify by content
    const paragraphs = preHeading.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);

    if (paragraphs.length > 0) {
      if (isFirstContent) {
        // First paragraph is the direct answer
        blocks.push({
          id: makeId(),
          type: 'direct-answer',
          title: null,
          content: paragraphs[0],
        });
        isFirstContent = false;

        // Remaining pre-heading paragraphs
        for (let i = 1; i < paragraphs.length; i++) {
          const type = classifyByContent(paragraphs[i]);
          blocks.push({
            id: makeId(),
            type,
            title: null,
            content: paragraphs[i],
          });
        }
      } else {
        for (const para of paragraphs) {
          const type = classifyByContent(para);
          blocks.push({ id: makeId(), type, title: null, content: para });
        }
      }
    }
  }

  // Process heading + content pairs
  for (let i = 1; i < parts.length; i += 2) {
    const headingLine = (parts[i] ?? '').trim();
    const sectionContent = (parts[i + 1] ?? '').trim();

    if (!headingLine) continue;

    // Extract heading text (strip #s)
    const headingText = headingLine.replace(/^#{2,5}\s+/, '').trim();
    const type = classifyByHeading(headingText);

    if (!sectionContent) {
      // Heading with no content — skip or add as label
      continue;
    }

    const block: StructuredBlock = {
      id: makeId(),
      type,
      title: headingText,
      content: sectionContent,
    };

    if (type === 'formula') {
      block.latex = extractLatex(sectionContent);
    }

    blocks.push(block);
    isFirstContent = false;
  }

  // If we only got one block and it's direct-answer with lots of content,
  // try to split it into logical sub-blocks
  if (blocks.length === 1 && blocks[0].type === 'direct-answer') {
    const expanded = expandSingleBlock(blocks[0]);
    if (expanded.length > 1) return expanded;
  }

  return blocks.length > 0 ? blocks : [{ id: makeId(), type: 'concept', title: null, content: markdown }];
}

/**
 * When the entire response is one big paragraph (no headings), try to split
 * it into logical blocks by detecting content patterns.
 */
function expandSingleBlock(block: StructuredBlock): StructuredBlock[] {
  const paragraphs = block.content.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  if (paragraphs.length <= 2) return [block]; // not worth splitting

  let idCounter = 100;
  const makeId = () => `block-${++idCounter}`;
  const result: StructuredBlock[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    let type: BlockType;

    if (i === 0) {
      type = 'direct-answer';
    } else {
      type = classifyByContent(para);
    }

    const b: StructuredBlock = { id: makeId(), type, title: null, content: para };
    if (type === 'formula') b.latex = extractLatex(para);
    result.push(b);
  }

  return result;
}
