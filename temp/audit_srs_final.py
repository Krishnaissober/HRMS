#!/usr/bin/env python3
"""Minimal SRS Traceability Audit v2."""

import json
import re
import os
from collections import defaultdict

SOURCE_FILE = r"C:\Users\Jeswin\Downloads\HRMS\docs\extracted_srs_full.txt"
TARGET_FILE = r"C:\Users\Jeswin\Downloads\HRMS\docs\SRS.md"
TEMP_DIR = r"C:\Users\Jeswin\Downloads\HRMS\temp"
os.makedirs(TEMP_DIR, exist_ok=True)


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
            if not raw or len(raw) < 3:
                continue
            n = normalize(raw)
            statements[tid] = {"id": tid, "text": raw, "normalized": n,
                               "section": sec_title + " (FR)", "type": "FR"}
            total += 1
        for m in re.finditer(r"^[\s]*[-+*]\s+(.+)$", clean, re.MULTILINE):
            raw = m.group(1).strip()
            if len(raw) < 3 or re.match(r"^(-{3,}|__{2,})$", raw):
                continue
            n = normalize(raw)
            tid += 1
            statements[tid] = {"id": tid, "text": raw, "normalized": n,
                               "section": sec_title + " (B)", "type": "bullet"}
            total += 1
        for m in re.finditer(r"^[\s]*\d+\.\s+(.+)$", clean, re.MULTILINE):
            raw = m.group(1).strip()
            if len(raw) < 3:
                continue
            n = normalize(raw)
            tid += 1
            statements[tid] = {"id": tid, "text": raw, "normalized": n,
                               "section": sec_title + " (N)", "type": "numbered"}
            total += 1
        for m in re.finditer(r"Do[Dd][-:]\s+(.+?)(?:\n|$)", clean, re.IGNORECASE):
            raw = m.group(1).strip()
            if len(raw) < 3:
                continue
            n = normalize(raw)
            tid += 1
            statements[tid] = {"id": tid, "text": raw, "normalized": n,
                               "section": sec_title + " (DoD)", "type": "DoD"}
            total += 1
        for m in re.finditer(r"AI[:-]\s+(.+?)(?:\n|$)", clean, re.IGNORECASE):
            raw = m.group(1).strip()
            if len(raw) < 3:
                continue
            n = normalize(raw)
            tid += 1
            statements[tid] = {"id": tid, "text": raw, "normalized": n,
                               "section": sec_title + " (AI)", "type": "AI"}
            total += 1
    return {"statements": statements, "total": total}


def match_source_to_target(src, tgt):
    results = []
    norm_to_tids = defaultdict(list)
    for tid, tdata in tgt["statements"].items():
        norm_to_tids[tdata["normalized"]].append(tid)
    rid_to_tids = defaultdict(list)
    for tid, tdata in tgt["statements"].items():
        for mr in re.finditer(r"FR-\d+(?:\.\d+)+", tdata["text"]):
            rid_to_tids[mr.group(0)].append(tid)
    for pid, pdata in src["paragraphs"].items():
        if not pdata["is_meaningful"]:
            continue
        p_norm = pdata["normalized"]
        matched = []
        src_frs = re.findall(r"FR-\d+(?:\.\d+)+", pdata["text"])
        for rid in src_frs:
            for tid in rid_to_tids.get(rid, []):
                if tid not in matched:
                    matched.append(tid)
        if matched:
            matched_hrs = set(src_frs)
            target_hrs = set()
            for tid in matched:
                for mr in re.finditer(r"FR-\d+(?:\.\d+)+", tgt["statements"][tid]["text"]):
                    target_hrs.add(mr.group(0))
            overlap = len(matched_hrs & target_hrs)
            if overlap > 0 and overlap == len(src_frs):
                cls = "SOURCE-EXACT"
                conf = 1.0
            else:
                cls = "SOURCE-PARAPHRASE"
                conf = 0.7
        else:
            if p_norm in norm_to_tids:
                matched = norm_to_tids[p_norm]
                cls = "SOURCE-EXACT"
                conf = 1.0
            else:
                best_tid = None
                best_ratio = 0
                src_tokens = set(p_norm.split())
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
                    cls = "SOURCE-PARAPHRASE"
                    conf = best_ratio
                else:
                    cls = "MISSING"
                    conf = 0.0
        results.append({
            "source_id": pid,
            "source_text": src["paragraphs"][pid]["text"],
            "target_ids": list(set(matched)),
            "classification": cls,
            "confidence": round(conf, 2),
        })
    return results


