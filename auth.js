var API_BASE_URL = window.API_BASE_URL || 'http://127.0.0.1:8000';

const TOKEN_KEY_ACCESS = 'access_token';
const TOKEN_KEY_REFRESH = 'refresh_token';

function getAccessToken() {
    return localStorage.getItem(TOKEN_KEY_ACCESS);
}

function getRefreshToken() {
    return localStorage.getItem(TOKEN_KEY_REFRESH);
}

function setTokens(access, refresh) {
    if (access) localStorage.setItem(TOKEN_KEY_ACCESS, access);
    if (refresh) localStorage.setItem(TOKEN_KEY_REFRESH, refresh);
}

function clearTokens() {
    localStorage.removeItem(TOKEN_KEY_ACCESS);
    localStorage.removeItem(TOKEN_KEY_REFRESH);
}

function isAuthenticated() {
    return !!getAccessToken();
}

async function refreshAccessToken() {
    const refresh = getRefreshToken();
    if (!refresh) {
        clearTokens();
        return null;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/user/token/refresh/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refresh })
        });

        if (!response.ok) {
            clearTokens();
            return null;
        }

        const data = await response.json();
        if (data.access) {
            localStorage.setItem(TOKEN_KEY_ACCESS, data.access);
            return data.access;
        }
        return null;
    } catch {
        clearTokens();
        return null;
    }
}

async function authenticatedFetch(url, options = {}, autoRedirect = false) {
    let token = getAccessToken();

    options.headers = options.headers || {};
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(url, options);

    if (response.status === 401 && getRefreshToken()) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            options.headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(url, options);
        } else if (autoRedirect) {
            const currentPath = window.location.pathname + window.location.search;
            window.location.href = `login.html?next=${encodeURIComponent(currentPath)}`;
        }
    }

    return response;
}

async function getCurrentUser() {
    if (!isAuthenticated()) return null;

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/user/me/`, {}, false);
        if (response.ok) {
            return await response.json();
        }
    } catch {}
    return null;
}

function logout() {
    clearTokens();
    window.location.href = 'login.html';
}

function redirectIfAuthenticated() {
    if (isAuthenticated()) {
        window.location.href = 'index.html';
    }
}

async function requireAuth() {
    if (!isAuthenticated()) {
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `login.html?next=${encodeURIComponent(currentPath)}`;
        return null;
    }

    const user = await getCurrentUser();
    if (!user) {
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `login.html?next=${encodeURIComponent(currentPath)}`;
        return null;
    }
    return user;
}

async function updateAuthUI() {
    const authNav = document.getElementById('authNav');
    if (!authNav) return;

    if (!isAuthenticated()) {
        authNav.innerHTML = `
            <a href="login.html" class="btn btn-secondary btn-sm">Вхід</a>
            <a href="register.html" class="btn btn-primary btn-sm">Реєстрація</a>
        `;
        return;
    }

    const user = await getCurrentUser();
    if (!user) {
        authNav.innerHTML = `
            <a href="login.html" class="btn btn-secondary btn-sm">Вхід</a>
            <a href="register.html" class="btn btn-primary btn-sm">Реєстрація</a>
        `;
        return;
    }

    const displayName = user.first_name || user.username;
    const adminBadge = user.is_staff ? '<span class="admin-badge">Admin</span>' : '';

    authNav.innerHTML = `
        <span class="user-greeting">Привіт, <strong>${displayName}</strong> ${adminBadge}</span>
        ${user.is_staff ? '<a href="admin.html" class="btn btn-accent btn-sm">Керування</a>' : ''}
        <button class="btn btn-secondary btn-sm" id="logoutBtn">Вийти</button>
    `;

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
});
