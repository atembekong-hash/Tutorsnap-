import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Difficulty } from "@/shared/types";

const KEY_PREFIX = "@tutorsnap/subjectDifficulty_";
const DEFAULT_DIFFICULTY: Difficulty = "medium";

/** Load the last-used difficulty for a given subject. Falls back to "medium". */
export async function getSubjectDifficulty(subjectId: string): Promise<Difficulty> {
  try {
    const val = await AsyncStorage.getItem(`${KEY_PREFIX}${subjectId}`);
    if (val === "easy" || val === "medium" || val === "hard") return val;
  } catch { /* ignore */ }
  return DEFAULT_DIFFICULTY;
}

/** Persist the difficulty chosen for a given subject. */
export async function setSubjectDifficulty(subjectId: string, difficulty: Difficulty): Promise<void> {
  try {
    await AsyncStorage.setItem(`${KEY_PREFIX}${subjectId}`, difficulty);
  } catch { /* ignore */ }
}
