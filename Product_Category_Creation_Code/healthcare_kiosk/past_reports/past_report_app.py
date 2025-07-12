import requests
from flask import request, jsonify
from flask import Flask, render_template
import os

app = Flask(__name__)

@app.route("/past_reports")
def past_reports():
    reports_dir = "static/reports"
    files = []

    if os.path.exists(reports_dir):
        files = sorted([
            f for f in os.listdir(reports_dir)
            if f.lower().endswith(".pdf")
        ], reverse=True)

    return render_template("past_reports.html", files=files)
@app.route('/api/translate', methods=['POST'])
def api_translate():
    data = request.get_json()
    texts = data.get('q', [])
    source = data.get('source', 'en')
    target = data.get('target', 'ta')
    out = []

    for text in texts:
        try:
            url = "https://api.mymemory.translated.net/get"
            params = {'q': text, 'langpair': f"{source}|{target}"}
            r = requests.get(url, params=params, timeout=5)
            j = r.json()
            translated = j['responseData']['translatedText']
        except Exception as e:
            print("Translation error:", e)
            translated = text
        out.append({"translatedText": translated})
    return jsonify(out)
if __name__ == "__main__":
    app.run(debug=True, port=5005)
