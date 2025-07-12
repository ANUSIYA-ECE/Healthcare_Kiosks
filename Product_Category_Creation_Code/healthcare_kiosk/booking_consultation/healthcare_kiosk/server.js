require('dotenv').config();
const express    = require('express');
const nodemailer = require('nodemailer');
const XLSX       = require('xlsx');
const path       = require('path');

const app = express();
app.use(express.json());

// ── SMTP transport ──
const transporter = nodemailer.createTransport({
  host:    process.env.EMAIL_HOST,
  port:    +process.env.EMAIL_PORT,
  secure:  process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
transporter.verify()
  .then(() => console.log('✅ SMTP ready'))
  .catch(err => console.error('❌ SMTP error', err));

// ── Email invite endpoint ──
app.post('/send-email', (req, res) => {
  const { to, url } = req.body;
  if (!to || !url) {
    return res.status(400).json({ error: 'Missing "to" or "url"' });
  }
  transporter.sendMail({
    from:    process.env.EMAIL_USER,
    to,
    subject: 'Your Video Consultation Link',
    text:    `Please join your video consultation:\n\n${url}`
  })
  .then(() => res.json({ success: true }))
  .catch(err => {
    console.error('❌ email error:', err);
    res.status(500).json({ error: err.message });
  });
});

// ── Serve static files ──
app.use(express.static(path.join(__dirname, 'public')));

// ── Online doctors API (NO CHANGE) ──
app.get('/api/doctors', (req, res) => {
  const uploadsDir = path.join(__dirname, 'uploads');
  const inputWb  = XLSX.readFile(path.join(uploadsDir, 'input.csv'));
  const inputRaw = XLSX.utils.sheet_to_json(
    inputWb.Sheets[inputWb.SheetNames[0]],
    { header: 1 }
  );
  const deptKey = (inputRaw[0] && inputRaw[0][0] || '').toLowerCase().trim();
  if (!deptKey) {
    return res.status(400).json({ error: 'No department keyword in input.csv' });
  }

  const listWb  = XLSX.readFile(path.join(uploadsDir, 'doctor_list.csv'), { raw: false });
  const doctors = XLSX.utils.sheet_to_json(
    listWb.Sheets[listWb.SheetNames[0]],
    { defval: '' }
  );

  const filtered = doctors.filter(row =>
    row['Department'] &&
    row['Department'].toString().toLowerCase().includes(deptKey)
  );

  const output = filtered.map(d => ({
    name:       d['Doctor Name']    || 'Unknown',
    department: d['Department']     || '',
    hospital:   d['Hospital']       || '',
    email:      d['Mail ID']        || '',
    phone:      d['Phone Number']   || '',
    photo:      `/images/${d['Image File'] || 'default.jpg'}`,
    from:       d['Available From'] || '',
    to:         d['Available To']   || ''
  }));

  res.json(output);
});

// ── Utility: Parse 12-hour time string (e.g., "02:15 PM") into minutes since midnight ──
function parse12HrTime(str) {
  if (!str) return null;
  str = str.trim().toLowerCase();
  // Accept with/without space before am/pm
  const match = str.match(/^(\d{1,2}):(\d{2})\s*([ap])\.?m\.?$/);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  let min = parseInt(match[2], 10);
  let ampm = match[3];
  if (ampm === 'p' && hour !== 12) hour += 12;
  if (ampm === 'a' && hour === 12) hour = 0;
  return hour * 60 + min;
}

// ── OFFLINE doctors API (12-hour format matching) ──
app.get('/api/doctors/offline', (req, res) => {
  const { time } = req.query;
  const uploadsDir = path.join(__dirname, 'uploads');
  const inputWb = XLSX.readFile(path.join(uploadsDir, 'input.csv'));
  const inputRaw = XLSX.utils.sheet_to_json(inputWb.Sheets[inputWb.SheetNames[0]], { header: 1 });
  const deptKey = (inputRaw[0] && inputRaw[0][0] || '').toLowerCase().trim();

  if (!time) return res.status(400).json({ error: 'Missing time parameter' });
  if (!deptKey) return res.status(400).json({ error: 'No department in input.csv' });

  // offline_schedule.csv
  const listWb = XLSX.readFile(path.join(uploadsDir, 'offline_schedule.csv'));
  const doctors = XLSX.utils.sheet_to_json(listWb.Sheets[listWb.SheetNames[0]], { defval: '' });

  const userMins = parse12HrTime(time);
  if (userMins === null) return res.json([]); // can't parse time

  const matches = doctors.filter(d => {
    const dept = (d['Department'] || '').toLowerCase();
    const availFrom = parse12HrTime((d['Available From'] || '').toLowerCase());
    const availTo   = parse12HrTime((d['Available To'] || '').toLowerCase());
    if (availFrom === null || availTo === null) return false;

    const deptMatch = dept.includes(deptKey);
    // inclusive for availFrom, exclusive for availTo (like 09:00 AM–04:00 PM means up to 4PM slot)
    const timeMatch = (userMins >= availFrom) && (userMins < availTo);
    return deptMatch && timeMatch;
  }).map(d => ({
    name: d['Doctor Name'] || 'Unknown',
    department: d['Department'] || '',
    hospital: d['Hospital'] || '',
    email: d['Mail ID'] || '',
    phone: d['Phone Number'] || '',
    photo: `/images/${d['Image File'] || 'default.jpg'}`
  }));

  res.json(matches);
});

// ── Fallback to serve index.html ──
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
