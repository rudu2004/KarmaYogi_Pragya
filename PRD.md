# Product Requirements Document (PRD)
## Project Name: KarmaYogi Pragya
**Version:** 2.0 (Production Release)  
**Target Cadres:** ISS, SSS, and CSS Statistical Personnel (MoSPI / DoPT Alignment)  
**License:** Open-Source GovTech Architecture

---

### 1. Executive Summary
KarmaYogi Pragya is an intelligent, dual-role civil services competency acceleration platform designed to enforce DoPT's National Training Policy and Mission Karmayogi principles. It replaces static, seminar-bound e-learning with a **closed-loop feedback system**: calibrated micro-assessments, automated semantic skill-gap mapping, bilingual (Hindi/English) in-situ study modules, and a live supervisor telemetry hub for active remediation dispatch.

---

### 2. User Personas & Core Journeys

#### Persona A: Statistical / Administrative Officer (Trainee)
- **Authentication:** Enters through the Enterprise Auth Portal with isolated `sessionStorage` credential management.
- **Calibrated Micro-Diagnostics:** Completes 10-question adaptive quizzes grounded in MoSPI Standard Operating Procedures (CPI compilation, Jevons geometric mean aggregation, Laspeyres weighting, sampling theory, and computational structures).
- **Automated Deficit Tagging:** Domains scoring under 40% are tagged as statutory deficits, automatically generating a personalized 3-step mastery pathway via local Sentence-BERT embeddings (`all-MiniLM-L6-v2`) mapped against the iGOT course catalog.
- **Targeted Study Hub:** Accesses structured statutory notes, interactive bilingual audio tutoring with variable speed playback, and the Pragya AI context co-pilot equipped with deterministic offline fallback rules.
- **Certification:** Automatically earns a verified NSSTA Competency Certificate upon achieving proficiency benchmarks.

#### Persona B: Cadre Supervisor / Section Head
- **Cadre Competency Heatmap:** Aggregated, departmental skill matrices (CSO, DES, NITI Aayog) without exposing raw individual answers (DPDP Act 2023 privacy-by-design compliance).
- **Statutory Deficit Intervention Ledger:** Real-time log showing officers who breached the <40% statutory threshold.
- **Active Remediation Dispatch:** 1-click API dispatch assigning curated iGOT remediation tracks directly to the officer's learning queue.

---

### 3. Technical Architecture

- **Backend:** FastAPI (Python 3.10) providing REST API endpoints and direct static file serving.
- **Database:** SQLite embedded ledger (`pragya_ledger.db`) storing user roles, diagnostic results, and intervention dispatch history.
- **Local Machine Learning:** `sentence-transformers` running CPU-optimized MiniLM for sub-second semantic vector similarity search across course catalogs without external API dependencies.
- **Frontend:** Responsive vanilla HTML5, CSS3, JavaScript (ES6+), Chart.js for telemetry visualizations, Marked.js for markdown rendering.
- **Resilience:** Deterministic rule engine fallback providing grounded answers to technical questions even when external LLM APIs are unreachable or offline.

---

### 4. Statutory & Policy Compliance

| Policy / Framework | Implementation Mechanism |
| :--- | :--- |
| **National Training Policy (DoPT)** | Shifts civil servants from rule-bound routines to role-based competency mastery. |
| **Mission Karmayogi (FRAC Framework)** | Aligns diagnostic deficits directly with the Framework of Roles, Activities, and Competencies. |
| **MoSPI / NSSTA Guidelines** | Test banks and study modules strictly verified against official CPI and National Accounts manuals. |
| **DPDP Act 2023** | Officers' test responses stay private; supervisors view aggregated team analytics only. |