import pandas as pd
import pickle
from sklearn.preprocessing import MultiLabelBinarizer
from sklearn.ensemble import RandomForestClassifier

# Load training dataset
df = pd.read_csv("data/dataset.csv")
df.fillna("", inplace=True)

# Extract all symptom columns
symptom_cols = [c for c in df.columns if c.lower().startswith("symptom")]

# Combine symptom columns into a list for each row
df["Symptoms"] = df[symptom_cols].values.tolist()

# Clean and format each symptom
df["Symptoms"] = df["Symptoms"].apply(
    lambda sym_list: [s.strip().lower().replace(" ", "_") for s in sym_list if s.strip()]
)

# Clean disease labels
df["Disease"] = df["Disease"].str.strip()

# Inputs (X) and Labels (y)
X = df["Symptoms"]
y = df["Disease"].astype("category")
y_cat = y.cat  # for label decoding later

# Encode symptom lists into a binary matrix
mlb = MultiLabelBinarizer()
X_encoded = mlb.fit_transform(X)

# Train model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_encoded, y.cat.codes)

# Save model and encoders
with open("model.pkl", "wb") as f:
    pickle.dump((model, mlb, y_cat), f)

print("✅ Disease prediction model trained and saved to model.pkl")
