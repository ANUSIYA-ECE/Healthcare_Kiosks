import requests
from flask import jsonify
import os
import cv2
import csv
import numpy as np
from flask import Flask, render_template, request

app = Flask(__name__)

DATASET_DIR = 'static/dataset'
CSV_FILE = os.path.join(DATASET_DIR, 'users.csv')
HAAR_MODEL = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
face_cascade = cv2.CascadeClassifier(HAAR_MODEL)

# Ensure dataset directory exists
os.makedirs(DATASET_DIR, exist_ok=True)

def detect_and_crop_face(image_path):
    img = cv2.imread(image_path)
    if img is None:
        print(f"❌ Couldn't read image: {image_path}")
        return None
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    if len(faces) == 0:
        print("❌ No face detected.")
        return None
    x, y, w, h = faces[0]
    face = gray[y:y+h, x:x+w]
    face_resized = cv2.resize(face, (200, 200))
    return face_resized

def username_exists(name):
    if not os.path.exists(CSV_FILE):
        return False
    with open(CSV_FILE, newline='') as f:
        reader = csv.reader(f)
        for row in reader:
            if row[0].lower() == name.lower():
                return True
    return False

def face_already_registered(new_face):
    if not os.path.exists(CSV_FILE):
        return False, None

    faces = []
    labels = []
    label_map = {}
    label_id = 0

    with open(CSV_FILE, newline='') as f:
        reader = csv.reader(f)
        for row in reader:
            name, path = row
            img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
            if img is not None and img.shape == (200, 200):
                faces.append(img)
                labels.append(label_id)
                label_map[label_id] = name
                label_id += 1
            else:
                print(f"⚠️ Skipping invalid or corrupted image: {path}")

    if len(faces) == 0:
        print("❌ No valid faces found in dataset.")
        return False, None

    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.train(faces, np.array(labels))

    predicted_label, confidence = recognizer.predict(new_face)
    print(f"[Face Match Check] Predicted: {predicted_label}, Confidence: {confidence}")

    if confidence < 60:
        return True, label_map[predicted_label]  # Face already exists
    return False, None

@app.route('/')
def home():
    return render_template("register.html")

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        name = request.form.get('name')
        image_file = request.files.get('image')

        if not name or not image_file:
            return render_template("register.html", message="❌ Name or image missing.")

        if username_exists(name):
            return render_template("register.html", message="❌ Username already exists. Try a different name.")

        filename = name.replace(" ", "_") + ".jpg"
        save_path = os.path.join(DATASET_DIR, filename).replace("\\", "/")
        image_file.save(save_path)

        face = detect_and_crop_face(save_path)
        if face is None:
            os.remove(save_path)
            return render_template("register.html", message="❌ No face detected. Try again.")

        # Check for face duplication
        face_exists, existing_user = face_already_registered(face)
        if face_exists:
            os.remove(save_path)
            return render_template("register.html", message=f"❌ This face is already registered under the name '{existing_user}'.")

        cv2.imwrite(save_path, face)

        with open(CSV_FILE, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([name, save_path])

        return render_template("login.html", message="✅ Registered successfully. Now login.")

    return render_template("register.html")

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template("login.html")

    name = request.form.get('name')
    image_file = request.files.get('image')

    if not name or not image_file:
        return render_template("login.html", message="❌ Please provide both name and image.")

    if not os.path.exists(CSV_FILE):
        return render_template("login.html", message="❌ No registered users found.")

    user_found = False
    user_image_path = None

    with open(CSV_FILE, newline='') as f:
        reader = csv.reader(f)
        for row in reader:
            registered_name, img_path = row
            if registered_name.lower() == name.lower():
                user_found = True
                user_image_path = img_path
                break

    if not user_found:
        return render_template("login.html", message="❌ Username does not exist.")

    login_path = os.path.join(DATASET_DIR, "login.jpg").replace("\\", "/")
    image_file.save(login_path)

    login_face = detect_and_crop_face(login_path)
    if login_face is None:
        return render_template("login.html", message="❌ No face detected during login.")

    recognizer = cv2.face.LBPHFaceRecognizer_create()
    train_img = cv2.imread(user_image_path, cv2.IMREAD_GRAYSCALE)

    if train_img is None:
        return render_template("login.html", message="⚠️ Could not load the registered face image.")

    recognizer.train([train_img], np.array([0]))
    label, confidence = recognizer.predict(login_face)

    print(f"[Login Check] Label: {label}, Confidence: {confidence}")
    if confidence < 60:
        return render_template("dashboard.html", name=name, method='Face', image=user_image_path)
    else:
        return render_template("login.html", message="❌ Face does not match. Please try again.")
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
if __name__ == '__main__':
    app.run(debug=True, port=5003)
