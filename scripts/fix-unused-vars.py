"""
Fix unused variable warnings by prefixing with underscore.
This script parses ESLint output and applies fixes.
"""
import subprocess
import re

# Run ESLint and capture output
result = subprocess.run(
    ['npx', 'eslint', 'app/', 'lib/', 'components/', '--format', 'json'],
    capture_output=True, text=True, cwd='/home/ubuntu/mathgenius-ai'
)

import json
try:
    data = json.loads(result.stdout)
except:
    print("Failed to parse ESLint JSON output")
    exit(1)

# Collect all unused var warnings with file, line, column, and variable name
fixes = []
for file_result in data:
    filepath = file_result['filePath']
    for msg in file_result.get('messages', []):
        if msg.get('ruleId') == '@typescript-eslint/no-unused-vars':
            # Extract variable name from message
            # Message format: "'X' is defined but never used" or "'X' is assigned a value but never used"
            match = re.match(r"'([^']+)' is (?:defined|assigned a value) but never used", msg['message'])
            if match:
                var_name = match.group(1)
                line = msg['line']
                col = msg['column']
                fixes.append({
                    'file': filepath,
                    'line': line,
                    'col': col,
                    'var': var_name,
                })

print(f"Found {len(fixes)} unused variable warnings")

# Group by file
from collections import defaultdict
by_file = defaultdict(list)
for fix in fixes:
    by_file[fix['file']].append(fix)

# For each file, apply fixes
# Strategy: 
# - For imports: remove unused imports if safe, or prefix with _
# - For catch variables: replace with _
# - For destructured variables: prefix with _
# - For function parameters: prefix with _

for filepath, file_fixes in by_file.items():
    with open(filepath, 'r') as f:
        lines = f.readlines()
    
    modified = False
    # Sort fixes by line number descending so we don't shift indices
    file_fixes.sort(key=lambda x: (-x['line'], -x['col']))
    
    for fix in file_fixes:
        line_idx = fix['line'] - 1
        var_name = fix['var']
        line = lines[line_idx]
        
        # Skip if already prefixed with _
        if var_name.startswith('_'):
            continue
        
        # Strategy 1: If it's a catch variable, replace with _
        if 'catch' in line and f'({var_name})' in line:
            lines[line_idx] = line.replace(f'({var_name})', '(_)')
            modified = True
            continue
        
        # Strategy 2: If it's an import that can be removed
        # Check if the entire line is just this import
        if f"import {var_name} " in line and "from" in line:
            # Single default import - check if it's the only thing imported
            if re.match(rf'^\s*import\s+{re.escape(var_name)}\s+from\s+', line):
                # Remove the entire line
                lines[line_idx] = ''
                modified = True
                continue
        
        # Strategy 3: If it's a named import, try to remove just that name
        named_import_pattern = rf'\b{re.escape(var_name)}\b'
        if 'import' in line and '{' in line and '}' in line:
            # Try to remove the variable from named imports
            # Pattern: { ..., VarName, ... } or { ..., VarName }
            new_line = re.sub(rf',\s*{re.escape(var_name)}\b', '', line)
            if new_line == line:
                new_line = re.sub(rf'\b{re.escape(var_name)}\s*,\s*', '', line)
            if new_line == line:
                # It's the only named import
                new_line = re.sub(rf'\b{re.escape(var_name)}\b', f'_{var_name}', line)
            if new_line != line:
                # Check if the import braces are now empty
                if re.search(r'\{\s*\}', new_line):
                    # Remove the entire line
                    lines[line_idx] = ''
                else:
                    lines[line_idx] = new_line
                modified = True
                continue
        
        # Strategy 4: For state setters like [x, setX] - prefix with _
        # Pattern: const [something, setVarName] or const [varName, setSomething]
        if f', {var_name}]' in line or f'[{var_name},' in line:
            lines[line_idx] = line.replace(var_name, f'_{var_name}', 1)
            modified = True
            continue
        
        # Strategy 5: For type imports, prefix with _
        if 'type ' in line and var_name in line:
            lines[line_idx] = line.replace(var_name, f'_{var_name}', 1)
            modified = True
            continue
            
        # Strategy 6: General prefix with _ for declarations
        # Only replace the first occurrence that's a declaration
        decl_patterns = [
            rf'const\s+{re.escape(var_name)}\b',
            rf'let\s+{re.escape(var_name)}\b',
            rf'function\s+{re.escape(var_name)}\b',
        ]
        for pat in decl_patterns:
            if re.search(pat, line):
                lines[line_idx] = re.sub(rf'\b{re.escape(var_name)}\b', f'_{var_name}', line, count=1)
                modified = True
                break
        else:
            # If it's in an import line, prefix it
            if 'import' in line:
                lines[line_idx] = line.replace(var_name, f'_{var_name}', 1)
                modified = True
    
    if modified:
        with open(filepath, 'w') as f:
            f.writelines(lines)
        print(f"Fixed {len(file_fixes)} warnings in: {filepath.replace('/home/ubuntu/mathgenius-ai/', '')}")

print("\nDone. Run ESLint again to verify.")
