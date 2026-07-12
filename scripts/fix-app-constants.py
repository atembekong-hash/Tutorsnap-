#!/usr/bin/env python3
"""
Replace hardcoded tutorsnapai.tech URLs and app strings with constants from @/constants/app.
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

IMPORT_LINE = 'import { APP_URL, APP_NAME, SUPPORT_EMAIL, PRIVACY_URL, TERMS_URL, buildSolveUrl } from "@/constants/app";'
IMPORT_LINE_MINIMAL = 'import { APP_URL, APP_NAME } from "@/constants/app";'

# Files and their specific replacements
FILE_REPLACEMENTS = {
    'app/(tabs)/chat.tsx': [
        ('tutorsnapai.tech', '${APP_URL.replace("https://", "")}'),
        ('"Shared from TutorSnap · tutorsnapai.tech"', '`Shared from ${APP_NAME} · ${APP_URL.replace("https://", "")}`'),
        ('Exported from TutorSnap &middot; tutorsnapai.tech', '`Exported from ${APP_NAME} &middot; ${APP_URL.replace("https://", "")}`'),
    ],
    'app/(tabs)/classroom.tsx': [
        ('tutorsnapai.tech', '${APP_URL.replace("https://", "")}'),
    ],
    'app/solution.tsx': [
        ('tutorsnapai.tech', '${APP_URL.replace("https://", "")}'),
        ('https://tutorsnapai.tech/solve?q=${encoded}&subject=${solution!.subject}',
         'buildSolveUrl(solution!.problem, solution!.subject)'),
    ],
    'app/settings.tsx': [
        ('"https://tutorsnapai.tech/privacy"', 'PRIVACY_URL'),
        ('"https://tutorsnapai.tech/terms"', 'TERMS_URL'),
        ('`mailto:support@tutorsnapai.tech?subject=${subject}&body=${body}`',
         '`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`'),
    ],
    'app/refer.tsx': [
        ('tutorsnapai.tech', '${APP_URL.replace("https://", "")}'),
    ],
}

changed = []
for rel_path, replacements in FILE_REPLACEMENTS.items():
    full_path = os.path.join(ROOT, rel_path)
    if not os.path.exists(full_path):
        print(f"SKIP (not found): {rel_path}")
        continue
    with open(full_path, 'r') as f:
        content = f.read()
    original = content
    for old, new in replacements:
        content = content.replace(old, new)
    if content != original:
        with open(full_path, 'w') as f:
            f.write(content)
        changed.append(rel_path)
        print(f"Updated: {rel_path}")
    else:
        print(f"No change: {rel_path}")

print(f"\nModified {len(changed)} files")
