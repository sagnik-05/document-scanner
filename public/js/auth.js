// public/js/auth.js
class AuthManager {
    constructor() {
        // DOM Elements
        this.loginForm = document.getElementById('loginFormElement');
        this.registerForm = document.getElementById('registerFormElement');
        this.navLogin = document.getElementById('navLogin');
        this.navRegister = document.getElementById('navRegister');
        this.navDashboard = document.getElementById('navDashboard');
        this.authForms = document.getElementById('authForms');
        this.dashboard = document.getElementById('dashboard');

        // Bind event listeners
        this.bindEvents();
        // Check authentication status on load
        this.checkAuthStatus();
    }

    bindEvents() {
        // Navigation events
        this.navLogin.addEventListener('click', () => this.showLoginForm());
        this.navRegister.addEventListener('click', () => this.showRegisterForm());
        
        // Form submission events
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));

        // Logout event
        document.getElementById('navLogout')?.addEventListener('click', () => this.handleLogout());
    }

    showLoginForm() {
        document.getElementById('loginForm').classList.remove('hidden');
        document.getElementById('registerForm').classList.add('hidden');
    }

    showRegisterForm() {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('registerForm').classList.remove('hidden');
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await API.login(username, password);
            this.handleAuthSuccess(response.token);
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
        this.updateUIForLoggedOutState();
        this.showMessage('Logged out successfully', 'success');
    }

    handleAuthSuccess(token) {
        localStorage.setItem('token', token);
        this.updateUIForLoggedInState();
        // Initialize dashboard
        if (window.DashboardManager) {
            window.DashboardManager.initialize();
        }
    }

    checkAuthStatus() {
        const token = localStorage.getItem('token');
        if (token) {
            this.updateUIForLoggedInState();
            // Initialize dashboard
            if (window.DashboardManager) {
                window.DashboardManager.initialize();
            }
        } else {
            this.updateUIForLoggedOutState();
        }
    }

    updateUIForLoggedInState() {
        this.authForms.classList.add('hidden');
        this.dashboard.classList.remove('hidden');
        this.navLogin.classList.add('hidden');
        this.navRegister.classList.add('hidden');
        this.navDashboard.classList.remove('hidden');
        document.getElementById('navLogout')?.classList.remove('hidden');
    }

    updateUIForLoggedOutState() {
        this.authForms.classList.remove('hidden');
        this.dashboard.classList.add('hidden');
        this.navLogin.classList.remove('hidden');
        this.navRegister.classList.remove('hidden');
        this.navDashboard.classList.add('hidden');
        document.getElementById('navLogout')?.classList.add('hidden');
    }

    showMessage(message, type) {
        const messageContainer = document.getElementById('messageContainer');
        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = message;

        messageContainer.appendChild(messageElement);

        // Remove message after 3 seconds
        setTimeout(() => {
            messageElement.remove();
        }, 3000);
    }
}

// Initialize auth manager
window.addEventListener('DOMContentLoaded', () => {
    window.AuthManager = new AuthManager();
});