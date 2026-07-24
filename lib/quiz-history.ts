import AsyncStorage from "@react-native-async-storage/async-storage";

const QUIZ_HISTORY_KEY = "tutorsnap_quiz_history";

// ─── Per-question snapshot saved with each quiz ────────────────────────────────

export interface QuizQuestionSnapshot {
  id: string;
  problem: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  userAnswer: "A" | "B" | "C" | "D" | null; // null = timed out
}

// ─── Full quiz result (summary + per-question detail) ─────────────────────────

export interface QuizResult {
  id: string;
  subject: string;
  difficulty: "easy" | "medium" | "hard";
  score: number;       // correct count
  total: number;       // total questions
  pct: number;         // 0-100
  timeTaken: number;   // seconds
  completedAt: number; // timestamp
  /** Per-question detail — may be absent on older records saved before this field was added */
  questions?: QuizQuestionSnapshot[];
  /** Grade level at the time of the quiz — may be absent on older records */
  gradeLevel?: string | null;
}

export async function saveQuizResult(result: Omit<QuizResult, "id">): Promise<QuizResult> {
  const entry: QuizResult = { ...result, id: `quiz-${Date.now()}` };
  const existing = await loadQuizHistory();
  const updated = [entry, ...existing].slice(0, 100); // keep last 100
  await AsyncStorage.setItem(QUIZ_HISTORY_KEY, JSON.stringify(updated));
  return entry;
}

export async function loadQuizHistory(): Promise<QuizResult[]> {
  try {
    const raw = await AsyncStorage.getItem(QUIZ_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as QuizResult[];
  } catch {
    return [];
  }
}

export interface QuizStats {
  totalQuizzes: number;
  bestScore: number;       // pct
  averageScore: number;    // pct
  bySubject: Record<string, { total: number; best: number; avg: number }>;
  byGrade: Record<string, { total: number; best: number; avg: number }>;
}

export interface DifficultyUpSuggestion {
  subject: string;
  currentDifficulty: "easy" | "medium";
  suggestedDifficulty: "medium" | "hard";
  avgPct: number;
  quizCount: number;
}

/**
 * Returns a suggestion to bump difficulty if the last 3 quizzes on the same
 * subject at the current difficulty all scored >= 85%.
 */
export async function getAdaptiveDifficultySuggestion(
  subject: string,
  currentDifficulty: "easy" | "medium" | "hard"
): Promise<DifficultyUpSuggestion | null> {
  if (currentDifficulty === "hard") return null;
  try {
    const history = await loadQuizHistory();
    const relevant = history
      .filter((h) => h.subject === subject && h.difficulty === currentDifficulty)
      .slice(0, 3);
    if (relevant.length < 3) return null;
    const avgPct = Math.round(relevant.reduce((s, h) => s + h.pct, 0) / relevant.length);
    if (avgPct < 85) return null;
    return {
      subject,
      currentDifficulty,
      suggestedDifficulty: currentDifficulty === "easy" ? "medium" : "hard",
      avgPct,
      quizCount: relevant.length,
    };
  } catch {
    return null;
  }
}

// ─── Downward difficulty suggestion ───────────────────────────────────────────

export interface DifficultyDownSuggestion {
  subject: string;
  currentDifficulty: "medium" | "hard";
  suggestedDifficulty: "easy" | "medium";
  avgPct: number;
  quizCount: number;
}

/**
 * Returns a suggestion to drop difficulty if the last 3 quizzes on the same
 * subject at the current difficulty all scored < 50% (struggling).
 */
export async function getDifficultyDownSuggestion(
  subject: string,
  currentDifficulty: "easy" | "medium" | "hard"
): Promise<DifficultyDownSuggestion | null> {
  if (currentDifficulty === "easy") return null;
  try {
    const history = await loadQuizHistory();
    const relevant = history
      .filter((h) => h.subject === subject && h.difficulty === currentDifficulty)
      .slice(0, 3);
    if (relevant.length < 3) return null;
    const avgPct = Math.round(relevant.reduce((s, h) => s + h.pct, 0) / relevant.length);
    if (avgPct >= 50) return null;
    return {
      subject,
      currentDifficulty: currentDifficulty as "medium" | "hard",
      suggestedDifficulty: currentDifficulty === "hard" ? "medium" : "easy",
      avgPct,
      quizCount: relevant.length,
    };
  } catch {
    return null;
  }
}

export async function loadQuizStats(): Promise<QuizStats> {
  const EMPTY_STATS: QuizStats = { totalQuizzes: 0, bestScore: 0, averageScore: 0, bySubject: {}, byGrade: {} };
  let history: QuizResult[];
  try {
    history = await loadQuizHistory();
  } catch {
    return EMPTY_STATS;
  }
  if (history.length === 0) {
    return EMPTY_STATS;
  }
  const best = Math.max(...history.map((h) => h.pct));
  const avg = Math.round(history.reduce((s, h) => s + h.pct, 0) / history.length);
  const bySubject: QuizStats["bySubject"] = {};
  for (const h of history) {
    if (!bySubject[h.subject]) bySubject[h.subject] = { total: 0, best: 0, avg: 0 };
    bySubject[h.subject].total += 1;
    bySubject[h.subject].best = Math.max(bySubject[h.subject].best, h.pct);
  }
  for (const subj of Object.keys(bySubject)) {
    const subjHistory = history.filter((h) => h.subject === subj);
    bySubject[subj].avg = Math.round(
      subjHistory.reduce((s, h) => s + h.pct, 0) / subjHistory.length
    );
  }
  const byGrade: QuizStats["byGrade"] = {};
  for (const h of history) {
    const key = h.gradeLevel ?? "unknown";
    if (!byGrade[key]) byGrade[key] = { total: 0, best: 0, avg: 0 };
    byGrade[key].total += 1;
    byGrade[key].best = Math.max(byGrade[key].best, h.pct);
  }
  for (const key of Object.keys(byGrade)) {
    const gradeHistory = history.filter((h) => (h.gradeLevel ?? "unknown") === key);
    byGrade[key].avg = Math.round(
      gradeHistory.reduce((s, h) => s + h.pct, 0) / gradeHistory.length
    );
  }
  return { totalQuizzes: history.length, bestScore: best, averageScore: avg, bySubject, byGrade };
}
