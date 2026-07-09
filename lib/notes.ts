import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTES_KEY = "study_notes";

export type StudyNote = {
  id: string;          // matches the solution problem text (used as key)
  problemKey: string;  // hash/key derived from the problem text
  note: string;
  updatedAt: number;
};

function makeProblemKey(problem: string): string {
  // Simple deterministic key: first 120 chars, lowercased, spaces collapsed
  return problem.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 120);
}

async function loadNotes(): Promise<Record<string, StudyNote>> {
  try {
    const raw = await AsyncStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveNotes(notes: Record<string, StudyNote>): Promise<void> {
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

export async function getNote(problem: string): Promise<StudyNote | null> {
  const key = makeProblemKey(problem);
  const notes = await loadNotes();
  return notes[key] ?? null;
}

export async function saveNote(problem: string, noteText: string): Promise<void> {
  const key = makeProblemKey(problem);
  const notes = await loadNotes();
  if (noteText.trim() === "") {
    delete notes[key];
  } else {
    notes[key] = {
      id: key,
      problemKey: key,
      note: noteText.trim(),
      updatedAt: Date.now(),
    };
  }
  await saveNotes(notes);
}

export async function deleteNote(problem: string): Promise<void> {
  const key = makeProblemKey(problem);
  const notes = await loadNotes();
  delete notes[key];
  await saveNotes(notes);
}

export async function getAllNotes(): Promise<StudyNote[]> {
  const notes = await loadNotes();
  return Object.values(notes).sort((a, b) => b.updatedAt - a.updatedAt);
}
