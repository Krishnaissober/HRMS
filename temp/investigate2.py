import re
import os

SOURCE_FILE = r"C:\Users\Jeswin\Downloads\HRMS\docs\extracted_srs_full.txt"

with open(SOURCE_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# Find all P-numbers with simple pattern
p_simple = re.findall(r"^P(\d+):", content, re.MULTILINE)
nums_simple = [int(x) for x in p_simple]
print(f"Simple pattern ^P(\\d+): found {len(nums_simple)} P-numbers")

# Now try to find the content after each P-number
# Use a broader pattern
pattern = re.compile(r"^P(\d+):\s*(.+)$", re.MULTILINE)
paragraphs = []
for m in pattern.finditer(content):
    p_id = int(m.group(1))
    p_text = m.group(2)
    paragraphs.append((p_id, p_text))

print(f"Full pattern found {len(paragraphs)}")

# Check which IDs from 1-959 are missing
all_nums = set(range(1, 960))
found_nums = set(p[0] for p in paragraphs)
missing = sorted(all_nums - found_nums)
print(f"Missing P-numbers: {len(missing)}")
if missing:
    print(f"Missing IDs: {missing[:10]}...")

# Check the content of a few missing paragraphs by looking at raw lines
# Find lines that start with P but don't match the pattern
lines = content.split('\n')
non_matching_P = []
for line in lines:
    m = re.match(r"^P(\d+):", line)
    if m:
        pid = int(m.group(1))
        if pid not in found_nums:
            non_matching_P.append((pid, line[:80]))

print(f"Non-matching P lines: {len(non_matching_P)}")
for pid, text in non_matching_P[:10]:
    print(f"  P{pid}: {text}")