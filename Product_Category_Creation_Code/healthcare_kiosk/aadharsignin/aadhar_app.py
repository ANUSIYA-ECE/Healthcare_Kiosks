import requests
import os
import csv
import random
import smtplib
from flask import Flask, render_template, request, jsonify, redirect, url_for
from email.mime.text import MIMEText

app = Flask(__name__)

# OTP store
otp_store = {}

# Load Aadhaar user data from CSV
def load_user_data():
    users = {}
    with open('aadhar_data.csv', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            users[row['AadhaarNumber']] = row
    return users

# Send OTP to email
def send_email_otp(receiver_email, otp):
    sender_email = "anusiyasrinivasan5@gmail.com"
    sender_password = "btgs hfgj shxd mgpk"

    message = MIMEText(f"Your OTP for Aadhaar login is: {otp}")
    message['Subject'] = "Your Aadhaar OTP"
    message['From'] = sender_email
    message['To'] = receiver_email

    try:
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(message)
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

@app.route('/')
def index():
    return render_template("index.html")

@app.route('/send_otp', methods=['POST'])
def send_otp():
    aadhaar = request.form.get('aadhaar', '').strip()
    users = load_user_data()

    if aadhaar not in users:
        return jsonify({"success": False, "message": "Aadhaar not found."})

    email = users[aadhaar]['Email']
    otp = str(random.randint(100000, 999999))
    otp_store[aadhaar] = otp

    print(f"Generated OTP for {aadhaar}: {otp}")  # For testing

    if send_email_otp(email, otp):
        return jsonify({"success": True, "message": "✅ OTP sent to your registered email."})
    else:
        return jsonify({"success": False, "message": "❌ Failed to send OTP. Try again."})

@app.route('/verify_otp', methods=['POST'])
def verify_otp():
    aadhaar = request.form.get('aadhaar', '').strip()
    user_otp = request.form.get('otp', '').strip()

    if aadhaar in otp_store and otp_store[aadhaar] == user_otp:
        del otp_store[aadhaar]

        # ✅ Load Aadhaar user info from CSV
        users = load_user_data()
        user = users.get(aadhaar, {})

        # ✅ Copy image to symptom_checker/static/user_photos/
        import shutil
        image_path = user.get("Image", "")
        image_name = os.path.basename(image_path)

        target_path = os.path.abspath(os.path.join(
            os.path.dirname(__file__), '..', 'symptom_checker', 'static', 'user_photos'
        ))
        os.makedirs(target_path, exist_ok=True)
        final_image_path = os.path.join(target_path, image_name)

        try:
            shutil.copyfile(image_path, final_image_path)
        except Exception as e:
            print(f"⚠️ Image copy failed: {e}")

        # ✅ Save to user_info.json for PDF generator
        user_info = {
            "name": user.get("Name", "Unknown"),
            "image": os.path.join("static", "user_photos", image_name).replace("\\", "/")
        }

        user_info_json = os.path.abspath(os.path.join(
            os.path.dirname(__file__), '..', 'symptom_checker', 'data', 'user_info.json'
        ))
        os.makedirs(os.path.dirname(user_info_json), exist_ok=True)

        with open(user_info_json, "w") as f:
            import json
            json.dump(user_info, f)

        # ✅ Dashboard still loads from CSV as before
        return redirect(url_for('dashboard', aadhaar=aadhaar))
    else:
        return "❌ Invalid OTP. Please try again.", 400


@app.route('/dashboard')
def dashboard():
    aadhaar = request.args.get('aadhaar')
    users = load_user_data()
    user = users.get(aadhaar)
    if not user:
        return "User not found.", 404

    return render_template("dashboard.html",
                           name=user['Name'],
                           email=user['Email'],
                           aadhaar=aadhaar,
                           method="Aadhaar + OTP",
                           image=user['Image'])
@app.route('/api/translate', methods=['POST'])
def api_translate():
    data = request.get_json()
    texts = data.get('q', [])
    source = data.get('source', 'en')
    target = data.get('target', 'ta')
    out = []

    for text in texts:
        try:
            # MyMemory Free API
            url = "https://api.mymemory.translated.net/get"
            params = {'q': text, 'langpair': f"{source}|{target}"}
            r = requests.get(url, params=params, timeout=5)
            j = r.json()
            translated = j['responseData']['translatedText']
        except Exception as e:
            print("Translation error:", e)
            translated = text  # Fallback to original

        out.append({"translatedText": translated})
    return jsonify(out)

if __name__ == '__main__':
    app.run(debug=True,port=5000)
