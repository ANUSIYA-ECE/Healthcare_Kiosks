import pandas as pd
import re

def clean_value(val):
    val = str(val).strip()
    val = val.replace("–", "-").replace("°F", "").replace("bpm", "").replace("%", "")
    
    if "/" in val and "-" in val:
        # BP range like 110–120/70–80 → 110/70-120/80
        try:
            part1, part2 = val.split("/")
            s1, s2 = part1.split("-")
            d1, d2 = part2.split("-")
            return f"{s1.strip()}/{d1.strip()}-{s2.strip()}/{d2.strip()}"
        except:
            return val

    if re.match(r"^>=", val):
        return f"{val[2:]}-inf"
    if re.match(r"^>", val):
        return f"{float(val[1:].strip()) + 0.1}-inf"
    if re.match(r"^<=", val):
        return f"-inf-{val[2:]}"
    if re.match(r"^<", val):
        return f"-inf-{float(val[1:].strip()) - 0.1}"
    
    return val

# Load, clean, and save
df = pd.read_csv("data/severity_fulldata.csv")      
for col in df.columns:
    if col not in ["Disease", "Gender", "Source(s)"]:
        df[col] = df[col].apply(clean_value)

df.to_csv("data/severity_fulldata_clean.csv", index=False)
print("✅ Cleaned and saved to severity_fulldata_clean.csv")
