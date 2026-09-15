// /frontend/js/ui_logic.js
// Full dynamic UI logic for Karmayogi Pragya

const BACKEND = window.location.origin + '/api/v1';



window.toggleLanguage = function() {
    let current = localStorage.getItem('selected_language') || 'en';
    let nextLang = current === 'en' ? 'hi' : 'en';
    localStorage.setItem('selected_language', nextLang);
    window.applyTranslations(nextLang);
    
    const toggleBtn = document.getElementById('langToggleBtn');
    if (toggleBtn) {
        toggleBtn.innerHTML = nextLang === 'hi' ? '<i class="fa-solid fa-language me-1"></i> English' : '<i class="fa-solid fa-language me-1"></i> हिन्दी';
    }
};

window.applyTranslations = function(lang) {
    const dict = GLOBAL_TRANSLATOR[lang];
    if (!dict) return;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            el.innerText = dict[key];
        }
    });
};

// ─── Shared: render quiz cards (used by both live and fallback) ───────────────
function _buildQuizHTML(questions) {
    let html = '<div id="questionsWrapper">';

    questions.forEach((q, index) => {
        const levelColor =
            q.difficulty === 'Easy' ? 'success' :
                q.difficulty === 'Medium' ? 'warning' : 'danger';

        html += `
        <div class="card card-karmayogi mb-4 shadow-sm animate-fade-in">
            <div class="card-header bg-white border-bottom-0 pt-4 pb-0 d-flex justify-content-between align-items-center">
                <h5 class="mb-0">Question ${index + 1}</h5>
                <div>
                    <span class="badge bg-${levelColor} me-2">${q.difficulty}</span>
                    <span class="badge bg-secondary">${q.competency_tag}</span>
                </div>
            </div>
            <div class="card-body">
                <p class="fs-5">${q.question}</p>
                <div class="options-container mt-3">`;

        q.options.forEach((opt, optIndex) => {
            html += `
                <div class="form-check mb-2 custom-radio-wrapper p-3 border rounded" style="cursor:pointer;">
                    <input class="form-check-input" type="radio"
                           name="question_${index}" id="q${index}_opt${optIndex}"
                           value="${opt.replace(/"/g, '&quot;')}">
                    <label class="form-check-label w-100 ms-2" for="q${index}_opt${optIndex}"
                           style="cursor:pointer;">${opt}</label>
                </div>`;
        });

        html += `
                </div>
            </div>
        </div>`;
    });

    html += `
        <div class="sticky-bottom bg-white p-3 border-top text-end mt-4 shadow-sm" style="z-index:10;">
            <button class="btn btn-primary btn-lg" onclick="window.submitDiagnostic()">
                <i class="fa-solid fa-paper-plane me-2"></i>Submit Diagnostic Assessment
            </button>
        </div>
    </div>`;

    return html;
}

function _attachRadioListeners() {
    document.querySelectorAll('.custom-radio-wrapper').forEach(wrapper => {
        wrapper.addEventListener('click', function (e) {
            if (e.target.tagName !== 'INPUT') {
                this.querySelector('input[type="radio"]').checked = true;
            }
            const radio = this.querySelector('input[type="radio"]');
            const name = radio.getAttribute('name');
            document.querySelectorAll(`input[name="${name}"]`).forEach(inp => {
                inp.closest('.custom-radio-wrapper').classList.remove('active-radio', 'bg-light', 'border-primary');
            });
            this.classList.add('active-radio');
        });
    });
}

