#!/usr/bin/env python3
"""
Fix Math.random() instability in leaderboard.tsx.
Replace with a seeded pseudo-random function based on the user's weekly solve count
and the current ISO week number, so the board is stable within a week but changes weekly.
"""
import re

path = '/home/ubuntu/mathgenius-ai/app/(tabs)/leaderboard.tsx'
with open(path) as f:
    content = f.read()

# Add a seeded random helper before generateBoard
SEEDED_RANDOM = '''
// Deterministic pseudo-random: stable within a week, changes each week.
// Uses a simple LCG seeded by (weekNumber * 1000 + index).
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function getISOWeek(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

'''

# Insert before generateBoard
content = content.replace(
    'function generateBoard(',
    SEEDED_RANDOM + 'function generateBoard('
)

# Replace Math.random() calls inside generateBoard with seeded versions
# Original: Math.floor(Math.random() * (base * 0.6 + 1))
content = content.replace(
    'const offset = (i % 2 === 0 ? 1 : -1) * Math.floor(Math.random() * (base * 0.6 + 1));',
    'const week = getISOWeek();\n    const offset = (i % 2 === 0 ? 1 : -1) * Math.floor(seededRandom(week * 100 + i) * (base * 0.6 + 1));'
)
content = content.replace(
    'const streak = Math.max(0, Math.floor(Math.random() * 14));',
    'const streak = Math.max(0, Math.floor(seededRandom(week * 200 + i) * 14));'
)

# Fix the userSolved approximation - use a stable weekly multiplier instead of random
content = content.replace(
    'const userSolved = progress.streak.todaySolved + Math.floor(Math.random() * 5); // approximate weekly',
    'const weekNum = getISOWeek();\n    const userSolved = progress.streak.todaySolved + Math.floor(seededRandom(weekNum * 7) * 5); // stable weekly approximation'
)

with open(path, 'w') as f:
    f.write(content)

print('Fixed leaderboard Math.random instability')
