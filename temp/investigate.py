import re
import os

SOURCE_FILE = r"C:\Users\Jeswin\Downloads\HRMS\docs\extracted_srs_full.txt"

with open(SOURCE_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Find all P-numbers
p = re.findall(r"^P(\d+):", content, re.MULTILINE)
nums = [int(x) for x in p]
print(f"Found {len(nums)} P-numbers")
print(f"Range: {min(nums)} to {max(nums)}")
print(f"Total stated in file: 959")

# Check which numbers 1-959 are present
all_nums = set(nums)
missing = []
for i in range(1, 960):
    if i not in all_nums:
        missing.append(i)

print(f"Missing P-numbers 1-959: {len(missing)}")
if missing:
    print(f"First 20 missing: {missing[:20]}")
    print(f"Last 20 missing: {missing[-20:]}")

# Check for duplicates
from collections import Counter
c = Counter(nums)
dups = {k: v for k, v in c.items() if v > 1}
print(f"Duplicate P-numbers: {len(dups)}")
if dups:
    print(f"  {dict(list(dups).items()[:5])}")