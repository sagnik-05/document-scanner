// public/js/auth.js
class AuthManager {
    constructor() {
        // DOM Elements
        this.loginForm = document.getElementById('loginFormElement');
        this.registerForm = document.getElementById('registerFormElement');
        this.navLogin = document.getElementById('navLogin');
        this.navRegister = document.getElementById('navRegister');
        this.navDashboard = document.getElementById('navDashboard');
        this.navAnalytics = document.getElementById('navAnalytics');
        this.navLogout = document.getElementById('navLogout');
        this.authForms = document.getElementById('authForms');
        this.dashboard = document.getElementById('dashboard');
        this.analytics = document.getElementById('analytics');
        this.switchToLoginLink = document.getElementById('switchToLogin');
        this.switchToRegisterLink = document.getElementById('switchToRegister');
        this.userWelcome = document.getElementById('userWelcome');

        // Bind event listeners
        this.bindEvents();
        // Check authentication status on load
        this.checkAuthStatus();
    }

    bindEvents() {
        // Navigation events
        this.navLogin.addEventListener('click', () => this.showLoginForm());
        this.navRegister.addEventListener('click', () => this.showRegisterForm());
        this.navDashboard.addEventListener('click', () => this.showDashboard());
        this.navAnalytics.addEventListener('click', () => this.showAnalytics());
        this.navLogout.addEventListener('click', () => this.handleLogout());
        
        // Form submission events
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));

        // Form switch events
        this.switchToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginForm();
        });
        this.switchToRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterForm();
        });
    }

    showLoginForm() {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
        this.dashboard.classList.add('hidden');
        this.analytics.classList.add('hidden');
        this.navLogin.classList.add('active');
        this.navRegister.classList.remove('active');
    }

    showRegisterForm() {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('registerForm').classList.remove('hidden');
        this.dashboard.classList.add('hidden');
        this.analytics.classList.add('hidden');
        this.navLogin.classList.remove('active');
        this.navRegister.classList.add('active');
    }

    showDashboard() {
        this.authForms.classList.add('hidden');
        this.analytics.classList.add('hidden');
        this.dashboard.classList.remove('hidden');
        this.navDashboard.classList.add('active');
        this.navAnalytics.classList.remove('active');
        // Refresh dashboard data
        if (window.DashboardManager) {
            window.DashboardManager.refreshDashboard();
        }
    }

    showAnalytics() {
        this.authForms.classList.add('hidden');
        this.dashboard.classList.add('hidden');
        this.analytics.classList.remove('hidden');
        this.navDashboard.classList.remove('active');
        this.navAnalytics.classList.add('active');
        // Refresh analytics data
        if (window.AnalyticsManager) {
            window.AnalyticsManager.loadAnalytics();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await API.login(username, password);
            this.handleAuthSuccess(response.token, username);
            this.showMessage('Login successful!', 'success');
        } catch (error) {
            this.showMessage(error.message || 'Login failed', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;

        try {
            await API.register(username, password);
            this.showMessage('Registration successful! Please login.', 'success');
            this.showLoginForm();
        } catch (error) {
            this.showMessage(error.message || 'Registration failed', 'error');
        }
    }

    handleLogout() {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        this.updateUIForLoggedOutState();
        this.showMessage('Logged out successfully', 'success');
    }

    handleAuthSuccess(token, username) {
        localStorage.setItem('token', token);
        localStorage.setItem('username', username);
        this.updateUIForLoggedInState(username);
        // Initialize dashboard
        if (window.DashboardManager) {
            window.DashboardManager.initialize();
        }
    }

    checkAuthStatus() {
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');
        if (token && username) {
            this.updateUIForLoggedInState(username);
            // Initialize dashboard
            if (window.DashboardManager) {
                window.DashboardManager.initialize();
            }
        } else {
            this.updateUIForLoggedOutState();
        }
    }

    updateUIForLoggedInState(username) {
        this.authForms.classList.add('hidden');
        this.dashboard.classList.remove('hidden');
        this.analytics.classList.add('hidden');
        this.navLogin.classList.add('hidden');
        this.navRegister.classList.add('hidden');
        this.navDashboard.classList.remove('hidden');
        this.navAnalytics.classList.remove('hidden');
        this.navLogout.classList.remove('hidden');
        this.navDashboard.classList.add('active');
        this.navAnalytics.classList.remove('active');
        if (this.userWelcome) {
            this.userWelcome.textContent = username;
        }
    }

    updateUIForLoggedOutState() {
        this.authForms.classList.remove('hidden');
        this.dashboard.classList.add('hidden');
        this.analytics.classList.add('hidden');
        this.navLogin.classList.remove('hidden');
        this.navRegister.classList.remove('hidden');
        this.navDashboard.classList.add('hidden');
        this.navAnalytics.classList.add('hidden');
        this.navLogout.classList.add('hidden');
        this.navDashboard.classList.remove('active');
        this.navAnalytics.classList.remove('active');
        this.showRegisterForm(); // Show register form by default
    }

    showMessage(message, type) {
        const messageContainer = document.getElementById('messageContainer');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = message;

        messageContainer.appendChild(messageElement);

        setTimeout(() => {
            messageElement.remove();
        }, 3000);
    }
}

// Initialize auth manager
window.addEventListener('DOMContentLoaded', () => {
    window.AuthManager = new AuthManager();
});