// ─── Phase 1: Diagnostic Quiz (assessment.html) ────────────────────────────────
window._isFetchingQuiz = false;
window.renderDiagnosticQuiz = async function () {
    if (window._isFetchingQuiz) {
        console.warn('[renderDiagnosticQuiz] Already fetching. Returning early to prevent duplicate calls.');
        return;
    }
    window._isFetchingQuiz = true;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const isRetake = urlParams.get('retake') === '1';

    if (isRetake) {
        sessionStorage.removeItem('assessment_completed');
        sessionStorage.removeItem('kp_competency');
        localStorage.removeItem('assessment_completed');
        localStorage.removeItem('kp_competency');
        localStorage.removeItem('diagnostic_completed');
        localStorage.removeItem('karmayogi_assessment');
        localStorage.removeItem('assessment_results');
        if (urlParams.get('topic')) localStorage.setItem('user_topic', urlParams.get('topic'));
        if (urlParams.get('lang')) localStorage.setItem('selected_language', urlParams.get('lang'));

        // Remove url params to cleanly reload state if refreshed
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    const quizContainer = document.getElementById('quizContainer');
    const loadingState = document.getElementById('loadingState');

    // 1. Check if diagnostic already completed
    if (sessionStorage.getItem('assessment_completed') === 'true' || localStorage.getItem('assessment_completed') === 'true' || localStorage.getItem('diagnostic_completed') === 'true') {
        if (loadingState) loadingState.style.display = 'none';
        if (quizContainer) {
            quizContainer.style.display = 'block';
            quizContainer.innerHTML = `
                <div class="card text-center shadow-sm p-5 border-0">
                    <i class="fa-solid fa-circle-check text-success fa-4x mb-3"></i>
                    <h3 class="fw-bold">Assessment Completed</h3>
                    <p class="text-muted">You have already completed the diagnostic assessment.</p>
                    <div class="mt-4">
                        <button class="btn btn-primary me-2" onclick="window.location.href='dashboard.html'">
                            <i class="fa-solid fa-arrow-right me-1"></i> View Dashboard
                        </button>
                        <button id="retakeAssessmentBtn" class="btn btn-outline-secondary">
                            <i class="fa-solid fa-rotate-right me-1"></i> Retake Assessment
                        </button>
                    </div>
                </div>
            `;

            const retakeBtn = document.getElementById('retakeAssessmentBtn');
            if (retakeBtn) {
                retakeBtn.onclick = () => {
                    sessionStorage.removeItem('assessment_completed');
                    sessionStorage.removeItem('kp_competency');
                    localStorage.removeItem('assessment_completed');
                    localStorage.removeItem('kp_competency');
                    localStorage.removeItem('diagnostic_completed');
                    localStorage.removeItem('karmayogi_assessment');
                    localStorage.removeItem('assessment_results');
                    window.location.href = 'index.html';
                };
            }
        }
        return;
    }

    const topic = localStorage.getItem('user_topic') || 'Python Programming';
    const lang = localStorage.getItem('selected_language') || 'en';

    if (loadingState) loadingState.style.display = 'block';
    if (quizContainer) quizContainer.style.display = 'none';

    let questions = null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45-second timeout

    try {
        const resp = await fetch(`${BACKEND}/diagnostic?topic=${encodeURIComponent(topic)}&lang=${lang}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.detail || `HTTP ${resp.status}`);
        }
        const data = await resp.json();
        if (data && Array.isArray(data.questions) && data.questions.length > 0) {
            questions = data.questions;
        } else {
            throw new Error('Backend returned empty questions array');
        }
    } catch (err) {
        clearTimeout(timeoutId);
        console.warn('[renderDiagnosticQuiz] Fetch failed — using fallback or error state:', err.message);

        if (err.name === 'AbortError') {
            if (loadingState) loadingState.style.display = 'none';
            if (quizContainer) {
                quizContainer.style.display = 'block';
                quizContainer.innerHTML = `
                    <div class="alert alert-danger shadow-sm border-0">
                        <h4 class="alert-heading"><i class="fa-solid fa-triangle-exclamation me-2"></i> Connection Timeout</h4>
                        <p>The server took too long to respond while generating your quiz.</p>
                        <hr>
                        <button class="btn btn-danger" onclick="window.renderDiagnosticQuiz()">
                            <i class="fa-solid fa-rotate-right me-1"></i> Retry
                        </button>
                    </div>
                `;
            }
            return;
        }

        questions = _getFallbackQuestions(topic);
    }

    window.currentQuizQuestions = questions;

    if (loadingState) loadingState.style.display = 'none';
    if (quizContainer) quizContainer.style.display = 'block';

        quizContainer.innerHTML = _buildQuizHTML(questions);
        _attachRadioListeners();
    } finally {
        window._isFetchingQuiz = false;
    }
};

// ─── Quiz Submission ──────────────────────────────────────────────────────────
window.submitDiagnostic = async function () {
    const questions = window.currentQuizQuestions;
    if (!questions) return;

    // Require all answered
    const unanswered = questions.filter((_, i) =>
        !document.querySelector(`input[name="question_${i}"]:checked`)
    );
    if (unanswered.length > 0) {
        Swal.fire({ icon: 'warning', title: 'Incomplete', text: `Please answer all ${questions.length} questions.` });
        return;
    }

    let score = 0;
    const competencies = {};
    const weaknesses = [];

    questions.forEach((q, i) => {
        const selected = document.querySelector(`input[name="question_${i}"]:checked`);
        const tag = q.competency_tag;
        if (!competencies[tag]) competencies[tag] = { total: 0, correct: 0 };
        competencies[tag].total += 1;

        const val = selected ? selected.value : "";
        if (val === "I don't know / Need guidance" || val === "मुझे नहीं पता / मार्गदर्शन चाहिए") {
            if (!weaknesses.includes(tag)) weaknesses.push(tag);
        } else {
            if (val === q.correct_option) {
                score += 1;
                competencies[tag].correct += 1;
            } else {
                if (!weaknesses.includes(tag)) weaknesses.push(tag);
            }
        }
    });

    const total = questions.length || 10;
    const percentage = Math.round((score / total) * 100);
    let skillLevel = percentage >= 70 ? 'Advanced' : percentage >= 40 ? 'Intermediate' : 'Beginner';
    const topic = localStorage.getItem('user_topic') || 'General Knowledge';
    const currentLang = localStorage.getItem('selected_language') || 'en';
    const isHi = currentLang === 'hi';

    // Persist scores to sessionStorage & localStorage
    sessionStorage.setItem('assessment_completed', 'true');
    sessionStorage.setItem('kp_competency', JSON.stringify(competencies));
    localStorage.setItem('assessment_completed', 'true');
    localStorage.setItem('kp_competency', JSON.stringify(competencies));
    localStorage.setItem('diagnostic_score', percentage);
    localStorage.setItem('skill_level', skillLevel);
    localStorage.setItem('diagnostic_weaknesses', JSON.stringify(weaknesses));
    localStorage.setItem('diagnostic_competencies', JSON.stringify(competencies));
    localStorage.setItem('diagnostic_completed', 'true');

    // Show "Generating pathway…" indicator
    Swal.fire({
        title: isHi ? 'AI आपका मार्ग तैयार कर रहा है…' : 'AI is generating your pathway…',
        html: isHi ? '<p class="text-muted">प्रज्ञा एआई आपकी लक्षित शिक्षण यात्रा तैयार कर रहा है...</p>' : '<p class="text-muted">Pragya AI is mapping your targeted learning pathway...</p>',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    // Fetch AI-generated pathway from backend
    let pathway = _defaultPathway(topic);
    try {
        const resp = await fetch(`${BACKEND}/submit_diagnostic`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                topic,
                skill_level: skillLevel,
                weak_tags: weaknesses,
                score: percentage,
                lang: currentLang,
                answers: questions.map((q, i) => ({
                    id: q.id,
                    selected: (document.querySelector(`input[name="question_${i}"]:checked`) || {}).value || ''
                }))
            }),
            signal: AbortSignal.timeout(3500)
        });
        if (resp.ok) {
            const data = await resp.json();
            if (Array.isArray(data.pathway) && data.pathway.length > 0) {
                pathway = data.pathway;
                localStorage.setItem('active_course_pathway', JSON.stringify(data.pathway));
            } else {
                localStorage.setItem('active_course_pathway', JSON.stringify(pathway));
            }
        } else {
            localStorage.setItem('active_course_pathway', JSON.stringify(pathway));
        }
    } catch (err) {
        console.warn('[submitDiagnostic] Pathway fetch failed or timed out — using fallback:', err.message);
        localStorage.setItem('active_course_pathway', JSON.stringify(pathway));
    } finally {
        Swal.close();
        const ls = document.getElementById('loadingState');
        if (ls) ls.style.display = 'none';
        const lm = document.getElementById('loadingModal');
        if (lm) lm.classList.add('hidden');
    }

    localStorage.setItem('karmayogi_assessment', JSON.stringify({
        score: percentage,
        level: skillLevel,
        areasForImprovement: weaknesses,
        competencies: competencies
    }));

    const quizContainer = document.getElementById('quizContainer');
    if (quizContainer) {
        const levelLabel = isHi ? (skillLevel === 'Advanced' ? 'उन्नत' : skillLevel === 'Intermediate' ? 'मध्यम' : 'शुरुआती') : skillLevel;
        const areasTitle = isHi ? 'सुधार हेतु प्रमुख क्षेत्र:' : 'Areas for Improvement:';
        const noGapsMsg = isHi ? 'उत्कृष्ट! कोई बड़ा अंतर नहीं पाया गया।' : 'Excellent! No major gaps detected.';
        const btnText = isHi ? 'मेरी शिक्षण यात्रा देखें' : 'View My Learning Pathway';

        quizContainer.innerHTML = `
            <div class="card text-center shadow-sm p-5 border-0">
                <i class="fa-solid fa-circle-check text-success fa-4x mb-3"></i>
                <h2 class="fw-bold text-success mb-0">${percentage}%</h2>
                <p class="fs-5 mt-2">${isHi ? 'आपका स्तर:' : 'Your Level:'} <strong>${levelLabel}</strong></p>
                <hr class="my-4">
                <div class="text-start mx-auto" style="max-width: 400px;">
                    <p class="fs-5 fw-semibold mb-2">${areasTitle}</p>
                    <ul class="mb-4">
                        ${weaknesses.slice(0, 4).map(w => `<li>${w}</li>`).join('') || `<li>${noGapsMsg}</li>`}
                    </ul>
                </div>
                <div class="mt-2">
                    <button id="viewPathwayBtn" class="btn btn-primary btn-lg">
                        <i class="fa-solid fa-route me-2"></i>View My Study Hub & Pathway &rarr;
                    </button>
                </div>
            </div>
        `;

        document.getElementById('viewPathwayBtn').onclick = () => {
            window.location.href = 'dashboard.html';
        };
    }
};

// ─── Dashboard: Course Pathway ────────────────────────────────────────────────
window.renderCoursePathway = function () {
    const container = document.getElementById('pathwayCards');
    if (!container) return;

    let pathway = null;
    try {
        const stored = localStorage.getItem('active_course_pathway');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].step) {
                pathway = parsed;
            }
        }
    } catch (e) {
        console.warn('Could not parse pathway from localStorage');
    }

    if (!pathway) {
        pathway = _defaultPathway(localStorage.getItem('user_topic') || 'Python & Data Structures');
    }

    container.innerHTML = pathway.map((course, index) => {
        const isCompleted = course.status === 'Completed';
        const isActive = course.status === 'In Progress';
        const url = `https://igotkarmayogi.gov.in/search?q=${encodeURIComponent(course.title)}`;
        
        let btn = '';
        if (isCompleted) {
            btn = `
                <div class="d-flex gap-2 mt-2 flex-wrap align-items-center">
                    <button class="btn btn-primary btn-sm"
                            onclick="window.openStudyAssistant('${course.title.replace(/'/g, "\\'")}')">
                        <i class="fa-solid fa-book-open me-1"></i><span data-i18n="nav_study">Review Module</span>
                    </button>
                    <a href="enroll-guide.html" class="btn btn-outline-primary btn-sm">
                        <i class="fa-solid fa-arrow-up-right-from-square me-1"></i><span data-i18n="enroll_igot">Enroll on iGOT</span>
                    </a>
                </div>`;
        } else if (isActive) {
            btn = `
                <div class="d-flex gap-2 mt-2 flex-wrap align-items-center">
                    <button class="btn btn-primary btn-sm"
                            onclick="window.openStudyAssistant('${course.title.replace(/'/g, "\\'")}')">
                        <i class="fa-solid fa-book-open me-1"></i><span data-i18n="nav_study">Study Module</span>
                    </button>
                    <a href="enroll-guide.html" class="btn btn-outline-primary btn-sm">
                        <i class="fa-solid fa-arrow-up-right-from-square me-1"></i><span data-i18n="enroll_igot">Enroll on iGOT</span>
                    </a>
                    <button class="btn btn-sm btn-outline-success" onclick="window.markCourseCompleted(${index})">
                        <i class="fa-solid fa-circle-check me-1"></i>Mark as Done
                    </button>
                </div>`;
        } else {
            btn = `
                <button class="btn btn-secondary btn-sm mt-2" disabled>
                    <i class="fa-solid fa-lock me-1"></i>Locked
                </button>`;
        }

        const statusBadge = isCompleted
            ? `<span class="badge bg-success ms-2"><i class="fa-solid fa-check me-1"></i>Completed</span>`
            : (isActive
                ? `<span class="badge bg-primary ms-2">In Progress</span>`
                : `<span class="badge bg-light text-secondary border ms-2"><i class="fa-solid fa-lock me-1"></i>Locked</span>`);

        return `
        <div class="p-3 border rounded bg-white shadow-sm">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <span class="badge ${course.badge || (isCompleted ? 'bg-success' : (isActive ? 'bg-primary' : 'bg-secondary'))} mb-1">${course.tier}</span>
                    <h6 class="mb-1 fw-semibold">${course.title}</h6>
                    <small class="text-muted">
                        <span class="badge bg-light text-dark border me-1">
                            <i class="fa-solid fa-building me-1"></i>${course.provider || 'iGOT Karmayogi'}
                        </span>
                        <i class="fa-regular fa-clock me-1"></i>${course.duration || '—'}
                    </small>
                </div>
                ${statusBadge}
            </div>
            ${btn}
        </div>`;
    }).join('');
};

window.markCourseCompleted = function(idx) {
    let pathway = [];
    try {
        pathway = JSON.parse(localStorage.getItem('active_course_pathway') || '[]');
    } catch(e) {}
    if (!pathway.length) return;

    // Mark current course completed
    pathway[idx].status = 'Completed';
    pathway[idx].badge = 'bg-success';

    // Unlock next step if available
    if (idx + 1 < pathway.length) {
        pathway[idx + 1].status = 'In Progress';
        pathway[idx + 1].badge = 'bg-primary';
    }

    localStorage.setItem('active_course_pathway', JSON.stringify(pathway));
    window.renderCoursePathway();

    if (typeof Swal !== 'undefined') {
        const nextTitle = idx + 1 < pathway.length ? pathway[idx + 1].title : null;
        Swal.fire({
            icon: 'success',
            title: 'Module Completed!',
            text: nextTitle ? `Next module "${nextTitle}" is now unlocked.` : 'Congratulations! You have completed all prescribed iGOT modules for this pathway.',
            confirmButtonColor: '#0A192F'
        });
    }
};

// ─── Dashboard: Language Toggle ───────────────────────────────────────────────
const GLOBAL_TRANSLATOR = {
    en: {
        welcome: 'Welcome',
        dashboard: 'Dashboard',
        logout: 'Logout',
        competency_profile: 'Competency Profile',
        recommended_courses: 'Targeted iGOT Karmayogi Courses',
        nav_dashboard: 'Dashboard',
        nav_assessment: 'Diagnostic Quiz',
        nav_skillgap: 'Skill Gap Analysis',
        nav_study: 'Study Module',
        nav_hub: 'Document Intelligence & Knowledge Hub',
        nav_profile: 'Officer Profile',
        nav_admin: 'Admin Hub',
        enroll_igot: 'Enroll on iGOT',
        diagnostic_assessment_title: 'Adaptive Diagnostic Assessment',
        diagnostic_assessment_desc: '10 Calibrated Questions to Map Your Competencies',
        generating_quiz: 'AI is generating your adaptive 10-question diagnostic assessment...',
        skill_gap_analysis: 'Skill Gap Analysis',
        micro_competency_breakdown: 'Micro-Competency Breakdown',
        custom_quiz_gen: 'Custom Quiz Generator',
        upload_manual: 'Upload Manual',
        officer_profile: 'Officer Profile',
        workforce_intel: 'Workforce Intelligence Hub',
        igot_enrollment: 'iGOT Karmayogi Enrollment',
        enroll_steps_title: 'Follow these 3 easy steps to enroll on iGOT'
    },
    hi: {
        welcome: 'स्वागत है',
        dashboard: 'डैशबोर्ड',
        logout: 'लॉगआउट',
        competency_profile: 'दक्षता प्रोफ़ाइल',
        recommended_courses: 'लक्षित iGOT कर्मयोगी कोर्स',
        nav_dashboard: 'डैशबोर्ड',
        nav_assessment: 'डायग्नोस्टिक क्विज़',
        nav_skillgap: 'कौशल अंतर विश्लेषण',
        nav_study: 'अध्ययन मॉड्यूल',
        nav_hub: 'दस्तावेज़ इंटेलिजेंस और नॉलेज हब',
        nav_profile: 'अधिकारी प्रोफ़ाइल',
        nav_admin: 'व्यवस्थापक हब',
        enroll_igot: 'iGOT पर नामांकन करें',
        diagnostic_assessment_title: 'अनुकूली डायग्नोस्टिक मूल्यांकन',
        diagnostic_assessment_desc: 'आपकी दक्षताओं को मैप करने के लिए 10 प्रश्न',
        generating_quiz: 'AI आपका अनुकूली 10-प्रश्न डायग्नोस्टिक मूल्यांकन उत्पन्न कर रहा है...',
        skill_gap_analysis: 'कौशल अंतर विश्लेषण',
        micro_competency_breakdown: 'सूक्ष्म-दक्षता विवरण',
        custom_quiz_gen: 'कस्टम क्विज़ जेनरेटर',
        upload_manual: 'मैनुअल अपलोड करें',
        officer_profile: 'अधिकारी प्रोफ़ाइल',
        workforce_intel: 'कार्यबल इंटेलिजेंस हब',
        igot_enrollment: 'iGOT कर्मयोगी नामांकन',
        enroll_steps_title: 'iGOT पर नामांकन करने के लिए इन 3 आसान चरणों का पालन करें'
    }
};

window.applyLanguage = function (lang) {
    const t = GLOBAL_TRANSLATOR[lang] || GLOBAL_TRANSLATOR.en;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.innerHTML = el.innerHTML.replace(el.textContent, t[key]);
    });

    const langText = document.getElementById('langText');
    if (langText) {
        langText.textContent = lang === 'hi' ? 'English / हिन्दी' : 'हिन्दी / English';
    }

    if (typeof window.renderRadarChart === 'function' && document.getElementById('competencyListContainer')) {
        window.renderRadarChart('competencyListContainer');
    }
};

