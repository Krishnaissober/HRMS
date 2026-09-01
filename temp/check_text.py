import re
with open(r"C:\Users\Jeswin\Downloads\HRMS\docs\SRS.md", "r", encoding="utf-8") as f:
    c = f.read()
# Find any line containing FR-
for i, line in enumerate(c.split('\n'), 1):
    if 'FR-' in line:
        print(f"Line {i}: {line[:100]}")
        break  # just first match