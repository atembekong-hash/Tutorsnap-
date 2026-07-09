// All academic subjects organized by category
// Designed to be clean and uncluttered in the UI

export type SubjectCategory = "math" | "english" | "science" | "social_studies";

export type SubjectId =
  // Math
  | "algebra" | "calculus" | "geometry" | "trigonometry" | "statistics"
  | "arithmetic" | "linear_algebra" | "differential_equations" | "number_theory" | "precalculus"
  // English / Language Arts
  | "american_literature" | "british_literature" | "world_literature"
  | "composition" | "creative_writing" | "debate" | "journalism" | "grammar" | "poetry"
  // Science
  | "biology" | "chemistry" | "physics" | "earth_science" | "space_science"
  | "environmental_science" | "anatomy" | "forensics" | "general_science"
  // Social Studies
  | "us_history" | "world_history" | "government" | "economics"
  | "geography" | "psychology" | "sociology" | "civics";

export type SubjectDef = {
  id: SubjectId;
  label: string;
  shortLabel: string;
  category: SubjectCategory;
  color: string;
  icon: string; // Material icon name
  description: string;
};

export type CategoryDef = {
  id: SubjectCategory;
  label: string;
  color: string;
  icon: string;
  subjects: SubjectDef[];
};

export const SUBJECT_CATEGORIES: CategoryDef[] = [
  {
    id: "math",
    label: "Mathematics",
    color: "#4F46E5",
    icon: "calculate",
    subjects: [
      { id: "algebra", label: "Algebra", shortLabel: "Algebra", category: "math", color: "#4F46E5", icon: "functions", description: "Equations, polynomials, systems" },
      { id: "calculus", label: "Calculus", shortLabel: "Calculus", category: "math", color: "#3B82F6", icon: "trending-up", description: "Derivatives, integrals, limits" },
      { id: "geometry", label: "Geometry", shortLabel: "Geometry", category: "math", color: "#06B6D4", icon: "change-history", description: "Shapes, proofs, coordinates" },
      { id: "trigonometry", label: "Trigonometry", shortLabel: "Trig", category: "math", color: "#8B5CF6", icon: "calculate", description: "Sin, cos, tan, identities" },
      { id: "statistics", label: "Statistics", shortLabel: "Stats", category: "math", color: "#EC4899", icon: "bar-chart", description: "Probability, data analysis" },
      { id: "arithmetic", label: "Arithmetic", shortLabel: "Arithmetic", category: "math", color: "#6366F1", icon: "functions", description: "Basic operations, fractions" },
      { id: "precalculus", label: "Pre-Calculus", shortLabel: "Pre-Calc", category: "math", color: "#7C3AED", icon: "show-chart", description: "Functions, sequences, limits" },
      { id: "linear_algebra", label: "Linear Algebra", shortLabel: "Lin. Algebra", category: "math", color: "#2563EB", icon: "grid-on", description: "Matrices, vectors, spaces" },
      { id: "differential_equations", label: "Differential Equations", shortLabel: "Diff. Eq.", category: "math", color: "#1D4ED8", icon: "timeline", description: "ODEs, PDEs, modeling" },
      { id: "number_theory", label: "Number Theory", shortLabel: "Number Theory", category: "math", color: "#4338CA", icon: "tag", description: "Primes, divisibility, proofs" },
    ],
  },
  {
    id: "english",
    label: "English / ELA",
    color: "#D97706",
    icon: "menu-book",
    subjects: [
      { id: "american_literature", label: "American Literature", shortLabel: "Am. Lit", category: "english", color: "#D97706", icon: "menu-book", description: "American authors & works" },
      { id: "british_literature", label: "British Literature", shortLabel: "Brit. Lit", category: "english", color: "#B45309", icon: "auto-stories", description: "British authors & works" },
      { id: "world_literature", label: "World Literature", shortLabel: "World Lit", category: "english", color: "#92400E", icon: "public", description: "Global literary traditions" },
      { id: "composition", label: "Composition", shortLabel: "Composition", category: "english", color: "#F59E0B", icon: "edit", description: "Essays, writing structure" },
      { id: "creative_writing", label: "Creative Writing", shortLabel: "Creative Writing", category: "english", color: "#FBBF24", icon: "create", description: "Fiction, poetry, narrative" },
      { id: "debate", label: "Debate", shortLabel: "Debate", category: "english", color: "#EF4444", icon: "record-voice-over", description: "Arguments, rhetoric, logic" },
      { id: "journalism", label: "Journalism", shortLabel: "Journalism", category: "english", color: "#F97316", icon: "newspaper", description: "News writing, reporting" },
      { id: "grammar", label: "Grammar & Language", shortLabel: "Grammar", category: "english", color: "#EA580C", icon: "spellcheck", description: "Grammar, syntax, vocabulary" },
      { id: "poetry", label: "Poetry", shortLabel: "Poetry", category: "english", color: "#DC2626", icon: "format-quote", description: "Analysis, forms, devices" },
    ],
  },
  {
    id: "science",
    label: "Science",
    color: "#059669",
    icon: "science",
    subjects: [
      { id: "biology", label: "Biology", shortLabel: "Biology", category: "science", color: "#059669", icon: "biotech", description: "Life, cells, genetics, ecology" },
      { id: "chemistry", label: "Chemistry", shortLabel: "Chemistry", category: "science", color: "#10B981", icon: "science", description: "Elements, reactions, bonds" },
      { id: "physics", label: "Physics", shortLabel: "Physics", category: "science", color: "#0D9488", icon: "bolt", description: "Motion, forces, energy, waves" },
      { id: "earth_science", label: "Earth Science", shortLabel: "Earth Sci.", category: "science", color: "#16A34A", icon: "terrain", description: "Geology, weather, oceans" },
      { id: "space_science", label: "Space Science", shortLabel: "Space Sci.", category: "science", color: "#1D4ED8", icon: "nights-stay", description: "Astronomy, planets, cosmos" },
      { id: "environmental_science", label: "Environmental Science", shortLabel: "Env. Science", category: "science", color: "#15803D", icon: "eco", description: "Ecosystems, climate, resources" },
      { id: "anatomy", label: "Anatomy", shortLabel: "Anatomy", category: "science", color: "#DC2626", icon: "favorite", description: "Human body, systems, organs" },
      { id: "forensics", label: "Forensics", shortLabel: "Forensics", category: "science", color: "#7C3AED", icon: "fingerprint", description: "Crime science, evidence" },
      { id: "general_science", label: "General Science", shortLabel: "General Sci.", category: "science", color: "#0891B2", icon: "lightbulb", description: "Broad science concepts" },
    ],
  },
  {
    id: "social_studies",
    label: "Social Studies",
    color: "#7C3AED",
    icon: "public",
    subjects: [
      { id: "us_history", label: "U.S. History", shortLabel: "U.S. History", category: "social_studies", color: "#B45309", icon: "account-balance", description: "American history & events" },
      { id: "world_history", label: "World History", shortLabel: "World History", category: "social_studies", color: "#92400E", icon: "public", description: "Global history & civilizations" },
      { id: "government", label: "Government / Civics", shortLabel: "Government", category: "social_studies", color: "#1D4ED8", icon: "gavel", description: "Political systems, law" },
      { id: "economics", label: "Economics", shortLabel: "Economics", category: "social_studies", color: "#15803D", icon: "attach-money", description: "Micro/macro, markets, trade" },
      { id: "geography", label: "Geography", shortLabel: "Geography", category: "social_studies", color: "#0891B2", icon: "map", description: "Physical & human geography" },
      { id: "psychology", label: "Psychology", shortLabel: "Psychology", category: "social_studies", color: "#7C3AED", icon: "psychology", description: "Mind, behavior, theories" },
      { id: "sociology", label: "Sociology", shortLabel: "Sociology", category: "social_studies", color: "#9333EA", icon: "groups", description: "Society, culture, institutions" },
      { id: "civics", label: "Civics", shortLabel: "Civics", category: "social_studies", color: "#2563EB", icon: "how-to-vote", description: "Citizenship, rights, democracy" },
    ],
  },
];

// Flat lookup map
export const SUBJECTS_MAP: Record<SubjectId, SubjectDef> = Object.fromEntries(
  SUBJECT_CATEGORIES.flatMap((cat) => cat.subjects.map((s) => [s.id, s]))
) as Record<SubjectId, SubjectDef>;

export const CATEGORY_MAP: Record<SubjectCategory, CategoryDef> = Object.fromEntries(
  SUBJECT_CATEGORIES.map((cat) => [cat.id, cat])
) as Record<SubjectCategory, CategoryDef>;

export function getSubjectColor(subjectId: string): string {
  return SUBJECTS_MAP[subjectId as SubjectId]?.color ?? "#6B7280";
}

export function getSubjectLabel(subjectId: string): string {
  return SUBJECTS_MAP[subjectId as SubjectId]?.label ?? "Academic";
}

export function getSubjectShortLabel(subjectId: string): string {
  return SUBJECTS_MAP[subjectId as SubjectId]?.shortLabel ?? subjectId;
}

export function getCategoryForSubject(subjectId: string): CategoryDef | undefined {
  return SUBJECT_CATEGORIES.find((cat) =>
    cat.subjects.some((s) => s.id === subjectId)
  );
}
