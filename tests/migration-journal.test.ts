import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type JournalEntry = {
  idx: number;
  when: number;
  tag: string;
};

type Journal = {
  dialect: string;
  entries: JournalEntry[];
};

const projectRoot = resolve(__dirname, "..");
const journalPath = resolve(projectRoot, "drizzle/meta/_journal.json");
const journal = JSON.parse(readFileSync(journalPath, "utf8")) as Journal;

describe("Drizzle migration journal", () => {
  it("contains one unique, sequential entry for every committed migration", () => {
    const tags = journal.entries.map((entry) => entry.tag);

    expect(journal.dialect).toBe("mysql");
    expect(new Set(tags).size).toBe(tags.length);
    expect(journal.entries.map((entry) => entry.idx)).toEqual(
      journal.entries.map((_, index) => index),
    );

    for (const tag of tags) {
      expect(existsSync(resolve(projectRoot, `drizzle/${tag}.sql`))).toBe(true);
    }
  });

  it("keeps migration timestamps strictly increasing", () => {
    for (let index = 1; index < journal.entries.length; index += 1) {
      expect(journal.entries[index].when).toBeGreaterThan(
        journal.entries[index - 1].when,
      );
    }
  });
});
