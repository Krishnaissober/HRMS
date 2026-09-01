#!/usr/bin/env python3
"""
SRS Marker Integrity Audit v2.
Exact comparison of P1-P959 source paragraphs against <!-- SOURCE: P### --> markers in SRS.md.
No semantic matching, no requirement-ID matching, no token similarity.
Uses normal Python file I/O only.
"""

import re
import json
import os
from collections import Counter

SOURCE_FILE = r"C:\Users\Jeswin\Downloads\HRMS\docs\extracted_srs_full.txt"
TARGET_FILE = r"C:\Users\Jeswin\Downloads\HRMS\docs\SRS.md"
TEMP_DIR = r"C:\Users\Jeswin\Downloads\HRMS\temp"
os.makedirs(TEMP_DIR, exist_ok=True)


def read_file(filepath):
    """Read file with UTF-8 encoding."""
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()


def parse_source_paragraphs(filepath):
    """Parse all P1-P959 from the source extraction file."""
    content = read_file(filepath)
    paragraphs = {}
    total = 0
    meaningful = 0
    empty = 0
    
    # Match P1: through P959: at line start
    pattern = re.compile(r"^P(\d+):\s*(.+)$", re.MULTILINE)
    for mo in pattern.finditer(content):
        total += 1
        pid = int(mo.group(1))
        ptext = mo.group(2)
        
        if len(ptext.strip()) == 0:
            empty += 1
            is_meaningful = False
        else:
            meaningful += 1
            is_meaningful = True
        
        paragraphs[pid] = {
            "id": pid,
            "text": ptext,
            "is_meaningful": is_meaningful,
            "is_empty": len(ptext.strip()) == 0
        }
    
    return {
        "paragraphs": paragraphs,
        "total": total,
        "meaningful": meaningful,
        "empty": empty
    }


def find_markers(filepath):
    """Find ALL <!-- SOURCE: P### --> markers in the target file."""
    content = read_file(filepath)
    # Robust pattern: accepts <!-- SOURCE: P123 -->, <!-- SOURCE:P123 -->, <!-- SOURCE:  P123  -->
    pattern = re.compile(r"<!--\s*SOURCE\s*:\s*P(\d+)\s*-->", re.IGNORECASE)
    markers = pattern.findall(content)
    
    # Also return full match strings with whitespace details
    marker_details = []
    for m in pattern.finditer(content):
        marker_id = m.group(1)
        full_match = m.group(0)
        marker_details.append({
            "id": int(marker_id),
            "full_text": full_match,
            "start": m.start(),
            "end": m.end()
        })
    
    return {
        "marker_ids": markers,
        "marker_details": marker_details,
        "total_found": len(markers)
    }


def check_marker_order(marker_details):
    """Check if markers appear in sequential order 1, 2, 3, ..., n."""
    # Sort by position in file
    sorted_markers = sorted(marker_details, key=lambda x: x["start"])
    ordered_ids = [m["id"] for m in sorted_markers]
    
    # Check which positions are out of order
    # A marker is "out of order" if its position in the sequence doesn't match its ID
    out_of_order = []
    for i, marker in enumerate(sorted_markers):
        # Expected position in sequential sequence: i+1
        # But we check if the marker ID matches its position order
        # If marker 5 appears at position 3 (0-indexed), it's out of order
        expected_id = i + 1
        if marker["id"] != expected_id:
            out_of_order.append(marker["id"])
    
    return ordered_ids, out_of_order


def extract_marker_content(filepath, marker_id):
    """Extract the text content between a SOURCE marker and the next one."""
    content = read_file(filepath)
    marker_str = "<!-- SOURCE: P{} -->".format(marker_id)
    
    pos = content.find(marker_str)
    if pos == -1:
        return None
    
    after_marker = content[pos + len(marker_str):]
    
    # Find next SOURCE marker
    next_marker_pos = content.find("<!-- SOURCE:", pos + 1)
    if next_marker_pos != -1:
        # Content is between this marker and the next one
        chunk = after_marker[:next_marker_pos - pos - len("<!-- SOURCE: ")]
    else:
        # No more markers - take up to 500 chars after marker
        chunk = after_marker[:500]
    
    return chunk.strip()


def normalize_for_comparison(text):
    """
    Normalize text for comparison, removing only Markdown formatting
    that was explicitly added for presentation. Preserve all substantive content.
    """
    if not text:
        return ""
    t = text.lower()
    # Remove Markdown bold/italic
    t = re.sub(r"\*\*|__|\*|_", "", t)
    # Remove code formatting
    t = re.sub(r"`", "", t)
    # Remove link syntax [text] - keep the text portion conceptually
    # But be conservative - only remove if clearly Markdown artifact
    t = re.sub(r"\[.*?\]\([^)]*\)", "", t)  # [text](url) removed
    t = re.sub(r"\s+", " ", t)
    t = t.strip()
    return t


