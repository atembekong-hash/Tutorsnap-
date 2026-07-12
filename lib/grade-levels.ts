/**
 * Shared grade-level constants and helpers used across all screens.
 * The canonical list of grade options, short labels, and descriptions.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export const GLOBAL_GRADE_KEY = "global_grade_level";

export interface GradeOption {
  id: string;
  label: string;
  sub: string;
}

export const GRADE_OPTIONS: GradeOption[] = [
  { id: "grade1",     label: "Grade 1",   sub: "Age 6-7"       },
  { id: "grade2",     label: "Grade 2",   sub: "Age 7-8"       },
  { id: "grade3",     label: "Grade 3",   sub: "Age 8-9"       },
  { id: "grade4",     label: "Grade 4",   sub: "Age 9-10"      },
  { id: "grade5",     label: "Grade 5",   sub: "Age 10-11"     },
  { id: "grade6",     label: "Grade 6",   sub: "Age 11-12"     },
  { id: "grade7",     label: "Grade 7",   sub: "Age 12-13"     },
  { id: "grade8",     label: "Grade 8",   sub: "Age 13-14"     },
  { id: "grade9",     label: "Grade 9",   sub: "Age 14-15"     },
  { id: "grade10",    label: "Grade 10",  sub: "Age 15-16"     },
  { id: "gcse",       label: "GCSE",      sub: "UK Gr 10-11"   },
  { id: "alevel",     label: "A-Level",   sub: "UK Gr 12-13"   },
  { id: "university", label: "University",sub: "Degree level"  },
];

export const GRADE_LABELS: Record<string, string> = {
  grade1:     "Gr 1",
  grade2:     "Gr 2",
  grade3:     "Gr 3",
  grade4:     "Gr 4",
  grade5:     "Gr 5",
  grade6:     "Gr 6",
  grade7:     "Gr 7",
  grade8:     "Gr 8",
  grade9:     "Gr 9",
  grade10:    "Gr 10",
  gcse:       "GCSE",
  alevel:     "A-Level",
  university: "Uni",
};

/** Full descriptions sent to the LLM for each grade level. */
export const GRADE_LEVEL_DESCRIPTIONS: Record<string, string> = {
  grade1:     "Grade 1 (age 6-7): Use very simple words, very short sentences, and fun real-world examples a young child would understand. Avoid all jargon.",
  grade2:     "Grade 2 (age 7-8): Use simple words and short sentences. Relate concepts to everyday objects and activities a child knows.",
  grade3:     "Grade 3 (age 8-9): Use clear, simple language. Introduce basic subject vocabulary with immediate plain-English definitions.",
  grade4:     "Grade 4 (age 9-10): Use friendly, clear language. Introduce subject terms with definitions and simple examples.",
  grade5:     "Grade 5 (age 10-11): Use clear language with some subject-specific terms. Provide step-by-step explanations with relatable examples.",
  grade6:     "Grade 6 (age 11-12): Use simple language, short sentences, relatable real-world examples. Avoid jargon.",
  grade7:     "Grade 7 (age 12-13): Simple language, concrete examples, introduce basic terminology with clear definitions.",
  grade8:     "Grade 8 (age 13-14): Moderate complexity, introduce subject-specific terms, use step-by-step explanations.",
  grade9:     "Grade 9 (age 14-15): High school level, standard academic vocabulary, structured explanations.",
  grade10:    "Grade 10 (age 15-16): GCSE / sophomore level, precise academic language, multi-step reasoning.",
  gcse:       "GCSE / Grade 10-11: UK secondary school level, exam-focused explanations, mark-scheme style answers.",
  alevel:     "A-Level / Grade 11-12: Advanced pre-university level, rigorous explanations, introduce university concepts.",
  university: "University / Degree level: Assume strong subject knowledge, use technical terminology freely, provide rigorous academic-level explanations.",
};

/** Load the global default grade level from AsyncStorage. */
export async function loadGlobalGrade(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(GLOBAL_GRADE_KEY);
  } catch {
    return null;
  }
}

/** Save the global default grade level to AsyncStorage. */
export async function saveGlobalGrade(grade: string | null): Promise<void> {
  try {
    if (grade) {
      await AsyncStorage.setItem(GLOBAL_GRADE_KEY, grade);
    } else {
      await AsyncStorage.removeItem(GLOBAL_GRADE_KEY);
    }
  } catch {
    // ignore
  }
}

/** Get the grade context string to inject into LLM prompts. */
export function getGradePromptContext(gradeLevel: string | null | undefined): string {
  if (!gradeLevel) return "";
  const desc = GRADE_LEVEL_DESCRIPTIONS[gradeLevel];
  if (!desc) return "";
  return `\nADAPT YOUR RESPONSE to this student's level: ${desc}`;
}
