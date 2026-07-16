import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@tutorsnap/quizPrefetch";

export interface PrefetchedQuiz {
  subject: string;
  difficulty: string;
  count: number;
  gradeLevel: string | null;
  questions: unknown[];
  cachedAt: number;
}

/** Save a pre-generated quiz to AsyncStorage */
export async function savePrefetchedQuiz(quiz: PrefetchedQuiz): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(quiz));
  } catch {
    // non-critical
  }
}

/** Load a cached quiz if it matches the requested params and is fresh (< 5 min) */
export async function loadPrefetchedQuiz(
  subject: string,
  difficulty: string,
  count: number,
  gradeLevel: string | null
): Promise<unknown[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as PrefetchedQuiz;
    const age = Date.now() - cached.cachedAt;
    if (
      cached.subject === subject &&
      cached.difficulty === difficulty &&
      cached.count === count &&
      cached.gradeLevel === gradeLevel &&
      age < 5 * 60 * 1000 // 5 minutes
    ) {
      await AsyncStorage.removeItem(KEY); // consume once
      return cached.questions;
    }
    return null;
  } catch {
    return null;
  }
}

/** Clear the prefetch cache */
export async function clearPrefetchedQuiz(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // non-critical
  }
}
