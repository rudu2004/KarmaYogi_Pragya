# 🏛️ KarmaYogi Pragya

> **An Intelligent, Dual-Role Statistical Competency Acceleration & Supervisor Telemetry Platform**  
> Aligned with Mission Karmayogi (DoPT), the FRAC Competency Framework, and official MoSPI Standard Operating Procedures.

---

## 📌 Executive Overview

**KarmaYogi Pragya** addresses a critical operational gap in civil service continuous learning: the absence of **calibrated diagnostic feedback** and **supervisor-level telemetry**. 

Instead of passive e-learning attendance, Pragya establishes an end-to-end, **closed-loop skill lifecycle**:
1. **Calibrated Micro-Diagnostics:** Fast, 10-question adaptive assessments grounded in MoSPI manuals (CPI/WPI compilation, sampling theory, Laspeyres weighting, Jevons geometric mean aggregation, and computational structures).
2. **Local Vector Skill-Gap Mapping:** On-device semantic matching via Sentence-BERT (`all-MiniLM-L6-v2`) mapping detected deficits against the official iGOT Karmayogi catalog without cloud round-trip latency.
3. **Multimodal Study Hub:** In-situ statutory study guides, variable-speed bilingual (Hindi / English) audio tutoring, and an offline-resilient contextual AI tutor.
4. **Cadre Supervisor Telemetry Hub:** An administrative command matrix displaying cross-departmental competency heatmaps, real-time statutory deficit alerts (<40% threshold), and 1-click active remediation dispatch via API bridges.

---

## ⚙️ Core Architecture & Tech Stack

```text
[ Web Browser / Client ]
       │
       ▼ (Port 8000 / Render $PORT)
[ FastAPI Unified Web Service ]
       ├── Static Web Layer      → Serves login, assessment, study, and supervisor dashboards
       ├── REST API Routing      → Auth guards, diagnostic submission, telemetry aggregates
       ├── Local ML Pipeline     → Sentence-BERT (MiniLM) vector semantic matching
       └── SQLite Storage Ledger → Encrypted session tokens, test scores, intervention audit trails
```

- **Backend:** FastAPI (Python 3.10+), Uvicorn ASGI server
- **Database:** SQLite local persistent ledger (`pragya_ledger.db`)
- **Semantic ML Engine:** `sentence-transformers`, `torch` (CPU-optimized build)
- **Frontend:** Vanilla ES6+ JavaScript, Responsive CSS3, Chart.js for telemetry analytics, Marked.js
- **Security & Privacy:** Tab-isolated `sessionStorage` credential state, strict Role-Based Access Control (Officer / Supervisor), DPDP Act 2023 privacy compliance (supervisors view aggregated team heatmaps; individual quiz attempts remain private).

---

## 🚀 Key Features

* **Dual-Role Unified Experience:** Distinct, authenticated entry points for trainee statistical officers and cadre supervisors.
* **Closed-Loop Telemetry Sync:** Assessment scores below statutory thresholds dynamically propagate to supervisor intervention queues in real time.
* **Offline-Resilient Pragya AI:** Built-in deterministic fallback logic ensuring field officers receive instant mathematical and SOP explanations even during network interruptions.
* **Automated NSSTA Certification:** Verification ledger certifying officer competency upon achieving mastery benchmarks.

---

## 🛠️ Local Installation & Run Guide

### 1. Clone the Repository
```bash
git clone https://github.com/rudu2004/KarmaYogi_Pragya.git
cd KarmaYogi_Pragya
```

### 2. Environment Setup
```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate

pip install -r backend/requirements.txt
```

### 3. Launch Platform

**Using Windows launcher:**
Double-click `run_app.bat` in the project root.

**Using Terminal:**
```bash
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Navigate to `http://127.0.0.1:8000/` in your browser.

---

## 📜 Statutory & Policy Alignment

| Policy / Mandate | Platform Implementation |
| :--- | :--- |
| **National Training Policy (DoPT)** | Shifts training paradigms from rule-bound routine to role-based competency development. |
| **Mission Karmayogi (FRAC)** | Aligns diagnostic deficits directly to the Framework of Roles, Activities, and Competencies. |
| **MoSPI / NSSTA Standards** | Diagnostic assessment banks and study notes strictly ground in official CPI, WPI, and NAS manuals. |
| **DPDP Act 2023** | Officer test data is private and compartmentalized; cadre supervisors only view aggregated analytics. |

---

## 📄 License
Open-Source Public GovTech Architecture under the MIT License.
