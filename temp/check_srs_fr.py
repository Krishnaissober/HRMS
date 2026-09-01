import re
with open(r"C:\Users\Jeswin\Downloads\HRMS\docs\SRS.md", "r", encoding="utf-8") as f:
    c = f.read()
# Find first 10 FR patterns
m_pattern = re.finditer(r"FR-\d+(?:\.\d+)+", c)
count = 0
for m in m_pattern:
    count += 1
    start = max(0, m.start()-20)
    end = min(len(c), m.end()+80)
    ctx = c[start:end]
    print(f"{count}: ...{ctx}...")
    if count >= 10:
        break