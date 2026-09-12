function renderRadarChart(canvasId, topic) {
    const container = document.getElementById('competencyListContainer') || document.getElementById(canvasId);
    if (!container) return;

    let compData = {};
    try {
        compData = JSON.parse(sessionStorage.getItem('kp_competency') || localStorage.getItem('kp_competency') || localStorage.getItem('diagnostic_competencies') || '{}');
    } catch (e) {
        console.warn('Could not parse competencies');
    }

    const isHi = localStorage.getItem('selected_language') === 'hi' || (typeof getUserSession === 'function' && getUserSession().language === 'hi');
    const keys = Object.keys(compData);

    // Fallback default skills if empty
    if (keys.length === 0) {
        const defaultSkills = [
            { name: isHi ? 'मूल सिद्धांत एवं शासन ढांचा' : 'Core Foundations & Governance', score: 100 },
            { name: isHi ? 'नीतिगत नैतिकता एवं रूपरेखा' : 'Policy Ethics & Frameworks', score: 40 },
            { name: isHi ? 'व्यावहारिक क्रियान्वयन' : 'Practical Implementation', score: 20 },
            { name: isHi ? 'जोखिम एवं डेटा प्रबंधन' : 'Risk & Data Management', score: 0 }
        ];
        container.innerHTML = defaultSkills.map(s => _renderSkillCard(s.name, s.score, isHi)).join('');
        return;
    }

    // Render each tested competency as a clear status card
    container.innerHTML = keys.map(k => {
        const item = compData[k];
        const pct = item && item.total ? Math.round((item.correct / item.total) * 100) : (item?.score || 0);
        return _renderSkillCard(k, pct, isHi);
    }).join('');
}

function _renderSkillCard(skillName, percentage, isHi = false) {
    let badgeClass = 'bg-danger text-white';
    let badgeIcon = 'fa-triangle-exclamation';
    let statusText = isHi ? 'प्रशिक्षण आवश्यक' : 'Needs Training';
    let barColor = 'bg-danger';

    if (percentage >= 80) {
        badgeClass = 'bg-success text-white';
        badgeIcon = 'fa-circle-check';
        statusText = isHi ? 'दक्ष (तैयार)' : 'Ready / Proficient';
        barColor = 'bg-success';
    } else if (percentage >= 40) {
        badgeClass = 'bg-warning text-dark';
        badgeIcon = 'fa-clock';
        statusText = isHi ? 'प्रगति पर' : 'Developing';
        barColor = 'bg-warning';
    }

    return `
    <div class="p-3 rounded border bg-light shadow-sm">
        <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="fw-bold text-dark fs-6">
                ${skillName}
            </span>
            <span class="badge ${badgeClass} px-2 py-1 rounded-pill small">
                <i class="fa-solid ${badgeIcon} me-1"></i>${statusText}
            </span>
        </div>
        <div class="d-flex align-items-center gap-3">
            <div class="progress flex-grow-1" style="height: 12px; border-radius: 8px; background-color: #E2E8F0;">
                <div class="progress-bar ${barColor} progress-bar-striped" 
                     role="progressbar" 
                     style="width: ${percentage}%; transition: width 0.8s ease;" 
                     aria-valuenow="${percentage}" 
                     aria-valuemin="0" 
                     aria-valuemax="100">
                </div>
            </div>
            <span class="fw-bold text-dark" style="min-width: 45px; text-align: right;">${percentage}%</span>
        </div>
    </div>`;
}

window.renderRadarChart = renderRadarChart;

// Auto-initialize if container exists
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('competencyListContainer') || document.getElementById('competencyRadarChart')) {
        renderRadarChart('competencyListContainer', localStorage.getItem('user_topic') || 'statistics');
    }
});
