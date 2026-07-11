/**
 * lib/daily-challenge.ts
 *
 * Daily Challenge logic:
 *  - One curated problem per day, seeded from the current date so all users
 *    see the same problem on the same day.
 *  - Resets at midnight local time.
 *  - Awards 50 bonus XP on first correct answer.
 *  - Persists completion state in AsyncStorage so the "Come back tomorrow"
 *    state survives app restarts.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Storage keys ─────────────────────────────────────────────────────────────
const DC_STATE_KEY = "@tutorsnap/dailyChallengeState";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface DailyChallengeState {
  dateKey: string;           // "YYYY-MM-DD"
  completed: boolean;
  correct: boolean | null;   // null = not yet answered
  bonusXpAwarded: boolean;
  selectedOption: string | null;
}

export interface DailyChallengeQuestion {
  id: string;
  subject: string;
  subjectLabel: string;
  difficulty: "medium" | "hard";
  problem: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  bonusXp: number;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
export function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Returns milliseconds until midnight tonight. */
export function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

// ─── Question bank (seeded by date) ──────────────────────────────────────────
const QUESTION_BANK: DailyChallengeQuestion[] = [
  {
    id: "dc-001",
    subject: "algebra",
    subjectLabel: "Algebra",
    difficulty: "hard",
    problem: "If f(x) = 2x² − 3x + 1, what is f(−2)?",
    options: { A: "15", B: "11", C: "3", D: "−1" },
    correctAnswer: "A",
    explanation: "f(−2) = 2(4) − 3(−2) + 1 = 8 + 6 + 1 = 15.",
    bonusXp: 50,
  },
  {
    id: "dc-002",
    subject: "geometry",
    subjectLabel: "Geometry",
    difficulty: "medium",
    problem: "A circle has a radius of 7 cm. What is its area? (Use π ≈ 3.14)",
    options: { A: "43.96 cm²", B: "153.86 cm²", C: "49 cm²", D: "21.98 cm²" },
    correctAnswer: "B",
    explanation: "Area = πr² = 3.14 × 49 = 153.86 cm².",
    bonusXp: 50,
  },
  {
    id: "dc-003",
    subject: "calculus",
    subjectLabel: "Calculus",
    difficulty: "hard",
    problem: "What is the derivative of f(x) = x³ − 4x² + 7?",
    options: { A: "3x² − 8x", B: "3x² − 4x", C: "x² − 8x + 7", D: "3x² + 7" },
    correctAnswer: "A",
    explanation: "Using the power rule: f′(x) = 3x² − 8x.",
    bonusXp: 50,
  },
  {
    id: "dc-004",
    subject: "statistics",
    subjectLabel: "Statistics",
    difficulty: "medium",
    problem: "The mean of 5 numbers is 12. If four of them are 10, 14, 11, and 13, what is the fifth?",
    options: { A: "10", B: "11", C: "12", D: "13" },
    correctAnswer: "C",
    explanation: "Sum = 5 × 12 = 60. Known sum = 10+14+11+13 = 48. Fifth = 60 − 48 = 12.",
    bonusXp: 50,
  },
  {
    id: "dc-005",
    subject: "physics",
    subjectLabel: "Physics",
    difficulty: "hard",
    problem: "A car accelerates from rest at 4 m/s². How far does it travel in 5 seconds?",
    options: { A: "20 m", B: "40 m", C: "50 m", D: "100 m" },
    correctAnswer: "C",
    explanation: "s = ½at² = ½ × 4 × 25 = 50 m.",
    bonusXp: 50,
  },
  {
    id: "dc-006",
    subject: "chemistry",
    subjectLabel: "Chemistry",
    difficulty: "medium",
    problem: "How many moles are in 44 g of CO₂? (Molar mass of CO₂ = 44 g/mol)",
    options: { A: "0.5 mol", B: "1 mol", C: "2 mol", D: "44 mol" },
    correctAnswer: "B",
    explanation: "Moles = mass ÷ molar mass = 44 ÷ 44 = 1 mol.",
    bonusXp: 50,
  },
  {
    id: "dc-007",
    subject: "algebra",
    subjectLabel: "Algebra",
    difficulty: "hard",
    problem: "Solve for x: log₂(x) + log₂(x − 2) = 3",
    options: { A: "x = 4", B: "x = 3", C: "x = 6", D: "x = 8" },
    correctAnswer: "A",
    explanation: "log₂(x(x−2)) = 3 → x(x−2) = 8 → x²−2x−8 = 0 → (x−4)(x+2) = 0. Since x > 2, x = 4.",
    bonusXp: 50,
  },
  {
    id: "dc-008",
    subject: "geometry",
    subjectLabel: "Geometry",
    difficulty: "hard",
    problem: "In a right triangle, the two legs are 9 cm and 12 cm. What is the hypotenuse?",
    options: { A: "13 cm", B: "14 cm", C: "15 cm", D: "21 cm" },
    correctAnswer: "C",
    explanation: "c = √(9² + 12²) = √(81 + 144) = √225 = 15 cm.",
    bonusXp: 50,
  },
  {
    id: "dc-009",
    subject: "statistics",
    subjectLabel: "Statistics",
    difficulty: "hard",
    problem: "A bag has 3 red and 5 blue balls. What is the probability of drawing 2 red balls without replacement?",
    options: { A: "3/28", B: "9/64", C: "3/8", D: "1/4" },
    correctAnswer: "A",
    explanation: "P = (3/8) × (2/7) = 6/56 = 3/28.",
    bonusXp: 50,
  },
  {
    id: "dc-010",
    subject: "calculus",
    subjectLabel: "Calculus",
    difficulty: "hard",
    problem: "Evaluate: ∫₀² (3x² + 2x) dx",
    options: { A: "8", B: "10", C: "12", D: "16" },
    correctAnswer: "C",
    explanation: "[x³ + x²]₀² = (8 + 4) − 0 = 12.",
    bonusXp: 50,
  },
];

/** Pick today's question using a date-based seed. */
export function getTodayQuestion(): DailyChallengeQuestion {
  const key = getTodayKey();
  // Simple numeric seed from date digits
  const seed = key.replace(/-/g, "").split("").reduce((acc, c) => acc + parseInt(c, 10), 0);
  return QUESTION_BANK[seed % QUESTION_BANK.length];
}

// ─── State persistence ────────────────────────────────────────────────────────
export async function getDailyChallengeState(): Promise<DailyChallengeState> {
  const today = getTodayKey();
  try {
    const raw = await AsyncStorage.getItem(DC_STATE_KEY);
    if (raw) {
      const parsed: DailyChallengeState = JSON.parse(raw);
      if (parsed.dateKey === today) return parsed;
    }
  } catch { /* ignore */ }
  // Fresh state for today
  return { dateKey: today, completed: false, correct: null, bonusXpAwarded: false, selectedOption: null };
}

export async function saveDailyChallengeState(state: DailyChallengeState): Promise<void> {
  try {
    await AsyncStorage.setItem(DC_STATE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}
