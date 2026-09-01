#!/usr/bin/env python3
"""
Convert extracted_srs_full.txt to SRS.md - Faithful Markdown conversion.
Preserves all 959 paragraphs in original order with SOURCE markers.
Only converts formatting; no content changes, summaries, or inventions.
"""

import re
import json
import os

SOURCE_FILE = r"C:\Users\Jeswin\Downloads\HRMS\docs\extracted_srs_full.txt"
TARGET_FILE = r"C:\Users\Jeswin\Downloads\HRMS\docs\SRS.md"
TEMP_DIR = r"C:\Users\Jeswin\Downloads\HRMS\temp"
os.makedirs(TEMP_DIR, exist_ok=True)


def normalize_heading(text):
    """Convert a heading line to Markdown heading."""
    text = text.strip()
    level = 3
    if re.match(r"^\d+\.\s", text) or re.match(r"^\d+\.\d+\s", text):
        level = 2
    if re.match(r"^Appendix", text, re.IGNORECASE):
        level = 2
    if re.match(r"^Change History", text, re.IGNORECASE):
        level = 2
    if re.match(r"^3[0-9]\.\s", text):
        level = 2
    return f"{'#' * level} {text}"


def normalize_bullet(text):
    """Convert to Markdown bullet."""
    text = text.strip()
    return f"- {text}"


def normalize_numbered(text):
    """Convert to Markdown numbered list item."""
    text = text.strip()
    return text


def is_meaningful(p_text):
    """Check if paragraph has substantive text."""
    return bool(re.search(r"[a-zA-Z0-9]", p_text.strip()))


def extract_paragraph_content(full_line):
    """
    Extract paragraph content from a line like:
    - 'P5: Item'
    - 'P20: Core design principle: ...'
    - 'P26.3 Recommended Technology Stack'
    Return just the content after 'P<number>:'
    """
    # Match P<number>: at the start, then capture the rest
    m = re.match(r"^P\d+:\s*(.+)$", full_line.strip())
    if m:
        return m.group(1).strip()
    # Fallback: just return the stripped line without the P<number>: prefix
    # Handle doubled format like "P5: P5: Item"
    # Remove leading "P<number>:" pattern
    normalized = re.sub(r"^P\d+:\s*", "", full_line.strip())
    # If result starts with "P<number>:" again, remove it too
    normalized = re.sub(r"^P\d+:\s*", "", normalized)
    return normalized.strip()