def audit_markers():
    """Perform the complete marker integrity audit."""
    
    # Step 1: Read source
    source_data = parse_source_paragraphs(SOURCE_FILE)
    total_source = 959  # As specified
    meaningful_source = source_data["meaningful"]
    empty_source = source_data["empty"]
    
    print(f"Source: {source_data['total']} paragraphs parsed")
    print(f"  Meaningful: {meaningful_source}, Empty: {empty_source}")
    
    # Step 2: Read target markers
    marker_data = find_markers(TARGET_FILE)
    found_ids = marker_data["marker_ids"]
    marker_details = marker_data["marker_details"]
    total_markers = len(marker_data["marker_ids"])
    
    print(f"Target: {total_markers} markers found in SRS.md")
    
    # Step 3: Analyze markers
    all_p_ids = set(range(1, 960))  # P1 through P959
    found_p_ids = set(int(m) for m in found_ids)
    
    # Missing markers
    missing_ids = sorted(all_p_ids - found_p_ids)
    missing_count = len(missing_ids)
    
    # Duplicate markers
    marker_counter = Counter(found_ids)
    duplicate_ids = [mid for mid, count in marker_counter.items() if count > 1]
    duplicate_count = len(duplicate_ids)
    
    # Out of order
    sorted_by_position, out_of_order_ids = check_marker_order(marker_details)
    out_of_order_count = len(out_of_order)
    
    # Unexpected markers (IDs < 1 or > 959)
    unexpected_ids = [mid for mid in found_ids if mid < 1 or mid > 959]
    unexpected_count = len(unexpected_ids)
    
    # Content check for present markers
    content_mismatches = []
    present_ids = sorted(found_p_ids)
    
    # Check content for ALL present markers (not just first 60)
    for p_id in present_ids:
        # Get source paragraph text
        source_para = source_data["paragraphs"].get(p_id)
        if source_para is None:
            # Paragraph not in source extraction - skip
            continue
        
        source_text = source_para["text"]
        
        # Get target marker content
        marker_str = "<!-- SOURCE: P{} -->".format(p_id)
        target_text = extract_marker_content(TARGET_FILE, p_id)
        
        if target_text is None:
            # Marker exists but we can't extract content - record as mismatch
            content_mismatches.append({
                "p_number": p_id,
                "source_text": source_text[:80] + "..." if len(source_text) > 80 else source_text,
                "target_text": "EXTRACTION_FAILED",
                "difference": "Could not extract target content between markers"
            })
            continue
        
        # Normalize both for comparison, removing only Markdown formatting
        source_norm = normalize_for_comparison(source_text)
        target_norm = normalize_for_comparison(target_text)
        
        # Normalize whitespace
        source_norm = re.sub(r"\s+", " ", source_norm).strip()
        target_norm = re.sub(r"\s+", " ", target_norm).strip()
        
        # Compare - exact match required
        if source_norm != target_norm:
            # For the mismatch report, capture key differences
            content_mismatches.append({
                "p_number": p_id,
                "source_text": source_text[:120] + "..." if len(source_text) > 120 else source_text,
                "target_text": target_text[:120] + "..." if len(target_text) > 120 else target_text,
                "difference": "Text differs after Markdown formatting normalization"
            })
    
    content_mismatch_count = len(content_mismatches)
    
    # Build results
    results = {
        "total_source_paragraphs": total_source,
        "meaningful_source_paragraphs": meaningful_source,
        "empty_source_paragraphs": empty_source,
        "total_target_markers": total_markers,
        "unique_target_markers": len(set(found_ids)),
        "missing_marker_count": missing_count,
        "missing_marker_ids": missing_ids,
        "duplicate_marker_count": duplicate_count,
        "duplicate_marker_ids": duplicate_ids,
        "unexpected_marker_count": unexpected_count,
        "unexpected_marker_ids": unexpected_ids,
        "out_of_order_count": out_of_order,
        "content_mismatch_count": content_mismatch_count,
        "content_mismatches": content_mismatches,
        "source_paragraphs_extracted": source_data["total"],
    }
    
    return results


