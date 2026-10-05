# CareMatrix — Smart Hospital Navigation, Clinical Workflow & Medication Alarm System

A unified hospital operating system featuring Dijkstra shortest-path indoor wayfinding, permanent patient ID registration, doctor consultation cabins, post-consultation scan referrals & radiology reports, prescription issuance with medicine photos, and real-time audible medication alarm reminders with multi-language support.

---

## 🚀 Live GitHub Pages Deployment (Zero Configuration)

This repository is built with a **100% flat, folder-free architecture** specifically optimized for **GitHub Pages**:

1. Create a new repository on GitHub (e.g. `carematrix`).
2. Push all the files from this directory to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Initial release of CareMatrix"
   git branch -M main
   git remote add origin https://github.com/<your-username>/carematrix.git
   git push -u origin main
   ```
3. In your GitHub repository:
   - Go to **Settings** → **Pages**
   - Under **Build and deployment** > **Source**, choose **Deploy from a branch**
   - Select branch **`main`** and folder **`/ (root)`**, then click **Save**
4. Your website is instantly live at:
   `https://<your-username>.github.io/carematrix/`

---

## 💻 Local Execution

You can run CareMatrix locally in two simple ways:

### Option A: Double-Click (No Installation Required)
Simply double-click `index.html` in your browser. All navigation, medication alarms, prescriptions, and local persistence run automatically using HTML5 `localStorage` and Web Audio API.

### Option B: Local Python Web Server
```bash
pip install -r requirements.txt
python app.py
```
Open your browser at `http://127.0.0.1:5000`.

---

## 🌟 Key Features

1. **Dijkstra Shortest-Path Wayfinding:**
   - Pre-calibrated starting point at Reception Desk (`REC-01`, Ground Floor).
   - Selecting any available doctor automatically computes the shortest path directly to their cabin.
   - Turn-by-turn walking steps, distance meter, estimated walk time, and walk simulation.
2. **Permanent Patient ID (One-Time ID for Lifetime Visits):**
   - Register mobile phone number once. The same permanent CareMatrix ID (`CM-XXXXXX`) and visit history are returned on every visit.
3. **Doctor Consultation & Status Management:**
   - Doctors can toggle availability (`Available` vs `In Consultation`) and update room numbers.
4. **Radiology Referrals & Scan Reports:**
   - Physicians order MRI / CT scans.
   - Radiologists submit scan findings & impressions, which auto-forward to the referring physician's inbox.
5. **Medical Prescriptions with Photo Attachment:**
   - Doctors issue prescriptions with medicine photo upload, dosage, tablets/capsules count, custom medication time slots, before/after food instructions, and start/end dates.
6. **Medication Alarm & Reminder System:**
   - Real-time monitor checking every 5 seconds against current device time.
   - Audible medical alert chime generated via HTML5 Web Audio API (no external MP3 dependencies).
   - Interactive Alarm Modal with **Mark Taken** (logs dose with pleasant confirmation chime), **Snooze (5m)**, and **Dismiss**.
   - **Test Alarm Now** button for 1-click verification.
7. **Regional Language Translations:**
   - English instructions translated into 7 regional Indian languages:
     - தமிழ் (Tamil), हिंदी (Hindi), తెలుగు (Telugu), ಕನ್ನಡ (Kannada), മലയാളം (Malayalam), বাংলা (Bengali), मराठी (Marathi).

---

## 📁 Repository File Structure (Flat / No Folders)

All files reside directly at the root level for GitHub Pages compatibility:

```
carematrix/
├── .nojekyll              # Bypasses Jekyll on GitHub Pages for clean asset delivery
├── README.md              # Documentation and GitHub deployment guide
├── app.js                 # Unified application engine, state management & audio synthesizer
├── app.py                 # Lightweight Python web server for local testing
├── index.html             # Main single-page application UI
├── medinav.css            # MediNav wayfinding stylesheet
├── medinav.html           # Embedded MediNav navigation map iframe
├── medinav.js             # Verbatim MediNav Dijkstra pathfinding & SVG map dataset
├── requirements.txt       # Minimal Python server dependencies (Flask)
└── run.bat                # Windows 1-click local launcher
```
