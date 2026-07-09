/**
 * Centralized subject definitions for StudyGenius AI.
 * All subjects are organized into 4 top-level categories.
 * Every screen imports from here — no duplicated subject maps.
 */

export type SubjectCategory = "math" | "english" | "science" | "social";

export interface SubjectDef {
  id: SubjectId;
  label: string;
  category: SubjectCategory;
  color: string;
  emoji: string;
}

export type SubjectId =
  // Math
  | "algebra" | "calculus" | "geometry" | "trigonometry" | "statistics"
  | "arithmetic" | "precalculus" | "linear_algebra" | "differential_equations" | "number_theory"
  // English / Language Arts
  | "american_literature" | "british_literature" | "world_literature"
  | "composition" | "creative_writing" | "debate" | "journalism" | "grammar" | "poetry"
  // Science
  | "biology" | "chemistry" | "physics" | "earth_science" | "space_science"
  | "environmental_science" | "anatomy" | "forensics" | "general_science"
  // Social Studies / History
  | "us_history" | "world_history" | "government" | "economics"
  | "geography" | "psychology" | "sociology" | "civics"
  | "other";

export const SUBJECT_CATEGORIES: Record<SubjectCategory, { label: string; emoji: string; color: string }> = {
  math:    { label: "Mathematics",             emoji: "📐", color: "#4F46E5" },
  english: { label: "English / Language Arts", emoji: "📖", color: "#0891B2" },
  science: { label: "Science",                 emoji: "🔬", color: "#059669" },
  social:  { label: "Social Studies",          emoji: "🌍", color: "#D97706" },
};

export const ALL_SUBJECTS: SubjectDef[] = [
  // ── Mathematics ──────────────────────────────────────────────────────────
  { id: "algebra",                label: "Algebra",                 category: "math",    color: "#4F46E5", emoji: "𝑥²" },
  { id: "calculus",               label: "Calculus",                category: "math",    color: "#6366F1", emoji: "∫" },
  { id: "geometry",               label: "Geometry",                category: "math",    color: "#7C3AED", emoji: "△" },
  { id: "trigonometry",           label: "Trigonometry",            category: "math",    color: "#8B5CF6", emoji: "sin" },
  { id: "statistics",             label: "Statistics",              category: "math",    color: "#A78BFA", emoji: "σ" },
  { id: "arithmetic",             label: "Arithmetic",              category: "math",    color: "#4338CA", emoji: "+" },
  { id: "precalculus",            label: "Pre-Calculus",            category: "math",    color: "#5B21B6", emoji: "f(x)" },
  { id: "linear_algebra",         label: "Linear Algebra",          category: "math",    color: "#3730A3", emoji: "[]" },
  { id: "differential_equations", label: "Differential Equations",  category: "math",    color: "#312E81", emoji: "dy" },
  { id: "number_theory",          label: "Number Theory",           category: "math",    color: "#4F46E5", emoji: "ℕ" },

  // ── English / Language Arts ───────────────────────────────────────────────
  { id: "american_literature",    label: "American Literature",     category: "english", color: "#0891B2", emoji: "🇺🇸" },
  { id: "british_literature",     label: "British Literature",      category: "english", color: "#0E7490", emoji: "🇬🇧" },
  { id: "world_literature",       label: "World Literature",        category: "english", color: "#155E75", emoji: "🌐" },
  { id: "composition",            label: "Composition",             category: "english", color: "#06B6D4", emoji: "✍️" },
  { id: "creative_writing",       label: "Creative Writing",        category: "english", color: "#22D3EE", emoji: "🖊️" },
  { id: "debate",                 label: "Debate",                  category: "english", color: "#0284C7", emoji: "💬" },
  { id: "journalism",             label: "Journalism",              category: "english", color: "#0369A1", emoji: "📰" },
  { id: "grammar",                label: "Grammar",                 category: "english", color: "#075985", emoji: "Aa" },
  { id: "poetry",                 label: "Poetry",                  category: "english", color: "#0C4A6E", emoji: "🎭" },

  // ── Science ───────────────────────────────────────────────────────────────
  { id: "biology",                label: "Biology",                 category: "science", color: "#059669", emoji: "🧬" },
  { id: "chemistry",              label: "Chemistry",               category: "science", color: "#10B981", emoji: "⚗️" },
  { id: "physics",                label: "Physics",                 category: "science", color: "#047857", emoji: "⚛️" },
  { id: "earth_science",          label: "Earth Science",           category: "science", color: "#065F46", emoji: "🌎" },
  { id: "space_science",          label: "Space Science",           category: "science", color: "#064E3B", emoji: "🚀" },
  { id: "environmental_science",  label: "Environmental Science",   category: "science", color: "#34D399", emoji: "🌿" },
  { id: "anatomy",                label: "Anatomy",                 category: "science", color: "#6EE7B7", emoji: "🫀" },
  { id: "forensics",              label: "Forensics",               category: "science", color: "#A7F3D0", emoji: "🔍" },
  { id: "general_science",        label: "General Science",         category: "science", color: "#D1FAE5", emoji: "🔭" },

  // ── Social Studies / History ──────────────────────────────────────────────
  { id: "us_history",             label: "U.S. History",            category: "social",  color: "#D97706", emoji: "🏛️" },
  { id: "world_history",          label: "World History",           category: "social",  color: "#B45309", emoji: "🗺️" },
  { id: "government",             label: "Government / Civics",     category: "social",  color: "#92400E", emoji: "⚖️" },
  { id: "economics",              label: "Economics",               category: "social",  color: "#78350F", emoji: "📊" },
  { id: "geography",              label: "Geography",               category: "social",  color: "#F59E0B", emoji: "🌏" },
  { id: "psychology",             label: "Psychology",              category: "social",  color: "#FBBF24", emoji: "🧠" },
  { id: "sociology",              label: "Sociology",               category: "social",  color: "#FCD34D", emoji: "👥" },
  { id: "civics",                 label: "Civics",                  category: "social",  color: "#FDE68A", emoji: "🗳️" },

  { id: "other",                  label: "Other",                   category: "math",    color: "#6B7280", emoji: "📚" },
];

