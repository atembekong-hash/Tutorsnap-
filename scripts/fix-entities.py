"""Fix unescaped entities in JSX text nodes across multiple files."""
import re

files_and_lines = {
    '/home/ubuntu/mathgenius-ai/app/(tabs)/classroom.tsx': [1251],
    '/home/ubuntu/mathgenius-ai/app/(tabs)/leaderboard.tsx': [226, 260],
    '/home/ubuntu/mathgenius-ai/app/daily-challenge.tsx': [163, 109],
    '/home/ubuntu/mathgenius-ai/app/feedback.tsx': [372, 293],
    '/home/ubuntu/mathgenius-ai/app/quiz-history-detail.tsx': [488],
    '/home/ubuntu/mathgenius-ai/app/settings.tsx': [122, 555, 1051, 1526, 1581, 1797],
    '/home/ubuntu/mathgenius-ai/app/paywall.tsx': [260],
    '/home/ubuntu/mathgenius-ai/components/today-study-widget.tsx': [46, 78],
}

def fix_jsx_entities(filepath):
    """Replace unescaped ' and " in JSX text with curly-brace expressions."""
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    changed = False
    for i, line in enumerate(lines):
        # Only fix lines that are JSX text content (inside <Text> or similar)
        # Check if line contains JSX text (has > before the quote and < after, or is inside a text node)
        # Simple heuristic: if line has unescaped ' or " that's inside JSX text
        # We look for patterns like: >text with 'quote' text<
        # or: >text with "quote" text<
        
        # Replace ' with &apos; only in JSX text content (not in attributes or JS)
        # A JSX text line typically doesn't start with import/const/let/var/function/if/return/{
        stripped = line.strip()
        if stripped.startswith(('import ', 'const ', 'let ', 'var ', 'function ', 'if ', 'return ', '{', '//', '/*', '*')):
            continue
        
        # Check if this line has Text content with unescaped quotes
        # Pattern: after > and before < there are quotes
        new_line = line
        
        # Fix apostrophes in JSX text: replace ' with {&apos;} won't work, use &apos;
        # Actually in React Native, we should use {"'"} or just the unicode character
        # Simplest fix: replace the apostrophe with a right single quotation mark (Unicode)
        # Or wrap in curly braces: {"'"}
        
        # Better approach: find text between > and < and replace quotes there
        def replace_in_jsx_text(match):
            text = match.group(1)
            text = text.replace("'", "\u2019")  # Replace with right single quotation mark
            text = text.replace('"', "\u201C")  # Replace with left double quotation mark (first occurrence)
            return '>' + text + '<'
        
        # Match text between > and < that contains quotes
        if ("'" in line or '"' in line):
            # Only process if this looks like JSX text content
            new_line = re.sub(r'>([^<]*[\'"][^<]*)<', replace_in_jsx_text, line)
        
        if new_line != line:
            lines[i] = new_line
            changed = True
    
    if changed:
        with open(filepath, 'w') as f:
            f.writelines(lines)
        print(f"Fixed entities in: {filepath}")
    else:
        print(f"No changes needed: {filepath}")

# Process each file
for filepath in files_and_lines:
    try:
        fix_jsx_entities(filepath)
    except Exception as e:
        print(f"ERROR in {filepath}: {e}")
