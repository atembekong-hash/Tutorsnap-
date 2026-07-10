import re
import os

with open('components/ui/icon-symbol.tsx') as f:
    mapping_content = f.read()
mapped = set(re.findall(r'"([^"]+)": "', mapping_content))

missing = []
for root, dirs, files in os.walk('app'):
    for fname in files:
        if not fname.endswith('.tsx'):
            continue
        path = os.path.join(root, fname)
        with open(path) as f:
            content = f.read()
        for m in re.finditer(r'name="([a-z][a-z0-9._]+)"', content):
            name = m.group(1)
            if '.' in name and name not in mapped:
                missing.append((path, name))

if missing:
    for f, n in sorted(set(missing)):
        print(f'MISSING ICON: {n} in {f}')
else:
    print('All icon names mapped correctly')
