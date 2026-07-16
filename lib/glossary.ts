/**
 * Glossary — persistent storage for pinned definitions.
 *
 * Each entry is a term + definition extracted from an AI Definition block.
 * Stored in AsyncStorage under a single JSON key.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const GLOSSARY_KEY = "@tutorsnap/glossary";

export interface GlossaryEntry {
  id: string;         // UUID
  term: string;       // Short title (first line of the definition block)
  definition: string; // Full markdown content of the block
  subject: string | null;
  pinnedAt: number;   // Timestamp
}

function generateId(): string {
  return `g_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function readGlossary(): Promise<GlossaryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(GLOSSARY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GlossaryEntry[];
  } catch {
    return [];
  }
}

async function writeGlossary(entries: GlossaryEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(GLOSSARY_KEY, JSON.stringify(entries));
  } catch { /* ignore */ }
}

/** Pin a definition. Returns the new entry. */
export async function pinDefinition(
  term: string,
  definition: string,
  subject: string | null = null,
): Promise<GlossaryEntry> {
  const entries = await readGlossary();
  // Avoid exact duplicates (same term)
  const existing = entries.find((e) => e.term.toLowerCase() === term.toLowerCase());
  if (existing) return existing;
  const entry: GlossaryEntry = {
    id: generateId(),
    term,
    definition,
    subject,
    pinnedAt: Date.now(),
  };
  await writeGlossary([entry, ...entries]);
  return entry;
}

/** Remove a glossary entry by id. */
export async function unpinDefinition(id: string): Promise<void> {
  const entries = await readGlossary();
  await writeGlossary(entries.filter((e) => e.id !== id));
}

/** Clear all glossary entries. */
export async function clearGlossary(): Promise<void> {
  await writeGlossary([]);
}
