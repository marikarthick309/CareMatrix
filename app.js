/**
 * CareMatrix — Unified Application Script (Flat GitHub-Ready Architecture)
 * Handles:
 *  - Doctor Availability & Consultation Cabins
 *  - Dijkstra Shortest-Path Hospital Navigation (MediNav iframe)
 *  - Permanent Patient ID Registration & QR Check-in
 *  - Post-Consultation Scan Referrals & Radiology Reports
 *  - Medical Prescriptions with Attached Photos
 *  - Real-Time Medication Alarm System (Web Audio API Chime & Modal)
 *  - Multi-Language Instructions (English + 7 Regional Languages)
 *  - Standalone localStorage Persistence for GitHub Pages
 */

class CareMatrixApp {
  constructor() {
    this.activeTab = "home";
    this.activeDoctorId = "doc_101";
    this.isDoctorLoggedIn = false;
    this.currentLang = "en";

    // Patient state
    this.patientId = localStorage.getItem("cm_current_patient_id") || "CM-575A03";
    this.patientName = localStorage.getItem("cm_current_patient_name") || "Alex Morgan";
    this.patientLocation = "G-RECEPTION";

    // Alarm state
    this.audioCtx = null;
    this.alarmAudioInterval = null;
    this.soundEnabled = true;
    this.alarmMonitorTimer = null;
    this.activeAlarmData = null;
    this.takenDoses = new Set(JSON.parse(localStorage.getItem("cm_taken_doses") || "[]"));
    this.snoozedAlarms = [];

    // Filters
    this.selectedSpecialty = "all";
    this.searchQuery = "";
    this.availableOnly = false;
    this.translCache = {};

    // Load or seed initial hospital state
    this.loadState();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA STORE & LOCALSTORAGE PERSISTENCE (GitHub Pages Standalone Ready)
  // ═══════════════════════════════════════════════════════════════════════════

  loadState() {
    const saved = localStorage.getItem("carematrix_state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.doctors = parsed.doctors || this.getInitialDoctors();
        this.scanRooms = parsed.scanRooms || this.getInitialScanRooms();
        this.patientRegistry = parsed.patientRegistry || {};
        this.patients = parsed.patients || {};
        this.recommendations = parsed.recommendations || [];
        this.scanReports = parsed.scanReports || [];
        this.prescriptions = parsed.prescriptions || [];
        return;
      } catch (e) {
        console.warn("Could not parse saved state, using defaults:", e);
      }
    }

    // Default initial seed data
    this.doctors = this.getInitialDoctors();
    this.scanRooms = this.getInitialScanRooms();
    this.patientRegistry = { "9876543210": "CM-575A03" };
    this.patients = {
      "CM-575A03": {
        id: "CM-575A03",
        name: "Alex Morgan",
        phone: "9876543210",
        gender: "Male",
        blood_group: "O+",
        current_node: "G-RECEPTION",
        visit_count: 2,
        last_visit: "Today, 10:30 AM"
      }
    };
    this.recommendations = [
      {
        id: "REC-101",
        patient_id: "CM-575A03",
        doctor_id: "doc_101",
        doctor_name: "Dr. Sarah Jenkins",
        scan_type: "MRI",
        study_name: "Brain MRI with Diffusion",
        clinical_notes: "Evaluate persistent headaches and dizziness.",
        urgency: "Routine",
        created_at: "Today, 11:15 AM",
        status: "Pending Scan"
      }
    ];
    this.scanReports = [
      {
        id: "RPT-21AB052F",
        patient_id: "CM-575A03",
        patient_name: "Alex Morgan",
        doctor_id: "doc_101",
        doctor_name: "Dr. Sarah Jenkins",
        scan_type: "MRI",
        study_name: "Brain MRI with Diffusion",
        findings: "T2 hyperintensity seen in left temporal lobe. No acute hemorrhage or midline shift.",
        impression: "Consistent with acute left MCA territory ischemia. Urgent clinical correlation advised.",
        technician: "Robert Bell (RT)",
        scan_room: "RAD-01 (MRI Bay)",
        status: "Reviewed",
        created_at: "Today, 11:45 AM"
      }
    ];
    this.prescriptions = [
      {
        id: "RX-BA962E7F",
        patient_id: "CM-575A03",
        patient_name: "Alex Morgan",
        doctor_name: "Dr. Sarah Jenkins",
        medicine_name: "Dolo 650",
        dosage: "650mg",
        num_tablets: "1 tablet",
        frequency: "Twice daily",
        food_relation: "After dinner / After food",
        med_times: ["09:00", "21:00"],
        start_date: new Date().toISOString().slice(0, 10),
        end_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        instructions: "Take with a full glass of water. Rest after taking.",
        prescribed_at: "Today, 12:00 PM",
        status: "Active"
      }
    ];

    this.saveState();
  }

  saveState() {
    try {
      const state = {
        doctors: this.doctors,
        scanRooms: this.scanRooms,
        patientRegistry: this.patientRegistry,
        patients: this.patients,
        recommendations: this.recommendations,
        scanReports: this.scanReports,
        prescriptions: this.prescriptions
      };
      localStorage.setItem("carematrix_state", JSON.stringify(state));
      localStorage.setItem("cm_taken_doses", JSON.stringify(Array.from(this.takenDoses)));
    } catch (e) {
      console.warn("Storage save error:", e);
    }
  }