def match_target_to_source(tgt, src):
    results = []
    norm_to_sids = defaultdict(list)
    for pid, pdata in src["paragraphs"].items():
        if pdata["is_meaningful"]:
            norm_to_sids[pdata["normalized"]].append(pid)
    rid_to_sids = defaultdict(list)
    for pid, pdata in src["paragraphs"].items():
        if not pdata["is_meaningful"]:
            continue
        for mr in re.finditer(r"FR-\d+(?:\.\d+)+", pdata["text"]):
            rid_to_sids[mr.group(0)].append(pid)
    for tid, tdata in tgt["statements"].items():
        if tdata["type"] in ("bullet", "numbered"):
            results.append({
                "target_id": tid,
                "target_text": tdata["text"],
                "source_ids": [],
                "classification": "FORMATTING",
                "confidence": 0.0,
            })
            continue
        t_norm = tdata["normalized"]
        matched = []
        cls = "ADDED/UNSUPPORTED"
        conf = 0.0
        if t_norm and t_norm in norm_to_sids:
            matched = norm_to_sids[t_norm]
            cls = "SOURCE-EXACT"
            conf = 1.0
        if cls != "SOURCE-EXACT":
            frs = re.findall(r"FR-\d+(?:\.\d+)+", tdata["text"])
            for rid in frs:
                for pid in rid_to_sids.get(rid, []):
                    if pid not in matched:
                        matched.append(pid)
            if matched:
                cls = "SOURCE-PARAPHRASE"
                conf = 0.7
        if cls == "ADDED/UNSUPPORTED" and not matched:
            t_tokens = set(t_norm.split()) if t_norm else set()
            best_pid = None
            best_ratio = 0
            for pid, pdata in src["paragraphs"].items():
                if not pdata["is_meaningful"]:
                    continue
                pn = pdata["normalized"]
                if not pn:
                    continue
                p_tokens = set(pn.split())
                if not p_tokens or not t_tokens:
                    continue
                isect = len(p_tokens & t_tokens)
                un = len(p_tokens | t_tokens)
                ratio = isect / un if un else 0
                if ratio > best_ratio and ratio >= 0.3:
                    best_ratio = ratio
                    best_pid = pid
            if best_pid:
                matched = [best_pid]
                cls = "SOURCE-PARAPHRASE"
                conf = best_ratio
        if not matched:
            cls = "ADDED/UNSUPPORTED"
            conf = 0.0
        results.append({
            "target_id": tid,
            "target_text": tdata["text"],
            "source_ids": matched,
            "classification": cls,
            "confidence": round(conf, 2),
        })
    return results


def compute_stats(src, tgt, s2t, t2s):
    total_src = src["total"]
    meaningful_src = src["meaningful"]
    empty_src = src["empty"]
    mapped_src = sum(1 for r in s2t if r["classification"] != "MISSING")
    missing_src = sum(1 for r in s2t if r["classification"] == "MISSING")
    sc = round(mapped_src / meaningful_src * 100, 1) if meaningful_src > 0 else 0
    total_tgt = tgt["total"]
    traceable_tgt = sum(1 for r in t2s if r["classification"] in ("SOURCE-EXACT", "SOURCE-PARAPHRASE"))
    unsupported_tgt = sum(1 for r in t2s if r["classification"] == "ADDED/UNSUPPORTED")
    tt = round(traceable_tgt / total_tgt * 100, 1) if total_tgt > 0 else 0
    critical_kw = ["RBAC", "permission", "role", "security", "tenancy",
                   "multi-tenant", "API", "endpoint", "authentication",
                   "database", "encryption", "performance", "scalability",
                   "uptime", "test coverage", "DoD", "AI"]
    high_matl = 0
    for r in t2s:
        if r["classification"] in ("MISSING", "ADDED/UNSUPPORTED"):
            t = r["target_text"].lower()
            if any(kw in t for kw in critical_kw):
                high_matl += 1
    return {
        "total_source_paragraphs": total_src,
        "meaningful_source_paragraphs": meaningful_src,
        "empty_source_paragraphs": empty_src,
        "mapped_source_paragraphs": mapped_src,
        "missing_source_paragraphs": missing_src,
        "source_coverage_pct": sc,
        "total_target_statements": total_tgt,
        "traceable_target_statements": traceable_tgt,
        "unsupported_target_statements": unsupported_tgt,
        "target_traceability_pct": tt,
        "high_materiality_issues": high_matl,
    }


