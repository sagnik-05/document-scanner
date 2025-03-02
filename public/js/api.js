// public/js/api.js
const API = {
    baseUrl: 'http://localhost:3000/api',

    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Request failed');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Auth endpoints
    async login(username, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    },

    async register(username, password) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    },

    // User endpoints
    async getProfile() {
        return this.request('/user/profile');
    },

    async getCredits() {
        return this.request('/user/credits');
    },

    // Document endpoints
    async uploadDocument(formData) {
        const token = localStorage.getItem('token');
        return this.request('/documents/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
    },

    async getDocuments() {
        return this.request('/documents');
    },
    async getDocuments() {
        return this.request('/documents');
    },

    async uploadDocument(formData) {
        const token = localStorage.getItem('token');
        return fetch(`${this.baseUrl}/documents/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        }).then(response => {
            if (!response.ok) {
                throw new Error('Upload failed');
            }
            return response.json();
        });
    },

    async getDocument(id) {
        return this.request(`/documents/${id}`);
    },

    async deleteDocument(id) {
        return this.request(`/documents/${id}`, {
            method: 'DELETE'
        });
    },
    getDocumentViewUrl(id) {
        const token = localStorage.getItem('token');
        return `${this.baseUrl}/documents/${id}/view?token=${token}`;
    },

    async uploadDocument(formData) {
        const token = localStorage.getItem('token');
        return fetch(`${this.baseUrl}/documents/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        }).then(response => {
            if (!response.ok) {
                throw new Error('Upload failed');
            }
            return response.json();
        });
    },
};