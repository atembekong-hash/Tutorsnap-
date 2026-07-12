#!/usr/bin/env python3
"""
Batch-replace raw expo-haptics imports and calls with the platform-safe @/lib/haptics wrapper.
Run from the project root: python3 scripts/fix-haptics.py
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

REPLACEMENTS = [
    # Import line
    (r'import \* as Haptics from "expo-haptics";',
     'import * as H from "@/lib/haptics";'),
    # Notification calls
    (r'Haptics\.notificationAsync\(Haptics\.NotificationFeedbackType\.Success\)',
     'H.notificationSuccess()'),
    (r'Haptics\.notificationAsync\(Haptics\.NotificationFeedbackType\.Error\)',
     'H.notificationError()'),
    (r'Haptics\.notificationAsync\(Haptics\.NotificationFeedbackType\.Warning\)',
     'H.notificationWarning()'),
    # Impact calls
    (r'Haptics\.impactAsync\(Haptics\.ImpactFeedbackStyle\.Light\)',
     'H.impactLight()'),
    (r'Haptics\.impactAsync\(Haptics\.ImpactFeedbackStyle\.Medium\)',
     'H.impactMedium()'),
    (r'Haptics\.impactAsync\(Haptics\.ImpactFeedbackStyle\.Heavy\)',
     'H.impactHeavy()'),
    # Selection
    (r'Haptics\.selectionAsync\(\)',
     'H.selectionFeedback()'),
    # Remove now-redundant Platform.OS guards around H.* calls
    # Pattern: if (Platform.OS !== "web") H.xxx(); → H.xxx();
    (r'if \(Platform\.OS !== "web"\) (H\.\w+\(\));',
     r'\1'),
    # Multi-line: if (Platform.OS !== "web") {\n      H.xxx();\n    }
]

MULTILINE_REPLACEMENTS = [
    # Multi-line Platform guard around a single H.xxx() call
    (r'if \(Platform\.OS !== "web"\) \{\s*\n\s*(H\.\w+\(\));\s*\n\s*\}',
     r'\1;'),
    # Conditional haptics: if (x) H.notificationSuccess(); else H.notificationWarning();
    # These are already correct — no change needed
]

def process_file(path: str) -> bool:
    with open(path, 'r', encoding='utf-8') as f:
        original = f.read()

    content = original
    for pattern, replacement in REPLACEMENTS:
        content = re.sub(pattern, replacement, content)
    for pattern, replacement in MULTILINE_REPLACEMENTS:
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

changed = []
for dirpath, _, filenames in os.walk(ROOT):
    # Skip node_modules and .expo
    if 'node_modules' in dirpath or '.expo' in dirpath or 'scripts' in dirpath:
        continue
    for filename in filenames:
        if filename.endswith('.tsx') or filename.endswith('.ts'):
            full = os.path.join(dirpath, filename)
            if process_file(full):
                changed.append(full.replace(ROOT + '/', ''))

print(f"Modified {len(changed)} files:")
for f in sorted(changed):
    print(f"  {f}")