def build_report(stats, s2t, t2s):
    lines = []
    lines.append("# SRS TRACEABILITY AUDIT")
    lines.append("")
    lines.append("## 1. Extraction Statistics")
    lines.append("")
    lines.append(f"- Total DOCX paragraphs: {stats['total_source_paragraphs']}")
    lines.append(f"- Meaningful DOCX paragraphs: {stats['meaningful_source_paragraphs']}")
    lines.append(f"- Empty DOCX paragraphs: {stats['empty_source_paragraphs']}")
    lines.append(f"- Target statements: {stats['total_target_statements']}")
    lines.append("")
    lines.append("## 2. Source Coverage Statistics")
    lines.append("")
    lines.append(f"- Mapped source paragraphs: {stats['mapped_source_paragraphs']}")
    lines.append(f"- Missing source paragraphs: {stats['missing_source_paragraphs']}")
    lines.append(f"- Source coverage: {stats['source_coverage_pct']}%")
    lines.append("")
    lines.append("## 3. Target Traceability Statistics")
    lines.append("")
    lines.append(f"- Total meaningful target statements: {stats['total_target_statements']}")
    lines.append(f"- Traceable target statements: {stats['traceable_target_statements']}")
    lines.append(f"- Unsupported target statements: {stats['unsupported_target_statements']}")
    lines.append(f"- Target traceability: {stats['target_traceability_pct']}%")
    lines.append("")
    lines.append("## 4. Missing Source Statements")
    lines.append("")
    missing = [r for r in s2t if r["classification"] == "MISSING"]
    if missing:
        lines.append("| Source ID | Classification |")
        lines.append("| --------- | --------- |")
        for m in missing[:10]:
            lines.append(f"| P{m['source_id']} | MISSING |")
    else:
        lines.append("No missing source paragraphs detected.")
    lines.append("")
    lines.append("## 5. Unsupported Target Statements")
    lines.append("")
    unsupported = [r for r in t2s if r["classification"] == "ADDED/UNSUPPORTED"]
    if unsupported:
        lines.append("| Target ID | Classification | Materiality |")
        lines.append("| --------- | --------- | --------- |")
        for u in unsupported[:10]:
            t = u["target_text"].lower()
            if any(kw in t for kw in ["rbac", "permission", "role", "security", "tenancy", "multi-tenant"]):
                mat = "HIGH"
            else:
                mat = "LOW"
            lines.append(f"| T{u['target_id']} | ADDED/UNSUPPORTED | {mat} |")
    else:
        lines.append("No unsupported target statements detected.")
    lines.append("")
    # Final verdict
    sc = stats["source_coverage_pct"]
    tt = stats["target_traceability_pct"]
    uns = stats["unsupported_target_statements"]
    hm = stats["high_materiality_issues"]
    if sc >= 99 and tt >= 99 and uns == 0 and hm == 0:
        verdict = "PASS"
    elif sc >= 99 and tt >= 99 and uns == 0 and hm > 0:
        verdict = "PASS WITH ISSUES"
    elif sc < 99 or tt < 99:
        verdict = "FAIL"
    elif uns > 0:
        verdict = "FAIL"
    else:
        verdict = "INCONCLUSIVE"
    lines.append("## 9. Final Verdict")
    lines.append("")
    lines.append(f"- Source coverage: {sc}% (PASS >= 99%: {'YES' if sc >= 99 else 'NO'})")
    lines.append(f"- Target traceability: {tt}% (PASS >= 99%: {'YES' if tt >= 99 else 'NO'})")
    lines.append(f"- Unsupported target statements = 0: {'YES' if uns == 0 else 'NO'}")
    lines.append(f"- No HIGH materiality missing items: {'YES' if hm == 0 else 'NO'}")
    lines.append("")
    lines.append(f"## Final Verdict: **{verdict}**")
    lines.append("")
    lines.append("- Source coverage >= 99%: PASS" if sc >= 99 else "- Source coverage >= 99%: FAIL")
    lines.append("- Target traceability >= 99%: PASS" if tt >= 99 else "- Target traceability >= 99%: FAIL")
    lines.append(f"- Unsupported target statements = 0: {'YES' if uns == 0 else 'NO'}")
    lines.append(f"- No HIGH materiality missing items: {'YES' if hm == 0 else 'NO'}")
    lines.append("")
    lines.append("---")
    lines.append("*Report generated by Minimal SRS Traceability Audit v2*")
    return "\n".join(lines)


