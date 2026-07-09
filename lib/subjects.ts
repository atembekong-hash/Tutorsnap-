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

/** Subjects grouped by category — used by SubjectPicker */
export function getSubjectsByCategory(): Record<SubjectCategory, SubjectDef[]> {
  const result: Record<SubjectCategory, SubjectDef[]> = { math: [], english: [], science: [], social: [] };
  for (const s of ALL_SUBJECTS) {
    if (s.id !== "other") result[s.category].push(s);
  }
  return result;
}
