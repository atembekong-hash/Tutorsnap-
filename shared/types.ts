export type MathSubject =
  // Math
  | "algebra" | "calculus" | "geometry" | "trigonometry" | "statistics"
  | "arithmetic" | "precalculus" | "linear_algebra" | "differential_equations" | "number_theory"
  // English / ELA
  | "american_literature" | "british_literature" | "world_literature"
  | "composition" | "creative_writing" | "debate" | "journalism" | "grammar" | "poetry"
  // Science
  | "biology" | "chemistry" | "physics" | "earth_science" | "space_science"
  | "environmental_science" | "anatomy" | "forensics" | "general_science"
  // Social Studies
  | "us_history" | "world_history" | "government" | "economics"
  | "geography" | "psychology" | "sociology" | "civics"
  | "other";

export type Difficulty = "easy" | "medium" | "hard";

export type SolutionStep = {
  stepNumber: number;
  title: string;
  explanation: string;
  expression?: string;
};

export type MathSolution = {
  problem: string;
  subject: MathSubject;
  answer: string;
  steps: SolutionStep[];
  conceptExplained?: string;
  tips?: string[];
  relatedTopics?: string[];
};

export type HistoryItem = {
  id: string;
  problem: string;
  answer: string;
  subject: MathSubject;
  steps: SolutionStep[];
  conceptExplained?: string;
  tips?: string[];
  imageUri?: string;
  solvedAt: number;
};

export type PracticeQuestion = {
  id: string;
  subject: MathSubject;
  difficulty: Difficulty;
  problem: string;
  answer: string;
  steps: SolutionStep[];
  hints: string[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
};
