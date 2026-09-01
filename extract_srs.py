import zipfile
import xml.etree.ElementTree as ET
import os

path = r"C:\Users\Jeswin\Downloads\HRMS\docs\HR_Portal_SRS_v1.1_Vibe_Coding.docx"

with zipfile.ZipFile(path, "r") as z:
    xml = z.read("word/document.xml")

root = ET.fromstring(xml)

ns = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
}

# Count total paragraphs and tables
paragraphs = 0
tables = root.findall(".//w:table", ns)

for p in root.findall(".//w:p", ns):
    paragraphs += 1

print("=" * 70)
print("DOCX EXTRACTION REPORT")
print("=" * 70)
print(f"Total paragraphs: {paragraphs}")
print(f"Total tables: {len(tables)}")
print()

# Extract all paragraph text with numbering
print("--- PARAGRAPHS (extracted) ---")
all_paragraphs = []
for i, p in enumerate(root.findall(".//w:p", ns), 1):
    texts = []
    for t in p.findall(".//w:t", ns):
        if t.text:
            texts.append(t.text)
    text = "".join(texts).strip()
    if text:
        all_paragraphs.append(text)
        # Print first 200 chars of each paragraph
        print(f"P{i}: {text[:200]}")

print()
print(f"Total paragraphs with content: {len(all_paragraphs)}")

# Extract table content
print("--- TABLES ---")
for t_idx, table in enumerate(tables):
    rows = table.findall(".//w:tr", ns)
    print(f"Table {t_idx}: {len(rows)} rows x {len(table.columns)} columns")
    for r_idx, row in enumerate(rows):
        cells = row.findall(".//w:tc", ns)
        row_text = []
        for c_idx, cell in enumerate(cells):
            cell_text_parts = cell.findall(".//w:t", ns)
            cell_text = "".join([t.text or "" for t in cell_text_parts]).strip()
            row_text.append(cell_text)
        print(f"  Row {r_idx}: {row_text}")
    print()

# Save full text to output file
output_path = r"C:\Users\Jeswin\Downloads\HRMS\docs\extracted_srs.txt"
with open(output_path, "w", encoding="utf-8") as f:
    f.write("HR PORTAL SRS - EXTRACTED CONTENT\n")
    f.write("=" * 60 + "\n\n")
    f.write(f"Total paragraphs: {paragraphs}\n")
    f.write(f"Total tables: {len(tables)}\n\n")
    f.write("--- ALL PARAGRAPHS ---\n")
    for p_text in all_paragraphs:
        f.write(p_text + "\n")
    f.write("\n--- ALL TABLES ---\n")
    for t_idx, table in enumerate(tables):
        f.write(f"Table {t_idx}: {len(table.rows)} rows x {len(table.columns)} columns\n")
        for r_idx, row in enumerate(table.rows):
            cells = row.findall(".//w:tc", ns)
            row_text = []
            for c_idx, cell in enumerate(cells):
                cell_text_parts = cell.findall(".//w:t", ns)
                cell_text = "".join([t.text or "" for t in cell_text_parts]).strip()
                row_text.append(cell_text)
            f.write(f"  Row {r_idx}: {row_text}\n")
        f.write("\n")

print(f"\nFull extraction saved to: {output_path}")
print(f"File size: {os.path.getsize(output_path)} bytes")

# Print the table of contents / major sections
print("\n--- MAJOR SECTIONS (by heading detection) ---")
for p_text in all_paragraphs:
    # Look for section headings (typically starting with number patterns like "1.", "2.", etc.)
    import re
    if re.match(r'^\d+(\.\d+)?\s', p_text) or p_text.startswith(('1 ', '2 ', '3 ', '4 ', '5 ', '6 ', '7 ', '8 ', '9 ', '10 ')):
        print(f"  Section: {p_text[:150]}")