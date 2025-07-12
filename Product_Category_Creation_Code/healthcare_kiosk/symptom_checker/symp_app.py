from flask import Flask, request, jsonify, render_template
import pandas as pd, pickle, os, json
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from semantic_matcher import semantic_match
from reportlab.lib.units import inch

app = Flask(__name__)

# ── Load model + data ─────────────────────────────────────────────────────
with open("model.pkl", "rb") as f:
    model, mlb, y_cat = pickle.load(f)

severity_df   = pd.read_csv("data/severity_fulldata.csv")
precaution_df = pd.read_csv("data/symptom_precaution.csv")
desc_df       = pd.read_csv("data/symptom_Description.csv")
train_df      = pd.read_csv("data/dataset.csv")

symptom_cols  = [c for c in train_df.columns if c.lower().startswith("symptom")]
symptom_vocab = pd.Series(train_df[symptom_cols].values.ravel()) \
                    .dropna().str.strip().str.lower().unique().tolist()

# ── Utility Functions ─────────────────────────────────────────────────────

def _norm(val: str) -> str:
    val = str(val).strip()
    return val.replace("–", "-").replace("—", "-").replace("−", "-") \
              .replace("°F", "").replace("bpm", "").replace("%", "")

def extract_num_range(raw: str):
    raw = _norm(raw)
    if raw.startswith(">="): return float(raw[2:].strip()), float("inf")
    if raw.startswith(">"):  return float(raw[1:].strip())+1e-6, float("inf")
    if raw.startswith("<="): return float("-inf"), float(raw[2:].strip())
    if raw.startswith("<"):  return float("-inf"), float(raw[1:].strip())-1e-6
    if "-" in raw:
        lo, hi = raw.split("-")
        return float(lo.strip()), float(hi.strip())
    return None, None

def parse_bp(bp_str):
    try:
        bp_str = _norm(bp_str)
        return tuple(map(float, bp_str.split("/")))
    except:
        return None

def bp_range_to_tuple(r):
    r = _norm(r)
    if r.startswith(">"):
        a, b = map(float, r[1:].split("/"))
        return (a + 1e-6, b + 1e-6), (float("inf"), float("inf"))
    if r.startswith("<"):
        a, b = map(float, r[1:].split("/"))
        return (float("-inf"), float("-inf")), (a - 1e-6, b - 1e-6)
    if "-" in r and "/" in r:
        sys, dia = r.split("/")
        s_lo, s_hi = map(float, sys.split("-"))
        d_lo, d_hi = map(float, dia.split("-"))
        return (s_lo, d_lo), (s_hi, d_hi)
    return None

def bp_in_range(bp_val, bp_range):
    tpl = bp_range_to_tuple(bp_range)
    if not tpl or not bp_val: return False
    (lo_s, lo_d), (hi_s, hi_d) = tpl
    s, d = bp_val
    return lo_s <= s <= hi_s and lo_d <= d <= hi_d

def value_in_range(val, range_str, is_bp=False):
    if is_bp: return bp_in_range(val, range_str)
    low, high = extract_num_range(range_str)
    if low is None: return False
    return low <= float(val) <= high

def level_of(row, measure, value):
    if measure == "BP":
        for lvl in ["Normal", "Moderate", "High"]:
            col = f"BP - {lvl}"
            if col in row and pd.notna(row[col]) and value_in_range(value, row[col], is_bp=True):
                return lvl
        return "Unknown"

    mapping = {
        "Age": ["Low Risk", "Moderate Risk", "High Risk"],
        "O%": ["Low", "Moderate", "Normal"],
        "default": ["Normal", "Moderate", "High"]
    }

    for lvl in mapping.get(measure, mapping["default"]):
        col = f"{measure} - {lvl}"
        if col in row and pd.notna(row[col]) and value_in_range(value, row[col]):
            return lvl.split()[0]
    return "Unknown"

def overall_severity(levels):
    hi = sum(l == "High" for l in levels.values())
    md = sum(l == "Moderate" for l in levels.values())
    return "High" if hi >= 3 else ("Moderate" if md >= 3 else "Normal")

def categorize_vitals(disease, vitals):
    match = severity_df[severity_df["Disease"].str.lower() == disease.lower()]
    if match.empty: return {}, "Unknown"
    row = match.iloc[0]
    bp = parse_bp(vitals.get("BP", ""))
    levels = {
        "Age":    level_of(row, "Age", vitals["Age"]),
        "BMI":    level_of(row, "BMI", vitals["BMI"]),
        "Pulse":  level_of(row, "Pulse", vitals["Pulse"]),
        "Oxygen": level_of(row, "O%", vitals["Oxygen"]),
        "Temp":   level_of(row, "Temp", vitals["Temp"]),
        "BP":     level_of(row, "BP", bp) if bp else "Unknown"
    }
    ug = str(vitals.get("Gender", "")).lower()
    dg = str(row.get("Gender", "")).lower()
    levels["Gender"] = "High" if ug == dg and dg else "Low"
    return levels, overall_severity(levels)

def get_department(disease):
    r = precaution_df[precaution_df["Disease"].str.lower() == disease.lower()]
    return r["Department"].values[0] if not r.empty else "General Physician"

def get_description(disease):
    r = desc_df[desc_df["Disease"].str.lower() == disease.lower()]
    return r["Description"].values[0] if not r.empty else "No description available."

def get_precautions(disease):
    r = precaution_df[precaution_df["Disease"].str.lower() == disease.lower()]
    if not r.empty:
        return [r[f"Precaution_{i}"].values[0] for i in range(1, 5)
                if f"Precaution_{i}" in r and pd.notna(r[f"Precaution_{i}"].values[0])]
    return []

