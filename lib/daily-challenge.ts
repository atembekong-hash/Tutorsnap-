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
  difficulty: "easy" | "medium" | "hard";
  /** Grade levels this question is appropriate for. null = all grades. */
  grades?: string[];
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
// Grade buckets:
//   elementary = grade1–grade5
//   middle     = grade6–grade8
//   high       = grade9–grade12
//   advanced   = university
const ELEMENTARY = ["grade1","grade2","grade3","grade4","grade5"];
const MIDDLE     = ["grade6","grade7","grade8"];
const HIGH       = ["grade9","grade10","grade11","grade12"];
const UNIVERSITY = ["university"];

const QUESTION_BANK: DailyChallengeQuestion[] = [
  // ── Elementary ──────────────────────────────────────────────────────────
  {
    id: "dc-e01", subject: "arithmetic", subjectLabel: "Arithmetic", difficulty: "easy", grades: ELEMENTARY,
    problem: "What is 7 × 8?",
    options: { A: "54", B: "56", C: "63", D: "48" }, correctAnswer: "B",
    explanation: "7 × 8 = 56. You can think of it as 7 groups of 8.", bonusXp: 30,
  },
  {
    id: "dc-e02", subject: "arithmetic", subjectLabel: "Arithmetic", difficulty: "easy", grades: ELEMENTARY,
    problem: "A pizza is cut into 8 equal slices. You eat 3. What fraction is left?",
    options: { A: "3/8", B: "5/8", C: "1/2", D: "2/8" }, correctAnswer: "B",
    explanation: "8 − 3 = 5 slices remain. Fraction left = 5/8.", bonusXp: 30,
  },
  {
    id: "dc-e03", subject: "geometry", subjectLabel: "Geometry", difficulty: "easy", grades: ELEMENTARY,
    problem: "A square has a side of 5 cm. What is its perimeter?",
    options: { A: "10 cm", B: "20 cm", C: "25 cm", D: "15 cm" }, correctAnswer: "B",
    explanation: "Perimeter of a square = 4 × side = 4 × 5 = 20 cm.", bonusXp: 30,
  },
  {
    id: "dc-e04", subject: "arithmetic", subjectLabel: "Arithmetic", difficulty: "easy", grades: ELEMENTARY,
    problem: "Round 347 to the nearest hundred.",
    options: { A: "300", B: "350", C: "400", D: "340" }, correctAnswer: "A",
    explanation: "The hundreds digit is 3. The tens digit (4) is less than 5, so we round down to 300.", bonusXp: 30,
  },
  {
    id: "dc-e05", subject: "arithmetic", subjectLabel: "Arithmetic", difficulty: "easy", grades: ELEMENTARY,
    problem: "What is 15% of 200?",
    options: { A: "25", B: "30", C: "35", D: "20" }, correctAnswer: "B",
    explanation: "15% of 200 = 0.15 × 200 = 30.", bonusXp: 30,
  },
  // ── Middle School ────────────────────────────────────────────────────────
  {
    id: "dc-m01", subject: "algebra", subjectLabel: "Algebra", difficulty: "medium", grades: MIDDLE,
    problem: "Solve for x: 3x + 7 = 22",
    options: { A: "x = 3", B: "x = 5", C: "x = 7", D: "x = 9" }, correctAnswer: "B",
    explanation: "3x = 22 − 7 = 15, so x = 5.", bonusXp: 40,
  },
  {
    id: "dc-m02", subject: "geometry", subjectLabel: "Geometry", difficulty: "medium", grades: MIDDLE,
    problem: "A circle has a radius of 7 cm. What is its area? (Use π ≈ 3.14)",
    options: { A: "43.96 cm²", B: "153.86 cm²", C: "49 cm²", D: "21.98 cm²" }, correctAnswer: "B",
    explanation: "Area = πr² = 3.14 × 49 = 153.86 cm².", bonusXp: 40,
  },
  {
    id: "dc-m03", subject: "statistics", subjectLabel: "Statistics", difficulty: "medium", grades: MIDDLE,
    problem: "The mean of 5 numbers is 12. If four of them are 10, 14, 11, and 13, what is the fifth?",
    options: { A: "10", B: "11", C: "12", D: "13" }, correctAnswer: "C",
    explanation: "Sum = 5 × 12 = 60. Known sum = 10+14+11+13 = 48. Fifth = 60 − 48 = 12.", bonusXp: 40,
  },
  {
    id: "dc-m04", subject: "algebra", subjectLabel: "Algebra", difficulty: "medium", grades: MIDDLE,
    problem: "What is the value of 2³ + 3²?",
    options: { A: "13", B: "17", C: "15", D: "11" }, correctAnswer: "B",
    explanation: "2³ = 8 and 3² = 9. 8 + 9 = 17.", bonusXp: 40,
  },
  {
    id: "dc-m05", subject: "geometry", subjectLabel: "Geometry", difficulty: "medium", grades: MIDDLE,
    problem: "In a right triangle, the two legs are 9 cm and 12 cm. What is the hypotenuse?",
    options: { A: "13 cm", B: "14 cm", C: "15 cm", D: "21 cm" }, correctAnswer: "C",
    explanation: "c = √(9² + 12²) = √(81 + 144) = √225 = 15 cm.", bonusXp: 40,
  },
  // ── High School ──────────────────────────────────────────────────────────
  {
    id: "dc-h01", subject: "algebra", subjectLabel: "Algebra", difficulty: "hard", grades: HIGH,
    problem: "If f(x) = 2x² − 3x + 1, what is f(−2)?",
    options: { A: "15", B: "11", C: "3", D: "−1" }, correctAnswer: "A",
    explanation: "f(−2) = 2(4) − 3(−2) + 1 = 8 + 6 + 1 = 15.", bonusXp: 50,
  },
  {
    id: "dc-h02", subject: "physics", subjectLabel: "Physics", difficulty: "hard", grades: HIGH,
    problem: "A car accelerates from rest at 4 m/s². How far does it travel in 5 seconds?",
    options: { A: "20 m", B: "40 m", C: "50 m", D: "100 m" }, correctAnswer: "C",
    explanation: "s = ½at² = ½ × 4 × 25 = 50 m.", bonusXp: 50,
  },
  {
    id: "dc-h03", subject: "chemistry", subjectLabel: "Chemistry", difficulty: "hard", grades: HIGH,
    problem: "How many moles are in 44 g of CO₂? (Molar mass of CO₂ = 44 g/mol)",
    options: { A: "0.5 mol", B: "1 mol", C: "2 mol", D: "44 mol" }, correctAnswer: "B",
    explanation: "Moles = mass ÷ molar mass = 44 ÷ 44 = 1 mol.", bonusXp: 50,
  },
  {
    id: "dc-h04", subject: "statistics", subjectLabel: "Statistics", difficulty: "hard", grades: HIGH,
    problem: "A bag has 3 red and 5 blue balls. What is the probability of drawing 2 red balls without replacement?",
    options: { A: "3/28", B: "9/64", C: "3/8", D: "1/4" }, correctAnswer: "A",
    explanation: "P = (3/8) × (2/7) = 6/56 = 3/28.", bonusXp: 50,
  },
  {
    id: "dc-h05", subject: "algebra", subjectLabel: "Algebra", difficulty: "hard", grades: HIGH,
    problem: "Solve for x: log₂(x) + log₂(x − 2) = 3",
    options: { A: "x = 4", B: "x = 3", C: "x = 6", D: "x = 8" }, correctAnswer: "A",
    explanation: "log₂(x(x−2)) = 3 → x(x−2) = 8 → x²−2x−8 = 0 → (x−4)(x+2) = 0. Since x > 2, x = 4.", bonusXp: 50,
  },
  // ── University ───────────────────────────────────────────────────────────
  {
    id: "dc-u01", subject: "calculus", subjectLabel: "Calculus", difficulty: "hard", grades: UNIVERSITY,
    problem: "What is the derivative of f(x) = x³ − 4x² + 7?",
    options: { A: "3x² − 8x", B: "3x² − 4x", C: "x² − 8x + 7", D: "3x² + 7" }, correctAnswer: "A",
    explanation: "Using the power rule: f′(x) = 3x² − 8x.", bonusXp: 60,
  },
  {
    id: "dc-u02", subject: "calculus", subjectLabel: "Calculus", difficulty: "hard", grades: UNIVERSITY,
    problem: "Evaluate: ∫₀² (3x² + 2x) dx",
    options: { A: "8", B: "10", C: "12", D: "16" }, correctAnswer: "C",
    explanation: "[x³ + x²]₀² = (8 + 4) − 0 = 12.", bonusXp: 60,
  },
  {
    id: "dc-u03", subject: "algebra", subjectLabel: "Linear Algebra", difficulty: "hard", grades: UNIVERSITY,
    problem: "If A is a 2×2 matrix with det(A) = 6 and det(B) = 3, what is det(AB)?",
    options: { A: "9", B: "18", C: "2", D: "3" }, correctAnswer: "B",
    explanation: "det(AB) = det(A) × det(B) = 6 × 3 = 18.", bonusXp: 60,
  },
  {
    id: "dc-u04", subject: "statistics", subjectLabel: "Probability", difficulty: "hard", grades: UNIVERSITY,
    problem: "X ~ N(0,1). What is P(−1 < X < 1) approximately?",
    options: { A: "0.50", B: "0.68", C: "0.95", D: "0.99" }, correctAnswer: "B",
    explanation: "The empirical rule: ~68% of data falls within 1 standard deviation of the mean.", bonusXp: 60,
  },
  {
    id: "dc-u05", subject: "physics", subjectLabel: "Physics", difficulty: "hard", grades: UNIVERSITY,
    problem: "A particle's position is x(t) = t³ − 6t. At what time t > 0 is the particle momentarily at rest?",
    options: { A: "t = 1", B: "t = √2", C: "t = 2", D: "t = √6" }, correctAnswer: "B",
    explanation: "v(t) = x′(t) = 3t² − 6 = 0 → t² = 2 → t = √2.", bonusXp: 60,
  },
];

