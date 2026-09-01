import zipfile
import xml.etree.ElementTree as ET

path = r"C:\Users\Jeswin\Downloads\HRMS\docs\HR_Portal_SRS_v1.1_Vibe_Coding.docx"

# Read the ZIP and extract document.xml
with zipfile.ZipFile(path, "r") as z:
    xml_content = z.read("word/document.xml")

# Parse the XML
root = ET.fromstring(xml_content)

# Define the namespace
ns = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
}

# Collect all paragraphs in order
paragraphs = []
for p in root.findall(".//w:p", ns):
    texts = []
    for t in p.findall(".//w:t", ns):
        if t.text is not None:
            texts.append(t.text)
    full_text = "".join(texts)
    paragraphs.append(full_text)

# Collect all tables
tables = []
table_elements = root.findall(".//w:table", ns)
for table_elem in table_elements:
    rows_data = []
    for row in table_elem.findall(".//w:tr", ns):
        cells_data = []
        for cell in row.findall(".//w:tc", ns):
            cell_text_parts = cell.findall(".//w:t", ns)
            cell_text = "".join([t.text if t.text is not None else "" for t in cell_text_parts])
            cells_data.append(cell_text)
        rows_data.append(cells_data)
    tables.append(rows_data)

# Write to UTF-8 file
output_path = r"C:\Users\Jeswin\Downloads\HRMS\docs\extracted_srs_full.txt"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(f"=== DOCX EXTRACTION SUMMARY ===\n")
    f.write(f"Total paragraphs: {len(paragraphs)}\n")
    f.write(f"Total tables: {len(tables)}\n")
    f.write(f"\n=== ALL PARAGRAPHS (document order) ===\n")
    for i, p_text in enumerate(paragraphs, 1):
        # Write each paragraph with its number
        f.write(f"P{i}: {p_text}\n")
    f.write(f"\n=== TABLES ===\n")
    for t_idx, table in enumerate(tables):
        f.write(f"Table {t_idx}: {len(table)} rows\n")
        for r_idx, row in enumerate(table):
            f.write(f"  Row {r_idx}: {row}\n")
        f.write("\n")

# Also compute character counts
total_chars = sum(len(p) for p in paragraphs)
total_chars_with_newlines = sum(len(p) + 1 for p in paragraphs)  # +1 for \n

print(f"Extraction complete!")
print(f"Total paragraphs: {len(paragraphs)}")
print(f"Total characters (paragraph content only): {total_chars}")
print(f"Total characters (with newlines): {total_chars_with_newlines}")
print(f"Total tables: {len(tables)}")
print(f"Output written to: {output_path}")