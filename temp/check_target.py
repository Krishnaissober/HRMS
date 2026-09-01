import json
with open(r"C:\Users\Jeswin\Downloads\HRMS\temp\trace_check.json", "r", encoding="utf-8") as f:
    d = json.load(f)
pt = d["target_profile"]
print("Target profile:")
print(json.dumps(pt, indent=2, ensure_ascii=False))
print()
print("First 5 target statements:")
stids = list(d["target_statements"].keys())[:5]
for tid in stids:
    st = d["target_statements"][tid]
    print(f"T{tid}: type={st['statement_type']}, classification={st['classification']}, source_ids={st['source_ids']}, confidence={st['confidence']}")