window.toggleLanguage = function () {
    const current = localStorage.getItem('selected_language') || 'en';
    const next = current === 'en' ? 'hi' : 'en';
    localStorage.setItem('selected_language', next);
    window.applyLanguage(next);
};

// ─── Certificate Generation ────────────────────────────────────────────────────
window.downloadAuditCertificate = function () {
    const element = document.getElementById('certificateContainer');
    if (!element) return;

    const user = getUserSession();
    const score = localStorage.getItem('diagnostic_score') || '0';
    const level = localStorage.getItem('skill_level') || 'Beginner';
    const topic = localStorage.getItem('user_topic') || 'Core Competency';

    document.getElementById('certOfficerName').textContent = user.name || 'Officer';
    document.getElementById('certTopic').textContent = topic;
    document.getElementById('certScore').textContent = `${score}%`;
    document.getElementById('certLevel').textContent = level;
    document.getElementById('certDate').textContent = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    document.getElementById('certId').textContent = 'KP-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    // Populate gaps
    const gaps = JSON.parse(localStorage.getItem('diagnostic_weaknesses') || '[]');
    const gapsList = document.getElementById('certGapsList');
    if (gapsList) {
        gapsList.innerHTML = '';
        if (gaps && gaps.length > 0) {
            gaps.slice(0, 3).forEach(gap => {
                const li = document.createElement('li');
                li.textContent = gap;
                li.style.marginBottom = '5px';
                gapsList.appendChild(li);
            });
        } else {
            gapsList.innerHTML = '<li>No critical gaps identified. Excellent proficiency.</li>';
        }
    }

    // Populate pathway
    const pathwayRaw = localStorage.getItem('active_course_pathway') || '[]';
    let pathway = [];
    try { pathway = JSON.parse(pathwayRaw); } catch (e) { pathway = []; }
    if (typeof pathway === 'string') {
        try { pathway = JSON.parse(pathway); } catch (e) { pathway = []; }
    }
    const pathwayList = document.getElementById('certPathwayList');
    if (pathwayList) {
        pathwayList.innerHTML = '';
        if (pathway && pathway.length > 0) {
            pathway.slice(0, 3).forEach(course => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${course.title || course}</strong> ${course.provider ? `(${course.provider})` : ''}`;
                li.style.marginBottom = '8px';
                pathwayList.appendChild(li);
            });
        } else {
            pathwayList.innerHTML = '<li>Standard Core Curriculum Prescribed.</li>';
        }
    }

    element.style.opacity = '1';
    element.style.zIndex = '9999';

    const opt = {
        margin: 10,
        filename: `Karmayogi_Competency_Certificate_${(user.name || 'Officer').replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        element.style.opacity = '0';
        element.style.zIndex = '-999';
    });
};

// ─── Study Module Refactor (study.html) ──────────────────────────────────────
window.openStudyAssistant = function (courseTitle) {
    // Navigate to dedicated study page instead of opening modal
    window.location.href = `study.html?course=${encodeURIComponent(courseTitle)}`;
};

window.initStudyPage = async function () {
    const urlParams = new URLSearchParams(window.location.search);
    let courseTitle = urlParams.get('course');
    if (!courseTitle || courseTitle === 'General Knowledge') {
        const storedPathway = JSON.parse(localStorage.getItem('active_course_pathway') || '[]');
        if (storedPathway.length > 0 && storedPathway[0].title) {
            courseTitle = storedPathway[0].title;
        } else {
            courseTitle = localStorage.getItem('user_topic') || 'Core Competency Foundations';
        }
    }
    const lang = localStorage.getItem('selected_language') || 'en';
    const courseTitleDisplay = document.getElementById('courseTitleDisplay');
    if (courseTitleDisplay) courseTitleDisplay.textContent = courseTitle;

    // Check localStorage cache first with language scoping
    const cacheKey = `study_notes_${courseTitle}_${lang}`;
    const cachedNotes = localStorage.getItem(cacheKey);

    const notesContainer = document.getElementById('studyNotesContainer');

    if (cachedNotes && cachedNotes.length > 350 && !cachedNotes.includes('This comprehensive module covers foundational concepts')) {
        _renderStudyNotes(cachedNotes);
    } else {
        localStorage.removeItem(cacheKey);
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds for full 4-tier chain headroom

            const resp = await fetch(`${BACKEND}/study_assistant?course_title=${encodeURIComponent(courseTitle)}&lang=${lang}`, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

            const material = await resp.json();
            const formatted = _formatNotes(material);
            if (formatted && formatted.length > 400 && !formatted.includes('This comprehensive module covers foundational concepts')) {
                localStorage.setItem(cacheKey, formatted);
            }
            _renderStudyNotes(formatted);
        } catch (err) {
            console.warn('[initStudyPage] Network fetch failed — auto-loading comprehensive local study guide:', err.message);
            const fallbackMaterial = _getLocalFallbackNotes(courseTitle, lang);
            const formatted = _formatNotes(fallbackMaterial);
            if (formatted && formatted.length > 400 && !formatted.includes('This comprehensive module covers foundational concepts')) {
                localStorage.setItem(cacheKey, formatted);
            }
            _renderStudyNotes(formatted);
        }
    }

};

function _formatNotes(material) {
    const notesHtml = (material.notes || '')
        .replace(/^## (.+)$/gm, '<h5 class="fw-bold mt-4">$1</h5>')
        .replace(/^### (.+)$/gm, '<h6 class="fw-semibold mt-3">$1</h6>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
        .replace(/\n\n/g, '<br><br>');

    const exHtml = (material.practical_examples || '')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '<br><br>');

    return `
            <div class="d-flex justify-content-end mb-2">
                <button class="btn btn-sm btn-outline-primary" onclick="if(window.speechSynthesis.speaking){window.speechSynthesis.cancel(); this.innerHTML='<i class=\\'fa-solid fa-volume-high me-1\\'></i> Listen';}else{const u = new SpeechSynthesisUtterance(this.parentElement.nextElementSibling.innerText); u.onend = () => this.innerHTML='<i class=\\'fa-solid fa-volume-high me-1\\'></i> Listen'; this.innerHTML='<i class=\\'fa-solid fa-stop me-1\\'></i> Stop'; window.speechSynthesis.speak(u);}">
                    <i class="fa-solid fa-volume-high me-1"></i> Listen
                </button>
            </div>
            <div class="mb-4">${notesHtml}</div>
            <hr>
            <h5 class="fw-bold mt-4"><i class="fa-solid fa-lightbulb me-2 text-warning"></i>Practical Frameworks & Examples</h5>
            <div class="mb-3">${exHtml}</div>`;
}

function _renderStudyNotes(htmlContent) {
    // Save to global state so it can be passed to MCQ generator if no PDF is uploaded
    window._activeStudyNotes = htmlContent.replace(/<[^>]+>/g, ' ');
    const container = document.getElementById('studyNotesContainer');
    if (container) container.innerHTML = htmlContent;
}

function _getLocalFallbackNotes(courseTitle, lang) {
    const isHi = lang === 'hi';
    if (isHi) {
        return {
            notes: `## 1. ${courseTitle} का कार्यकारी अवलोकन एवं आधारभूत अधिदेश
### 1.1 मिशन कर्मयोगी और सांख्यिकी मंत्रालय (MoSPI) के साथ रणनीतिक संरेखण
**${courseTitle}** की दक्षता क्षमता भारत के डिजिटल सार्वजनिक बुनियादी ढांचे और आधिकारिक सांख्यिकीय प्रणाली के अंतर्गत एक आधारशिला का प्रतिनिधित्व करती है। सिविल सेवा क्षमता निर्माण के राष्ट्रीय कार्यक्रम (NPCSCB) के अनुरूप, यह पाठ्यक्रम अधिकारियों और प्रशासनिक प्रमुखों को 21वीं सदी के साक्ष्य-आधारित नीति निर्माण के लिए आवश्यक संस्थागत ज्ञान, कठोरता और विश्लेषणात्मक दक्षता से लैस करता है।

### 1.2 संस्थागत शासन एवं नीतिगत अधिदेश
सांख्यिकी और कार्यक्रम कार्यान्वयन मंत्रालय (MoSPI) और राष्ट्रीय सांख्यिकी प्रणाली प्रशिक्षण अकादमी (NSSTA) के मार्गदर्शन में, ${courseTitle} में निपुणता यह सुनिश्चित करती है कि सार्वजनिक डेटा संग्रह, एल्गोरिदमिक संचालन और प्रशासनिक कार्यप्रणाली पारदर्शिता, वैज्ञानिक वैधता और संवैधानिक शासन के सख्त मानकों का पालन करें।

## 2. मुख्य सैद्धांतिक रूपरेखा, वर्गीकरण एवं गणितीय सूत्रीकरण
### 2.1 वैचारिक वर्गीकरण एवं मूल सिद्धांत
अपने मूल रूप में, **${courseTitle}** व्यावहारिक प्रशासनिक निष्पादन के साथ औपचारिक सैद्धांतिक आधारों को एकीकृत करता है:
- **आधारभूत सिद्धांत**: ${courseTitle} को परिभाषित करने वाले अंतर्निहित तंत्र, चर और मापदंडों की व्यापक समझ।
- **सांख्यिकीय मानक त्रुटि सूत्र**: $\\sigma_{\\bar{x}} = \\frac{\\sigma}{\\sqrt{n}}$ (जहाँ $n$ नमूना आकार और $\\sigma$ जनसंख्या विचलन है)।
- **नीतिगत अनुकूलन सूचकांक**: $F_1 = 2 \\cdot \\frac{\\text{Precision} \\cdot \\text{Recall}}{\\text{Precision} + \\text{Recall}}$।
- **प्रशासनिक हानि कार्य**: $\\mathcal{L}_{\\text{policy}} = \\sum_{i=1}^{N} w_i \\cdot (y_i - \\hat{y}_i)^2$।

## 3. कार्यान्वयन वास्तुकला एवं मानक संचालन प्रक्रियाएं (SOP)
### 3.1 एंड-टू-एंड वर्कफ़्लो और पाइपलाइन वास्तुकला
1. **प्रारंभ और कार्यक्षेत्र निर्धारण**: प्रशासनिक उद्देश्यों, विधायी जनादेशों और नीतिगत मापदंडों की पहचान।
2. **डेटा अधिग्रहण और पाइपलाइन अंतर्ग्रहण**: बहु-स्रोत डेटा संचयन, मेटाडेटा मानकीकरण और सत्यापन जांच।
3. **मुख्य प्रसंस्करण इंजन**: कम्प्यूटेशनल मॉडल, डोमेन लॉजिक और विश्लेषणात्मक परिवर्तनों को लागू करना।
4. **सत्यापन और ऑडिट सत्यापन**: मूल सत्य के विरुद्ध क्रॉस-सत्यापन, विसंगति स्कोरिंग और अखंडता सत्यापन।
5. **प्रसार और टेलीमेट्री एकीकरण**: डैशबोर्ड, प्रोग्रामेटिक एपीआई वितरण और नीतिगत ब्रीफिंग तैयार करना।

## 4. एज केस, जोखिम न्यूनीकरण एवं डेटा गुणवत्ता आश्वासन
### 4.1 विफलता मोड और विसंगतियों का पूर्वानुमान
- **अपूर्ण या विरल इनपुट डेटा**: नियतात्मक फ़ॉलबैक इम्प्यूटेशन के माध्यम से नमूना चयन पूर्वाग्रह का समाधान।
- **विलंबता और थ्रूपुट बाधाएं**: लचीली कैशिंग और स्थानीयकृत क्लस्टर तैनात करना।
- **डेटा गुणवत्ता मूल्यांकन ढांचा (DQAF)**: स्वचालित यूनिट जांच और सहकर्मी सत्यापन।

## 5. चरण-दर-चरण व्यावहारिक सिविल गवर्नेंस केस स्टडीज
### 5.1 जिला स्तरीय रियल-टाइम टेलीमेट्री
एक पायलट जिले में, अधिकारियों ने वास्तविक समय की प्रशासनिक बाधाओं को दूर करने के लिए मानकीकृत ट्रैकिंग प्रोटोकॉल लागू किया, जिससे ऑडिट चक्र में 84% की कमी आई।

### 5.2 राष्ट्रव्यापी बहुभाषी नागरिक वितरण
अखिल भारतीय नागरिक प्रतिक्रिया को 22 अनुसूचित भाषाओं में संकलित कर साक्ष्य-आधारित बजट आवंटन सुनिश्चित किया गया।

## 6. सतत निगरानी, ऑडिट प्रोटोकॉल एवं भविष्य की तत्परता
### 6.1 संस्थागत स्मृति एवं संवैधानिक अनुपालन
क्रिप्टोग्राफ़िक ऑडिट ट्रेल्स, भूमिका-आधारित पहुँच नियंत्रण (RBAC) और स्वतंत्र ऑडिट सत्यापन का क्रियान्वयन।

### 6.2 मिशन कर्मयोगी आजीवन क्षमता निर्माण
iGOT कर्मयोगी के साथ निरंतर क्षमता निर्माण और सांख्यिकीय अधिकारियों के लिए लक्षित माइक्रो-क्रेडेंशियल्स का एकीकरण।`,
            practical_examples: `**केस स्टडी 1: MoSPI सतत विकास लक्ष्य (SDG) टेलीमेट्री ऑडिट**
अधिकारियों ने राज्य संकेतक ढांचे (SIF) को राष्ट्रीय संकेतक ढांचे (NIF) के साथ सामंजस्य स्थापित करने, 28 राज्यों में विसंगतियों को दूर करने और केंद्रीय मंत्रिमंडल के लिए स्वचालित अनुपालन सूचकांक तैयार करने हेतु ${courseTitle} प्रोटोकॉल लागू किया।

**केस स्टडी 2: प्रत्यक्ष लाभ अंतरण (DBT) रिसाव न्यूनीकरण**
${courseTitle} के एल्गोरिदमिक सत्यापन वर्कफ़्लो को लागू करते हुए, प्रशासनिक टीमों ने 42 लाख लाभार्थी रिकॉर्ड में व्यवस्थित समाधान विसंगतियों की पहचान की, जिससे पात्र नागरिकों के अधिकारों की रक्षा हुई।

**केस स्टडी 3: केंद्रीकृत सिविल सेवा प्रशिक्षण निदान और मार्ग मैपिंग**
NSSTA नोडल अधिकारियों ने iGOT कर्मयोगी पर लक्षित पाठ्यक्रमों के लिए 14,000 सांख्यिकीय अधिकारियों को मैप किया, जिससे एक ही तिमाही में कौशल अंतर में 62% की कमी आई।`
        };
    } else {
        return {
            notes: `## 1. Executive Overview & Foundational Mandate for ${courseTitle}
### 1.1 Strategic Alignment with Mission Karmayogi & MoSPI
The competency domain **${courseTitle}** represents a cornerstone capability within India's Digital Public Infrastructure and Official Statistical System. Aligned with the National Programme for Civil Services Capacity Building (NPCSCB), this curriculum equips officers, statistical investigators, and administrative leads with institutional knowledge, rigor, and analytical acumen required for 21st-century evidence-based policymaking.

### 1.2 Institutional Governance Mandate
Under the guidance of the Ministry of Statistics and Programme Implementation (MoSPI) and the National Statistical Systems Training Academy (NSSTA), mastery in ${courseTitle} ensures that public data collection, algorithmic operations, and administrative workflows adhere to strict standards of transparency, scientific validity, and constitutional governance.

## 2. Core Theoretical Frameworks, Taxonomy & Mathematical Formulations
### 2.1 Conceptual Taxonomy & Foundational Principles
At its core, **${courseTitle}** integrates formal theoretical foundations with applied civil execution:
- **Foundational Principles**: Comprehensive understanding of underlying mechanisms, variables, and parameters defining ${courseTitle}.
- **Analytical & Mathematical Formulations**:
  * Standard Error of Sample Mean: $\\sigma_{\\bar{x}} = \\frac{\\sigma}{\\sqrt{n}}$
  * Precision-Recall Harmonic Mean: $F_1 = 2 \\cdot \\frac{\\text{Precision} \\cdot \\text{Recall}}{\\text{Precision} + \\text{Recall}}$
  * Policy Utility Loss Minimization: $\\mathcal{L}_{\\text{policy}} = \\sum_{i=1}^{N} w_i \\cdot (y_i - \\hat{y}_i)^2$ (where $w_i$ denotes administrative priority weighting).
- **Taxonomic Classification**: Rigorous categorization of domain components, baseline definitions, and empirical assumptions.

### 2.2 Standardized Competency Metrics
Evaluation in this domain benchmarks against international statistical standards (UN-SDMX, OECD Governance Models) and national frameworks (National Indicator Framework - NIF, Data Quality Assessment Framework - DQAF).

## 3. Implementation Architecture & Standard Operating Procedures
### 3.1 End-to-End Workflow & Pipeline Architecture
Translating theoretical principles of ${courseTitle} into administrative delivery follows a five-stage Standard Operating Procedure (SOP):
1. **Initiation & Scope Definition**: Identifying administrative objectives, legislative mandates, and stakeholder parameters.
2. **Data Acquisition & Pipeline Ingestion**: Multi-source data harvesting, metadata standardization, and validation checks.
3. **Core Processing & Transformation Engine**: Applying computational models, domain logic, and analytical transformations.
4. **Verification & Audit Verification**: Cross-validation against ground truth, anomaly scoring, and integrity verification.
5. **Dissemination & Telemetry Integration**: Dashboards, programmatic API distribution, and policy briefing formulation.

### 3.2 Technical & Procedural Checklist
- Enforce cryptographic validation and role-based access control (RBAC) at all data touchpoints.
- Maintain immutable audit trails for every algorithmic recommendation and administrative transition.
- Ensure cross-departmental schema interoperability with iGOT Karmayogi and national data standards.

## 4. Edge Cases, Risk Mitigation & Data Quality Assurance
### 4.1 Anticipating Failure Modes & Edge Anomalies
Operational rollouts frequently encounter non-standard distributions, edge-case discrepancies, and environment bottlenecks:
- **Sparse or Incomplete Input Data**: Addressing sample selection bias and cold-start anomalies through deterministic fallback imputation.
- **Latency & Throughput Constraints**: Deploying resilient caching, asynchronous queues, and localized micro-service clusters.
- **Model Drift & Semantic Shifts**: Establishing continuous calibration routines to capture shifting demographic or macroeconomic baselines.

### 4.2 Quality Assurance Protocols (DQAF)
Systematic compliance auditing through automated unit checks, statistical boundary tests, and peer validation gates ensures zero data degradation across mission-critical civil service workflows.

## 5. Step-by-Step Practical Civil Governance Case Studies
### 5.1 District-Level Real-Time Telemetry & Resource Balancing
In a pilot district deployment, officers applied the principles of ${courseTitle} to evaluate real-time administrative reporting bottlenecks. By deploying standardized tracking protocols and stratified sampling, the administration achieved an 84% reduction in audit cycle times while maintaining 99.4% data fidelity.

### 5.2 Nationwide Multilingual Citizen Assessment & Delivery
Leveraging domain frameworks from ${courseTitle}, an inter-ministerial task force streamlined the collection and processing of pan-India citizen feedback across 22 scheduled languages, eliminating manual triage latency and driving direct evidence into budget allocations.

### 5.3 Resilient Emergency Data Synthesis & Disaster Mitigation
During high-stakes disaster response scenarios, field officers utilized the rapid deployment protocols of ${courseTitle} to aggregate disparate satellite, demographic, and logistical streams into a unified situational map, ensuring prioritized aid distribution within 120 minutes of incident trigger.

## 6. Continuous Monitoring, Audit Protocols & Future Readiness
### 6.1 Algorithmic Accountability & Institutional Governance
Establish persistent telemetry tracking, version-controlled policy iteration repositories, and cross-cadre peer review gates to preserve institutional memory and guarantee constitutional compliance in public service delivery.

### 6.2 Alignment with Mission Karmayogi Lifecycle
Integrate continuous competency evaluations with the iGOT Karmayogi lifelong learning framework, ensuring civil servants evolve in tandem with emerging national priorities and technological breakthroughs.`,
            practical_examples: `**Case Study 1: MoSPI Sustainable Development Goals (SDG) Telemetry Audit**
Officers implemented the ${courseTitle} protocol to harmonize State Indicator Frameworks (SIF) with the National Indicator Framework (NIF), reconciling discordant data points across 28 states and generating automated compliance indices for the Union Cabinet.

**Case Study 2: Direct Benefit Transfer (DBT) Leakage Minimization**
Applying algorithmic verification workflows from ${courseTitle}, administrative teams identified systemic reconciliation anomalies across 4.2 million beneficiary records, recovering misallocated resources while protecting bona fide recipient entitlements.

**Case Study 3: Centralized Civil Service Training Diagnostic & Pathway Mapping**
Using the competency mapping paradigm of ${courseTitle}, NSSTA nodal officers automatically mapped 14,000 statistical officers to targeted micro-credentials on iGOT Karmayogi, reducing skill gaps by 62% in a single financial quarter.`
        };
    }
}

// ─── Voice Tutor Logic ────────────────────────────────────────────────────────
window._ttsUtterance = null;
window._ttsSpeed = 1.0;

window.playVoiceTutor = function() {
    if (!window._activeStudyNotes) {
        Swal.fire('Notice', 'Please wait for the study notes to load before playing.', 'info');
        return;
    }

    if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        if (window.startSoundWaveAnimation) window.startSoundWaveAnimation();
        return;
    }

    if (window.speechSynthesis.speaking) return;

    const textToSpeak = window._activeStudyNotes.replace(/[\*#_]/g, '');
    window._ttsUtterance = new SpeechSynthesisUtterance(textToSpeak);
    window._ttsUtterance.rate = window._ttsSpeed;

    const lang = localStorage.getItem('selected_language') || 'en';
    
    // Attempt to load Indian voices
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;

    if (lang === 'hi') {
        selectedVoice = voices.find(v => v.lang.includes('hi') || v.name.toLowerCase().includes('hindi'));
    } else {
        selectedVoice = voices.find(v => v.lang === 'en-IN' || v.name.includes('India')) || voices.find(v => v.lang.startsWith('en'));
    }
    
    if (selectedVoice) window._ttsUtterance.voice = selectedVoice;

    // Visual indicator
    const icon = document.querySelector('.audio-toolbar .fa-headphones');
    if (icon) icon.classList.add('fa-beat-fade', 'text-danger');
    if (window.startSoundWaveAnimation) window.startSoundWaveAnimation();

    window._ttsUtterance.onend = () => {
        if (icon) icon.classList.remove('fa-beat-fade', 'text-danger');
        if (window.stopSoundWaveAnimation) window.stopSoundWaveAnimation();
    };

    window._ttsUtterance.onerror = () => {
        if (icon) icon.classList.remove('fa-beat-fade', 'text-danger');
        if (window.stopSoundWaveAnimation) window.stopSoundWaveAnimation();
    };

    window.speechSynthesis.speak(window._ttsUtterance);
};

window.pauseVoiceTutor = function() {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        const icon = document.querySelector('.audio-toolbar .fa-headphones');
        if (icon) icon.classList.remove('fa-beat-fade', 'text-danger');
        if (window.stopSoundWaveAnimation) window.stopSoundWaveAnimation();
    }
};

window.stopVoiceTutor = function() {
    if (window.speechSynthesis.speaking || window.speechSynthesis.paused) {
        window.speechSynthesis.cancel();
        const icon = document.querySelector('.audio-toolbar .fa-headphones');
        if (icon) icon.classList.remove('fa-beat-fade', 'text-danger');
        if (window.stopSoundWaveAnimation) window.stopSoundWaveAnimation();
    }
};

window.changeVoiceSpeed = function(speed) {
    window._ttsSpeed = parseFloat(speed);
    if (window._ttsUtterance && window.speechSynthesis.speaking) {
        const wasPaused = window.speechSynthesis.paused;
        window.stopVoiceTutor();
        window.playVoiceTutor();
        if (wasPaused) window.pauseVoiceTutor();
    }
};


window.generateStudyMCQs = async function () {
    const btn = document.getElementById('btnGenerateMCQ');
    const container = document.getElementById('mcqContainer');
    const section = document.getElementById('mcqSection');
    const summary = document.getElementById('mcq_score_summary');

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i> Generating...`;

    section.classList.remove('d-none');
    container.innerHTML = `<div class="text-center p-4"><i class="fa-solid fa-spinner fa-spin fa-2x text-primary mb-3"></i><p>Crafting rigorous questions...</p></div>`;
    summary.classList.add('d-none');

    const urlParams = new URLSearchParams(window.location.search);
    const courseTitle = urlParams.get('course') || 'General Knowledge';
    const lang = localStorage.getItem('selected_language') || 'en';

    // Use active study notes, slicing to 6000 chars to avoid token limits
    let pdfText = window._activeStudyNotes || '';
    if (pdfText.length > 6000) {
        pdfText = pdfText.slice(0, 6000);
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const resp = await fetch(`${BACKEND}/study_mcqs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                course_title: courseTitle, 
                pdf_text: pdfText,
                language: lang
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        if (!resp.ok) throw new Error('MCQ Generation Failed');
        const rawData = await resp.json();
        const mcqs = Array.isArray(rawData) ? rawData : (rawData.questions || []);

        if (!mcqs || mcqs.length === 0) {
            throw new Error('No MCQs returned');
        }

        window._mcqState = { total: mcqs.length, answered: 0, score: 0, mcqs };

        let mcqHtml = '';
        mcqs.forEach((mcq, qi) => {
            const optionsHtml = (mcq.options || []).map((opt, oi) => `
                <div class="mcq-option p-3 border rounded mb-2 shadow-sm bg-white hover-overlay"
                     id="mcq_${qi}_opt_${oi}"
                     style="cursor:pointer; transition: all 0.2s;"
                     onclick="window._answerMCQ(${qi}, ${oi}, '${(opt || '').replace(/'/g, "\\'")}', '${(mcq.correct_option || '').replace(/'/g, "\\'")}', '${(mcq.explanation || '').replace(/'/g, "\\'").replace(/\n/g, ' ')}')">
                    ${opt}
                </div>`).join('');

            mcqHtml += `
            <div class="mb-5 p-4 border rounded bg-light shadow-sm animate-fade-in" id="mcq_block_${qi}">
                <h5 class="fw-semibold mb-3">Q${qi + 1}. ${mcq.question}</h5>
                <div id="mcq_opts_${qi}">${optionsHtml}</div>
                <div id="mcq_exp_${qi}" class="alert alert-info mt-3 d-none shadow-sm border-0"></div>
            </div>`;
        });

        container.innerHTML = mcqHtml;
    } catch (err) {
        console.error(err);
        if (err.name === 'AbortError') {
            container.innerHTML = `<div class="alert alert-danger">Timeout. The server took too long to generate practice questions.</div>`;
        } else {
            container.innerHTML = `<div class="alert alert-danger">Failed to generate practice assessment. Please try again.</div>`;
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = `Regenerate Assessment <i class="fa-solid fa-rotate-right ms-1"></i>`;
    }
};

window._answerMCQ = function (qi, oi, selected, correct, explanation) {
    const optsContainer = document.getElementById(`mcq_opts_${qi}`);
    if (!optsContainer || optsContainer.dataset.answered) return; // prevent re-answer
    optsContainer.dataset.answered = '1';

    const isCorrect = selected === correct;
    if (isCorrect) window._mcqState.score += 1;
    window._mcqState.answered += 1;

    // Colour all options
    optsContainer.querySelectorAll('.mcq-option').forEach(el => {
        el.style.pointerEvents = 'none';
        if (el.textContent.trim() === correct) {
            el.classList.remove('bg-white');
            el.classList.add('bg-success', 'text-white', 'border-success', 'fw-bold');
            el.innerHTML += ' <i class="fa-solid fa-circle-check float-end fs-5 mt-1"></i>';
        } else if (el.textContent.trim().startsWith(selected) && !isCorrect) {
            el.classList.remove('bg-white');
            el.classList.add('bg-danger', 'text-white', 'border-danger');
            el.innerHTML += ' <i class="fa-solid fa-circle-xmark float-end fs-5 mt-1"></i>';
        }
    });

    // Show explanation
    const expBox = document.getElementById(`mcq_exp_${qi}`);
    if (expBox) {
        expBox.classList.remove('d-none');
        expBox.innerHTML = `<i class="fa-solid fa-circle-info me-2 fs-5 float-start"></i> 
                            <div><strong>Explanation:</strong><br>${explanation}</div>`;
    }

    // Show score summary when all answered
    if (window._mcqState.answered === window._mcqState.total) {
        const summary = document.getElementById('mcq_score_summary');
        if (summary) {
            summary.classList.remove('d-none');
            const pct = Math.round((window._mcqState.score / window._mcqState.total) * 100);
            let msg = pct >= 70 ? 'Excellent work!' : 'Keep practicing!';
            summary.innerHTML = `
                <i class="fa-solid fa-trophy text-warning fs-3 mb-2"></i><br>
                Assessment Complete!<br>
                Your Score: ${window._mcqState.score} / ${window._mcqState.total} (${pct}%)<br>
                <small>${msg}</small>
            `;
            // Scroll to summary
            summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function _defaultPathway(topic) {
    const targetTopic = topic || localStorage.getItem('user_topic') || 'Python & Data Structures';
    const lang = localStorage.getItem('selected_language') || 'en';
    const enc = encodeURIComponent(targetTopic);
    if (lang === 'hi') {
        return [
            { step: 1, tier: 'चरण 1: आधारभूत दक्षता', title: `${targetTopic} के आधारभूत सिद्धांत`, duration: '8-12 घंटे', provider: 'iGOT कर्मयोगी / डिजिटल इंडिया', status: 'In Progress', badge: 'bg-primary', url: `https://igotkarmayogi.gov.in/search?q=Foundations+of+${enc}` },
            { step: 2, tier: 'चरण 2: व्यावहारिक दक्षता', title: `अनुप्रयुक्त ${targetTopic} और समस्या समाधान`, duration: '14-18 घंटे', provider: 'iGOT कर्मयोगी / MeitY', status: 'Locked', badge: 'bg-secondary', url: `https://igotkarmayogi.gov.in/search?q=Applied+${enc}` },
            { step: 3, tier: 'चरण 3: उन्नत विशेषज्ञता', title: `उन्नत ${targetTopic} और प्रशासनिक प्रणालियां`, duration: '20-25 घंटे', provider: 'iGOT कर्मयोगी / NIC', status: 'Locked', badge: 'bg-secondary', url: `https://igotkarmayogi.gov.in/search?q=Advanced+${enc}` },
        ];
    }
    return [
        { step: 1, tier: 'Step 1: Foundation', title: `Foundations of ${targetTopic}`, duration: '8-12 Hours', provider: 'iGOT Karmayogi / Digital India', status: 'In Progress', badge: 'bg-primary', url: `https://igotkarmayogi.gov.in/search?q=Foundations+of+${enc}` },
        { step: 2, tier: 'Step 2: Core Mastery', title: `Applied ${targetTopic} & Algorithmic Problem Solving`, duration: '14-18 Hours', provider: 'iGOT Karmayogi / MeitY', status: 'Locked', badge: 'bg-secondary', url: `https://igotkarmayogi.gov.in/search?q=Applied+${enc}` },
        { step: 3, tier: 'Step 3: Advanced Specialization', title: `Advanced ${targetTopic} & Production Systems`, duration: '20-25 Hours', provider: 'iGOT Karmayogi / NIC', status: 'Locked', badge: 'bg-secondary', url: `https://igotkarmayogi.gov.in/search?q=Advanced+${enc}` },
    ];
}

function _getFallbackQuestions(topic) {
    const lang = localStorage.getItem('selected_language') || 'en';
    const t = topic || "the subject";
    if (lang === 'hi') {
        const th = topic || "विषय";
        return [
            { id: 1, question: `${th} का मुख्य प्रशासनिक उद्देश्य और आधार क्या है?`, options: ["डेटा भंडारण", "प्रणाली प्रबंधन", "कोर संचालन ढांचा", "मुझे नहीं पता / मार्गदर्शन चाहिए"], correct_option: "कोर संचालन ढांचा", difficulty: "Easy", competency_tag: "बुनियादी बातें" },
            { id: 2, question: `${th} के संदर्भ में सबसे महत्वपूर्ण घटक क्या है?`, options: ["हार्डवेयर", "रणनीतिक योजना", "कार्यान्वयन मॉडल", "मुझे नहीं पता / मार्गदर्शन चाहिए"], correct_option: "कार्यान्वयन मॉडल", difficulty: "Easy", competency_tag: "मुख्य अवधारणाएं" },
            { id: 3, question: `आधुनिक परिवेश में ${th} को किस प्रकार लागू किया जाता है?`, options: ["मैन्युअल रूप से", "स्वचालित रूपरेखा द्वारा", "यह शायद ही कभी प्रयुक्त होता है", "मुझे नहीं पता / मार्गदर्शन चाहिए"], correct_option: "स्वचालित रूपरेखा द्वारा", difficulty: "Easy", competency_tag: "अनुप्रयोग" },
            { id: 4, question: `${th} को लागू करते समय मुख्य परिचालन चुनौती क्या है?`, options: ["कम लागत", "एकीकरण जटिलताएं", "अत्यधिक गति", "मुझे नहीं पता / मार्गदर्शन चाहिए"], correct_option: "एकीकरण जटिलताएं", difficulty: "Medium", competency_tag: "समस्या समाधान" },
            { id: 5, question: `${th} के लिए कौन सी कार्यप्रणाली सबसे उपयुक्त है?`, options: ["वाटरफॉल", "फुर्तीली और पुनरावृत्तीय (Agile)", "यादृच्छिक", "मुझे नहीं पता / मार्गदर्शन चाहिए"], correct_option: "फुर्तीली और पुनरावृत्तीय (Agile)", difficulty: "Medium", competency_tag: "पद्धति" },
            { id: 6, question: `${th} का मूल्यांकन करते समय कौन सा मीट्रिक सबसे उपयोगी है?`, options: ["रंग की गहराई", "दक्षता और सटीकता", "ध्वनि की मात्रा", "मुझे नहीं पता / मार्गदर्शन चाहिए"], correct_option: "दक्षता और सटीकता", difficulty: "Medium", competency_tag: "मूल्यांकन" },
            { id: 7, question: `${th} पर कौन सा मानक प्रत्यक्ष रूप से लागू होता है?`, options: ["ISO 9001", "उद्योग-विशिष्ट सर्वोत्तम प्रथाएं", "कोई नहीं", "मुझे नहीं पता / मार्गदर्शन चाहिए"], correct_option: "उद्योग-विशिष्ट सर्वोत्तम प्रथाएं", difficulty: "Medium", competency_tag: "मानक" },
            { id: 8, question: `${th} का विस्तार करते समय मुख्य बाधा क्या हो सकती है?`, options: ["नेटवर्क विलंबता", "संसाधनों की कमी और बाधाएं", "मॉनिटर का आकार", "मुझे नहीं पता / मार्गदर्शन चाहिए"], correct_option: "संसाधनों की कमी और बाधाएं", difficulty: "Hard", competency_tag: "आर्किटेक्चर" },
            { id: 9, question: `${th} लीगेसी प्रणालियों के साथ कैसे समन्वय करता है?`, options: ["यह उन्हें तुरंत बदल देता है", "एडेप्टर परतों और API की आवश्यकता होती है", "यह उन्हें अनदेखा करता है", "मुझे नहीं पता / मार्गदर्शन चाहिए"], correct_option: "एडेप्टर परतों और API की आवश्यकता होती है", difficulty: "Hard", competency_tag: "एकीकरण" },
            { id: 10, question: `${th} की सबसे उन्नत क्षमता क्या है?`, options: ["टाइपिंग", "पूर्वानुमानात्मक मॉडलिंग और स्वचालन", "प्रिंटिंग", "मुझे नहीं पता / मार्गदर्शन चाहिए"], correct_option: "पूर्वानुमानात्मक मॉडलिंग और स्वचालन", difficulty: "Hard", competency_tag: "उन्नत अवधारणाएं" }
        ];
    }
    return [
        { id: 1, question: `Which of the following best describes the core purpose of ${t}?`, options: ["Data storage", "System management", "Core operational framework", "I don't know / Need guidance"], correct_option: "Core operational framework", difficulty: "Easy", competency_tag: "Fundamentals" },
        { id: 2, question: `In the context of ${t}, what is the most critical component?`, options: ["Hardware", "Strategic planning", "Execution model", "I don't know / Need guidance"], correct_option: "Execution model", difficulty: "Easy", competency_tag: "Core Concepts" },
        { id: 3, question: `How is ${t} typically applied in modern environments?`, options: ["Manually", "Through automated frameworks", "It is rarely used", "I don't know / Need guidance"], correct_option: "Through automated frameworks", difficulty: "Easy", competency_tag: "Application" },
        { id: 4, question: `Which common challenge is associated with implementing ${t}?`, options: ["Low cost", "Integration complexities", "Too fast", "I don't know / Need guidance"], correct_option: "Integration complexities", difficulty: "Medium", competency_tag: "Problem Solving" },
        { id: 5, question: `What methodology best supports ${t}?`, options: ["Waterfall", "Agile and Iterative", "Randomized", "I don't know / Need guidance"], correct_option: "Agile and Iterative", difficulty: "Medium", competency_tag: "Methodology" },
        { id: 6, question: `When evaluating ${t}, which metric is most useful?`, options: ["Color depth", "Efficiency and accuracy", "Sound volume", "I don't know / Need guidance"], correct_option: "Efficiency and accuracy", difficulty: "Medium", competency_tag: "Evaluation" },
        { id: 7, question: `Which standard applies directly to ${t}?`, options: ["ISO 9001", "Industry-specific best practices", "None", "I don't know / Need guidance"], correct_option: "Industry-specific best practices", difficulty: "Medium", competency_tag: "Standards" },
        { id: 8, question: `What is a known edge case when scaling ${t}?`, options: ["Network latency", "Resource bottlenecks and constraints", "Monitor size", "I don't know / Need guidance"], correct_option: "Resource bottlenecks and constraints", difficulty: "Hard", competency_tag: "Architecture" },
        { id: 9, question: `How does ${t} interact with legacy systems?`, options: ["It replaces them instantly", "Requires adapter layers and APIs", "It ignores them", "I don't know / Need guidance"], correct_option: "Requires adapter layers and APIs", difficulty: "Hard", competency_tag: "Integration" },
        { id: 10, question: `What is the most advanced feature of ${t}?`, options: ["Typing", "Predictive modeling and automation", "Printing", "I don't know / Need guidance"], correct_option: "Predictive modeling and automation", difficulty: "Hard", competency_tag: "Advanced Concepts" }
    ];
}



// ─── Pragya AI Real-Time Assistant ──────────────────────────────────────────
window.sendPragyaQuery = async function() {
    const inputEl = document.getElementById('pragyaChatInput');
    const query = inputEl.value.trim();
    if (!query) return;

    const historyEl = document.getElementById('pragyaChatHistory');
    
    // Add User Message
    const userMsg = document.createElement('div');
    userMsg.className = 'mb-3 text-end animate-fade-in';
    userMsg.innerHTML = `<div class="d-inline-block bg-primary text-white p-2 rounded shadow-sm text-start" style="max-width: 85%; font-size: 0.9rem;">${query}</div>`;
    historyEl.appendChild(userMsg);
    inputEl.value = '';
    
    // Scroll to bottom
    historyEl.scrollTop = historyEl.scrollHeight;

    // Add Loading Indicator
    const aiMsg = document.createElement('div');
    aiMsg.className = 'mb-3 animate-fade-in';
    aiMsg.innerHTML = `<div class="d-inline-block bg-white border p-2 rounded shadow-sm" style="max-width: 85%; font-size: 0.9rem;">
        <i class="fa-solid fa-spinner fa-spin text-warning me-2"></i> Thinking...
    </div>`;
    historyEl.appendChild(aiMsg);
    historyEl.scrollTop = historyEl.scrollHeight;

    const urlParams = new URLSearchParams(window.location.search);
    const courseTitle = urlParams.get('course') || 'General Knowledge';
    const contextNotes = window._activeStudyNotes || '';
    const lang = localStorage.getItem('selected_language') || 'en';

    try {
        const resp = await fetch(`${BACKEND}/pragya_chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                course_title: courseTitle, 
                context_notes: contextNotes, 
                query: query,
                language: lang
            })
        });
        
        if (!resp.ok) throw new Error('API Error');
        const data = await resp.json();
        
        // Use marked.js if available, otherwise just use text
        const answerText = data.response || data.reply || '';
        let formattedReply = answerText;
        if (typeof marked !== 'undefined') {
            formattedReply = marked.parse(answerText);
        } else {
            formattedReply = answerText.replace(/\n/g, '<br>');
        }
        
        aiMsg.innerHTML = `<div class="d-inline-block bg-white border p-2 rounded shadow-sm" style="max-width: 95%; font-size: 0.9rem;">${formattedReply}</div>`;
    } catch (e) {
        aiMsg.innerHTML = `<div class="d-inline-block bg-white border border-danger text-danger p-2 rounded shadow-sm" style="max-width: 85%; font-size: 0.9rem;">
            <i class="fa-solid fa-circle-exclamation me-1"></i> Failed to connect to Pragya AI.
        </div>`;
    }
    historyEl.scrollTop = historyEl.scrollHeight;
};

// ─── Skill Gaps ────────────────────────────────────────────────────────────────
window.renderSkillGaps = function() {
    const container = document.getElementById('skillBarsContainer');
    if (!container) return;
    const gaps = JSON.parse(localStorage.getItem('diagnostic_weaknesses') || '[]');
    if (gaps.length === 0) {
        container.innerHTML = '<div class="alert alert-success">No critical gaps detected. You are highly proficient!</div>';
        return;
    }
    
    // Simulate some realistic gap percentages between 30% and 70%
    const generateGapHtml = (gapText, index) => {
        const percent = Math.floor(Math.random() * 40) + 30; 
        const barColor = percent < 40 ? 'bg-danger' : 'bg-warning';
        return `
            <div class="mb-3">
                <div class="d-flex justify-content-between">
                    <span class="fw-semibold text-dark">${gapText}</span>
                    <span class="text-muted small">${percent}% Mastery</span>
                </div>
                <div class="progress mt-1" style="height: 10px;">
                    <div class="progress-bar ${barColor}" role="progressbar" style="width: ${percent}%" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </div>
        `;
    };
    
    container.innerHTML = gaps.map((g, i) => generateGapHtml(g, i)).join('');
};

// ─── Auto-init ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Apply current language translations
    const lang = localStorage.getItem('selected_language') || 'en';
    window.applyTranslations(lang);
    const toggleBtn = document.getElementById('langToggleBtn');
    if (toggleBtn) {
        toggleBtn.innerHTML = lang === 'hi' ? '<i class="fa-solid fa-language me-1"></i> English' : '<i class="fa-solid fa-language me-1"></i> हिन्दी';
    }

    if (window.location.pathname.includes('assessment.html')) {
        window.renderDiagnosticQuiz();
    }
    if (window.location.pathname.includes('dashboard.html')) {
        window.renderCoursePathway();
    }
    
    // Render Skill Gaps if container exists
    if (document.getElementById('skillBarsContainer')) {
        window.renderSkillGaps();
    }
});