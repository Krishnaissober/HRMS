import json
import re

SOURCE_FILE = r"C:\Users\Jeswin\Downloads\HRMS\docs\extracted_srs_full.txt"
TARGET_FILE = r"C:\Users\Jeswin\Downloads\HRMS\docs\SRS.md"

def normalize(t):
    if not t:
        return ""
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
    m = re.compile(r"^P(\d+):\s*(.+)$", re.MULTILINE)
    for mo in m.finditer(content):
        total += 1
        pid = int(mo.group(1))
        ptext = mo.group(2).strip()
        if len(ptext) == 0:
            is_meaningful = False
        else:
            is_meaningful = bool(re.search(r"[a-zA-Z0-9]", ptext))
        if is_meaningful:
            meaningful += 1
        n = normalize(ptext)
        paragraphs[pid] = {"id": pid, "text": ptext, "normalized": n,
                           "is_meaningful": is_meaningful, "is_empty": ptext.strip() == ""}
    return {"paragraphs": paragraphs, "total": total, "meaningful": meaningful, "empty": 0}

def parse_target_extract(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    statements = {}
    total = 0
    tid = 0
    
    # FR requirements
    for m in re.finditer(r"FR-(\d+(?:\.\d+)+)\s+(.+)$", content, re.MULTILINE):
        tid += 1
        raw = m.group(2).strip()
        if not raw or len(raw) < 3:
            continue
        n = normalize(raw)
        statements[tid] = {"id": tid, "text": raw, "normalized": n,
                           "section": "FR", "type": "FR"}
        total += 1
    
    return {"statements": statements, "total": total}

src = parse_source(SOURCE_FILE)
tgt = parse_target_extract(TARGET_FILE)

# Build lookups
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

# Check a sample of source paragraphs
print("Sample source paragraph analysis:")
print("=" * 60)
for pid in [1, 2, 3, 18, 19, 36, 37, 41, 50, 75, 100, 200, 500, 700, 900]:
    if pid not in src["paragraphs"]:
        print(f"P{pid}: NOT IN SOURCE")
        continue
    pdata = src["paragraphs"][pid]
    p_norm = pdata["normalized"]
    p_text = pdata["text"]
    
    # Check FR IDs in source
    src_frs = re.findall(r"FR-\d+(?:\.\d+)+", p_text)
    
    # Check matches
    matched = []
    
    # Exact normalized match
    if p_norm in norm_to_tids:
        matched = list(set(norm_to_tids[p_norm]))
    
    # FR ID match
    if not matched and src_frs:
        for rid in src_frs:
            if rid in rid_to_tids:
                for tid in rid_to_tids[rid]:
                    if tid not in matched:
                        matched.append(tid)
    
    # Token similarity fallback
    if not matched:
        src_tokens = set(p_norm.split()) if p_norm else set()
        best_tid = None
        best_ratio = 0
        for tid2, tdata2 in tgt["statements"].items():
            tn = tdata2["normalized"]
            if not tn or tn == p_norm:
                continue
            t_tokens = set(tn.split())
            if not src_tokens or not t_tokens:
                continue
            isect = len(src_tokens & t_tokens)
            un = len(src_tokens | t_tokens)
            ratio = isect / un if un else 0
            if ratio > best_ratio and ratio >= 0.3:
                best_ratio = ratio
                best_tid = tid2
        if best_tid:
            matched = [best_tid]
    
    status = "MATCH" if matched else "MISSING"
    fr_count = len(src_frs) if 'src_frs' in dir() else 0
    print(f"P{pid}: classification={status}, fr_ids={src_frs[:3]}, matched={len(matched)}, evidence={p_text[:50]}...")