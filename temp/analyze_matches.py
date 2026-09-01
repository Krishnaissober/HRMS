import json
import re

SOURCE_FILE = r"C:\Users\Jeswin\Downloads\HRMS\docs\extracted_srs_full.txt"
TARGET_FILE = r"C:\Users\Jeswin\Downloads\HRMS\docs\SRS.md"

def normalize(t):
    if not t: return ""
    t = t.lower()
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r"\*\*|__|\*|_", "", t)
    t = re.sub(r"`", "", t)
    t = re.sub(r"[^\w\s]", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t

def parse_source(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    paragraphs = {}
    total = 0
    meaningful = 0
    empty = 0
    m = re.compile(r"^P(\d+):\s*(.+)$", re.MULTILINE)
    for mo in m.finditer(content):
        total += 1
        pid = int(mo.group(1))
        ptext = mo.group(2).strip()
        if len(ptext) == 0:
            empty += 1
            is_meaningful = False
        else:
            is_meaningful = bool(re.search(r"[a-zA-Z0-9]", ptext))
        if is_meaningful:
            meaningful += 1
        n = normalize(ptext)
        paragraphs[pid] = {"id": pid, "text": ptext, "normalized": n,
                           "is_meaningful": is_meaningful, "is_empty": ptext.strip() == ""}
    return {"paragraphs": paragraphs, "total": total, "meaningful": meaningful, "empty": empty}

def parse_target(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    statements = {}
    total = 0
    tid = 0
    headings = list(re.finditer(r"^(#{1,6})\s+(.+)$", content, re.MULTILINE))
    sections = []
    for i, h in enumerate(headings):
        start = h.end()
        end = headings[i+1].start() if i+1 < len(headings) else len(content)
        sections.append((int(len(h.group(1))), h.group(2), content[start:end]))
    if not sections:
        sections = [("", "Root", content)]
    for level, sec_title, sec_text in sections:
        clean = re.sub(r"^#{1,6}\s+.+$", "", sec_text, flags=re.MULTILINE)
        for m in re.finditer(r"FR-(\d+(?:\.\d+)+)\s+(.+)$", clean, re.MULTILINE):
            tid += 1
            raw = m.group(2).strip()
            if not raw or len(raw) < 3: continue
            n = normalize(raw)
            statements[tid] = {"id": tid, "text": raw, "normalized": n,
                               "section": sec_title + " (FR)", "type": "FR"}
            total += 1
        for m in re.finditer(r"^[\s]*[-+*]\s+(.+)$", clean, re.MULTILINE):
            raw = m.group(1).strip()
            if len(raw) < 3: continue
            if re.match(r"^(-{3,}|__{2,})$", raw): continue
            n = normalize(raw)
            tid += 1
            statements[tid] = {"id": tid, "text": raw, "normalized": n,
                               "section": sec_title + " (B)", "type": "bullet"}
            total += 1
        for m in re.finditer(r"^[\s]*\d+\.\s+(.+)$", clean, re.MULTILINE):
            raw = m.group(1).strip()
            if len(raw) < 3: continue
            n = normalize(raw)
            tid += 1
            statements[tid] = {"id": tid, "text": raw, "normalized": n,
                               "section": sec_title + " (N)", "type": "numbered"}
            total += 1
    return {"statements": statements, "total": total}

src = parse_source(SOURCE_FILE)
tgt = parse_target(TARGET_FILE)

# Count source paragraphs by type
with_count_fr = 0
without_fr = 0
for pid, pdata in src["paragraphs"].items():
    if not pdata["is_meaningful"]: continue
    src_frs = re.findall(r"FR-\d+(?:\.\d+)+", pdata["text"])
    if src_frs: with_count_fr += 1
    else: without_fr += 1

print(f"Source paragraphs with FR-ID: {with_count_fr}")
print(f"Source paragraphs without FR-ID: {without_fr}")
print(f"Total meaningful: {src['meaningful']}")
print()

# Check how many source paragraphs with FR-ID can match
norm_to_tids = {}
for tid, tdata in tgt["statements"].items():
    n = tdata["normalized"]
    if n not in norm_to_tids:
        norm_to_tids[n] = []
    norm_to_tids[n].append(tid)

rid_to_tids = {}
for tid, tdata in tgt["statements"].items():
    for mr in re.finditer(r"FR-\d+(?:\.\d+)+", tdata["text"]):
        rid = mr.group(0)
        if rid not in rid_to_tids:
            rid_to_tids[rid] = []
        rid_to_tids[rid].append(tid)

matched_with_fr = 0
matched_without_fr = 0
for pid, pdata in src["paragraphs"].items():
    if not pdata["is_meaningful"]: continue
    p_norm = pdata["normalized"]
    src_frs = re.findall(r"FR-\d+(?:\.\d+)+", pdata["text"])
    matched = []
    
    # FR ID match
    if src_frs:
        for rid in src_frs:
            if rid in rid_to_tids:
                for tid in rid_to_tids[rid]:
                    if tid not in matched:
                        matched.append(tid)
    
    # Exact normalized match
    if not matched and p_norm in norm_to_tids:
        matched = list(set(norm_to_tids[p_norm]))
    
    # Token similarity fallback
    if not matched:
        src_tokens = set(p_norm.split()) if p_norm else set()
        best_tid = None
        best_ratio = 0
        for tid2, tdata2 in tgt["statements"].items():
            tn = tdata2["normalized"]
            if not tn or tn == p_norm: continue
            t_tokens = set(tn.split())
            if not src_tokens or not t_tokens: continue
            isect = len(src_tokens & t_tokens)
            un = len(src_tokens | t_tokens)
            ratio = isect / un if un else 0
            if ratio > best_ratio and ratio >= 0.3:
                best_ratio = ratio
                best_tid = tid2
        if best_tid:
            matched = [best_tid]
    
    if matched:
        if src_frs: matched_with_fr += 1
        else: matched_without_fr += 1

print(f"Source paragraphs with FR-ID that match: {matched_with_fr}")
print(f"Source paragraphs without FR-ID that match: {matched_without_fr}")
print(f"Total matched: {matched_with_fr + matched_without_fr}")
print(f"Total source meaningful: {src['meaningful']}")