def get_latest_vitals():
    try:
        return pd.read_csv("data/user_vitals.csv").iloc[-1].to_dict()
    except:
        return {}

def get_user_info():
    try:
        path = os.path.join(os.path.dirname(__file__), "data", "user_info.json")
        return json.load(open(path))
    except:
        return {}

from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, Spacer, Image
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
import os
from datetime import datetime

def generate_pdf_report(path, disease, desc, sev, dept, vitals, levels, precs, name, image):
    doc = SimpleDocTemplate(path, pagesize=letter)
    st = getSampleStyleSheet()
    el = []

    # -- Ensure absolute path to image --
    abs_image = os.path.abspath(image) if image else ""
    img_obj = None

    if os.path.exists(abs_image) and abs_image.lower().endswith(('.jpg', '.jpeg', '.png', '.gif')):
        try:
            img_obj = Image(abs_image, width=1.5*inch, height=1.5*inch)
        except Exception as e:
            print(f"❌ Failed to load image: {e}")
            img_obj = None

    # Name and Image at top
    name_para = Paragraph(f"<b>Name:</b> {name}<br/><b>Date:</b> {datetime.now():%Y-%m-%d %H:%M}", st["Normal"])
    if img_obj:
        top_table = Table([[name_para, img_obj]], colWidths=[4.5*inch, 2*inch])
        top_table.setStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (1, 0), (1, 0), "RIGHT")
        ])
        el.append(top_table)
    else:
        el.append(name_para)

    el.append(Spacer(1, 12))

    # Disease info
    el.extend([
        Paragraph(f"<b>Disease:</b> {disease}", st["Title"]),
        Spacer(1, 6),
        Paragraph(desc, st["Normal"]),
        Spacer(1, 6),
        Paragraph(f"<b>Severity:</b> {sev}", st["Normal"]),
        Paragraph(f"<b>Department:</b> {dept}", st["Normal"]),
        Spacer(1, 12)
    ])

    # Vitals Table
    table_data = [["Vital", "Value", "Level"]]
    for k in ["Age", "BMI", "Pulse", "Oxygen", "Temp", "BP", "Gender"]:
        table_data.append([k, vitals.get(k, "?"), levels.get(k, "?")])
    
    vit_table = Table(table_data)
    vit_table.setStyle([
        ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("ALIGN", (1, 1), (-1, -1), "CENTER")
    ])
    el.append(vit_table)
    el.append(Spacer(1, 12))

    # Precautions
    el.append(Paragraph("<b>Precautions:</b>", st["Heading3"]))
    if precs:
        for p in precs:
            el.append(Paragraph(f"• {p}", st["Normal"]))
    else:
        el.append(Paragraph("None listed.", st["Normal"]))

    doc.build(el)


# ── Flask Routes ───────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/symptom_list")
def symptom_list():
    return jsonify(symptom_vocab)

from flask import send_from_directory
from flask import send_from_directory

@app.route("/symptom_checker_reports")
def list_all_reports():
    report_dir = os.path.join("static", "reports")
    if not os.path.exists(report_dir):
        return render_template("report_list.html", reports=[])

    # Just list all PDF files
    reports = sorted([f for f in os.listdir(report_dir) if f.endswith(".pdf")], reverse=True)
    return render_template("report_list.html", reports=reports)


# Optional placeholders for future implementation
@app.route("/general_vital_reports")
def general_vital_reports():
    return "<h2>General Vital Reports (Coming soon)</h2>"

@app.route("/appointments")
def appointments():
    return "<h2>Booked Appointments (Coming soon)</h2>"


@app.route('/static/reports/<filename>')
def download_report(filename):
    report_dir = os.path.join(app.root_path, 'static', 'reports')
    return send_from_directory(report_dir, filename)


@app.route("/predict", methods=["POST"])
def predict():
    raw = request.form["symptoms"]
    sym = [s.strip().lower() for s in raw.split(",") if s.strip()]
    if len(sym) < 2:
        return jsonify({"reply": "⚠️ Please enter at least 2 symptoms."})

    matched = semantic_match(sym, symptom_vocab)
    if not matched:
        return jsonify({"reply": "❌ No valid symptoms found."})

    vec = mlb.transform([matched])
    disease = y_cat.categories[model.predict(vec)[0]]

    vitals = get_latest_vitals()
    user = get_user_info()
    levels, sev = categorize_vitals(disease, vitals)
    dept = get_department(disease)
    desc = get_description(disease)
    precs = get_precautions(disease)

    name = user.get("name", "Unknown")
    image = user.get("image", None)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    os.makedirs("static/reports", exist_ok=True)
    pdf_path = f"static/reports/{name}_{ts}.pdf"
    generate_pdf_report(pdf_path, disease, desc, sev, dept, vitals, levels, precs, name, image)

    vit_table = "\n".join(f"{k}: {vitals.get(k,'?')} → {levels.get(k,'?')}"
                          for k in ["Age", "BMI", "Pulse", "Oxygen", "Temp", "BP", "Gender"])
    prec_txt = "\n".join(f"• {p}" for p in precs) if precs else "No specific precautions listed."

    reply = (
        f"🧬 Disease: {disease}\n\n"
        f"📄 Description: {desc}\n\n"
        f"🩺 Severity: {sev}\n\n"
        f"👨‍⚕️ Department: {dept}\n\n"
        f"📊 Vital Summary:\n{vit_table}\n\n"
        f"⚕️ Precautions:\n{prec_txt}\n\n"
        f"📄 <a href='/{pdf_path}' target='_blank'>Download PDF Report</a>"
    )
    return jsonify({"reply": reply})

if __name__ == "__main__":
    app.run(debug=True, port=5001)
