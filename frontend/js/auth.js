// Session management & RBAC Access Control

function initUserSession(name, topic, lang = 'en') {
    localStorage.setItem('user_name', name);
    localStorage.setItem('userName', name);
    localStorage.setItem('user_topic', topic);
    localStorage.setItem('selected_language', lang);
    localStorage.setItem('diagnostic_score', '0');
    localStorage.setItem('skill_level', 'Beginner');
    localStorage.setItem('active_course_pathway', JSON.stringify([]));
}

function getUserSession() {
    let pragyaUser = null;
    try {
        const raw = sessionStorage.getItem('pragya_user') || localStorage.getItem('pragya_user') || localStorage.getItem('currentUser');
        if (raw) {
            pragyaUser = typeof raw === 'string' && (raw.startsWith('{') || raw.startsWith('[')) ? JSON.parse(raw) : { name: raw };
        }
    } catch (e) {}

    const name = (pragyaUser && (pragyaUser.full_name || pragyaUser.name || pragyaUser.username)) || 
                 localStorage.getItem('userName') || localStorage.getItem('user_name') || localStorage.getItem('current_user_name') || 'Aditya Sharma (SSO)';
    const role = (pragyaUser && (pragyaUser.role || pragyaUser.userRole)) || localStorage.getItem('userRole') || 'officer';
    const topic = (pragyaUser && (pragyaUser.topic || pragyaUser.department)) || localStorage.getItem('user_topic') || 'MoSPI';
    const language = localStorage.getItem('selected_language') || (pragyaUser && pragyaUser.language) || 'en';

    // Synchronize to standard keys in localStorage
    try {
        if (!localStorage.getItem('userName')) localStorage.setItem('userName', name);
        if (!localStorage.getItem('userRole')) localStorage.setItem('userRole', role);
        if (!localStorage.getItem('currentUser') && pragyaUser) localStorage.setItem('currentUser', JSON.stringify(pragyaUser));
    } catch (e) {}

    return {
        name: name,
        role: role,
        topic: topic,
        language: language,
        score: parseInt(localStorage.getItem('diagnostic_score') || '0'),
        level: localStorage.getItem('skill_level') || 'Beginner',
        pathway: JSON.parse(localStorage.getItem('active_course_pathway') || '[]'),
        
        // Backward compatibility for earlier views
        id: (pragyaUser && (pragyaUser.username || pragyaUser.id)) || localStorage.getItem('current_user_id') || 'ISS_104',
        fullName: name
    };
}

function setLanguage(lang) {
    localStorage.setItem('selected_language', lang);
}

function getActiveUser() {
    return {
        id: localStorage.getItem('current_user_id') || 'ISS_104',
        name: localStorage.getItem('userName') || localStorage.getItem('current_user_name') || 'Aditya Sharma (SSO)'
    };
}

function clearSession() {
    signOut();
}

function signOut() {
    sessionStorage.clear();
    localStorage.clear();
    window.location.replace('login.html');
}

// ─── Role-Based Sidebar Access Control (RBAC) ────────────────────────────────
// Dynamically hides admin-only sidebar links for non-admin/non-supervisor users.
// Any sidebar link with data-role="admin-only" or pointing to admin.html is hidden/removed
// unless the user's role is 'supervisor' or 'admin'.
(function enforceRoleSidebar() {
    function getStoredRole() {
        let userRole = 'officer';
        try {
            const raw = sessionStorage.getItem('pragya_user') || localStorage.getItem('pragya_user') || localStorage.getItem('currentUser');
            if (raw) {
                const u = typeof raw === 'string' && (raw.startsWith('{') || raw.startsWith('[')) ? JSON.parse(raw) : { role: raw };
                userRole = (u.role || u.userRole || 'officer').toLowerCase();
            } else {
                userRole = (localStorage.getItem('userRole') || 'officer').toLowerCase();
            }
        } catch (e) {}
        return userRole;
    }

    function applySidebarRBAC() {
        const userRole = getStoredRole();
        const isAdmin = (userRole === 'supervisor' || userRole === 'admin');
        const isCurrentPageAdmin = window.location.pathname.endsWith('admin.html');

        if (!isAdmin && !isCurrentPageAdmin) {
            // Immediately inject stylesheet to prevent any flash of admin links
            if (!document.getElementById('rbac-hide-admin-style')) {
                const style = document.createElement('style');
                style.id = 'rbac-hide-admin-style';
                style.textContent = '[data-role="admin-only"], a[href*="admin.html"]:not(.allow-admin) { display: none !important; visibility: hidden !important; pointer-events: none !important; }';
                (document.head || document.documentElement).appendChild(style);
            }

            // Remove or hide all admin-only elements from DOM
            const adminElements = document.querySelectorAll('[data-role="admin-only"], a[href*="admin.html"]');
            adminElements.forEach(el => {
                el.style.setProperty('display', 'none', 'important');
                el.setAttribute('aria-hidden', 'true');
                if (el.parentNode) {
                    el.parentNode.removeChild(el);
                }
            });
        }
    }

    // Execute immediately for fast DOM interception
    applySidebarRBAC();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applySidebarRBAC);
    }
    // Also run after window load in case dynamic menus were rendered
    window.addEventListener('load', applySidebarRBAC);
})();
