import re
with open(r"C:\Users\Jeswin\Downloads\HRMS\docs\SRS.md", "r", encoding="utf-8") as f:
    c = f.read()
m = re.findall(r"FR-\d+(?:\.\d+)+.*", c)
print(f"Found {len(m)} FR patterns")
for x in m[:10]:
    print(x[:80])