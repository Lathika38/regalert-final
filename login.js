// ─────────────────────────────────────────────────────────────────────────────
// login.js — Handles Authentication UI and JWT processing
// ─────────────────────────────────────────────────────────────────────────────

let isRegisterMode = false;

// If user is already logged in, redirect to dashboard
if (localStorage.getItem('ra_token')) {
    window.location.href = 'index.html';
}

function toggleAuthMode() {
    isRegisterMode = !isRegisterMode;
    const box = document.getElementById('auth-box');
    const btn = document.getElementById('submit-btn');
    const sText = document.getElementById('switch-text');
    const sLink = document.getElementById('switch-link');
    const errorMsg = document.getElementById('error-msg');

    errorMsg.style.display = 'none';

    if (isRegisterMode) {
        box.classList.add('mode-register');
        btn.innerHTML = 'Create Workspace <i class="fa fa-check ml-2"></i>';
        sText.textContent = 'Already have an account?';
        sLink.textContent = 'Sign in here';
    } else {
        box.classList.remove('mode-register');
        btn.innerHTML = 'Secure Login <i class="fa fa-arrow-right ml-2"></i>';
        sText.textContent = "Don't have an account?";
        sLink.textContent = 'Create workspace';
    }
}

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const btn = document.getElementById('submit-btn');
    const errorMsg = document.getElementById('error-msg');

    if (!email || !password) return;

    btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Authenticating...';
    btn.disabled = true;
    errorMsg.style.display = 'none';

    try {
        let res;

        if (isRegisterMode) {
            const name = document.getElementById('reg-name').value.trim() || 'Admin User';
            const company = document.getElementById('reg-company').value.trim() || 'My Startup';
            // Call register API
            res = await API.post('/api/auth/register', { name, email, password, companyName: company });
        } else {
            // Call login API
            res = await API.post('/api/auth/login', { email, password });
        }

        if (res && res.success) {
            // Save Token and User Info to LocalStorage!
            localStorage.setItem('ra_token', res.token);
            localStorage.setItem('ra_user', JSON.stringify(res.user));

            // Update local profile immediately so index.html loads right away perfectly
            localStorage.setItem('ra_profile', JSON.stringify({
                name: res.user.companyName || 'My Startup',
                sector: 'FinTech / Payments',
                hq: 'India'
            }));

            showToast('✅ Verification successful. Securing connection...', 'success');

            // Redirect to dashboard after a tiny delay for the cool factor
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);

        } else {
            errorMsg.textContent = res ? res.message : 'Server offline. Ensure backend is running.';
            errorMsg.style.display = 'block';
            btn.disabled = false;
            btn.innerHTML = isRegisterMode ? 'Create Workspace <i class="fa fa-check ml-2"></i>' : 'Secure Login <i class="fa fa-arrow-right ml-2"></i>';
        }
    } catch (err) {
        errorMsg.textContent = 'Connection error. Please try again.';
        errorMsg.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = 'Try Again';
    }
});

// Simple Toast function for login page
function showToast(msg, type) {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.style = `background: ${type === 'success' ? '#10b981' : '#ef4444'}; color: white; padding: 12px 20px; border-radius: 8px; font-size: 0.9rem; font-weight: 500; box-shadow: 0 10px 25px rgba(0,0,0,0.3); animation: slideInRight 0.3s ease forwards;`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => {
        t.style.opacity = '0';
        t.style.transform = 'translateX(100%)';
        t.style.transition = 'all 0.3s ease';
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

// Add animation keyframes dynamically
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(style);
