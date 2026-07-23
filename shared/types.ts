export type MathSubject =
  // Math
  | "algebra"
  | "calculus"
  | "geometry"
  | "trigonometry"
  | "statistics"
  | "arithmetic"
  | "precalculus"
  | "linear_algebra"
  | "differential_equations"
  | "number_theory"
  // English / Language Arts
  | "american_literature"
  | "british_literature"
  | "world_literature"
  | "composition"
  | "creative_writing"
  | "debate"
  | "journalism"
  | "grammar"
  | "poetry"
  // Science
  | "biology"
  | "chemistry"
  | "physics"
  | "earth_science"
  | "space_science"
  | "environmental_science"
  | "anatomy"
  | "forensics"
  | "general_science"
  // Social Studies
  | "us_history"
  | "world_history"
  | "government"
  | "economics"
  | "geography"
  | "psychology"
  | "sociology"
  | "civics"
  // Fallback
  | "other";

export type Difficulty = "easy" | "medium" | "hard";

export type SolutionStep = {
  stepNumber: number;
  title: string;
  explanation: string;
  expression?: string;
};

export type WorkedExample = {
  title: string;
  problem: string;
  solution: string;
};

export type MathSolution = {
  problem: string;
  subject: MathSubject;
  answer: string;
  steps: SolutionStep[];
  conceptExplained?: string;
  tips?: string[];
  relatedTopics?: string[];
  workedExample?: WorkedExample;
  /** Independently generated submission-ready answer — complete worked solution as a student would write for marking. */
  submissionReady?: string;
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
  gradeLevel?: string;
};

export type PracticeQuestion = {
  id: string;
  subject: MathSubject;
  difficulty: Difficulty;
  problem: string;
  answer: string;
  steps: SolutionStep[];
  hints: string[];
  /** Independently generated submission-ready answer — complete worked solution as a student would write for marking. */
  submissionReady?: string;
};

export type StudyBlockType =
  | "core_answer"
  | "key_concept"
  | "worked_example"
  | "formula"
  | "definition"
  | "tip"
  | "analogy"
  | "code"
  | "summary"
  | "step_breakdown"
  | "visual_note";

export type StudyBlock = {
  id: string;
  type: StudyBlockType;
  title: string;
  content: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  stopped?: boolean; // true when user manually stopped streaming
  error?: boolean;  // true when the AI stream failed — shows retry button
  retryPayload?: Array<{ role: "user" | "assistant"; content: string }>; // context to retry
};