/** O(1) lookup map */
const SUBJECT_MAP = new Map<SubjectId, SubjectDef>(ALL_SUBJECTS.map((s) => [s.id, s]));

export function getSubjectDef(id: SubjectId | string): SubjectDef {
  return SUBJECT_MAP.get(id as SubjectId) ?? { id: "other", label: id, category: "math", color: "#6B7280", emoji: "📚" };
}

export function getSubjectColor(id: SubjectId | string): string {
  return getSubjectDef(id).color;
}

export function getSubjectLabel(id: SubjectId | string): string {
  return getSubjectDef(id).label;
}

export function getSubjectEmoji(id: SubjectId | string): string {
  return getSubjectDef(id).emoji;
}

/** Returns true if the subject belongs to the Math category */
export function isMathSubject(id: SubjectId | string | null): boolean {
  if (!id) return false;
  return getSubjectDef(id as SubjectId).category === "math";
}

/** Returns a subject-specific input placeholder string */
export function getSubjectPlaceholder(id: SubjectId | string | null): string {
  if (!id) return "Type your question or problem here...";
  const placeholders: Partial<Record<string, string>> = {
    algebra:                "e.g. Solve: 2x² + 5x - 3 = 0",
    calculus:               "e.g. Find the derivative of f(x) = x³ + 2x²",
    geometry:               "e.g. Find the area of a triangle with base 8 and height 5",
    trigonometry:           "e.g. Solve: sin(x) = 0.5 for 0 ≤ x ≤ 2π",
    statistics:             "e.g. Find the mean and standard deviation of [4, 7, 13, 16]",
    arithmetic:             "e.g. Calculate: 3/4 + 5/6",
    precalculus:            "e.g. Simplify: log₂(8) + log₂(4)",
    linear_algebra:         "e.g. Find the determinant of matrix [[1,2],[3,4]]",
    differential_equations: "e.g. Solve: dy/dx = 3y with y(0) = 2",
    number_theory:          "e.g. Find the GCD of 48 and 18",
    american_literature:    "e.g. Analyze the symbolism in The Great Gatsby",
    british_literature:     "e.g. Discuss the themes of ambition in Macbeth",
    world_literature:       "e.g. Compare the themes in Don Quixote and One Hundred Years of Solitude",
    composition:            "e.g. Help me write a thesis statement about climate change",
    creative_writing:       "e.g. Give me feedback on my short story opening",
    debate:                 "e.g. Build an argument for renewable energy",
    journalism:             "e.g. Write a lead sentence for a story about a school fire",
    grammar:                "e.g. When do I use 'who' vs 'whom'?",
    poetry:                 "e.g. Analyze the meter of Shakespeare's Sonnet 18",
    biology:                "e.g. Explain the process of mitosis",
    chemistry:              "e.g. Balance: Fe + O₂ → Fe₂O₃",
    physics:                "e.g. A car accelerates from 0 to 60 m/s in 10s. Find acceleration.",
    earth_science:          "e.g. Explain the rock cycle",
    space_science:          "e.g. Why do planets orbit the sun?",
    environmental_science:  "e.g. Explain the greenhouse effect",
    anatomy:                "e.g. Describe the function of the mitral valve",
    forensics:              "e.g. How is DNA evidence collected and analyzed?",
    general_science:        "e.g. What is the difference between a hypothesis and a theory?",
    us_history:             "e.g. What caused the Civil War?",
    world_history:          "e.g. What caused World War I?",
    government:             "e.g. Explain the system of checks and balances",
    economics:              "e.g. Explain supply and demand with an example",
    geography:              "e.g. What is the Ring of Fire?",
    psychology:             "e.g. Explain Maslow's hierarchy of needs",
    sociology:              "e.g. What is social stratification?",
    civics:                 "e.g. What rights are protected by the First Amendment?",
  };
  return placeholders[id] ?? `Ask a ${getSubjectDef(id as SubjectId).label} question...`;
}

/** Subjects grouped by category — used by SubjectPicker */
export function getSubjectsByCategory(): Record<SubjectCategory, SubjectDef[]> {
  const result: Record<SubjectCategory, SubjectDef[]> = { math: [], english: [], science: [], social: [] };
  for (const s of ALL_SUBJECTS) {
    if (s.id !== "other") result[s.category].push(s);
  }
  return result;
}
