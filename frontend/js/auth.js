// Session management

function initUserSession(name, topic, lang = 'en') {
    localStorage.setItem('user_name', name);
    localStorage.setItem('user_topic', topic);
    localStorage.setItem('selected_language', lang);
    localStorage.setItem('diagnostic_score', '0');
    localStorage.setItem('skill_level', 'Beginner');
    localStorage.setItem('active_course_pathway', JSON.stringify([]));
}

function getUserSession() {
    let pragyaUser = null;
    try {
        pragyaUser = JSON.parse(sessionStorage.getItem('pragya_user'));
    } catch (e) {}

    return {
        name: (pragyaUser && (pragyaUser.full_name || pragyaUser.username)) || localStorage.getItem('user_name') || '',
        topic: (pragyaUser && (pragyaUser.topic || pragyaUser.department)) || localStorage.getItem('user_topic') || '',
        language: localStorage.getItem('selected_language') || (pragyaUser && pragyaUser.language) || 'en',
        score: parseInt(localStorage.getItem('diagnostic_score') || '0'),
        level: localStorage.getItem('skill_level') || 'Beginner',
        pathway: JSON.parse(localStorage.getItem('active_course_pathway') || '[]'),
        
        // Backward compatibility for earlier views
        id: (pragyaUser && (pragyaUser.username || pragyaUser.id)) || localStorage.getItem('current_user_id') || 'ISS_104',
        fullName: (pragyaUser && pragyaUser.full_name) || localStorage.getItem('current_user_name') || 'Aditya Sharma (SSO)'
    };
}

function setLanguage(lang) {
    localStorage.setItem('selected_language', lang);
    // Optional: emit event or trigger reload
}

// Keep original getActiveUser and clearSession for backwards compatibility
function getActiveUser() {
    return {
        id: localStorage.getItem('current_user_id') || 'ISS_104',
        name: localStorage.getItem('current_user_name') || 'Aditya Sharma (SSO)'
    };
}

function clearSession() {
    signOut();
}

function signOut() {
    sessionStorage.clear();
    localStorage.clear();
    window.location.replace('/login.html');
}

// ─── Role-Based Sidebar Access Control (RBAC) ────────────────────────────────
// Dynamically hides admin-only sidebar links for non-admin/non-supervisor users.
// Any sidebar link with data-role="admin-only" will be removed from the DOM
// unless the user's role (from sessionStorage 'pragya_user') is 'supervisor' or 'admin'.
(function enforceRoleSidebar() {
    function applySidebarRBAC() {
        let userRole = 'officer'; // default
        try {
            const raw = sessionStorage.getItem('pragya_user');
            if (raw) {
                const u = JSON.parse(raw);
                userRole = (u.role || 'officer').toLowerCase();
            }
        } catch (e) {}

        const isAdmin = (userRole === 'supervisor' || userRole === 'admin');

        document.querySelectorAll('[data-role="admin-only"]').forEach(el => {
            if (!isAdmin) {
                el.style.display = 'none';
                el.setAttribute('aria-hidden', 'true');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applySidebarRBAC);
    } else {
        applySidebarRBAC();
    }
})();
