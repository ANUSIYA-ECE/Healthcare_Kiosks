// Send OTP
document.getElementById("aadhaar-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const aadhaar = document.getElementById("aadhaar").value;

    fetch("/send_otp", {
        method: "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `aadhaar=${aadhaar}`
    })
    .then(res => res.json())
    .then(data => {
        document.getElementById("message").textContent = data.message;
        if (data.success) {
            document.getElementById("otp-box").style.display = "block";
        }
    });
});

// Verify OTP
document.getElementById("otp-form").addEventListener("submit", function(e) {
    e.preventDefault();
    const aadhaar = document.getElementById("aadhaar").value;
    const otp = document.getElementById("otp").value;

    fetch("/verify_otp", {
        method: "POST",
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `aadhaar=${aadhaar}&otp=${otp}`
    })
    .then(response => {
        if (response.redirected) {
            // Redirect to Symptom Checker
            window.location.href = response.url;
        } else {
            response.text().then(text => {
                document.getElementById("message").textContent = text;
            });
        }
    });
});
