import json
import re
import os

SOURCE_FILE = r"C:\Users\Jeswin\Downloads\HRMS\docs\extracted_srs_full.txt"
TARGET_FILE = r"C:\Users\Jeswin\Downloads\HRMS\docs\SRS.md"
TEMP_DIR = r"C:\Users\Jeswin\Downloads\HRMS\temp"

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

def parse_target_v1(filepath):
    """Parse target looking for FR-* requirements as the auditor does."""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    statements = {}
    total = 0
    tid = 0
    
    # Look for FR- requirements
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

def debug_match():
    src = parse_source(SOURCE_FILE)
    tgt = parse_target_v1(TARGET_FILE)
    
    print(f"Source: {src['total']} paragraphs, {src['meaningful']} meaningful")
    print(f"Target: {tgt['total']} FR statements")
    
    # Build normalized target lookup
    norm_to_tids = {}
    for tid, tdata in tgt["statements"].items():
        n = tdata["normalized"]
        if n not in norm_to_tids:
            norm_to_tids[n] = []
        norm_to_tids[n].append(tid)
    
    # Also build FR-ID lookup
    rid_to_tids = {}
    for tid, tdata in tgt["statements"].items():
        frs = re.findall(r"FR-\d+(?:\.\d+)+", tdata["text"])
        for rid in frs:
            if rid not in rid_to_tids:
                rid_to_tids[rid] = []
            rid_to_tids[rid].append(tid)
    
    # Check first few source paragraphs
    matched_any = 0
    missing_any = 0
    exact_match = 0
    rid_match = 0
    
    for pid in list(src["paragraphs"].keys())[:20]:
        if not src["paragraphs"][pid]["is_meaningful"]:
            continue
        p_norm = src["paragraphs"][pid]["normalized"]
        p_text = src["paragraphs"][pid]["text"]
        
        # Check exact normalized match
        if p_norm in norm_to_tids:
            exact_match += 1
            matched = norm_to_tids[p_norm]
        else:
            # Check FR IDs in source
            src_frs = re.findall(r"FR-\d+(?:\.\d+)+", p_text)
            matched = []
            for rid in src_frs:
                if rid in rid_to_tids:
                    for tid in rid_to_tids[rid]:
                        if tid not in matched:
                            matched.append(tid)
            if not matched and src_frs:
                rid_match += 1
        
        if matched:
            matched_any += 1
        else:
            missing_any += 1
        
        print(f"P{pid}: text={p_text[:60]}... norm_match={p_norm in norm_to_tids}, fr_match={len(src_frs) if 'src_frs' in dir() else 0}, matched={len(matched)}")
    
    print(f"\nExact normalized match: {exact_match}/20")
    print(f"Any match: {matched_any}/20")
    print(f"Missing: {missing_any}/20")
    print(f"FR-ID match: {rid_match}/20")

if __name__ == "__main__":
    debug_match()