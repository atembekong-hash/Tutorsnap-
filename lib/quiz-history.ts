import AsyncStorage from "@react-native-async-storage/async-storage";

const QUIZ_HISTORY_KEY = "tutorsnap_quiz_history";

export interface QuizResult {
  id: string;
  subject: string;
  difficulty: "easy" | "medium" | "hard";
  score: number;       // correct count
  total: number;       // total questions
  pct: number;         // 0-100
  timeTaken: number;   // seconds
  completedAt: number; // timestamp
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
}

export async function loadQuizStats(): Promise<QuizStats> {
  const history = await loadQuizHistory();
  if (history.length === 0) {
    return { totalQuizzes: 0, bestScore: 0, averageScore: 0, bySubject: {} };
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
  return { totalQuizzes: history.length, bestScore: best, averageScore: avg, bySubject };
}