  getInitialDoctors() {
    return {
      doc_101: {
        id: "doc_101",
        name: "Dr. Sarah Jenkins",
        specialty: "Cardiology & Cath Lab",
        qualification: "MD, FACC - Senior Cardiologist",
        status: "Available",
        room: "Cardiology Suite (Level 1)",
        node_id: "F1-CARDIOLOGY",
        dest_id: "dest-cardiology",
        floor: 1,
        avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
        phone: "Ext. 101",
        experience: "15 Years"
      },
      doc_102: {
        id: "doc_102",
        name: "Dr. Rajesh Kumar",
        specialty: "Orthopedic Clinic",
        qualification: "MS (Ortho), Joint Replacement",
        status: "Available",
        room: "Room 104 (Ground Floor)",
        node_id: "G-104",
        dest_id: "dest-104",
        floor: 0,
        avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80",
        phone: "Ext. 102",
        experience: "12 Years"
      },
      doc_103: {
        id: "doc_103",
        name: "Dr. Elena Rostova",
        specialty: "Neurology Suite",
        qualification: "MD, DM (Neurology)",
        status: "Available",
        room: "Room 205 (Level 1)",
        node_id: "F1-205",
        dest_id: "dest-205",
        floor: 1,
        avatar: "https://images.unsplash.com/photo-1594824813626-d62198be9312?w=150&auto=format&fit=crop&q=80",
        phone: "Ext. 103",
        experience: "18 Years"
      },
      doc_104: {
        id: "doc_104",
        name: "Dr. Marcus Vance",
        specialty: "Medical Oncology",
        qualification: "MD (Oncology), ESMO Certified",
        status: "In Consultation",
        room: "Room 206 (Level 1)",
        node_id: "F1-206",
        dest_id: "dest-206",
        floor: 1,
        avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80",
        phone: "Ext. 104",
        experience: "10 Years"
      },
      doc_201: {
        id: "doc_201",
        name: "Dr. Aisha Patel",
        specialty: "Pediatrics Outpatient",
        qualification: "MD (Pediatrics), DCH",
        status: "Available",
        room: "Room 102 (Ground Floor)",
        node_id: "G-102",
        dest_id: "dest-102",
        floor: 0,
        avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80",
        phone: "Ext. 201",
        experience: "9 Years"
      },
      doc_202: {
        id: "doc_202",
        name: "Dr. David Kim",
        specialty: "General Medicine OPD",
        qualification: "MD, Internal Medicine",
        status: "Available",
        room: "Room 101 (Ground Floor)",
        node_id: "G-101",
        dest_id: "dest-101",
        floor: 0,
        avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&auto=format&fit=crop&q=80",
        phone: "Ext. 202",
        experience: "16 Years"
      }
    };
  }