def main():
    print("SRS Traceability Audit v2")
    print("=" * 40)
    print("[1/4] Parsing source paragraphs from DOCX extraction...")
    src = parse_source(SOURCE_FILE)
    print(f"  Total: {src['total']}, Meaningful: {src['meaningful']}, Empty: {src['empty']}")
    print("[2/4] Parsing target statements from SRS.md...")
    tgt = parse_target(TARGET_FILE)
    print(f"  Total statements: {tgt['total']}")
    print("[3/4] Running source -> target matching...")
    s2t = match_source_to_target(src, tgt)
    print(f"  Source classifications: MISSING={sum(1 for r in s2t if r['classification']=='MISSING')}, SOURCE-EXACT={sum(1 for r in s2t if r['classification']=='SOURCE-EXACT')}, SOURCE-PARAPHRASE={sum(1 for r in s2t if r['classification']=='SOURCE-PARAPHRASE')}")
    print("[4/4] Running target -> source matching...")
    t2s = match_target_to_source(tgt, src)
    print(f"  Target classifications: FORMATTING={sum(1 for r in t2s if r['classification']=='FORMATTING')}, SOURCE-EXACT={sum(1 for r in t2s if r['classification']=='SOURCE-EXACT')}, SOURCE-PARAPHRASE={sum(1 for r in t2s if r['classification']=='SOURCE-PARAPHRASE')}, ADDED/UNSUPPORTED={sum(1 for r in t2s if r['classification']=='ADDED/UNSUPPORTED')}")
    print("Computing statistics...")
    stats = compute_stats(src, tgt, s2t, t2s)
    print("Writing JSON files...")
    source_json = {
        "source_profile": {
            "total_paragraphs": stats["total_source_paragraphs"],
            "meaningful_paragraphs": stats["meaningful_source_paragraphs"],
            "empty_paragraphs": stats["empty_source_paragraphs"],
        },
        "source_paragraph_details": {},
        "mapped_source_paragraphs": stats["mapped_source_paragraphs"],
        "missing_source_paragraphs": stats["missing_source_paragraphs"],
        "source_coverage_pct": stats["source_coverage_pct"],
    }
    for r in s2t:
        source_json["source_paragraph_details"][r["source_id"]] = {
            "classification": r["classification"],
            "target_ids": r["target_ids"],
            "confidence": r["confidence"],
        }
    with open(os.path.join(TEMP_DIR, "source_traceability_final.json"), "w", encoding="utf-8") as f:
        json.dump(source_json, f, indent=2, ensure_ascii=False)
    target_json = {
        "target_profile": {
            "total_statements": stats["total_target_statements"],
            "statement_types": {},
        },
        "target_statements": {},
        "traceable_target_statements": stats["traceable_target_statements"],
        "unsupported_target_statements": stats["unsupported_target_statements"],
        "target_traceability_pct": stats["target_traceability_pct"],
        "high_materiality_issues": stats["high_materiality_issues"],
    }
    type_counts = defaultdict(int)
    for tid, tdata in tgt["statements"].items():
        type_counts[tdata["type"]] += 1
    target_json["target_profile"]["statement_types"] = dict(type_counts)
    for r in t2s:
        tid = r["target_id"]
        target_json["target_statements"][tid] = {
            "target_text": r["target_text"][:80] + "..." if len(r["target_text"]) > 80 else r["target_text"],
            "statement_type": tgt["statements"][tid]["type"],
            "section": tgt["statements"][tid]["section"],
            "source_ids": r["source_ids"],
            "classification": r["classification"],
            "confidence": r["confidence"],
        }
    with open(os.path.join(TEMP_DIR, "target_traceability_final.json"), "w", encoding="utf-8") as f:
        json.dump(target_json, f, indent=2, ensure_ascii=False)
    print("Writing fidelity report...")
    report = build_report(stats, s2t, t2s)
    with open(os.path.join(TEMP_DIR, "fidelity_report_final.md"), "w", encoding="utf-8") as f:
        f.write(report)
    print()
    print("=" * 50)
    print("AUDIT SUMMARY")
    print("=" * 50)
    print(f"Source paragraphs: {stats['total_source_paragraphs']}")
    print(f"Meaningful source paragraphs: {stats['meaningful_source_paragraphs']}")
    print(f"Mapped source paragraphs: {stats['mapped_source_paragraphs']}")
    print(f"Missing source paragraphs: {stats['missing_source_paragraphs']}")
    print(f"Source coverage: {stats['source_coverage_pct']}%")
    print(f"Target statements: {stats['total_target_statements']}")
    print(f"Traceable target statements: {stats['traceable_target_statements']}")
    print(f"Unsupported target statements: {stats['unsupported_target_statements']}")
    print(f"Target traceability: {stats['target_traceability_pct']}%")
    print(f"High-materiality issues: {stats['high_materiality_issues']}")
    if stats["source_coverage_pct"] >= 99 and stats["target_traceability_pct"] >= 99 and stats["unsupported_target_statements"] == 0 and stats["high_materiality_issues"] == 0:
        verdict = "PASS"
    elif stats["source_coverage_pct"] >= 99 and stats["target_traceability_pct"] >= 99 and stats["unsupported_target_statements"] == 0 and stats["high_materiality_issues"] > 0:
        verdict = "PASS WITH ISSUES"
    elif stats["source_coverage_pct"] < 99 or stats["target_traceability_pct"] < 99:
        verdict = "FAIL"
    elif stats["unsupported_target_statements"] > 0:
        verdict = "FAIL"
    else:
        verdict = "INCONCLUSIVE"
    print(f"Final verdict: {verdict}")
    print()
    print(f"Report: temp/fidelity_report_final.md")
    print(f"Source JSON: temp/source_traceability_final.json")
    print(f"Target JSON: temp/target_traceability_final.json")


if __name__ == "__main__":
    main()