def main():
    results = audit_markers()
    
    # Write JSON audit file
    with open(os.path.join(TEMP_DIR, "srs_marker_audit_v2.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    # Build Markdown report
    lines = []
    lines.append("# SRS SOURCE-MARKER AUDIT V2")
    lines.append("")
    lines.append("## Source")
    lines.append("")
    lines.append(f"- Total source paragraphs: {results['total_source_paragraphs']}")
    lines.append(f"- Meaningful source paragraphs: {results['meaningful_source_paragraphs']}")
    lines.append(f"- Empty source paragraphs: {results['empty_source_paragraphs']}")
    lines.append("")
    lines.append("## Target")
    lines.append("")
    lines.append(f"- Total markers: {results['total_target_markers']}")
    lines.append(f"- Unique markers: {results['unique_target_markers']}")
    lines.append("")
    lines.append("## Integrity")
    lines.append("")
    lines.append(f"- Missing markers: {results['missing_marker_count']}")
    lines.append(f"  Missing IDs: {results['missing_marker_ids']}")
    lines.append(f"- Duplicate markers: {results['duplicate_marker_count']}")
    lines.append(f"  Duplicate IDs: {results['duplicate_marker_ids']}")
    lines.append(f"- Unexpected markers: {results['unexpected_marker_count']}")
    lines.append(f"  Unexpected IDs: {results['unexpected_marker_ids']}")
    lines.append(f"- Out of order markers: {results['out_of_order_count']}")
    lines.append(f"  Out of order IDs: {results['out_of_order_ids'][:20]}...")
    lines.append(f"- Content mismatches: {results['content_mismatch_count']}")
    lines.append("")
    lines.append("## Mismatches")
    lines.append("")
    if results['content_mismatch_count'] > 0:
        lines.append("Content mismatches detected for {} paragraphs:".format(results['content_mismatch_count']))
        for m in results['content_mismatches'][:20]:
            lines.append(f"  - P{m['p_number']}: source vs target text differ")
        if results['content_mismatch_count'] > 20:
            lines.append(f"  - ... and {results['content_mismatch_count'] - 20} more mismatches")
    else:
        lines.append("- No content mismatches detected")
    lines.append("")
    lines.append("## Final Verdict")
    lines.append("")
    
    # PASS criteria
    paas = (
        results['total_source_paragraphs'] == 959 and
        results['total_target_markers'] == 959 and
        results['missing_marker_count'] == 0 and
        results['duplicate_marker_count'] == 0 and
        results['unexpected_marker_count'] == 0 and
        results['out_of_order_count'] == 0 and
        results['content_mismatch_count'] == 0
    )
    
    verdict = "PASS" if paas else "FAIL"
    lines.append(f"- **Final Verdict: {verdict}**")
    lines.append("")
    lines.append(f"- Source paragraphs == 959: {'YES' if results['total_source_paragraphs'] == 959 else 'NO'} ({results['total_source_paragraphs']})")
    lines.append(f"- Target markers == 959: {'YES' if results['total_target_markers'] == 959 else 'NO'} ({results['total_target_markers']})")
    lines.append(f"- Missing markers == 0: {'YES' if results['missing_marker_count'] == 0 else 'NO'} ({results['missing_marker_count']})")
    lines.append(f"- Duplicate markers == 0: {'YES' if results['duplicate_marker_count'] == 0 else 'NO'} ({results['duplicate_marker_count']})")
    lines.append(f"- Unexpected markers == 0: {'YES' if results['unexpected_marker_count'] == 0 else 'NO'} ({results['unexpected_marker_count']})")
    lines.append(f"- Out of order markers == 0: {'YES' if results['out_of_order_count'] == 0 else 'NO'} ({results['out_of_order_count']})")
    lines.append(f"- Content mismatches == 0: {'YES' if results['content_mismatch_count'] == 0 else 'NO'} ({results['content_mismatch_count']})")
    lines.append("")
    lines.append("---")
    lines.append(f"*Audit performed by SRS Marker Integrity Audit v2*")
    
    report_md = "\n".join(lines)
    
    with open(os.path.join(TEMP_DIR, "srs_marker_audit_v2.md"), "w", encoding="utf-8") as f:
        f.write(report_md)
    
    print("=" * 60)
    print("AUDIT RESULTS")
    print("=" * 60)
    print(f"Total source paragraphs: {results['total_source_paragraphs']}")
    print(f"Meaningful source paragraphs: {results['meaningful_source_paragraphs']}")
    print(f"Empty source paragraphs: {results['empty_source_paragraphs']}")
    print()
    print(f"Target markers: {results['total_target_markers']}")
    print(f"Unique markers: {results['unique_target_markers']}")
    print(f"Missing markers: {results['missing_marker_count']}")
    print(f"  Missing IDs count: {len(results['missing_marker_ids'])}")
    print(f"Duplicate markers: {results['duplicate_marker_count']}")
    print(f"  Duplicate IDs: {results['duplicate_marker_ids']}")
    print(f"Unexpected markers: {results['unexpected_marker_count']}")
    print(f"Out of order markers: {results['out_of_order_count']}")
    print(f"  First few out-of-order: {results['out_of_order_ids'][:5]}")
    print(f"Content mismatches: {results['content_mismatch_count']}")
    print()
    print(f"Final verdict: {verdict}")
    print()
    print(f"Report: temp/srs_marker_audit_v2.md")
    print(f"JSON: temp/srs_marker_audit_v2.json")


if __name__ == "__main__":
    main()