  getInitialScanRooms() {
    return {
      mri_1: {
        id: "mri_1",
        name: "Radiology & Imaging - MRI Suite",
        node_id: "G-RADIOLOGY",
        dest_id: "dest-radiology",
        room: "RAD-01 (MRI Bay)",
        type: "MRI",
        floor: 0,
        status: "Available",
        queue_count: 2,
        estimated_wait_mins: 14,
        technician: "Robert Bell (RT)",
        current_procedure: "Brain & Neuro Imaging Protocol"
      },
      ct_1: {
        id: "ct_1",
        name: "Radiology & Imaging - CT Scan Lab",
        node_id: "G-RADIOLOGY",
        dest_id: "dest-radiology",
        room: "RAD-01 (CT Bay)",
        type: "CT",
        floor: 0,
        status: "Available",
        queue_count: 1,
        estimated_wait_mins: 8,
        technician: "Carlos Mendoza (RT)",
        current_procedure: "Coronary & Cardiac Angiography"
      }
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION & TAB SWITCHING
  // ═══════════════════════════════════════════════════════════════════════════

  init() {
    this.renderDoctors();
    this.renderScanRooms();
    this.renderDoctorPortal();
    this.renderDoctorDropdowns();
    this.loadPatientData();
    this.generateReceptionQrCodes();
    this.setDefaultPrescriptionDates();
    this.initAlarmMonitor();

    // Check URL parameters (e.g. ?tab=patient or ?action=checkin)
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    if (tabParam && ["home", "patient", "myhealth", "prescribe", "doctor", "map", "reception"].includes(tabParam)) {
      this.switchTab(tabParam);
    } else {
      this.switchTab("home");
    }

    if (window.lucide) lucide.createIcons();
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    const tabs = ["home", "patient", "myhealth", "prescribe", "doctor", "map", "reception"];

    tabs.forEach(t => {
      const view = document.getElementById(`view-${t}`);
      const btn = document.getElementById(`tab-${t}-btn`);
      if (view) view.classList.toggle("hidden", t !== tabId);
      if (btn) {
        if (t === tabId) {
          btn.className = "tab-active px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition shrink-0";
        } else {
          btn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700/50 transition flex items-center space-x-1.5 shrink-0";
        }
      }
    });

    if (tabId === "myhealth") {
      this.loadPatientData();
    } else if (tabId === "doctor") {
      this.loadDoctorReports();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.lucide) lucide.createIcons();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDINAV DIJKSTRA WAYFINDING INTEGRATION (Core Requirement)
  // ═══════════════════════════════════════════════════════════════════════════

  getMediNav() {
    const iframe = document.getElementById("medinav-iframe");
    if (!iframe || !iframe.contentWindow || !iframe.contentWindow.mediNav) return null;
    return iframe.contentWindow.mediNav;
  }

  /**
   * "When a patient selects an available doctor, automatically pass the starting location
   * as Reception and the destination as the doctor's cabin."
   */
  startDoctorNavigationFromReception(doctorNodeId, doctorName, doctorRoom, doctorDestId) {
    this.patientLocation = "G-RECEPTION";
    this.switchTab("patient");

    const targetDestId = doctorDestId || this.nodeToDestId(doctorNodeId);
    this.routeInMediNav("G-RECEPTION", targetDestId, `${doctorName} (${doctorRoom})`);

    // Smooth scroll to navigation panel / map
    const navPanel = document.getElementById("active-navigation-panel");
    if (navPanel) {
      setTimeout(() => navPanel.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    }
  }

  startScanNavigation(scanNodeId, scanName, scanRoom, scanDestId) {
    const startNodeId = this.patientLocation || "G-RECEPTION";
    this.switchTab("patient");

    const targetDestId = scanDestId || "dest-radiology";
    this.routeInMediNav(startNodeId, targetDestId, `${scanName} (${scanRoom})`);

    const navPanel = document.getElementById("active-navigation-panel");
    if (navPanel) {
      setTimeout(() => navPanel.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    }
  }

  nodeToDestId(nodeId) {
    if (nodeId === "G-RADIOLOGY") return "dest-radiology";
    if (nodeId === "G-RECEPTION") return "dest-reception";
    const match = nodeId.match(/[GF]\d*-(\d+)$/);
    if (match) return `dest-${match[1]}`;
    return "dest-reception";
  }

  routeInMediNav(startNodeId, targetDestId, label) {
    const mNav = this.getMediNav();
    if (!mNav) {
      this.showToast("Navigation map loading… Please wait a moment.", "info");
      setTimeout(() => this.routeInMediNav(startNodeId, targetDestId, label), 600);
      return;
    }

    // 1. Set start location to Reception (or current position)
    mNav.startId = startNodeId;
    if (mNav.startSelect) {
      mNav.startSelect.value = startNodeId;
    }

    // Update start marker
    const startNode = mNav.dataset.nodes[startNodeId];
    if (startNode && mNav.renderer) {
      mNav.renderer.startNode = startNode;
      if (mNav.renderer._refreshMarkers) mNav.renderer._refreshMarkers();
    }

    // 2. Find destination in dataset
    let dest = mNav.dataset.destinations.find(d => d.id === targetDestId);
    if (!dest) {
      dest = mNav.dataset.destinations.find(d => d.nodeId === targetDestId);
    }

    if (!dest) {
      this.showToast(`Destination "${label}" not found on map. Please select manually.`, "error");
      return;
    }

    // 3. Trigger route calculation & map rendering inside MediNav
    mNav._selectDest(dest);

    // 4. Update guidance panel
    setTimeout(() => {
      const navPanel = document.getElementById("active-navigation-panel");
      if (navPanel) navPanel.classList.remove("hidden");

      const targetTitle = document.getElementById("nav-target-name");
      if (targetTitle) targetTitle.textContent = `Navigating from Reception to: ${label}`;

      const dist = mNav.statDist ? mNav.statDist.textContent : "—";
      const time = mNav.statTime ? mNav.statTime.textContent : "—";

      const distLabel = document.getElementById("nav-stat-dist");
      if (distLabel) distLabel.textContent = dist;

      const timeLabel = document.getElementById("nav-stat-time");
      if (timeLabel) timeLabel.textContent = time;

      const floorLabel = document.getElementById("nav-stat-floor");
      if (floorLabel) {
        floorLabel.textContent = dest.floor === 0 ? "Ground Floor (GF)" : "First Floor (1F)";
      }

      // Clone turn-by-turn steps
      const stepsContainer = document.getElementById("nav-instructions-list");
      if (stepsContainer && mNav.routeSteps) {
        stepsContainer.innerHTML = "";
        const steps = mNav.routeSteps.querySelectorAll(".route-step");
        let idx = 0;
        steps.forEach(step => {
          const text = step.querySelector(".step-text");
          const stepText = text ? text.textContent : step.textContent;
          const div = document.createElement("div");
          div.className = "p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs flex items-start space-x-2";
          div.innerHTML = `
            <div class="w-4 h-4 rounded-full bg-sky-500 text-white font-bold flex items-center justify-center shrink-0 text-[10px] mt-0.5">${idx + 1}</div>
            <div class="flex-1 text-slate-200 font-medium">${stepText}</div>
          `;
          stepsContainer.appendChild(div);
          idx++;
        });
      }

      const startFloor = startNode ? startNode.floor : 0;
      mNav._switchFloor(startFloor);
      this.setMediNavFloorButtons(startFloor);
    }, 150);

    this.activeRoute = { destId: targetDestId, label, dest };
    this.showToast(`Shortest path to ${label} calculated via Dijkstra engine!`, "info");
  }

  setMediNavFloor(floorNum) {
    const mNav = this.getMediNav();
    if (mNav) mNav._switchFloor(floorNum);
    this.setMediNavFloorButtons(floorNum);
  }

  setMediNavFloorButtons(floorNum) {
    const btnGf = document.getElementById("btn-medinav-gf");
    const btn1f = document.getElementById("btn-medinav-1f");
    if (btnGf && btn1f) {
      if (floorNum === 0) {
        btnGf.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-sm transition";
        btn1f.className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition";
      } else {
        btn1f.className = "px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white shadow-sm transition";
        btnGf.className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 transition";
      }
    }
  }

  toggleWalkSimulation() {
    const mNav = this.getMediNav();
    if (!mNav || !mNav.route) {
      this.showToast("Calculate a route first before simulating.", "info");
      return;
    }
    mNav.btnSimulate.click();
    const btnText = document.getElementById("nav-sim-text");
    if (btnText) {
      const isActive = mNav.btnSimulate.classList.contains("active");
      btnText.textContent = isActive ? "Pause Walk" : "Simulate Walk";
    }
  }

  confirmArrival() {
    if (!this.activeRoute) return;
    const dest = this.activeRoute.dest;
    if (dest && dest.nodeId) {
      this.patientLocation = dest.nodeId;
      const locLabel = document.getElementById("current-loc-label");
      if (locLabel) locLabel.textContent = `Loc: ${dest.name} (${dest.floor === 0 ? "GF" : "1F"})`;
    }
    this.showToast(`Arrived at destination: ${this.activeRoute.label}!`, "success");
    this.cancelNavigation();
  }

  cancelNavigation() {
    this.activeRoute = null;
    const mNav = this.getMediNav();
    if (mNav) mNav._clearDest();
    const navPanel = document.getElementById("active-navigation-panel");
    if (navPanel) navPanel.classList.add("hidden");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMANENT PATIENT ID (One-Time ID for Lifetime Visits)
  // ═══════════════════════════════════════════════════════════════════════════

  registerPatient() {
    const name = (document.getElementById("ph-name")?.value || "").trim();
    const phone = (document.getElementById("ph-phone")?.value || "").trim();
    const dob = document.getElementById("ph-dob")?.value || "";
    const gender = document.getElementById("ph-gender")?.value || "";

    if (!phone) {
      this.showToast("Please enter your mobile phone number.", "error");
      return;
    }

    const cleanPhone = phone.replace(/[\s-]/g, "");

    // Check if patient exists (permanent ID lookup)
    let pId = this.patientRegistry[cleanPhone];
    let isNew = false;

    if (pId && this.patients[pId]) {
      const p = this.patients[pId];
      p.visit_count = (p.visit_count || 1) + 1;
      p.last_visit = new Date().toLocaleDateString() + ", " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (name) p.name = name;
    } else {
      isNew = true;
      pId = "CM-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      this.patientRegistry[cleanPhone] = pId;
      this.patients[pId] = {
        id: pId,
        name: name || `Patient ${cleanPhone.slice(-4)}`,
        phone: cleanPhone,
        dob,
        gender,
        visit_count: 1,
        last_visit: "First Visit (Today)",
        registered_at: new Date().toLocaleDateString()
      };
    }

    const patient = this.patients[pId];
    this.patientId = patient.id;
    this.patientName = patient.name;
    localStorage.setItem("cm_current_patient_id", this.patientId);
    localStorage.setItem("cm_current_patient_name", this.patientName);

    this.saveState();
    this.loadPatientData();

    // Fill IDs into inputs
    const fPid = document.getElementById("f-patient-id");
    if (fPid) fPid.value = this.patientId;
    const fPname = document.getElementById("f-patient-name");
    if (fPname) fPname.value = this.patientName;
    const srPid = document.getElementById("sr-patient-id");
    if (srPid) srPid.value = this.patientId;

    this.showToast(isNew ? `Welcome! Your permanent CareMatrix ID is ${this.patientId}` : `Welcome back, ${patient.name}! ID: ${this.patientId} (Visit #${patient.visit_count})`, "success");
  }

  loadPatientData() {
    const patient = this.patients[this.patientId];
    if (patient) {
      const nameEl = document.getElementById("ph-patient-name");
      if (nameEl) nameEl.textContent = `Welcome, ${patient.name}!`;

      const metaEl = document.getElementById("ph-patient-meta");
      if (metaEl) metaEl.textContent = `Permanent ID: ${patient.id} • Visit #${patient.visit_count || 1} • Last Visit: ${patient.last_visit}`;

      const badge = document.getElementById("ph-patient-id-badge");
      if (badge) badge.classList.remove("hidden");

      const idEl = document.getElementById("ph-patient-id");
      if (idEl) idEl.textContent = patient.id;

      const vcEl = document.getElementById("ph-visit-count");
      if (vcEl) vcEl.textContent = patient.visit_count || 1;

      const headerLabel = document.getElementById("current-patient-label");
      if (headerLabel) headerLabel.textContent = `${patient.name} (${patient.id})`;
    }

    this.renderPatientPrescriptions();
    this.renderPatientScanReports();
    this.renderTodayReminders();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDICATION ALARM & REMINDER SYSTEM (Web Audio API Synthesizer)
  // ═══════════════════════════════════════════════════════════════════════════

  initAlarmMonitor() {
    if (this.alarmMonitorTimer) clearInterval(this.alarmMonitorTimer);
    this.alarmMonitorTimer = setInterval(() => this.checkAlarms(), 5000);

    setInterval(() => this.updateClock(), 1000);
    this.updateClock();
  }

  updateClock() {
    const el = document.getElementById("current-clock-display");
    if (el) {
      const now = new Date();
      el.textContent = `Current Time: ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
    }
  }

  playTone(freq = 880, duration = 0.15, type = "sine", volume = 0.3) {
    if (!this.soundEnabled) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio error:", e);
    }
  }

  playDoubleBeep() {
    this.playTone(880, 0.18, "triangle", 0.4);
    setTimeout(() => this.playTone(1174, 0.25, "sine", 0.45), 200);
  }

  playSuccessChime() {
    this.playTone(587.33, 0.15, "sine", 0.3);
    setTimeout(() => this.playTone(880, 0.18, "sine", 0.35), 150);
    setTimeout(() => this.playTone(1174.66, 0.35, "sine", 0.4), 320);
  }

  startAlarmSound() {
    if (!this.soundEnabled) return;
    this.stopAlarmSound();
    this.playDoubleBeep();
    this.alarmAudioInterval = setInterval(() => this.playDoubleBeep(), 2500);
  }

  stopAlarmSound() {
    if (this.alarmAudioInterval) {
      clearInterval(this.alarmAudioInterval);
      this.alarmAudioInterval = null;
    }
  }

  toggleAlarmSound() {
    this.soundEnabled = !this.soundEnabled;
    if (!this.soundEnabled) this.stopAlarmSound();
    const icon = document.getElementById("sound-icon");
    const label = document.getElementById("sound-label");
    if (icon) icon.textContent = this.soundEnabled ? "🔊" : "🔇";
    if (label) label.textContent = this.soundEnabled ? "Sound ON" : "Sound OFF";
    this.showToast(`Alarm sound ${this.soundEnabled ? "enabled" : "muted"}.`, "info");
  }

  checkAlarms() {
    const list = this.prescriptions.filter(rx => rx.patient_id === this.patientId);
    if (!list.length) return;

    const now = new Date();
    const nowMs = now.getTime();
    const today = now.toISOString().slice(0, 10);
    const nowHour = String(now.getHours()).padStart(2, "0");
    const nowMinute = String(now.getMinutes()).padStart(2, "0");
    const currentTimeStr = `${nowHour}:${nowMinute}`;

    // 1. Check snoozed alarms
    for (let i = this.snoozedAlarms.length - 1; i >= 0; i--) {
      const s = this.snoozedAlarms[i];
      if (nowMs >= s.triggerAt) {
        this.snoozedAlarms.splice(i, 1);
        this.triggerAlarm(s.rx, s.timeStr, true);
        return;
      }
    }

    // 2. Check scheduled doses
    const activeList = list.filter(rx => {
      if (!rx.start_date || !rx.end_date) return true;
      return rx.start_date <= today && rx.end_date >= today;
    });

    for (const rx of activeList) {
      for (const t of (rx.med_times || [])) {
        const key = `${today}|${t}|${rx.id}`;
        if (t === currentTimeStr && !this.takenDoses.has(key)) {
          this.takenDoses.add(key);
          this.saveState();
          this.triggerAlarm(rx, t, false);
          return;
        }
      }
    }

    // Update countdown label
    this.updateNextDoseLabel(activeList, now);
  }

  updateNextDoseLabel(activeList, now) {
    const lbl = document.getElementById("alarm-next-dose");
    if (!lbl) return;

    const nowMin = now.getHours() * 60 + now.getMinutes();
    let nextDiff = Infinity;
    let nextMatch = null;

    activeList.forEach(rx => {
      (rx.med_times || []).forEach(t => {
        const [h, m] = t.split(":").map(Number);
        const doseMin = h * 60 + m;
        let diff = doseMin - nowMin;
        if (diff < 0) diff += 24 * 60;
        if (diff < nextDiff) {
          nextDiff = diff;
          nextMatch = { rx, time: t, diff };
        }
      });
    });

    if (nextMatch) {
      const hrs = Math.floor(nextMatch.diff / 60);
      const mins = nextMatch.diff % 60;
      const formatted = this.formatTime(nextMatch.time);
      const timeLeft = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
      lbl.textContent = `Next dose due in ${timeLeft} (${formatted}) — ${nextMatch.rx.medicine_name}`;
    } else {
      lbl.textContent = "All scheduled doses for today completed or none set.";
    }
  }

  async triggerAlarm(rx, timeStr, isSnoozed = false) {
    this.activeAlarmData = { rx, timeStr };

    const timeLbl = document.getElementById("alarm-time-label");
    if (timeLbl) timeLbl.textContent = `${isSnoozed ? "Snoozed Alarm" : "Scheduled Dose"} Due Now at ${this.formatTime(timeStr)}`;

    const nameEl = document.getElementById("alarm-med-name");
    if (nameEl) nameEl.textContent = rx.medicine_name;

    const metaEl = document.getElementById("alarm-med-meta");
    if (metaEl) metaEl.textContent = `${rx.num_tablets} • ${rx.dosage}`;

    const foodEl = document.getElementById("alarm-food-text");
    if (foodEl) foodEl.textContent = rx.food_relation;

    const instEn = document.getElementById("alarm-inst-en");
    if (instEn) instEn.textContent = this.buildInstruction(rx);

    const imgBox = document.getElementById("alarm-img-box");
    if (imgBox) {
      if (rx.image_url) {
        imgBox.innerHTML = `<img src="${rx.image_url}" class="w-full h-full object-cover" alt="${rx.medicine_name}" />`;
      } else {
        imgBox.innerHTML = "💊";
      }
    }

    // Regional translation
    const regionalBox = document.getElementById("alarm-regional-box");
    const regionalText = document.getElementById("alarm-inst-regional");
    const regionalTitle = document.getElementById("alarm-regional-title");
    if (this.currentLang !== "en" && regionalBox && regionalText) {
      regionalBox.classList.remove("hidden");
      const langNames = { ta: "தமிழ்", hi: "हिंदी", te: "తెలుగు", kn: "ಕನ್ನಡ", ml: "മലയാളം", bn: "বাংলা", mr: "मराठी" };
      if (regionalTitle) regionalTitle.textContent = `${langNames[this.currentLang] || "Regional"} Instruction`;
      regionalText.textContent = "Translating…";
      const trans = await this.translateText(this.buildInstruction(rx), this.currentLang);
      regionalText.textContent = trans;
    } else if (regionalBox) {
      regionalBox.classList.add("hidden");
    }

    this.startAlarmSound();
    const modal = document.getElementById("alarm-modal");
    if (modal) modal.classList.remove("hidden");
  }

  testAlarm() {
    const list = this.prescriptions.filter(rx => rx.patient_id === this.patientId);
    const rx = list.length > 0 ? list[0] : {
      id: "DEMO-RX",
      medicine_name: "Dolo 650",
      dosage: "650mg",
      num_tablets: "1 tablet",
      frequency: "Twice daily",
      food_relation: "After dinner / After food",
      instructions: "Take with water."
    };
    const now = new Date();
    const tStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    this.triggerAlarm(rx, tStr, false);
  }

  confirmMedicationTaken() {
    this.stopAlarmSound();
    this.playSuccessChime();

    const modal = document.getElementById("alarm-modal");
    if (modal) modal.classList.add("hidden");

    if (this.activeAlarmData) {
      const today = new Date().toISOString().slice(0, 10);
      const key = `${today}|${this.activeAlarmData.timeStr}|${this.activeAlarmData.rx.id}`;
      this.takenDoses.add(key);
      this.saveState();
      this.showToast(`✓ Recorded: ${this.activeAlarmData.rx.medicine_name} marked as taken!`, "success");
      this.renderTodayReminders();
    }
    this.activeAlarmData = null;
  }

  snoozeAlarm() {
    this.stopAlarmSound();
    const modal = document.getElementById("alarm-modal");
    if (modal) modal.classList.add("hidden");

    if (this.activeAlarmData) {
      const triggerAt = Date.now() + 5 * 60 * 1000;
      this.snoozedAlarms.push({ rx: this.activeAlarmData.rx, timeStr: this.activeAlarmData.timeStr, triggerAt });
      this.showToast("⏰ Alarm snoozed for 5 minutes.", "info");
    }
    this.activeAlarmData = null;
  }

  dismissAlarm() {
    this.stopAlarmSound();
    const modal = document.getElementById("alarm-modal");
    if (modal) modal.classList.add("hidden");
    this.activeAlarmData = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESCRIPTION RENDERING & REGIONAL TRANSLATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  renderTodayReminders() {
    const list = this.prescriptions.filter(rx => rx.patient_id === this.patientId);
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const active = list.filter(rx => {
      if (!rx.start_date || !rx.end_date) return true;
      return rx.start_date <= today && rx.end_date >= today;
    });

    const remEl = document.getElementById("reminder-list");
    if (!remEl) return;

    if (!active.length) {
      remEl.innerHTML = `<div class="text-xs text-amber-800/60 text-center py-2">No medication doses scheduled for today.</div>`;
      return;
    }

    const reminders = [];
    active.forEach(rx => {
      (rx.med_times || []).forEach(t => reminders.push({ time: t, rx }));
    });
    reminders.sort((a, b) => a.time.localeCompare(b.time));

    const nowMin = now.getHours() * 60 + now.getMinutes();

    remEl.innerHTML = reminders.map(({ time, rx }) => {
      const [h, m] = time.split(":").map(Number);
      const rMin = h * 60 + m;
      const key = `${today}|${time}|${rx.id}`;
      const isTaken = this.takenDoses.has(key);
      const isPast = !isTaken && rMin < nowMin;

      return `
        <div class="flex items-center gap-3 ${isTaken ? "bg-emerald-50 border-emerald-200" : isPast ? "opacity-75 bg-slate-50 border-slate-200" : "bg-white border-amber-200"} rounded-2xl px-4 py-2.5 border shadow-sm transition">
          <div class="text-lg shrink-0">${isTaken ? "✅" : isPast ? "⚠️" : "⏰"}</div>
          <div class="flex-1 min-w-0">
            <div class="font-extrabold text-sm text-slate-800 flex items-center gap-2">
              <span>${rx.medicine_name}</span>
              <span class="text-xs font-normal text-slate-500">${rx.dosage} (${rx.num_tablets})</span>
            </div>
            <div class="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
              <span>${rx.food_relation}</span>
              <span>•</span>
              <span class="font-bold ${isTaken ? "text-emerald-700" : "text-amber-800"}">${this.formatTime(time)}</span>
            </div>
          </div>
          <div class="text-right shrink-0">
            ${isTaken
              ? `<span class="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">Taken ✓</span>`
              : `<button type="button" onclick="app.triggerAlarm(app.prescriptions.find(r=>r.id==='${rx.id}'), '${time}', false)" class="text-xs font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1 rounded-xl transition">Ring Alarm 🔔</button>`
            }
          </div>
        </div>
      `;
    }).join("");
  }

  async renderPatientPrescriptions() {
    const list = this.prescriptions.filter(rx => rx.patient_id === this.patientId);
    const container = document.getElementById("ph-rx-list");
    if (!container) return;

    if (!list.length) {
      container.innerHTML = `<div class="text-xs text-slate-400 text-center py-6">No prescriptions found for ID ${this.patientId}.</div>`;
      return;
    }

    container.innerHTML = list.map((rx, idx) => `
      <div class="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-3">
        <div class="flex items-start gap-3">
          ${rx.image_url
            ? `<img src="${rx.image_url}" class="w-14 h-14 rounded-xl object-cover border border-emerald-200 shrink-0 shadow-sm" alt="${rx.medicine_name}" />`
            : `<div class="w-14 h-14 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl shrink-0 font-bold">💊</div>`
          }
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2">
              <div>
                <h4 class="font-extrabold text-slate-900 text-base leading-tight">${rx.medicine_name}</h4>
                <p class="text-xs text-emerald-700 font-bold mt-0.5">${rx.dosage} • ${rx.num_tablets} • ${rx.food_relation}</p>
              </div>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">${rx.status || "Active"}</span>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-1.5">
          ${(rx.med_times || []).map(t => `
            <span class="text-[11px] font-bold bg-white text-slate-700 px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">⏰ ${this.formatTime(t)}</span>
          `).join("")}
        </div>

        <div class="bg-white rounded-xl p-3 border border-emerald-100 text-xs text-slate-800 space-y-1">
          <div><strong>English:</strong> ${this.buildInstruction(rx)}</div>
          <div id="rx-transl-${idx}" class="text-amber-900 font-medium"></div>
        </div>

        <div class="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-emerald-100">
          <span>🩺 ${rx.doctor_name || "Doctor"}</span>
          <span>📅 ${rx.start_date || "—"} to ${rx.end_date || "—"}</span>
        </div>
      </div>
    `).join("");

    // Translate instructions
    if (this.currentLang !== "en") {
      list.forEach(async (rx, idx) => {
        const translEl = document.getElementById(`rx-transl-${idx}`);
        if (translEl) {
          translEl.textContent = "Translating…";
          const res = await this.translateText(this.buildInstruction(rx), this.currentLang);
          translEl.innerHTML = `<strong>Regional (${this.currentLang}):</strong> ${res}`;
        }
      });
    }
  }

  setLanguage(lang) {
    this.currentLang = lang;
    this.renderPatientPrescriptions();
  }

  buildInstruction(rx) {
    const qty = rx.num_tablets || "1 tablet";
    const freq = rx.frequency || "daily";
    const food = rx.food_relation || "after food";
    const times = (rx.med_times || []).map(t => this.formatTime(t)).join(" and ");
    return `Take ${qty} of ${rx.medicine_name} ${freq} ${food}${times ? " at " + times : ""}.`;
  }

  async translateText(text, targetLang) {
    if (!text || targetLang === "en") return text;
    const cacheKey = `${text}|${targetLang}`;
    if (this.translCache[cacheKey]) return this.translCache[cacheKey];

    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`;
      const res = await fetch(url);
      const data = await res.json();
      const translated = data?.responseData?.translatedText || text;
      this.translCache[cacheKey] = translated;
      return translated;
    } catch {
      return text;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRESCRIPTION CREATION (Doctor Section)
  // ═══════════════════════════════════════════════════════════════════════════

  previewMedicineImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      this.pendingMedicineImageData = ev.target.result;
      const preview = document.getElementById("img-preview");
      if (preview) {
        preview.src = ev.target.result;
        preview.classList.remove("hidden");
      }
      const clearBtn = document.getElementById("img-clear-btn");
      if (clearBtn) clearBtn.classList.remove("hidden");
    };
    reader.readAsDataURL(file);
  }

  clearMedicineImage() {
    this.pendingMedicineImageData = null;
    const input = document.getElementById("f-image");
    if (input) input.value = "";
    const preview = document.getElementById("img-preview");
    if (preview) preview.classList.add("hidden");
    const clearBtn = document.getElementById("img-clear-btn");
    if (clearBtn) clearBtn.classList.add("hidden");
  }

  addTimeSlot() {
    const container = document.getElementById("time-slots");
    if (!container) return;
    const div = document.createElement("div");
    div.className = "flex items-center gap-1 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5";
    div.innerHTML = `
      <input type="time" class="med-time text-sm font-semibold text-slate-800 bg-transparent outline-none" value="20:00" />
      <button type="button" onclick="app.removeTimeSlot(this)" class="text-rose-400 hover:text-rose-600 font-bold ml-1">✕</button>
    `;
    container.appendChild(div);
  }

  removeTimeSlot(btn) {
    const parent = btn.closest("div");
    if (document.querySelectorAll(".med-time").length > 1) {
      parent.remove();
    } else {
      this.showToast("At least one medication time is required.", "error");
    }
  }

  setDefaultPrescriptionDates() {
    const today = new Date().toISOString().slice(0, 10);
    const end = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const sEl = document.getElementById("f-start");
    const eEl = document.getElementById("f-end");
    if (sEl) sEl.value = today;
    if (eEl) eEl.value = end;

    const fPid = document.getElementById("f-patient-id");
    if (fPid) fPid.value = this.patientId;
    const fPname = document.getElementById("f-patient-name");
    if (fPname) fPname.value = this.patientName;
  }

  submitStandalonePrescription(e) {
    e.preventDefault();

    const patientId = document.getElementById("f-patient-id").value.trim();
    const patientName = document.getElementById("f-patient-name").value.trim();
    const doctorName = document.getElementById("f-doctor").value;
    const medicineName = document.getElementById("f-medicine").value.trim();
    const dosage = document.getElementById("f-dosage").value.trim();
    const numTablets = document.getElementById("f-num-tablets").value.trim();
    const frequency = document.getElementById("f-frequency").value;
    const food = document.getElementById("f-food").value;
    const start = document.getElementById("f-start").value;
    const end = document.getElementById("f-end").value;
    const instructions = document.getElementById("f-instructions").value.trim();

    const times = Array.from(document.querySelectorAll(".med-time")).map(i => i.value).filter(Boolean);

    const rxId = "RX-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const rx = {
      id: rxId,
      patient_id: patientId,
      patient_name: patientName,
      doctor_name: doctorName,
      medicine_name: medicineName,
      dosage,
      num_tablets: numTablets,
      frequency,
      food_relation: food,
      med_times: times,
      start_date: start,
      end_date: end,
      instructions,
      image_url: this.pendingMedicineImageData || null,
      prescribed_at: new Date().toLocaleDateString() + ", " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "Active"
    };

    this.prescriptions.unshift(rx);
    this.saveState();
    this.clearMedicineImage();
    e.target.reset();
    this.setDefaultPrescriptionDates();

    this.showToast(`Prescription for ${medicineName} issued! Alarms enabled for Patient ${patientId}.`, "success");
    this.switchTab("myhealth");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RADIOLOGY SCAN REPORTS & DOCTOR INBOX
  // ═══════════════════════════════════════════════════════════════════════════

  submitScanReport() {
    const patientId = document.getElementById("sr-patient-id")?.value.trim();
    const doctorId = document.getElementById("sr-doctor-id")?.value;
    const scanType = document.getElementById("sr-scan-type")?.value;
    const study = document.getElementById("sr-study")?.value.trim();
    const findings = document.getElementById("sr-findings")?.value.trim();
    const impression = document.getElementById("sr-impression")?.value.trim();

    if (!patientId || !study || !findings || !impression) {
      this.showToast("Please fill in all scan report fields.", "error");
      return;
    }

    const doc = this.doctors[doctorId] || { name: "Physician" };
    const p = this.patients[patientId] || { name: `Patient ${patientId}` };

    const rptId = "RPT-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const rpt = {
      id: rptId,
      patient_id: patientId,
      patient_name: p.name,
      doctor_id: doctorId,
      doctor_name: doc.name,
      scan_type: scanType,
      study_name: study,
      findings,
      impression,
      status: "Pending Review",
      created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    this.scanReports.unshift(rpt);
    this.saveState();

    document.getElementById("sr-study").value = "";
    document.getElementById("sr-findings").value = "";
    document.getElementById("sr-impression").value = "";

    this.showToast(`Scan report forwarded to ${doc.name}'s Inbox!`, "success");
    this.loadPatientData();
    this.loadDoctorReports();
  }

  renderPatientScanReports() {
    const list = this.scanReports.filter(r => r.patient_id === this.patientId);
    const container = document.getElementById("ph-reports-list");
    if (!container) return;

    if (!list.length) {
      container.innerHTML = `<div class="text-xs text-slate-400 text-center py-6">No scan reports found.</div>`;
      return;
    }

    container.innerHTML = list.map(r => `
      <div class="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/50 space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-extrabold text-slate-900 text-sm">${r.scan_type} — ${r.study_name}</div>
            <div class="text-[11px] text-slate-500">${r.created_at} • Ref: ${r.doctor_name}</div>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">${r.status}</span>
        </div>
        <div class="text-xs text-slate-700"><strong>Findings:</strong> ${r.findings}</div>
        <div class="text-xs text-slate-700"><strong>Impression:</strong> ${r.impression}</div>
      </div>
    `).join("");
  }

  loadDoctorReports() {
    const container = document.getElementById("doc-reports-list");
    if (!container) return;

    const list = this.scanReports.filter(r => r.doctor_id === this.activeDoctorId);
    if (!list.length) {
      container.innerHTML = `<div class="text-xs text-slate-400 text-center py-4">No scan reports in inbox.</div>`;
      return;
    }

    container.innerHTML = list.map(r => `
      <div class="p-4 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-2.5">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-extrabold text-slate-900 text-sm">${r.scan_type} — ${r.study_name}</div>
            <div class="text-xs text-slate-500">Patient: <strong>${r.patient_name}</strong> (${r.patient_id}) • ${r.created_at}</div>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${r.status === 'Pending Review' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">${r.status}</span>
        </div>
        <div class="text-xs text-slate-800"><strong>Findings:</strong> ${r.findings}</div>
        <div class="text-xs text-slate-800"><strong>Impression:</strong> ${r.impression}</div>
        <div class="pt-2 flex items-center space-x-2">
          <button onclick="app.prescribeForReport('${r.id}', '${r.patient_id}', '${r.patient_name}')" class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition">
            💊 Prescribe Medicines
          </button>
        </div>
      </div>
    `).join("");
  }

  prescribeForReport(reportId, patientId, patientName) {
    this.switchTab("prescribe");
    const fPid = document.getElementById("f-patient-id");
    if (fPid) fPid.value = patientId;
    const fPname = document.getElementById("f-patient-name");
    if (fPname) fPname.value = patientName;
  }

  submitScanRecommendation() {
    const patientId = document.getElementById("rec-patient-id")?.value.trim() || this.patientId;
    const modality = document.getElementById("rec-modality")?.value;
    const study = document.getElementById("rec-study-name")?.value.trim() || "General Diagnostic Scan";
    const notes = document.getElementById("rec-notes")?.value.trim();

    const doc = this.doctors[this.activeDoctorId] || { name: "Doctor" };
    const recId = "REC-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    this.recommendations.unshift({
      id: recId,
      patient_id: patientId,
      doctor_id: this.activeDoctorId,
      doctor_name: doc.name,
      scan_type: modality,
      study_name: study,
      clinical_notes: notes,
      status: "Pending Scan",
      created_at: "Just now"
    });
    this.saveState();

    this.showToast(`Scan referral issued for Patient ${patientId}.`, "success");
    const banner = document.getElementById("live-alert-banner");
    if (banner) banner.classList.remove("hidden");
    const bText = document.getElementById("banner-rec-text");
    if (bText) bText.textContent = `${doc.name} referred you for ${modality} Scan (${study}).`;
  }

  dismissAlertBanner() {
    const banner = document.getElementById("live-alert-banner");
    if (banner) banner.classList.add("hidden");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCTORS, SCAN ROOMS & UI RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  renderDoctors() {
    const grid = document.getElementById("doctors-grid");
    if (!grid) return;

    const list = Object.values(this.doctors);
    const q = this.searchQuery.toLowerCase();

    const filtered = list.filter(doc => {
      const matchQ = doc.name.toLowerCase().includes(q) ||
                     doc.specialty.toLowerCase().includes(q) ||
                     doc.room.toLowerCase().includes(q);
      const matchSpec = this.selectedSpecialty === "all" || doc.specialty.toLowerCase().includes(this.selectedSpecialty);
      const matchAvail = !this.availableOnly || doc.status === "Available";
      return matchQ && matchSpec && matchAvail;
    });

    if (!filtered.length) {
      grid.innerHTML = `<div class="col-span-3 text-center py-10 text-slate-400">No doctors match your criteria.</div>`;
      return;
    }

    grid.innerHTML = filtered.map(doc => {
      const isAvail = doc.status === "Available";
      return `
        <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:border-sky-300 hover:shadow-md transition space-y-4 flex flex-col justify-between">
          <div class="flex items-start space-x-3.5">
            <img src="${doc.avatar}" alt="${doc.name}" class="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-1">
                <h4 class="font-extrabold text-slate-900 text-sm leading-tight">${doc.name}</h4>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isAvail ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}">
                  ${doc.status}
                </span>
              </div>
              <p class="text-xs text-sky-700 font-semibold mt-0.5">${doc.specialty}</p>
              <p class="text-[11px] text-slate-500">${doc.qualification}</p>
              <div class="text-[11px] font-bold text-slate-700 mt-1 flex items-center space-x-1">
                <i data-lucide="map-pin" class="w-3 h-3 text-sky-500"></i>
                <span>${doc.room}</span>
              </div>
            </div>
          </div>

          <button onclick="app.startDoctorNavigationFromReception('${doc.node_id}', '${doc.name}', '${doc.room}', '${doc.dest_id}')"
            class="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white font-extrabold text-xs shadow transition flex items-center justify-center space-x-2">
            <i data-lucide="navigation" class="w-3.5 h-3.5"></i>
            <span>Navigate from Reception to Cabin (${doc.room.split('(')[0].trim()})</span>
          </button>
        </div>
      `;
    }).join("");

    if (window.lucide) lucide.createIcons();
  }

  renderScanRooms() {
    const grid = document.getElementById("scan-rooms-grid");
    if (!grid) return;

    grid.innerHTML = Object.values(this.scanRooms).map(sr => `
      <div class="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <h4 class="font-extrabold text-slate-900 text-sm">${sr.name}</h4>
            <p class="text-xs text-slate-500">${sr.room} • Technician: ${sr.technician}</p>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">${sr.status}</span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-center text-xs">
          <div class="bg-slate-50 p-2 rounded-xl border border-slate-100">
            <div class="font-bold text-slate-900">${sr.queue_count} Patients</div>
            <div class="text-[10px] text-slate-500">Queue Length</div>
          </div>
          <div class="bg-slate-50 p-2 rounded-xl border border-slate-100">
            <div class="font-bold text-purple-700">~${sr.estimated_wait_mins} Mins</div>
            <div class="text-[10px] text-slate-500">Est. Wait Time</div>
          </div>
        </div>

        <button onclick="app.startScanNavigation('${sr.node_id}', '${sr.name}', '${sr.room}', '${sr.dest_id}')" class="w-full py-2.5 px-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow transition flex items-center justify-center space-x-2">
          <i data-lucide="navigation" class="w-3.5 h-3.5"></i>
          <span>Navigate from Current Position to ${sr.type} Lab</span>
        </button>
      </div>
    `).join("");

    if (window.lucide) lucide.createIcons();
  }

  renderDoctorPortal() {
    const doc = this.doctors[this.activeDoctorId] || Object.values(this.doctors)[0];
    const nameEl = document.getElementById("doc-active-name");
    if (nameEl) nameEl.textContent = doc.name;

    const specEl = document.getElementById("doc-active-specialty");
    if (specEl) specEl.textContent = `${doc.specialty} • ${doc.qualification}`;

    const roomEl = document.getElementById("doc-active-room");
    if (roomEl) roomEl.textContent = doc.room;

    const imgEl = document.getElementById("doc-active-avatar");
    if (imgEl) imgEl.src = doc.avatar;

    const badge = document.getElementById("doc-active-status-badge");
    if (badge) {
      badge.textContent = doc.status;
      badge.className = `px-2 py-0.5 rounded-full text-[10px] font-bold ${doc.status === 'Available' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`;
    }
  }

  renderDoctorDropdowns() {
    const list = Object.values(this.doctors);
    const dSelect = document.getElementById("doctor-switcher-select");
    const fDoc = document.getElementById("f-doctor");
    const srDoc = document.getElementById("sr-doctor-id");

    const populate = sel => {
      if (!sel) return;
      sel.innerHTML = list.map(d => `<option value="${d.id}">${d.name} (${d.specialty})</option>`).join("");
    };

    populate(dSelect);
    populate(srDoc);
    if (fDoc) {
      fDoc.innerHTML = list.map(d => `<option value="${d.name}">${d.name} — ${d.specialty}</option>`).join("");
    }
  }

  switchActiveDoctor(docId) {
    this.activeDoctorId = docId;
    this.renderDoctorPortal();
    this.loadDoctorReports();
  }

  toggleCurrentDoctorStatus() {
    const doc = this.doctors[this.activeDoctorId];
    if (doc) {
      doc.status = doc.status === "Available" ? "In Consultation" : "Available";
      this.saveState();
      this.renderDoctorPortal();
      this.renderDoctors();
      this.showToast(`${doc.name} status updated to: ${doc.status}`, "info");
    }
  }

  filterDoctors() {
    this.searchQuery = document.getElementById("doctor-search-input")?.value || "";
    this.renderDoctors();
  }

  setSpecialtyFilter(spec) {
    if (spec === "available_only") {
      this.availableOnly = !this.availableOnly;
    } else {
      this.selectedSpecialty = spec;
    }
    this.renderDoctors();
  }

  generateReceptionQrCodes() {
    const container = document.getElementById("reception-qrcode-container");
    if (container && window.QRCode) {
      container.innerHTML = "";
      new QRCode(container, {
        text: window.location.href.split("?")[0] + "?tab=patient&origin=reception",
        width: 180,
        height: 180,
        colorDark: "#0f172a",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  }

  simulateReceptionScan() {
    this.patientLocation = "G-RECEPTION";
    this.showToast("Checked in at Main Reception Desk (REC-01)! Starting position calibrated.", "success");
    this.switchTab("patient");
  }

  formatTime(t) {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  }

  showToast(message, type = "info") {
    const existing = document.getElementById("toast");
    if (!existing) return;

    let bg = "bg-slate-900 text-white";
    if (type === "success") bg = "bg-emerald-600 text-white";
    if (type === "error") bg = "bg-rose-600 text-white";
    if (type === "info") bg = "bg-sky-600 text-white";

    existing.className = `fixed bottom-6 right-6 ${bg} px-5 py-3 rounded-2xl shadow-2xl z-50 text-sm font-bold flex items-center space-x-2 animate-slide-up`;
    existing.innerHTML = `<span>${message}</span>`;
    existing.classList.remove("hidden");

    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => existing.classList.add("hidden"), 4000);
  }
}

// Instantiate and initialize on DOM load
window.addEventListener("DOMContentLoaded", () => {
  window.app = new CareMatrixApp();
  window.app.init();
});
