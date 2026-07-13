/**
 * Centralized subject definitions for TutorSnap.
 * All subjects are organized into 4 top-level categories.
 * Every screen imports from here — no duplicated subject maps.
 */

export type SubjectCategory = "math" | "english" | "science" | "social";

export interface SubjectDef {
  id: SubjectId;
  label: string;
  category: SubjectCategory;
  /** Light-mode color (used as default) */
  color: string;
  /** Dark-mode color — brighter/lighter variant for visibility on dark backgrounds */
  darkColor: string;
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

export const SUBJECT_CATEGORIES: Record<SubjectCategory, { label: string; emoji: string; color: string; darkColor: string }> = {
  math:    { label: "Mathematics",             emoji: "📐", color: "#4F46E5", darkColor: "#818CF8" },
  english: { label: "English / Language Arts", emoji: "📖", color: "#0891B2", darkColor: "#22D3EE" },
  science: { label: "Science",                 emoji: "🔬", color: "#059669", darkColor: "#34D399" },
  social:  { label: "Social Studies",          emoji: "🌍", color: "#D97706", darkColor: "#FBBF24" },
};

export const ALL_SUBJECTS: SubjectDef[] = [
  // ── Mathematics ──────────────────────────────────────────────────────────
  { id: "algebra",                label: "Algebra",                 category: "math",    color: "#4F46E5", darkColor: "#818CF8", emoji: "𝑥²" },
  { id: "calculus",               label: "Calculus",                category: "math",    color: "#6366F1", darkColor: "#A5B4FC", emoji: "∫" },
  { id: "geometry",               label: "Geometry",                category: "math",    color: "#7C3AED", darkColor: "#A78BFA", emoji: "△" },
  { id: "trigonometry",           label: "Trigonometry",            category: "math",    color: "#8B5CF6", darkColor: "#C4B5FD", emoji: "sin" },
  { id: "statistics",             label: "Statistics",              category: "math",    color: "#7C3AED", darkColor: "#A78BFA", emoji: "σ" },
  { id: "arithmetic",             label: "Arithmetic",              category: "math",    color: "#4338CA", darkColor: "#818CF8", emoji: "+" },
  { id: "precalculus",            label: "Pre-Calculus",            category: "math",    color: "#5B21B6", darkColor: "#A78BFA", emoji: "f(x)" },
  { id: "linear_algebra",         label: "Linear Algebra",          category: "math",    color: "#3730A3", darkColor: "#818CF8", emoji: "[]" },
  { id: "differential_equations", label: "Differential Equations",  category: "math",    color: "#312E81", darkColor: "#818CF8", emoji: "dy" },
  { id: "number_theory",          label: "Number Theory",           category: "math",    color: "#4F46E5", darkColor: "#818CF8", emoji: "ℕ" },

  // ── English / Language Arts ───────────────────────────────────────────────
  { id: "american_literature",    label: "American Literature",     category: "english", color: "#0891B2", darkColor: "#22D3EE", emoji: "🇺🇸" },
  { id: "british_literature",     label: "British Literature",      category: "english", color: "#0E7490", darkColor: "#22D3EE", emoji: "🇬🇧" },
  { id: "world_literature",       label: "World Literature",        category: "english", color: "#155E75", darkColor: "#38BDF8", emoji: "🌐" },
  { id: "composition",            label: "Composition",             category: "english", color: "#06B6D4", darkColor: "#67E8F9", emoji: "✍️" },
  { id: "creative_writing",       label: "Creative Writing",        category: "english", color: "#22D3EE", darkColor: "#A5F3FC", emoji: "🖊️" },
  { id: "debate",                 label: "Debate",                  category: "english", color: "#0284C7", darkColor: "#38BDF8", emoji: "💬" },
  { id: "journalism",             label: "Journalism",              category: "english", color: "#0369A1", darkColor: "#38BDF8", emoji: "📰" },
  { id: "grammar",                label: "Grammar",                 category: "english", color: "#075985", darkColor: "#38BDF8", emoji: "Aa" },
  { id: "poetry",                 label: "Poetry",                  category: "english", color: "#0C4A6E", darkColor: "#38BDF8", emoji: "🎭" },

  // ── Science ───────────────────────────────────────────────────────────────
  { id: "biology",                label: "Biology",                 category: "science", color: "#059669", darkColor: "#34D399", emoji: "🧬" },
  { id: "chemistry",              label: "Chemistry",               category: "science", color: "#10B981", darkColor: "#6EE7B7", emoji: "⚗️" },
  { id: "physics",                label: "Physics",                 category: "science", color: "#047857", darkColor: "#34D399", emoji: "⚛️" },
  { id: "earth_science",          label: "Earth Science",           category: "science", color: "#065F46", darkColor: "#34D399", emoji: "🌎" },
  { id: "space_science",          label: "Space Science",           category: "science", color: "#064E3B", darkColor: "#34D399", emoji: "🚀" },
  { id: "environmental_science",  label: "Environmental Science",   category: "science", color: "#059669", darkColor: "#34D399", emoji: "🌿" },
  { id: "anatomy",                label: "Anatomy",                 category: "science", color: "#0D9488", darkColor: "#2DD4BF", emoji: "🫀" },
  { id: "forensics",              label: "Forensics",               category: "science", color: "#0891B2", darkColor: "#22D3EE", emoji: "🔍" },
  { id: "general_science",        label: "General Science",         category: "science", color: "#0284C7", darkColor: "#38BDF8", emoji: "🔭" },

  // ── Social Studies / History ──────────────────────────────────────────────
  { id: "us_history",             label: "U.S. History",            category: "social",  color: "#D97706", darkColor: "#FBBF24", emoji: "🏛️" },
  { id: "world_history",          label: "World History",           category: "social",  color: "#B45309", darkColor: "#FCD34D", emoji: "🗺️" },
  { id: "government",             label: "Government / Civics",     category: "social",  color: "#92400E", darkColor: "#FCD34D", emoji: "⚖️" },
  { id: "economics",              label: "Economics",               category: "social",  color: "#78350F", darkColor: "#FCD34D", emoji: "📊" },
  { id: "geography",              label: "Geography",               category: "social",  color: "#F59E0B", darkColor: "#FDE68A", emoji: "🌏" },
  { id: "psychology",             label: "Psychology",              category: "social",  color: "#D97706", darkColor: "#FBBF24", emoji: "🧠" },
  { id: "sociology",              label: "Sociology",               category: "social",  color: "#B45309", darkColor: "#FCD34D", emoji: "👥" },
  { id: "civics",                 label: "Civics",                  category: "social",  color: "#92400E", darkColor: "#FCD34D", emoji: "🗳️" },

  { id: "other",                  label: "Other",                   category: "math",    color: "#6B7280", darkColor: "#9CA3AF", emoji: "📚" },
];

/** O(1) lookup map */
const SUBJECT_MAP = new Map<SubjectId, SubjectDef>(ALL_SUBJECTS.map((s) => [s.id, s]));

export function getSubjectDef(id: SubjectId | string): SubjectDef {
  return SUBJECT_MAP.get(id as SubjectId) ?? { id: "other", label: id, category: "math", color: "#6B7280", darkColor: "#9CA3AF", emoji: "📚" };
}

/**
 * Returns the subject color appropriate for the current color scheme.
 * Pass `scheme` to get the dark-mode variant when in dark mode.
 */
export function getSubjectColor(id: SubjectId | string, scheme?: "light" | "dark"): string {
  const def = getSubjectDef(id);
  return scheme === "dark" ? def.darkColor : def.color;
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

/** Returns true if the subject belongs to the Science category */
export function isScienceSubject(id: SubjectId | string | null): boolean {
  if (!id) return false;
  return getSubjectDef(id as SubjectId).category === "science";
}

/** Returns a contextual placeholder string for the text input based on the selected subject */
export function getSubjectPlaceholder(id: SubjectId | string | null): string {
  if (!id) return "Type or paste a problem here…";
  const def = getSubjectDef(id);
  const placeholders: Partial<Record<SubjectId, string>> = {
    algebra: "e.g. Solve 2x + 3 = 11",
    calculus: "e.g. Find the derivative of x³ + 2x",
    geometry: "e.g. Find the area of a triangle with base 6 and height 4",
    trigonometry: "e.g. Solve sin(x) = 0.5 for 0 ≤ x ≤ 2π",
    statistics: "e.g. Find the mean and standard deviation of 3, 7, 5, 9",
    arithmetic: "e.g. Calculate 245 × 37",
    precalculus: "e.g. Find the zeros of f(x) = x² − 5x + 6",
    linear_algebra: "e.g. Find the eigenvalues of [[2,1],[1,2]]",
    differential_equations: "e.g. Solve dy/dx = 2y",
    number_theory: "e.g. Find all prime factors of 360",
    biology: "e.g. Explain the process of mitosis",
    chemistry: "e.g. Balance: H₂ + O₂ → H₂O",
    physics: "e.g. A ball is thrown at 20 m/s at 45°. Find the range.",
    grammar: "e.g. Identify the subject and predicate in this sentence",
    poetry: "e.g. Analyse the metaphors in this poem",
  };
  return (placeholders as Record<string, string>)[def.id] ?? `e.g. Enter a ${def.label} problem…`;
}

/** Returns all subjects grouped by category */
export function getSubjectsByCategory(): Record<SubjectCategory, SubjectDef[]> {
  const result: Record<SubjectCategory, SubjectDef[]> = {
    math: [],
    english: [],
    science: [],
    social: [],
  };
  for (const s of ALL_SUBJECTS) {
    result[s.category].push(s);
  }
  return result;
}
