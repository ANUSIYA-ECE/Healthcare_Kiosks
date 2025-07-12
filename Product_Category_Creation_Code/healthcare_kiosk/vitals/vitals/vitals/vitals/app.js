// app.js

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const fetch   = require('node-fetch');  // keep for translation proxy

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── CSV OUTPUT PATH ─────────────────────────────────
const PATIENT_CSV = 'D:\\ANUSIYA S\\AICTE\\.vscode\\Intel_1\\healthcare_kiosk\\symptom_checker\\data\\user_vitals.csv';


// ─── EXPRESS SETUP ───────────────────────────────────
app.set('view engine','ejs');
app.set('views', path.join(__dirname,'views'));
app.use(express.static(path.join(__dirname,'public')));
app.use(express.urlencoded({ extended:true }));
app.use(express.json());

// ─── TRANSLATION PROXY (MyMemory) ────────────────────
app.post('/api/translate', async (req, res) => {
  try {
    const { q, source, target } = req.body;
    const results = await Promise.all(q.map(async text => {
      const url = 'https://api.mymemory.translated.net/get'
                + '?q=' + encodeURIComponent(text)
                + `&langpair=${source}|${target}`;
      const r = await fetch(url);
      const j = await r.json();
      return { translatedText: j.responseData.translatedText };
    }));
    res.json(results);
  } catch(err) {
    console.error('Translate error:', err);
    res.status(500).json({ error: 'translation_failed' });
  }
});

// ─── CLINICAL THRESHOLD RULES ────────────────────────

// Blood pressure classification by age group:
function classifyBP(age, bp) {
  const [systolic, diastolic] = bp.split('/').map(Number);

  if (age < 13) {
    if (systolic < 110 && diastolic < 70)    return 'normal';
    if (systolic < 120 && diastolic < 80)    return 'elevated';
    if (systolic < 130 && diastolic < 85)    return 'elevated';
    return 'critical';
  }
  if (age < 18) {
    if (systolic < 120 && diastolic < 80)    return 'normal';
    if (systolic < 130 && diastolic < 85)    return 'elevated';
    if (systolic < 140 && diastolic < 90)    return 'elevated';
    return 'critical';
  }
  if (age < 60) {
    if (systolic < 120 && diastolic < 80)    return 'normal';
    if (systolic < 130 && diastolic < 80)    return 'elevated';
    if (systolic < 140 && diastolic < 90)    return 'elevated';
    if (systolic < 180 && diastolic < 120)   return 'critical';
    return 'critical';
  }
  if (systolic < 130 && diastolic < 85)      return 'normal';
  if (systolic < 140 && diastolic < 90)      return 'elevated';
  if (systolic < 160 && diastolic < 100)     return 'elevated';
  return 'critical';
}

// Pulse rate (beats per minute) by age group:
function classifyPulse(age, pulse) {
  pulse = Number(pulse);
  if (age <= 1) {
    if (pulse < 100)    return 'elevated';
    if (pulse <= 160)   return 'normal';
    return 'critical';
  }
  if (age <= 5) {
    if (pulse < 80)     return 'elevated';
    if (pulse <= 120)   return 'normal';
    return 'critical';
  }
  if (age <= 12) {
    if (pulse < 70)     return 'elevated';
    if (pulse <= 110)   return 'normal';
    return 'critical';
  }
  if (pulse < 60)       return 'elevated';
  if (pulse <= 100)     return 'normal';
  if (pulse <= 120)     return 'elevated';
  return 'critical';
}

// Body temperature (°F) classification:
function classifyTemp(temp) {
  temp = Number(temp);
  if (temp < 95)        return 'critical';
  if (temp < 97.8)      return 'elevated';
  if (temp <= 99.1)     return 'normal';
  if (temp <= 100.4)    return 'elevated';
  return 'critical';
}

// Oxygen saturation (%) classification:
function classifyOxygen(spo2) {
  spo2 = Number(spo2);
  if (spo2 >= 95)       return 'normal';
  if (spo2 >= 90)       return 'elevated';
  return 'critical';
}

// BMI classification:
function classifyBMI(bmi) {
  bmi = Number(bmi);
  if (bmi < 18.5)       return 'elevated';
  if (bmi < 25)         return 'normal';
  if (bmi < 30)         return 'elevated';
  return 'critical';
}

// ─── ROUTES ──────────────────────────────────────────
app.get('/',     (req, res) => res.render('vitals_start'));
app.get('/form', (req, res) => res.render('vitals_form'));

app.post('/predict', (req, res) => {
  const {
    age, gender,
    bloodPressure, pulseRate,
    temperature, height, weight,
    oxygen
  } = req.body;

  // Compute BMI
  const h   = Number(height) / 100;
  const bmi = +((Number(weight) / (h*h)).toFixed(1));

  // Classify each vital
  const bpLab    = classifyBP(+age, bloodPressure);
  const pulseLab = classifyPulse(+age, pulseRate);
  const tempLab  = classifyTemp(temperature);
  const oxyLab   = classifyOxygen(oxygen);
  const bmiLab   = classifyBMI(bmi);

  // ─── WRITE USER VITALS TO user_vitals.csv ───────────
  const header = 'Age,Gender,BP,BMI,Pulse,Oxygen,Temp\n';
  const line   = [
    age,
    gender,
    `${bloodPressure}`,
    bmi,
    pulseRate,
    oxygen,
    temperature
  ].join(',') + '\n';

  fs.writeFileSync(PATIENT_CSV, header + line, 'utf8');

  // Render result page
  res.render('vitals_result', {
    results: [
      { name:'Blood Pressure',    label:bpLab    },
      { name:'Pulse Rate',        label:pulseLab },
      { name:'Body Temperature',  label:tempLab  },
      { name:'Oxygen Saturation', label:oxyLab   },
      { name:'BMI',               label:bmiLab   }
    ]
  });
});

// ─── START SERVER ───────────────────────────────────
app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
