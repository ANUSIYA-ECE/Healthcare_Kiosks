# Healthcare_Kiosks
Product Category Creation for Healthcare Kiosks in India 

This project outlines the development of a multifunctional AI-enabled Healthcare Kiosk System designed specifically for rural and semi-urban communities in India. The system offers a comprehensive platform that enables secure user authentication, real-time health monitoring, AI-based symptom analysis, doctor appointment booking, and access to previous medical records, all within a compact kiosk unit.

To begin, users can log in using two modes: facial recognition or Aadhaar-based OTP verification. The facial recognition system uses Haar Cascade for face detection and the LBPH algorithm for user identification. The Aadhaar module sends a one-time password to the registered email using SMTP for identity confirmation.

Once authenticated, users are taken to a dynamic dashboard offering four main services. The **Vitals Monitoring** module, developed using Node.js, captures and evaluates health parameters such as blood pressure, heart rate, oxygen saturation, temperature, and BMI. It uses a rule-based logic that adjusts classification based on the user’s age and gender. The data is securely stored in CSV format.

The **AI Symptom Checker**, built in Python using Flask, analyzes user symptoms in combination with measured vitals to determine illness severity. It processes datasets like `dataset.csv`, `user_vitals.csv`, and `symptom_severity.csv` through a weighted decision-making model. Based on this analysis, it generates a detailed health report that includes probable conditions, symptom descriptions, preventive tips, and medication advice, which is saved as a downloadable PDF.

In the **Consultation Booking** module, users can select medical departments and available time slots to fix appointments with doctors. Scheduling is handled through reference files such as `offline_schedule.csv`, which contains time-based availability data. The **Past Reports** section allows users to view and download previously generated medical summaries, enabling follow-up and health tracking.

A key feature of the system is its **language toggle functionality**, which allows users to operate the kiosk in their preferred language. It supports five languages—English, Tamil, Hindi, Malayalam, and Kannada—ensuring accessibility across diverse linguistic groups in India.

The backend infrastructure uses structured file formats like CSV and JSON to enable smooth communication between the Python and Node.js environments. Designed to function effectively on low-resource devices, the kiosk maintains offline compatibility, data security, biometric accuracy, and ease of use, making it a sustainable healthcare solution for regions with limited medical infrastructure.

PROJECT VIDEO DRIVE LINK:
https://drive.google.com/drive/folders/1xTJpeC6nxCIEKHGVZD5bWPZv85n7K1D_?usp=drive_link