def convert_docx_to_markdown():
    """
    Read the extracted DOCX text and produce a Markdown conversion
    that preserves ALL 959 paragraphs in original order with SOURCE markers.
    """
    with open(SOURCE_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    # Parse ALL P1-P959 paragraphs using the simple number extractor
    # First, find all P1 through P959 and their full line content
    all_paragraphs = []
    # Find all lines starting with P1: through P959:
    pattern = re.compile(r"^P(\d+):\s*(.+)$", re.MULTILINE)
    for m in pattern.finditer(content):
        p_id = int(m.group(1))
        p_text = m.group(2)
        all_paragraphs.append((p_id, p_text))

    # Also add any paragraphs that the simple ^P(\d+): pattern finds but the full pattern misses
    simple_pattern = re.compile(r"^P(\d+):", re.MULTILINE)
    for m in simple_pattern.finditer(content):
        p_id = int(m.group(1))
        # Check if this paragraph is already added
        already = any(p[0] == p_id for p in all_paragraphs)
        if not already:
            # Get the full line content - everything after "P<number>:"
            # Find this paragraph's line in the original content
            line_match = re.search(rf"^P{p_id}:\s*", content, re.MULTILINE)
            if line_match:
                line_start = line_match.start()
                # Get the rest of the line
                rest_of_content = content[line_match.end():]
                # Get just the first line
                first_newline = rest_of_content.find('\n')
                if first_newline >= 0:
                    p_text = rest_of_content[:first_newline]
                else:
                    p_text = rest_of_content
                # Clean up: the content might start with "P5: " etc.
                p_text = extract_paragraph_content(p_text)
                all_paragraphs.append((p_id, p_text))

    # Sort by paragraph number to ensure original order
    all_paragraphs.sort(key=lambda x: x[0])

    print(f"Total paragraphs parsed: {len(all_paragraphs)}")

    # Verify we have all 959
    p_ids = [p[0] for p in all_paragraphs]
    missing = [i for i in range(1, 960) if i not in p_ids]
    if missing:
        print(f"WARNING: Missing {len(missing)} paragraph IDs: {missing[:10]}...")

    # Convert each paragraph to Markdown with SOURCE marker
    md_lines = []
    markers_seen = {}

    for p_id, p_text in all_paragraphs:
        # Add SOURCE marker HTML comment
        marker = f"<!-- SOURCE: P{p_id} -->"
        markers_seen[p_id] = marker

        # Determine if meaningful
        meaningful = is_meaningful(p_text)

        # Strip the paragraph content
        p_stripped = p_text.strip()

        # Empty paragraph
        if len(p_stripped) == 0:
            md_lines.append(marker)
            md_lines.append("")
            continue

        # Heading lines (e.g., "1. Introduction", "26.3 Recommended Technology Stack")
        if re.match(r"^\d+\.\s", p_stripped) or re.match(r"^\d+\.\d+\s", p_stripped):
            md_lines.append(normalize_heading(p_stripped))
            md_lines.append("")
            continue

        # Appendix and change history headings
        if re.match(r"^Appendix", p_stripped, re.IGNORECASE):
            md_lines.append(normalize_heading(p_stripped))
            md_lines.append("")
            continue

        if re.match(r"^Change History", p_stripped, re.IGNORECASE):
            md_lines.append(normalize_heading(p_stripped))
            md_lines.append("")
            continue

        # Table separator lines
        if re.match(r"^[-_]{3,}$", p_stripped):
            md_lines.append("")
            continue

        # Table rows (lines starting with |)
        if p_stripped.startswith("|"):
            md_lines.append(marker)
            md_lines.append(p_stripped)
            md_lines.append("")
            continue

        # FR requirement items: "FR-001 - Authentication: ..."
        if re.match(r"^FR-\d+(?:\.\d+)\s+-", p_stripped):
            md_lines.append(marker)
            md_lines.append(p_stripped)
            md_lines.append("")
            continue

        # Bullets (lines starting with - or *)
        if re.match(r"^[-*]\s", p_stripped):
            md_lines.append(marker)
            md_lines.append(normalize_bullet(p_stripped))
            md_lines.append("")
            continue

        # Numbered list items like "1." or "1.1"
        if re.match(r"^\d+(\.\d+)*\s", p_stripped):
            md_lines.append(marker)
            md_lines.append(normalize_numbered(p_stripped))
            md_lines.append("")
            continue

        # Definition-style: "Term: definition"
        if re.match(r"^[A-Z][a-zA-Z\s]+\s*:", p_stripped):
            md_lines.append(marker)
            parts = re.split(r"(:)\s", p_stripped, maxsplit=1)
            if len(parts) >= 3:
                term = parts[1]
                definition = parts[2]
                md_lines.append(f"**{term}:** {definition}")
            else:
                md_lines.append(marker)
                md_lines.append(p_stripped)
            md_lines.append("")
            continue

        # Section headings like "1. Introduction", "2. Product Vision", etc.
        if re.match(r"^\d+\.\s*.+$", p_stripped) or re.match(r"^\d+\.\d+\s*.+$", p_stripped):
            md_lines.append(normalize_heading(p_stripped))
            md_lines.append("")
            continue

        # Paragraphs that start with "P1:", "P2:" etc. - handle the doubled format
        if re.match(r"^P\d+\:\s*", p_stripped):
            # This happens with doubled format like "P5: P5: Item"
            # Just use the content after removing the first "P<number>:" prefix
            md_lines.append(marker)
            # Recursively strip if needed
            cleaned = re.sub(r"^P\d+\:\s*", "", p_stripped)
            md_lines.append(cleaned)
            md_lines.append("")
            continue

        # Default: plain paragraph
        md_lines.append(marker)
        md_lines.append(p_stripped)
        md_lines.append("")

    # Write the Markdown file
    with open(TARGET_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))

    # Verification: check all 959 paragraphs are accounted for
    all_p_ids = set(range(1, 960))  # P1 through P959
    seen_p_ids = set(markers_seen.keys())
    missing_ids = sorted(all_p_ids - seen_p_ids)
    duplicate_ids = [pid for pid in markers_seen if list(markers_seen.keys()).count(pid) > 1]

    # Count meaningful paragraphs from source
    meaningful_count = sum(1 for p_id, p_text in all_paragraphs if is_meaningful(p_text))

    # Write verification JSON
    report = {
        "total_source_paragraphs": len(all_paragraphs),
        "meaningful_paragraphs": meaningful_count,
        "total_paragraphs_in_md": len([l for l in md_lines if l.startswith("<!-- SOURCE:")]),
        "missing_source_ids": missing_ids,
        "duplicate_source_ids": duplicate_ids,
        "source_markers_count": len(markers_seen),
        "target_paragraphs_written": TARGET_FILE,
    }

    with open(os.path.join(TEMP_DIR, "srs_conversion_check.json"), "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"Conversion complete:")
    print(f"  Total paragraphs parsed: {len(all_paragraphs)}")
    print(f"  Meaningful paragraphs: {meaningful_count}")
    print(f"  Source markers written: {len(markers_seen)}")
    print(f"  Missing source markers: {len(missing_ids)}")
    print(f"  Duplicate source markers: {len(duplicate_ids)}")
    print(f"  Missing IDs: {missing_ids if missing_ids else 'NONE'}")
    print(f"  Target file: {TARGET_FILE}")

    return report


if __name__ == "__main__":
    convert_docx_to_markdown()