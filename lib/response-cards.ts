/**
 * Response Card System — Type Definitions
 *
 * Every AI response is parsed into an ordered array of ResponseCard objects.
 * The server returns structured JSON; the client renders each card using its
 * dedicated visual component.
 */

// ─── Card Types ───────────────────────────────────────────────────────────────

export type CardType =
  | "definition"
  | "key_concept"
  | "formula"
  | "theorem"
  | "rule"
  | "important_note"
  | "tip"
  | "warning"
  | "worked_example"
  | "step_by_step"
  | "calculation"
  | "proof"
  | "real_world"
  | "common_mistakes"
  | "memory_trick"
  | "practice_question"
  | "challenge_question"
  | "summary"
  | "final_answer"
  | "next_steps"
  | "related_concepts"
  | "vocabulary"
  | "faq"
  | "text"; // fallback for plain paragraphs

// ─── Step (used in step_by_step and worked_example) ──────────────────────────

export interface CardStep {
  number: number;
  title: string;
  content: string;
  expression?: string; // LaTeX or plain math
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────

export interface FaqItem {
  question: string;
  answer: string;
}

// ─── Base card ────────────────────────────────────────────────────────────────

export interface ResponseCard {
  id: string;
  type: CardType;
  title?: string;
  content: string;           // Main body text (Markdown allowed)
  expression?: string;       // LaTeX formula / math expression
  steps?: CardStep[];        // For step_by_step / worked_example
  items?: string[];          // For lists: next_steps, related_concepts, vocabulary, common_mistakes
  faqs?: FaqItem[];          // For faq cards
  answer?: string;           // For practice/challenge questions — the answer
  hint?: string;             // For practice/challenge questions
  subject?: string;          // Context for "Practice Similar" action
  difficulty?: string;       // Context for "Practice Similar" action
}

// ─── Parsed response ─────────────────────────────────────────────────────────

export interface ParsedResponse {
  cards: ResponseCard[];
  /** Raw fallback text if parsing fails */
  rawText?: string;
}

// ─── Card metadata (visual config per type) ──────────────────────────────────

export interface CardMeta {
  label: string;
  icon: string;           // SF Symbol name (iOS) / Material icon name (Android)
  accentLight: string;    // Hex color for light mode accent
  accentDark: string;     // Hex color for dark mode accent
  bgLight: string;        // Card background light
  bgDark: string;         // Card background dark
  collapsible: boolean;
  defaultCollapsed: boolean;
}

export const CARD_META: Record<CardType, CardMeta> = {
  definition: {
    label: "Definition",
    icon: "book.fill",
    accentLight: "#6366F1", accentDark: "#818CF8",
    bgLight: "#EEF2FF", bgDark: "#1E1B4B",
    collapsible: false, defaultCollapsed: false,
  },
  key_concept: {
    label: "Key Concept",
    icon: "lightbulb.fill",
    accentLight: "#F59E0B", accentDark: "#FBBF24",
    bgLight: "#FFFBEB", bgDark: "#1C1A0A",
    collapsible: false, defaultCollapsed: false,
  },
  formula: {
    label: "Formula",
    icon: "function",
    accentLight: "#0EA5E9", accentDark: "#38BDF8",
    bgLight: "#F0F9FF", bgDark: "#0C1A2E",
    collapsible: false, defaultCollapsed: false,
  },
  theorem: {
    label: "Theorem",
    icon: "seal.fill",
    accentLight: "#8B5CF6", accentDark: "#A78BFA",
    bgLight: "#F5F3FF", bgDark: "#1A1033",
    collapsible: true, defaultCollapsed: false,
  },
  rule: {
    label: "Rule",
    icon: "ruler.fill",
    accentLight: "#0891B2", accentDark: "#22D3EE",
    bgLight: "#ECFEFF", bgDark: "#0A1F26",
    collapsible: false, defaultCollapsed: false,
  },
  important_note: {
    label: "Important Note",
    icon: "exclamationmark.circle.fill",
    accentLight: "#EF4444", accentDark: "#F87171",
    bgLight: "#FEF2F2", bgDark: "#1F0A0A",
    collapsible: false, defaultCollapsed: false,
  },
  tip: {
    label: "Tip",
    icon: "star.fill",
    accentLight: "#10B981", accentDark: "#34D399",
    bgLight: "#F0FDF4", bgDark: "#0A1F14",
    collapsible: false, defaultCollapsed: false,
  },
  warning: {
    label: "Warning",
    icon: "exclamationmark.triangle.fill",
    accentLight: "#F97316", accentDark: "#FB923C",
    bgLight: "#FFF7ED", bgDark: "#1F1005",
    collapsible: false, defaultCollapsed: false,
  },
  worked_example: {
    label: "Worked Example",
    icon: "pencil.and.list.clipboard",
    accentLight: "#0D9488", accentDark: "#2DD4BF",
    bgLight: "#F0FDFA", bgDark: "#0A1F1C",
    collapsible: true, defaultCollapsed: false,
  },
  step_by_step: {
    label: "Step-by-Step Solution",
    icon: "list.number",
    accentLight: "#2563EB", accentDark: "#60A5FA",
    bgLight: "#EFF6FF", bgDark: "#0A1628",
    collapsible: true, defaultCollapsed: false,
  },
  calculation: {
    label: "Calculation",
    icon: "equal.circle.fill",
    accentLight: "#7C3AED", accentDark: "#A78BFA",
    bgLight: "#F5F3FF", bgDark: "#130D2E",
    collapsible: false, defaultCollapsed: false,
  },
  proof: {
    label: "Proof",
    icon: "checkmark.seal.fill",
    accentLight: "#059669", accentDark: "#34D399",
    bgLight: "#ECFDF5", bgDark: "#0A1F14",
    collapsible: true, defaultCollapsed: true,
  },
  real_world: {
    label: "Real-World Application",
    icon: "globe",
    accentLight: "#0284C7", accentDark: "#38BDF8",
    bgLight: "#F0F9FF", bgDark: "#0A1828",
    collapsible: true, defaultCollapsed: false,
  },
  common_mistakes: {
    label: "Common Mistakes",
    icon: "xmark.circle.fill",
    accentLight: "#DC2626", accentDark: "#F87171",
    bgLight: "#FEF2F2", bgDark: "#1F0A0A",
    collapsible: true, defaultCollapsed: false,
  },
  memory_trick: {
    label: "Memory Trick",
    icon: "brain.head.profile",
    accentLight: "#DB2777", accentDark: "#F472B6",
    bgLight: "#FDF2F8", bgDark: "#1F0A18",
    collapsible: false, defaultCollapsed: false,
  },
  practice_question: {
    label: "Practice Question",
    icon: "questionmark.circle.fill",
    accentLight: "#16A34A", accentDark: "#4ADE80",
    bgLight: "#F0FDF4", bgDark: "#0A1F14",
    collapsible: false, defaultCollapsed: false,
  },
  challenge_question: {
    label: "Challenge Question",
    icon: "flame.fill",
    accentLight: "#EA580C", accentDark: "#FB923C",
    bgLight: "#FFF7ED", bgDark: "#1F1005",
    collapsible: false, defaultCollapsed: false,
  },
  summary: {
    label: "Summary",
    icon: "doc.text.fill",
    accentLight: "#475569", accentDark: "#94A3B8",
    bgLight: "#F8FAFC", bgDark: "#0F172A",
    collapsible: true, defaultCollapsed: false,
  },
  final_answer: {
    label: "Final Answer",
    icon: "checkmark.circle.fill",
    accentLight: "#16A34A", accentDark: "#4ADE80",
    bgLight: "#F0FDF4", bgDark: "#0A1F14",
    collapsible: false, defaultCollapsed: false,
  },
  next_steps: {
    label: "Next Steps",
    icon: "arrow.right.circle.fill",
    accentLight: "#2563EB", accentDark: "#60A5FA",
    bgLight: "#EFF6FF", bgDark: "#0A1628",
    collapsible: true, defaultCollapsed: false,
  },
  related_concepts: {
    label: "Related Concepts",
    icon: "link.circle.fill",
    accentLight: "#7C3AED", accentDark: "#A78BFA",
    bgLight: "#F5F3FF", bgDark: "#130D2E",
    collapsible: true, defaultCollapsed: false,
  },
  vocabulary: {
    label: "Vocabulary",
    icon: "character.book.closed.fill",
    accentLight: "#0891B2", accentDark: "#22D3EE",
    bgLight: "#ECFEFF", bgDark: "#0A1F26",
    collapsible: true, defaultCollapsed: false,
  },
  faq: {
    label: "Frequently Asked Questions",
    icon: "questionmark.bubble.fill",
    accentLight: "#D97706", accentDark: "#FBBF24",
    bgLight: "#FFFBEB", bgDark: "#1C1A0A",
    collapsible: true, defaultCollapsed: false,
  },
  text: {
    label: "Explanation",
    icon: "text.alignleft",
    accentLight: "#64748B", accentDark: "#94A3B8",
    bgLight: "transparent", bgDark: "transparent",
    collapsible: false, defaultCollapsed: false,
  },
};

// ─── Server prompt ────────────────────────────────────────────────────────────

export const CARD_EXTRACTION_SYSTEM_PROMPT = `You are TutorSnap's intelligent response formatter.
Your job is to analyze an AI tutor's raw response and restructure it into a JSON array of educational cards.

CARD TYPES (use the most appropriate for each piece of content):
definition, key_concept, formula, theorem, rule, important_note, tip, warning,
worked_example, step_by_step, calculation, proof, real_world, common_mistakes,
memory_trick, practice_question, challenge_question, summary, final_answer,
next_steps, related_concepts, vocabulary, faq, text

RULES:
- Split the response into logical sections. Each section becomes one card.
- Do NOT combine unrelated content into one card.
- Use "text" only for introductory/transitional sentences that don't fit other types.
- For step_by_step and worked_example, populate the "steps" array.
- For formulas, put the LaTeX/math in "expression" and the explanation in "content".
- For final_answer, put the answer in "content" and optionally in "expression" if it's math.
- For practice_question and challenge_question, put the question in "content", the answer in "answer", and a hint in "hint".
- For next_steps, related_concepts, vocabulary, common_mistakes: use the "items" array (strings).
- For faq: use the "faqs" array of {question, answer} objects.
- Keep "content" concise. Use Markdown sparingly (bold for key terms only).
- NEVER include raw LaTeX delimiters in "content" — put math in "expression" instead.
- Always include a "title" for every card except "text".
- Generate unique "id" values: "c1", "c2", etc.

OUTPUT FORMAT (strict JSON, no extra text):
{"cards":[{"id":"c1","type":"key_concept","title":"What is a Derivative?","content":"A derivative measures the instantaneous rate of change of a function.","expression":"f'(x) = \\\\lim_{h \\\\to 0} \\\\frac{f(x+h)-f(x)}{h}"}]}`;
