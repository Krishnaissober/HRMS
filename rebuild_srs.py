#!/usr/bin/env python3
"""
Rebuild SRS.md with ALL 959 paragraphs as <!-- SOURCE: P### --> markers.
Lossless conversion from extracted_srs_full.txt.
No restructuring, no summarization, no content changes.
"""

import re
import os

SOURCE_FILE = r"C:\Users\Jeswin\Downloads\HRMS\docs\extracted_srs_full.txt"
TARGET_FILE = r"C:\Users\Jeswin\Downloads\HRMS\docs\SRS.md"
TEMP_DIR = r"C:\Users\Jeswin\Downloads\HRMS\temp"
os.makedirs(TEMP_DIR, exist_ok=True)


def read_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        return f.read()


def extract_paragraph_content(full_line):
    """Extract paragraph content after 'P<number>:' prefix.
    Handles formats like:
    - 'P5: Item'
    - 'P5: P5: Item' (doubled)
    - 'P26.3 Recommended Technology Stack'
    """
    line = full_line.strip()
    # Remove leading "P<number>:" pattern (first occurrence)
    normalized = re.sub(r"^P\d+:\s*", "", line)
    # If result still starts with "P<number>:", remove it again
    normalized = re.sub(r"^P\d+:\s*", "", normalized)
    return normalized.strip()


def main():
    # Read source file
    source_content = read_file(SOURCE_FILE)

    # Parse ALL P1-P959 paragraphs using robust method
    all_paragraphs = []
    
    # Method 1: Find all lines starting with P1: through P959:
    pattern = re.compile(r"^P(\d+):\s*(.+)$", re.MULTILINE)
    for m in pattern.finditer(source_content):
        p_id = int(m.group(1))
        p_text = m.group(2)
        all_paragraphs.append((p_id, p_text))

    # Method 2: Also add any paragraphs the simple ^P(\d+) pattern finds
    # that the full pattern misses (e.g., doubled format)
    simple_pattern = re.compile(r"^P(\d+):", re.MULTILINE)
    added_count = 0
    for m in simple_pattern.finditer(source_content):
        p_id = int(m.group(1))
        # Check if this paragraph is already added
        already = any(p[0] == p_id for p in all_paragraphs)
        if not already:
            # Get the full line content - everything after "P<number>:"
            line_match = re.search(rf"^P{p_id}:\s*", source_content, re.MULTILINE)
            if line_match:
                line_start = line_match.start()
                # Get the rest of the line
                rest_of_content = source_content[line_match.end():]
                # Get just the first line
                first_newline = rest_of_content.find('\n')
                if first_newline >= 0:
                    p_text = rest_of_content[:first_newline]
                else:
                    p_text = rest_of_content
                # Clean up: the content might start with "P5: " etc.
                p_text = extract_paragraph_content(p_text)
                all_paragraphs.append((p_id, p_text))
                added_count += 1

    # Sort by paragraph number to ensure original order
    all_paragraphs.sort(key=lambda x: x[0])

    # Verify we have all 959
    p_ids = [p[0] for p in all_paragraphs]
    missing = [i for i in range(1, 960) if i not in p_ids]
    if missing:
        print(f"WARNING: Missing {len(missing)} paragraph IDs: {missing[:10]}")
    else:
        print(f"All 959 paragraph IDs present (P1-P959)")

    print(f"Total paragraphs parsed: {len(all_paragraphs)}")

    # Build Markdown content with SOURCE markers
    md_lines = []
    for p_id, p_text in all_paragraphs:
        # Add SOURCE marker
        marker = "<!-- SOURCE: P{} -->".format(p_id)
        md_lines.append(marker)
        # Add the source text exactly as extracted
        md_lines.append(p_text.strip())
        md_lines.append("")  # blank line between entries

    # Write the Markdown file
    with open(TARGET_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))

    print(f"SRS.md written with {len(all_paragraphs)} paragraphs")
    print(f"Target file: {TARGET_FILE}")

    # Verification: check all 959 markers are present
    content = read_file(TARGET_FILE)
    marker_pattern = re.compile(r"<!-- SOURCE: P(\d+) -->", re.IGNORECASE)
    found_markers = marker_pattern.findall(content)
    found_ids = [int(x) for x in found_markers]
    expected = list(range(1, 960))
    
    if found_ids == expected:
        print("VERIFICATION SUCCESS: All 959 markers P1-P959 present in correct order")
    else:
        missing = [i for i in expected if i not in found_ids]
        extra = [i for i in found_ids if i not in expected]
        print(f"VERIFICATION ISSUE: Missing {len(missing)}, Extra {len(extra)}")
        if missing:
            print(f"First 5 missing: {missing[:5]}")
        if extra:
            print(f"First 5 extra: {extra[:5]}")


if __name__ == "__main__":
    main()