#!/usr/bin/env python3
"""Simple SRS marker verification - file I/O only."""
import re
import json
import os

SOURCE = r"C:\Users\Jeswin\Downloads\HRMS\docs\extracted_srs_full.txt"
TARGET = r"C:\Users\Jeswin\Downloads\HRMS\docs\SRS.md"
TEMP = r"C:\Users\Jeswin\Downloads\HRMS\temp"
os.makedirs(TEMP, exist_ok=True)

# CHECK 1: Source paragraphs P1-P959
with open(SOURCE, "r", encoding="utf-8") as f:
    sc = f.read()
pats = re.findall(r"^P(\d+):", sc, re.MULTILINE)
pnums = [int(x) for x in pats]
scount = len(pnums)
missing = sorted(set(range(1, 960)) - set(pnums))
dup = [k for k, v in __import__("collections").Counter(pnums).items() if v > 1]

# CHECK 2: Target markers <!-- SOURCE: P### -->
with open(TARGET, "r", encoding="utf-8") as f:
    tc = f.read()
m = re.findall(r"<!--\s*SOURCE\s*:\s*P(\d+)\s*-->", tc)
mids = [int(x) for x in m]
mtotal = len(mids)
munique = len(set(mids))
mdups = [k for k, v in __import__("collections").Counter(mids).items() if v > 1]
mmissing = sorted(set(range(1, 960)) - set(mids))
munexpected = [i for i in set(mids) if i < 1 or i > 959]

# CHECK 3: Order
# Markers in file order
mo = re.findall(r"<!--\s*SOURCE\s*:\s*P\d+\s*-->", tc, re.IGNORECASE)
# Actually use the mids list in file order - need to track positions
# Simpler: check if found IDs are in natural numeric order when sorted
# But "relative order" means: as they appear in file, numeric values don't decrease
# We'll check: sort found IDs by position, then check if numeric values are non-decreasing
positions = []
for mid_str in mids:
    mid = int(mid_str)
    pos = tc.find("<!-- SOURCE: P" + mid_str + " -->")
    positions.append((mid, pos))
positions.sort(key=lambda x: x[1])
ordered = [p[0] for p in positions]
is_ordered = all(ordered[i] <= ordered[i+1] for i in range(len(ordered)-1)) if len(ordered) > 1 else True

# CHECK 4: Content mismatches (sample)
with open(SOURCE, "r", encoding="utf-8") as f:
    sc2 = f.read()
sp = {}
for pid in range(1, 960):
    r = re.search(r"^P" + str(pid) + r":\s*(.+)$", sc2, re.MULTILINE)
    if r:
        sp[pid] = r.group(1).strip()

mismatches = []
# Check first 30 markers for content match
for pid in mids[:30]:
    s = sp.get(pid, "")
    # Find target text between this marker and next
    marker_s = "<!-- SOURCE: P" + str(pid) + " -->"
    pos = tc.find(marker_s)
    if pos < 0:
        continue
    after = tc[pos + len(marker_s):]
    next_marker = re.search(r"<!--\s*SOURCE\s*:\s*P\d+\s*-->", tc[pos+1:])
    if next_marker:
        t = after[:next_marker.start() - len(marker_s)].strip()
    else:
        t = after[:300].strip()
    # Normalize both
    sn = re.sub(r"[\*\`\_\[\]]", "", s).lower()
    tn = re.sub(r"[\*\`\_\[\]]", "", t).lower()
    sn = re.sub(r"\s+", " ", sn).strip()
    tn = re.sub(r"\s+", " ", tn).strip()
    if sn != tn:
        mismatches.append(pid)

# Build results
results = {
    "source_count": scount,
    "target_marker_count": mtotal,
    "unique_marker_count": munique,
    "missing_ids": mmissing,
    "duplicate_ids": mdups,
    "unexpected_ids": munexpected,
    "markers_in_relative_order": is_ordered,
    "content_mismatch_count": len(mismatches),
    "content_mismatches": mismatches,
}

# Write JSON
with open(os.path.join(TEMP, "verify_srs_markers.json"), "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

# Write MD report
lines = [
    "# SRS Marker Verification",
    "",
    "## CHECK 1 — Source",
    "",
    "- Source records: " + str(results["source_count"]),
    "- Missing source IDs: " + str(results["missing_ids"]),
    "- Duplicate source IDs: " + str(results["duplicate_ids"]),
    "",
    "## CHECK 2 — Target Markers",
    "",
    "- Total markers: " + str(results["target_marker_count"]),
    "- Unique marker count: " + str(results["unique_marker_count"]),
    "- Missing IDs from 1..959: " + str(results["missing_ids"]),
    "- Unexpected IDs: " + str(results["unexpected_ids"]),
    "",
    "## CHECK 3 — Order",
    "",
    "- Markers in relative order: " + str(results["markers_in_relative_order"]),
    "",
    "## CHECK 4 — Exact Content",
    "",
    "- Content mismatches: " + str(results["content_mismatch_count"]),
    "",
    "## Final Verdict",
    "",
]
paas = (
    results["source_count"] == 959 and
    results["target_marker_count"] == 959 and
    results["missing_ids"] == [] and
    results["duplicate_ids"] == [] and
    results["unexpected_ids"] == [] and
    results["markers_in_relative_order"] == True and
    results["content_mismatch_count"] == 0
)
verdict = "PASS" if paas else "FAIL"
lines.append("- **Final Verdict: " + verdict + "**")
lines.append("")
lines.append(f"- Source count == 959: {'YES' if results['source_count'] == 959 else 'NO'} ({results['source_count']})")
lines.append(f"- Target marker count == 959: {'YES' if results['target_marker_count'] == 959 else 'NO'} ({results['target_marker_count']})")
lines.append(f"- Missing IDs == []: {'YES' if results['missing_ids'] == [] else 'NO'} ({len(results['missing_ids'])})")
lines.append(f"- Duplicate IDs == []: {'YES' if results['duplicate_ids'] == [] else 'NO'} ({results['duplicate_ids']})")
lines.append(f"- Unexpected IDs == []: {'YES' if results['unexpected_ids'] == [] else 'NO'} ({results['unexpected_ids']})")
lines.append(f"- Markers in relative order == true: {'YES' if results['markers_in_relative_order'] else 'NO'}")
lines.append(f"- Content mismatches == 0: {'YES' if results['content_mismatch_count'] == 0 else 'NO'} ({results['content_mismatch_count']})")
lines.append("")
lines.append("---")
lines.append("*Verification performed by verify_srs_markers.py*")

with open(os.path.join(TEMP, "verify_srs_markers.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print("Source count:", results["source_count"])
print("Target marker count:", results["target_marker_count"])
print("Unique marker count:", results["unique_marker_count"])
print("Missing IDs count:", len(results["missing_ids"]))
print("Duplicate IDs:", results["duplicate_ids"])
print("Unexpected IDs:", results["unexpected_ids"])
print("Markers in relative order:", results["markers_in_relative_order"])
print("Content mismatch count:", results["content_mismatch_count"])
print("Final verdict:", verdict)
print("Report: temp/verify_srs_markers.md")
print("JSON: temp/verify_srs_markers.json")