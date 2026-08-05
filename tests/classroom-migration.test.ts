import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "..");

const FROZEN_JOURNAL_PREFIX = [
  {
    idx: 0,
    version: "5",
    when: 1763372440610,
    tag: "0000_elite_eternals",
    breakpoints: true,
  },
  {
    idx: 1,
    version: "5",
    when: 1783976861273,
    tag: "0001_noisy_pepper_potts",
    breakpoints: true,
  },
  {
    idx: 2,
    version: "5",
    when: 1784409554750,
    tag: "0002_breezy_legion",
    breakpoints: true,
  },
  {
    idx: 3,
    version: "5",
    when: 1784409696852,
    tag: "0003_material_gladiator",
    breakpoints: true,
  },
  {
    idx: 4,
    version: "5",
    when: 1784592577119,
    tag: "0004_square_ogun",
    breakpoints: true,
  },
  {
    idx: 5,
    version: "5",
    when: 1784603902688,
    tag: "0005_neat_hairball",
    breakpoints: true,
  },
  {
    idx: 6,
    version: "5",
    when: 1784611319310,
    tag: "0006_petite_quicksilver",
    breakpoints: true,
  },
  {
    idx: 7,
    version: "5",
    when: 1784931305510,
    tag: "0007_robust_reavers",
    breakpoints: true,
  },
  {
    idx: 8,
    version: "5",
    when: 1785029455323,
    tag: "0008_narrow_zaladane",
    breakpoints: true,
  },
  {
    idx: 9,
    version: "5",
    when: 1785097616078,
    tag: "0010_white_zaran",
    breakpoints: true,
  },
  {
    idx: 10,
    version: "5",
    when: 1785128423753,
    tag: "0011_normal_clint_barton",
    breakpoints: true,
  },
] as const;

const FROZEN_ARTIFACT_HASHES: Record<string, string> = {
  "drizzle/0000_elite_eternals.sql":
    "814a08e40d7fc2bcfd458759d18319198ca8ae394f2fa15617a78678e9c9c93b",
  "drizzle/0001_noisy_pepper_potts.sql":
    "9429edadf0e103a640b8c3a656a5be5534fd196f9e8555f713bfbaea2e74bcf9",
  "drizzle/0002_breezy_legion.sql":
    "9715c050708898373f42217a4c308f6670a118d8cb0440ae7d6c67f55bcb3ecd",
  "drizzle/0003_material_gladiator.sql":
    "2848cbfc3701d0c6b34634d7a523ebbd83dd7ed7cbdddf9106ce64b372458fc0",
  "drizzle/0004_square_ogun.sql":
    "958dc81f778a06f7e8d2bf3a9e707842ee4dfaf44e4215a1b22ea72326887154",
  "drizzle/0005_neat_hairball.sql":
    "d26060969dcac4b154692cf9e5650924156263148b5d3c9bd6d6a2240c4a17ee",
  "drizzle/0006_petite_quicksilver.sql":
    "5fdbac88def2a7171080d00908acacdcceb7fe59f7c6d1cf1b31af4e24325bf7",
  "drizzle/0007_robust_reavers.sql":
    "39d0cb307102c8cec25739d690515e4a484265e87510043e0056377bdd377482",
  "drizzle/0008_narrow_zaladane.sql":
    "e371439ad314fc67a8a8feb32a1d306c758ac071e2e72e6739a3e2d8205229f4",
  "drizzle/0010_white_zaran.sql":
    "e359a029204f0e29c2dc85a14581c650a5b616f57cef0e13b258fbfd4554647f",
  "drizzle/0011_normal_clint_barton.sql":
    "314092b401052042289d3fe8164fc85b5ce9c5f59b92d56673c5d84f1e7a3ac1",
  "drizzle/meta/0000_snapshot.json":
    "b7a2022015ccca4b794abe639c7c94a54749472bc4967a0d89fc104cfa589033",
  "drizzle/meta/0001_snapshot.json":
    "33ccbd4f8050ea435372dba74240e628350f8cb97e1c54b93e85dbc7bbc1a21c",
  "drizzle/meta/0002_snapshot.json":
    "85c32e3557fd846991d4272d6df96fd7b1d667434174a4f71a46a67a67f678c9",
  "drizzle/meta/0003_snapshot.json":
    "21b331f8aaa0e41b550cb35d5f7c7a8295bf4d3a97de01437696484cc4512090",
  "drizzle/meta/0004_snapshot.json":
    "d60ec3a71874dc1b47658e4fd56c283bef19eca60b29f4d989c4adcb5a08cc1d",
  "drizzle/meta/0005_snapshot.json":
    "af4fd05c397e5d45354ca7f27779cf272dff6c9715c4feb199a080cab6896fbb",
  "drizzle/meta/0006_snapshot.json":
    "e0899d5a87249f89a896cc3c4c5bdbc8fcd83a782f30ad01d68287b58f2ed5c1",
  "drizzle/meta/0007_snapshot.json":
    "4d2c9ae8140870a9c0decd1bcc3be604da5fbd3f3ae9ed8bba6100392129a198",
  "drizzle/meta/0008_snapshot.json":
    "7b723c989d528ac95f31987edc85e2704883fc15a514f49ee5a75d2762a4fda6",
  "drizzle/meta/0010_snapshot.json":
    "a9061cf7d31322ac28b2fbdb55d47ce0a7bc848091e42dd8f0c1461de470bebb",
  "drizzle/meta/0011_snapshot.json":
    "a7895237c2c8b5b211fefc7eed75307f739569402b2faf0fec800736f4fb6de9",
};

