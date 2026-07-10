#!/usr/bin/env python3
"""
Injects accessibilityLabel props on TouchableOpacity and Pressable elements
that are missing them, inferring labels from child Text content or onPress handler names.
"""

import os
import re
import glob

# Map of common handler name patterns to human-readable labels
HANDLER_LABELS = {
    "handleSolve": "Solve problem",
    "handleSend": "Send message",
    "handleSubmit": "Submit",
    "handleSave": "Save",
    "handleDelete": "Delete",
    "handleShare": "Share",
    "handleCopy": "Copy",
    "handleClose": "Close",
    "handleBack": "Go back",
    "handleCancel": "Cancel",
    "handleConfirm": "Confirm",
    "handleCreate": "Create",
    "handleJoin": "Join",
    "handleLeave": "Leave",
    "handleReset": "Reset",
    "handleRetry": "Retry",
    "handleRefresh": "Refresh",
    "handleToggle": "Toggle",
    "handlePress": "Button",
    "handleTap": "Button",
    "handleOpen": "Open",
    "handleEdit": "Edit",
    "handleAdd": "Add",
    "handleRemove": "Remove",
    "handleClear": "Clear",
    "handleNext": "Next",
    "handlePrev": "Previous",
    "handleSkip": "Skip",
    "handleStart": "Start",
    "handleStop": "Stop",
    "handlePause": "Pause",
    "handlePlay": "Play",
    "handleRecord": "Record",
    "handleUpload": "Upload",
    "handleDownload": "Download",
    "handleExport": "Export",
    "handleImport": "Import",
    "handleSearch": "Search",
    "handleFilter": "Filter",
    "handleSort": "Sort",
    "handleRate": "Rate app",
    "handleShareProgress": "Share progress",
    "handleClearHistory": "Clear history",
    "handleResetProgress": "Reset progress",
    "handleShareText": "Share as text",
    "handleSharePDF": "Share as PDF",
    "handleCopyLink": "Copy link",
    "handlePracticeFromMenu": "Practice this topic",
    "handleShareToClassroom": "Share to classroom",
    "handleChallenge": "Challenge classmate",
    "handleConfirmJoin": "Confirm join",
    "handleResetLeaderboard": "Reset leaderboard",
    "handleToggleNotifPref": "Toggle notification",
    "handleSaveHomework": "Save homework",
    "handleOpenHomeworkModal": "Assign as homework",
    "handleActivateFreeze": "Activate streak freeze",
}

# Route-based labels
ROUTE_LABELS = {
    "/settings": "Open settings",
    "/progress": "View progress",
    "/bookmarks": "View bookmarks",
    "/flashcards": "View flashcards",
    "/study-planner": "Open study planner",
    "/leaderboard": "View leaderboard",
    "/faq": "Open help center",
    "/classroom": "Open classroom",
    "/feedback": "Send feedback",
    "/report-bug": "Report a bug",
    "/legal": "View legal information",
    "/notification-center": "Notification settings",
    "/(tabs)/classroom": "Open classroom tab",
    "/(tabs)/practice": "Go to practice",
    "/(tabs)/history": "View history",
    "/(tabs)/chat": "Open AI tutor",
}

def infer_label_from_onpress(onpress_value):
    """Try to infer a label from the onPress handler value."""
    if not onpress_value:
        return None
    
    # Check route navigation
    for route, label in ROUTE_LABELS.items():
        if route in onpress_value:
            return label
    
    # Check handler names
    for handler, label in HANDLER_LABELS.items():
        if handler in onpress_value:
            return label
    
    # setState patterns
    set_match = re.search(r'set(\w+)\(', onpress_value)
    if set_match:
        state_name = set_match.group(1)
        # Convert camelCase to readable
        readable = re.sub(r'([A-Z])', r' \1', state_name).strip().lower()
        return f"Toggle {readable}"
    
    return None

def process_file(filepath):
    """Add accessibilityLabel to TouchableOpacity/Pressable elements missing them."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    changes = 0
    
    # Find TouchableOpacity and Pressable elements
    # Pattern: <TouchableOpacity or <Pressable followed by props, missing accessibilityLabel
    
    lines = content.split('\n')
    new_lines = []
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Check if this line starts a TouchableOpacity or Pressable
        stripped = line.strip()
        if (stripped.startswith('<TouchableOpacity') or stripped.startswith('<Pressable')) and \
           not stripped.startswith('//') and \
           'accessibilityLabel' not in stripped:
            
            # Collect the full element opening tag (may span multiple lines)
            tag_lines = [line]
            j = i + 1
            # Check if the opening tag continues on next lines
            if not ('{' in stripped and '}' in stripped and stripped.endswith('>')) and not stripped.endswith('>'):
                while j < len(lines) and not lines[j].strip().startswith('>') and \
                      not lines[j].strip().startswith('<') and j < i + 15:
                    tag_lines.append(lines[j])
                    j += 1
                if j < len(lines) and (lines[j].strip().startswith('>') or lines[j].strip() == '>'):
                    tag_lines.append(lines[j])
                    j += 1
            
            full_tag = '\n'.join(tag_lines)
            
            # Already has accessibilityLabel?
            if 'accessibilityLabel' in full_tag:
                new_lines.extend(tag_lines)
                i = j if j > i + 1 else i + 1
                continue
            
            # Try to find onPress value
            onpress_match = re.search(r'onPress=\{([^}]+(?:\{[^}]*\}[^}]*)*)\}', full_tag)
            onpress_value = onpress_match.group(1) if onpress_match else ""
            
            label = infer_label_from_onpress(onpress_value)
            
            if label:
                # Insert accessibilityLabel after the opening element tag
                indent = len(line) - len(line.lstrip())
                indent_str = ' ' * indent
                
                # Find the right insertion point - after the element name
                first_line = tag_lines[0]
                if first_line.strip().startswith('<TouchableOpacity'):
                    new_first = first_line.rstrip()
                    if new_first.endswith('>'):
                        # Self-closing or ends with >
                        new_first = new_first[:-1] + f'\n{indent_str}  accessibilityLabel="{label}">'
                    else:
                        new_first = new_first + f'\n{indent_str}  accessibilityLabel="{label}"'
                    tag_lines[0] = new_first
                elif first_line.strip().startswith('<Pressable'):
                    new_first = first_line.rstrip()
                    if new_first.endswith('>'):
                        new_first = new_first[:-1] + f'\n{indent_str}  accessibilityLabel="{label}">'
                    else:
                        new_first = new_first + f'\n{indent_str}  accessibilityLabel="{label}"'
                    tag_lines[0] = new_first
                
                changes += 1
            
            new_lines.extend(tag_lines)
            i = j if j > i + 1 else i + 1
        else:
            new_lines.append(line)
            i += 1
    
    new_content = '\n'.join(new_lines)
    
    if changes > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  {filepath}: +{changes} labels")
    
    return changes

def main():
    # Target all app and component files
    patterns = [
        "app/**/*.tsx",
        "components/**/*.tsx",
    ]
    
    total = 0
    files_changed = 0
    
    for pattern in patterns:
        for filepath in sorted(glob.glob(pattern, recursive=True)):
            # Skip layout, dev, oauth, and icon files
            if any(skip in filepath for skip in ['_layout', 'dev/', 'oauth/', 'icon-symbol', 'haptic-tab']):
                continue
            count = process_file(filepath)
            if count > 0:
                total += count
                files_changed += 1
    
    print(f"\nTotal: {total} labels added across {files_changed} files")

if __name__ == "__main__":
    main()