/** Grade-bucket helper: map a gradeLevel string to a bucket name. */
function gradeBucket(gradeLevel: string | null | undefined): "elementary" | "middle" | "high" | "university" | null {
  if (!gradeLevel) return null;
  if (ELEMENTARY.includes(gradeLevel)) return "elementary";
  if (MIDDLE.includes(gradeLevel)) return "middle";
  if (HIGH.includes(gradeLevel)) return "high";
  if (UNIVERSITY.includes(gradeLevel)) return "university";
  return null;
}

/**
 * Pick today's question using a date-based seed.
 * When gradeLevel is provided, filters to questions appropriate for that level.
 * Falls back to the full bank if no matching questions exist.
 */
export function getTodayQuestion(gradeLevel?: string | null): DailyChallengeQuestion {
  const key = getTodayKey();
  // Simple numeric seed from date digits
  const seed = key.replace(/-/g, "").split("").reduce((acc, c) => acc + parseInt(c, 10), 0);

  const bucket = gradeBucket(gradeLevel);
  let pool = QUESTION_BANK;
  if (bucket) {
    const gradePool = QUESTION_BANK.filter((q) => {
      if (!q.grades) return true; // no restriction = all grades
      if (bucket === "elementary") return q.grades.some((g) => ELEMENTARY.includes(g));
      if (bucket === "middle")     return q.grades.some((g) => MIDDLE.includes(g));
      if (bucket === "high")       return q.grades.some((g) => HIGH.includes(g));
      if (bucket === "university") return q.grades.some((g) => UNIVERSITY.includes(g));
      return true;
    });
    if (gradePool.length > 0) pool = gradePool;
  }
  return pool[seed % pool.length];
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