const NEW_TABLES = [
  "assignment_comments",
  "assignment_submissions",
  "assignments",
  "classroom_join_attempts",
  "classroom_members",
  "classrooms",
] as const;

function sha256(path: string): string {
  return createHash("sha256")
    .update(readFileSync(resolve(projectRoot, path)))
    .digest("hex");
}

describe("Guided Classroom migration safety", () => {
  it("keeps the production migration history byte-for-byte frozen", () => {
    for (const [path, expectedHash] of Object.entries(FROZEN_ARTIFACT_HASHES)) {
      expect(
        existsSync(resolve(projectRoot, path)),
        `${path} must still exist`,
      ).toBe(true);
      expect(sha256(path), `${path} changed`).toBe(expectedHash);
    }
  });

  it("preserves every existing journal entry and appends one terminal entry", () => {
    const journal = JSON.parse(
      readFileSync(resolve(projectRoot, "drizzle/meta/_journal.json"), "utf8"),
    ) as { dialect: string; entries: Record<string, unknown>[] };

    expect(journal.dialect).toBe("mysql");
    expect(journal.entries.slice(0, FROZEN_JOURNAL_PREFIX.length)).toEqual(
      FROZEN_JOURNAL_PREFIX,
    );
    expect(journal.entries).toHaveLength(FROZEN_JOURNAL_PREFIX.length + 1);
    expect(journal.entries.at(-1)).toMatchObject({
      idx: 11,
      version: "5",
      tag: "0012_guided_classroom_mvp",
      breakpoints: true,
    });
  });

  it("contains only additive DDL against the six new Classroom tables", () => {
    const migration = readFileSync(
      resolve(projectRoot, "drizzle/0012_guided_classroom_mvp.sql"),
      "utf8",
    );

    expect(migration).not.toMatch(/\b(?:DROP|TRUNCATE|RENAME)\b/i);
    expect(migration).not.toMatch(
      /ALTER\s+TABLE\s+`?(?:users|subscriptions|otp_codes|otp_audit|solve_history|chat_sessions|user_progress|user_bookmarks|user_notes)`?/i,
    );

    const createdTables = [
      ...migration.matchAll(/CREATE TABLE `([^`]+)`/g),
    ].map((match) => match[1]);
    expect(createdTables.sort()).toEqual([...NEW_TABLES].sort());

    const alteredTables = [...migration.matchAll(/ALTER TABLE `([^`]+)`/g)].map(
      (match) => match[1],
    );
    expect(
      alteredTables.every((table) =>
        NEW_TABLES.includes(table as (typeof NEW_TABLES)[number]),
      ),
    ).toBe(true);
  });

  it("chains the new generated snapshot to the frozen 0011 snapshot", () => {
    const previous = JSON.parse(
      readFileSync(
        resolve(projectRoot, "drizzle/meta/0011_snapshot.json"),
        "utf8",
      ),
    ) as { id: string };
    const next = JSON.parse(
      readFileSync(
        resolve(projectRoot, "drizzle/meta/0012_snapshot.json"),
        "utf8",
      ),
    ) as { id: string; prevId: string };

    expect(next.id).not.toBe(previous.id);
    expect(next.prevId).toBe(previous.id);
  });
});
