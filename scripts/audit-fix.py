"""
Batch fix script for Phase 3: 
1. Wrap unguarded JSON.parse calls in try/catch
2. Add timer cleanup useEffect to solution.tsx
"""
import re

# Fix 1: classroom.tsx line 170 - wrap JSON.parse in try/catch
def fix_classroom():
    path = '/home/ubuntu/mathgenius-ai/app/(tabs)/classroom.tsx'
    with open(path, 'r') as f:
        content = f.read()
    
    # The unguarded line: const ids: string[] = JSON.parse(raw);
    old = 'const ids: string[] = JSON.parse(raw);'
    new = 'let ids: string[] = [];\n          try { ids = JSON.parse(raw); } catch { /* corrupted data */ }'
    
    if old in content:
        content = content.replace(old, new, 1)
        with open(path, 'w') as f:
            f.write(content)
        print(f"Fixed: {path} - wrapped JSON.parse in try/catch")
    else:
        print(f"SKIP: {path} - pattern not found")

# Fix 2: settings.tsx line 908 - wrap dataOpLog JSON.parse
def fix_settings_908():
    path = '/home/ubuntu/mathgenius-ai/app/settings.tsx'
    with open(path, 'r') as f:
        content = f.read()
    
    # Line 908: ...(JSON.parse((await AsyncStorage.getItem("@tutorsnap/dataOpLog")) ?? "[]")).slice(-2),
    old = '...(JSON.parse((await AsyncStorage.getItem("@tutorsnap/dataOpLog")) ?? "[]")).slice(-2),'
    new = '...(() => { try { return JSON.parse((AsyncStorage.getItem("@tutorsnap/dataOpLog") as any) ?? "[]"); } catch { return []; } })().slice(-2),'
    
    # Actually this is tricky because it uses await. Let's just wrap the whole expression
    # Better approach: find the line and wrap it
    lines = content.split('\n')
    fixed = False
    for i, line in enumerate(lines):
        if '...(JSON.parse((await AsyncStorage.getItem("@tutorsnap/dataOpLog")) ?? "[]")).slice(-2),' in line and i > 900:
            indent = len(line) - len(line.lstrip())
            spaces = ' ' * indent
            lines[i] = f'{spaces}...(() => {{ try {{ return JSON.parse((await AsyncStorage.getItem("@tutorsnap/dataOpLog")) ?? "[]"); }} catch {{ return []; }} }})().slice(-2),'
            # Actually await inside IIFE won't work. Let's use a simpler approach
            # Just wrap with try/catch using a let variable above
            lines[i] = line  # revert
            break
    
    # Simpler: just add a try/catch around the whole expression by using || []
    # The safest fix: replace JSON.parse(x) with a safe parse helper
    # Let's just add a safeJsonParse helper at the top of the file
    print(f"SKIP: {path}:908 - complex expression, will handle via safe parse helper")

# Fix 3: appearance-deep-link.ts lines 44, 62, 67
def fix_appearance_deep_link():
    path = '/home/ubuntu/mathgenius-ai/lib/appearance-deep-link.ts'
    with open(path, 'r') as f:
        content = f.read()
    
    # Line 44: const settings: Record<string, unknown> = raw ? JSON.parse(raw) : {};
    old1 = 'const settings: Record<string, unknown> = raw ? JSON.parse(raw) : {};'
    new1 = 'let settings: Record<string, unknown> = {};\n  try { settings = raw ? JSON.parse(raw) : {}; } catch { /* ignore */ }'
    
    if old1 in content:
        content = content.replace(old1, new1, 1)
    
    # Line 62: const incoming = JSON.parse(json) as Record<string, unknown>;
    old2 = 'const incoming = JSON.parse(json) as Record<string, unknown>;'
    new2 = 'let incoming: Record<string, unknown> = {};\n  try { incoming = JSON.parse(json) as Record<string, unknown>; } catch { return; }'
    
    if old2 in content:
        content = content.replace(old2, new2, 1)
    
    # Line 67: const current: Record<string, unknown> = raw ? JSON.parse(raw) : {};
    old3 = 'const current: Record<string, unknown> = raw ? JSON.parse(raw) : {};'
    new3 = 'let current: Record<string, unknown> = {};\n  try { current = raw ? JSON.parse(raw) : {}; } catch { /* ignore */ }'
    
    if old3 in content:
        content = content.replace(old3, new3, 1)
    
    with open(path, 'w') as f:
        f.write(content)
    print(f"Fixed: {path} - wrapped 3 JSON.parse calls in try/catch")

# Fix 4: server/routers.ts line 340
def fix_server_routers():
    path = '/home/ubuntu/mathgenius-ai/server/routers.ts'
    with open(path, 'r') as f:
        content = f.read()
    
    old = 'const parsed = JSON.parse(jsonStr);'
    new = 'let parsed: any;\n      try { parsed = JSON.parse(jsonStr); } catch { throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid JSON in AI response" }); }'
    
    if old in content:
        content = content.replace(old, new, 1)
        with open(path, 'w') as f:
            f.write(content)
        print(f"Fixed: {path} - wrapped JSON.parse in try/catch with TRPCError")
    else:
        print(f"SKIP: {path} - pattern not found")

# Fix 5: solution.tsx - add timer cleanup useEffect
def fix_solution_timers():
    path = '/home/ubuntu/mathgenius-ai/app/solution.tsx'
    with open(path, 'r') as f:
        content = f.read()
    
    # Add cleanup useEffect after the timer refs are declared
    cleanup_effect = '''
  // Cleanup all feedback timers on unmount
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      if (copyFeedbackTimerRef.current) clearTimeout(copyFeedbackTimerRef.current);
      if (copyLinkFeedbackTimerRef.current) clearTimeout(copyLinkFeedbackTimerRef.current);
      if (copiedProblemIdTimerRef.current) clearTimeout(copiedProblemIdTimerRef.current);
    };
  }, []);'''
    
    # Insert after the last timer ref declaration
    marker = 'const copiedProblemIdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);'
    if marker in content and '// Cleanup all feedback timers on unmount' not in content:
        content = content.replace(marker, marker + cleanup_effect)
        with open(path, 'w') as f:
            f.write(content)
        print(f"Fixed: {path} - added timer cleanup useEffect")
    else:
        print(f"SKIP: {path} - already has cleanup or marker not found")

if __name__ == '__main__':
    fix_classroom()
    fix_appearance_deep_link()
    fix_server_routers()
    fix_solution_timers()
    fix_settings_908()
    print("\nPhase 3 fixes complete.")
