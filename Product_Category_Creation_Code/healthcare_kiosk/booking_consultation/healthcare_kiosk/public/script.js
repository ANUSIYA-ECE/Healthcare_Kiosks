document.addEventListener('DOMContentLoaded', () => {
  const steps = {
    step1: document.getElementById('step1'),
    step2: document.getElementById('step2'),
    offlineSchedule: document.getElementById('offlineSchedule'),
    doctorList: document.getElementById('doctorList'),
    payment: document.getElementById('payment'),
    videoCall: document.getElementById('videoCall'),
  };
  let history = [], current = null;
  function show(id, back = false) {
    if (!back && current) history.push(current);
    current = id;
    Object.values(steps).forEach(s => s.classList.remove('show'));
    steps[id].classList.add('show');
  }

  document.querySelectorAll('.back-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      show(history.pop() || 'step1', true);
    });
  });

  const yesBtn = document.getElementById('yesBtn');
  const noBtn = document.getElementById('noBtn');
  const onlineBtn = document.getElementById('onlineBtn');
  const offlineBtn = document.getElementById('offlineBtn');
  const offlineSub = document.getElementById('offlineSubmit');
  const cardsDiv = document.getElementById('doctorCards');
  const selectBtn = document.getElementById('doctorSelectBtn');
  const paymentText = document.getElementById('paymentText');
  const qrContainer = document.getElementById('qrContainer');
  const txnInput = document.getElementById('txnInput');
  const confirmBtn = document.getElementById('confirmTxnBtn');
  const paymentDoneBtn = document.getElementById('paymentDoneBtn');
  const overlay = document.getElementById('paymentOverlay');
  const overlayText = document.getElementById('overlayText');
  const notif = document.getElementById('notifMsg');
  const jitsiContainer = document.getElementById('jitsiContainer');
  const endCallBtn = document.getElementById('endCallBtn');

  let mode, selectedDoctor, meetingURL, jitsiApi, lastOfflineDate, lastOfflineTime;

  function renderDoctors(list) {
    cardsDiv.innerHTML = '';
    selectedDoctor = null;
    if (!list.length) {
      cardsDiv.textContent = 'No doctors available.';
      return;
    }
    list.forEach(d => {
      const card = document.createElement('div');
      card.className = 'doctor-card';
      card.innerHTML = `
        <img src="${d.photo}" alt="${d.name}">
        <div class="doctor-info">
          <div class="doctor-name">${d.name}</div>
          <div class="doctor-dept">${d.department}</div>
          <div class="doctor-hospital">${d.hospital}</div>
        </div>`;
      card.addEventListener('click', () => {
        document.querySelectorAll('.doctor-card')
          .forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedDoctor = d;
      });
      cardsDiv.appendChild(card);
    });
  }

  yesBtn.addEventListener('click', () => show('step2'));
  noBtn.addEventListener('click', () => window.location.href = '/home.html');

  onlineBtn.addEventListener('click', () => {
    mode = 'online';
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const hh = now.getHours().toString().padStart(2, '0');
    const mm = now.getMinutes().toString().padStart(2, '0');
    fetch(`/api/doctors?time=${hh}:${mm}`)
      .then(r => r.json())
      .then(list => { show('doctorList'); renderDoctors(list); });
  });

  offlineBtn.addEventListener('click', () => {
    mode = 'offline';
    show('offlineSchedule');
  });

  offlineSub.addEventListener('click', () => {
    const date = document.getElementById('offlineDate').value;
    const timeInput = document.getElementById('offlineTime');
    let time = timeInput.value;

    lastOfflineDate = date;

    if (/^\d{2}:\d{2}$/.test(time)) {
      let [h, m] = time.split(":");
      h = parseInt(h, 10);
      const ampm = h >= 12 ? "PM" : "AM";
      let hr12 = h % 12;
      if (hr12 === 0) hr12 = 12;
      time = `${hr12.toString().padStart(2, '0')}:${m} ${ampm}`;
    }

    lastOfflineTime = time;

    fetch(`/api/doctors/offline?date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`)
      .then(r => r.json())
      .then(list => { show('doctorList'); renderDoctors(list); });
  });

  selectBtn.addEventListener('click', () => {
    if (!selectedDoctor) return alert('Select a doctor');
    const disp = 300;
    paymentText.textContent = mode === 'offline'
      ? `Pay ₹${disp} for offline appointment`
      : `Scan to pay ₹${disp} via UPI`;
    const room = `Kiosk_${selectedDoctor.name.replace(/\s+/g, '_')}_${Date.now()}`;
    meetingURL = `https://meet.jit.si/${room}`;
    qrContainer.innerHTML = '';
    txnInput.value = '';
    overlay.style.display = 'none';
    show('payment');
    new QRCode(qrContainer, { text: `upi://pay?pa=6381801116@superyes&am=300&cu=INR`, width: 200, height: 200 });
    // Show/hide confirm/done payment buttons
    if (mode === 'online') {
      confirmBtn.style.display = '';
      paymentDoneBtn.style.display = 'none';
    } else {
      confirmBtn.style.display = 'none';
      paymentDoneBtn.style.display = '';
    }
  });

  // --- ONLINE MODE: Show overlay, send email, open video call
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (mode !== 'online') return; // Safety: Only for online
      const tx = txnInput.value.trim();
      if (!tx) return alert('Enter transaction ID');
      overlayText.textContent = 'Payment Confirmed';
      overlay.style.display = 'flex';
      setTimeout(() => {
        overlayText.textContent = 'Notifying Doctor...';
        fetch('/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: selectedDoctor.email, url: meetingURL })
        })
          .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
          .then(() => {
            overlayText.textContent = 'Connecting to video call...';
            setTimeout(() => {
              overlay.style.display = 'none';
              startVideoCall();
            }, 1000);
          })
          .catch(err => {
            overlayText.textContent = 'Error notifying';
            setTimeout(() => {
              overlay.style.display = 'none';
            }, 1500);
          });
      }, 1000);
    });
  }

  // --- OFFLINE MODE: Just show success notification as before
  if (paymentDoneBtn) {
    paymentDoneBtn.addEventListener('click', () => {
      if (mode !== 'offline') return; // Only for offline
      let date = lastOfflineDate;
      let time = lastOfflineTime;
      if (!date || !time) {
        date = document.getElementById('offlineDate').value;
        let rawTime = document.getElementById('offlineTime').value;
        if (/^\d{2}:\d{2}$/.test(rawTime)) {
          let [h, m] = rawTime.split(":");
          h = parseInt(h, 10);
          const ampm = h >= 12 ? "PM" : "AM";
          let hr12 = h % 12;
          if (hr12 === 0) hr12 = 12;
          time = `${hr12.toString().padStart(2, '0')}:${m} ${ampm}`;
        } else {
          time = rawTime;
        }
      }
      // Format date
      let dt = new Date(date);
      let opts = { month: 'long', day: 'numeric', year: 'numeric' };
      let dateString = dt.toLocaleDateString('en-US', opts);
      function getDaySuffix(n) {
        if (n >= 11 && n <= 13) return 'th';
        let last = n % 10;
        if (last === 1) return 'st';
        if (last === 2) return 'nd';
        if (last === 3) return 'rd';
        return 'th';
      }
      let d = dt.getDate();
      let dateWithSuffix = dateString.replace(String(d), d + getDaySuffix(d));
      let timeString = (time || '').toLowerCase().replace(/^0/, '');

      // Blur and show notification
      document.body.classList.add('blur-bg');
      notif.innerText = `Appointment booked successfully on ${dateWithSuffix} at ${timeString}`;
      notif.style.display = "block";
      notif.style.opacity = "1";

      setTimeout(() => {
        notif.style.opacity = "0";
        setTimeout(() => {
          notif.style.display = "none";
          document.body.classList.remove('blur-bg');
          show('step1', true);
        }, 400);
      }, 4600);
    });
  }

  function startVideoCall() {
    show('videoCall');
    jitsiContainer.innerHTML = '';
    jitsiApi = new JitsiMeetExternalAPI('meet.jit.si', {
      roomName: meetingURL.split('/').pop(),
      parentNode: jitsiContainer,
      configOverwrite: { prejoinPageEnabled: false },
      interfaceConfigOverwrite: {
        SHOW_BRAND_WATERMARK: false,
        SHOW_POWERED_BY: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'chat']
      }
    });
  }

  endCallBtn.addEventListener('click', () => {
    if (confirm('Do you really want to end the call?')) {
      jitsiApi.executeCommand('hangup');
      jitsiApi.dispose();
      show('step1', true);
    }
  });

  show('step1', true);
});
