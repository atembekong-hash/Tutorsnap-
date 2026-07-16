/**
 * structured-blocks.ts
 *
 * Parses AI Markdown responses into semantic educational blocks.
 * Each block has a type, optional title, and content string.
 *
 * Block types:
 *   direct-answer  — The core answer (first H1 or opening paragraph)
 *   definition     — Key term definition
 *   concept        — Core concept explanation
 *   formula        — Mathematical formula or rule
 *   steps          — Numbered step-by-step solution
 *   example        — Worked example
 *   insight        — Key insight, tip, or pro tip
 *   warning        — Common mistake, warning, or caution
 */

export type BlockType =
  | 'direct-answer'
  | 'definition'
  | 'concept'
  | 'formula'
  | 'steps'
  | 'example'
  | 'insight'
  | 'warning';

export interface StructuredBlock {
  id: string;
  type: BlockType;
  title: string;
  content: string;
}

// ─── Keyword classifiers ──────────────────────────────────────────────────────

const DEFINITION_KEYWORDS = /\b(definition|define|what is|meaning|term|vocabulary|glossary)\b/i;
const FORMULA_KEYWORDS = /\b(formula|equation|rule|theorem|law|expression|identity)\b/i;
const STEPS_KEYWORDS = /\b(step|steps|how to|procedure|method|process|solution|solve|working|calculation)\b/i;
const EXAMPLE_KEYWORDS = /\b(example|worked example|sample|illustration|practice|exercise|problem)\b/i;
const INSIGHT_KEYWORDS = /\b(tip|insight|key|note|remember|important|trick|shortcut|pro tip|summary|conclusion|takeaway)\b/i;
const WARNING_KEYWORDS = /\b(mistake|error|warning|caution|avoid|don't|do not|pitfall|common error|watch out|beware)\b/i;

function classifyHeading(text: string, level: number, isFirst: boolean): BlockType {
  const t = text.toLowerCase();
  if (isFirst && level === 1) return 'direct-answer';
  if (level === 5) {
    if (FORMULA_KEYWORDS.test(t)) return 'formula';
    return 'formula'; // H5 is always formula per system prompt
  }
  if (level === 6) {
    if (WARNING_KEYWORDS.test(t)) return 'warning';
    return 'insight'; // H6 is always tip/insight per system prompt
  }
  if (WARNING_KEYWORDS.test(t)) return 'warning';
  if (INSIGHT_KEYWORDS.test(t)) return 'insight';
  if (EXAMPLE_KEYWORDS.test(t)) return 'example';
  if (STEPS_KEYWORDS.test(t)) return 'steps';
  if (DEFINITION_KEYWORDS.test(t)) return 'definition';
  if (FORMULA_KEYWORDS.test(t)) return 'formula';
  return 'concept';
}

// ─── Section splitter ─────────────────────────────────────────────────────────

interface RawSection {
  level: number;
  title: string;
  content: string;
}

function splitIntoSections(markdown: string): RawSection[] {
  const lines = markdown.split('\n');
  const sections: RawSection[] = [];
  let currentLevel = 0;
  let currentTitle = '';
  let currentLines: string[] = [];

  const flush = () => {
    const content = currentLines.join('\n').trim();
    if (content || currentTitle) {
      sections.push({ level: currentLevel, title: currentTitle, content });
    }
    currentLines = [];
  };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flush();
      currentLevel = headingMatch[1].length;
      currentTitle = headingMatch[2].trim();
    } else {
      currentLines.push(line);
    }
  }
  flush();

  return sections;
}

// ─── Blockquote classifier ────────────────────────────────────────────────────

function classifyBlockquote(content: string): BlockType {
  if (WARNING_KEYWORDS.test(content)) return 'warning';
  return 'insight';
}

// ─── Main parser ──────────────────────────────────────────────────────────────

let _idCounter = 0;
function nextId(): string {
  return `block_${++_idCounter}_${Date.now()}`;
}

export function parseStructuredBlocks(markdown: string): StructuredBlock[] {
  if (!markdown?.trim()) return [];

  const sections = splitIntoSections(markdown);
  const blocks: StructuredBlock[] = [];
  let isFirst = true;

  for (const section of sections) {
    // Skip empty sections with no meaningful heading
    if (!section.title && !section.content) continue;

    // If there's no heading (preamble content before first heading)
    if (!section.title && section.content.trim()) {
      // Check if it contains blockquotes
      const bqMatch = section.content.match(/^>\s+(.+)$/m);
      if (bqMatch) {
        const bqContent = section.content.replace(/^>\s*/gm, '').trim();
        blocks.push({
          id: nextId(),
          type: classifyBlockquote(bqContent),
          title: '',
          content: bqContent,
        });
      } else {
        blocks.push({
          id: nextId(),
          type: isFirst ? 'direct-answer' : 'concept',
          title: '',
          content: section.content.trim(),
        });
        isFirst = false;
      }
      continue;
    }

    const type = classifyHeading(section.title, section.level, isFirst);
    isFirst = false;

    // Split blockquotes out of the content into separate blocks
    const contentParts = splitBlockquotes(section.content);
    const mainContent = contentParts.filter(p => p.type === 'text').map(p => p.content).join('\n\n').trim();
    const bqParts = contentParts.filter(p => p.type === 'blockquote');

    if (mainContent) {
      blocks.push({
        id: nextId(),
        type,
        title: section.title,
        content: mainContent,
      });
    }

    for (const bq of bqParts) {
      blocks.push({
        id: nextId(),
        type: classifyBlockquote(bq.content),
        title: '',
        content: bq.content,
      });
    }
  }

  // Deduplicate: merge consecutive blocks of the same type with no title
  return mergeConsecutiveConcepts(blocks);
}

interface ContentPart {
  type: 'text' | 'blockquote';
  content: string;
}

function splitBlockquotes(content: string): ContentPart[] {
  if (!content) return [];
  const lines = content.split('\n');
  const parts: ContentPart[] = [];
  let currentType: 'text' | 'blockquote' = 'text';
  let currentLines: string[] = [];

  const flush = () => {
    const c = currentLines.join('\n').trim();
    if (c) parts.push({ type: currentType, content: c });
    currentLines = [];
  };

  for (const line of lines) {
    const isBq = line.startsWith('> ') || line === '>';
    const lineType: 'text' | 'blockquote' = isBq ? 'blockquote' : 'text';
    if (lineType !== currentType) {
      flush();
      currentType = lineType;
    }
    currentLines.push(isBq ? line.replace(/^>\s?/, '') : line);
  }
  flush();

  return parts;
}

function mergeConsecutiveConcepts(blocks: StructuredBlock[]): StructuredBlock[] {
  const result: StructuredBlock[] = [];
  for (const block of blocks) {
    const last = result[result.length - 1];
    if (
      last &&
      last.type === 'concept' &&
      block.type === 'concept' &&
      !last.title &&
      !block.title
    ) {
      last.content = `${last.content}\n\n${block.content}`;
    } else {
      result.push(block);
    }
  }
  return result;
}
