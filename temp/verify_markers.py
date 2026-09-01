#!/usr/bin/env python3
"""Simple marker verification."""
import re
import os

TARGET_FILE = r"C:\Users\Jeswin\Downloads\HRMS\docs\SRS.md"
SOURCE_FILE = r"C:\Users\Jeswin\Downloads\HRMS\docs\extracted_srs_full.txt"
TEMP_DIR = r"C:\Users\Jeswin\Downloads\HRMS\temp"

with open(TARGET_FILE, "r", encoding="utf-8") as f:
    srs = f.read()

# Find all SOURCE markers
markers = re.findall(r"<!-- SOURCE: P(\d+) -->", srs)
print(f"Markers found: {len(markers)}")

# Check P1-P959 coverage
present = set(int(m) for m in markers)
all_p = set(range(1, 960))
missing = sorted(all_p - present)
print(f"Missing P1-P959: {len(missing)}")
print(f"First 5 missing: {missing[:5]}")
print(f"Last 5 missing: {missing[-5:]} if missing else 'None'")

# Check for duplicates
from collections import Counter
c = Counter(markers)
dups = {k: v for k, v in c.items() if v > 1}
print(f"Duplicate marker IDs: {len(dups)}")
if dups:
    for d in list(dups.items())[:3]:
        print(f"  P{d[0]}: {d[1]} times")

# Check order
positions = []
for m in markers:
    pos = srs.find("<!-- SOURCE: P" + m + " -->")
    positions.append((int(m), pos))
positions.sort(key=lambda x: x[1])
ordered = [mid for mid, pos in positions]
# Check if ordered is 1,2,3,...
out_of_order = []
for i, mid in enumerate(ordered):
    if mid != i + 1:
        out_of_order.append(mid)
print(f"Out of order markers: {len(out_of_order)}")
if out_of_order:
    print(f"First few: {out_of_order[:5]}")