// public/js/dashboard.js
class DashboardManager {
    constructor() {
        // Initialize DOM elements
        this.creditCount = document.getElementById('creditCount');
        this.documentsList = document.getElementById('documentsList');
        this.requestCreditsBtn = document.getElementById('requestCredits');
        this.uploadForm = document.getElementById('uploadForm');
        this.searchInput = document.getElementById('searchDocuments');

        // Bind methods to instance
        this.handleCreditRequest = this.handleCreditRequest.bind(this);
        this.loadDocuments = this.loadDocuments.bind(this);
        this.viewDocument = this.viewDocument.bind(this);
        this.deleteDocument = this.deleteDocument.bind(this);

        // Initialize
        this.bindEvents();
        this.initialize();
    }

    bindEvents() {
        // Credit request button
        if (this.requestCreditsBtn) {
            this.requestCreditsBtn.addEventListener('click', this.handleCreditRequest);
        }

        // Search input
        if (this.searchInput) {
            this.searchInput.addEventListener('input', this.debounce(() => {
                this.searchDocuments(this.searchInput.value);
            }, 300));
        }

        // Make methods available globally for onclick handlers
        window.DashboardManager = {
            viewDocument: this.viewDocument,
            deleteDocument: this.deleteDocument
        };
    }

    async initialize() {
        try {
            await Promise.all([
                this.loadCredits(),
                this.loadDocuments()
            ]);
        } catch (error) {
            console.error('Initialization error:', error);
            this.showMessage('Error initializing dashboard', 'error');
        }
    }

    async loadCredits() {
        try {
            const response = await API.getCredits();
            this.updateCreditDisplay(response.credits);
        } catch (error) {
            console.error('Error loading credits:', error);
            this.showMessage('Error loading credits', 'error');
        }
    }

    async loadDocuments() {
        try {
            const response = await API.getDocuments();
            this.renderDocuments(response.documents || []);
        } catch (error) {
            console.error('Error loading documents:', error);
            this.showMessage('Error loading documents', 'error');
        }
    }

    renderDocuments(documents) {
        if (!this.documentsList) return;

        this.documentsList.innerHTML = '';

        if (!documents || documents.length === 0) {
            this.documentsList.innerHTML = `
                <div class="no-documents">
                    <p>No documents found. Upload your first document!</p>
                </div>
            `;
            return;
        }

        documents.forEach(doc => {
            const documentElement = document.createElement('div');
            documentElement.className = 'document-card';
            documentElement.dataset.id = doc.id;
            documentElement.innerHTML = `
                <div class="document-info">
                    <h4>${this.escapeHtml(doc.filename)}</h4>
                    <p class="upload-date">Uploaded: ${new Date(doc.upload_date).toLocaleDateString()}</p>
                    ${doc.match_count ? `<p class="match-count">Matches: ${doc.match_count}</p>` : ''}
                </div>
                <div class="document-actions">
                    <button onclick="DashboardManager.viewDocument(${doc.id})" class="btn btn-secondary">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button onclick="DashboardManager.deleteDocument(${doc.id})" class="btn btn-error">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;
            this.documentsList.appendChild(documentElement);
        });
    }

    updateCreditDisplay(credits) {
        if (this.creditCount) {
            this.creditCount.textContent = credits;
        }
    }

    async handleCreditRequest() {
        try {
            await API.request('/credits/request', {
                method: 'POST',
                body: JSON.stringify({ amount: 20 })
            });
            this.showMessage('Credit request submitted successfully', 'success');
            await this.loadCredits(); // Refresh credits
        } catch (error) {
            console.error('Credit request error:', error);
            this.showMessage('Error requesting credits', 'error');
        }
    }

    async viewDocument(docId) {
        try {
            const response = await API.request(`/documents/${docId}`);
            if (response.document) {
                this.showDocumentModal(response.document);
            }
        } catch (error) {
            console.error('Error viewing document:', error);
            this.showMessage('Error viewing document', 'error');
        }
    }

    showDocumentModal(document) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${this.escapeHtml(document.filename)}</h3>
                    <button onclick="this.closest('.modal').remove()" class="btn-close">&times;</button>
                </div>
                <div class="modal-body">
                    <pre class="document-content">${this.escapeHtml(document.content)}</pre>
                </div>
                <div class="modal-footer">
                    <button onclick="this.closest('.modal').remove()" class="btn btn-primary">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Close modal on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async deleteDocument(docId) {
        if (!confirm('Are you sure you want to delete this document?')) {
            return;
        }

        try {
            await API.request(`/documents/${docId}`, { method: 'DELETE' });
            this.showMessage('Document deleted successfully', 'success');
            await this.loadDocuments(); // Refresh the document list
        } catch (error) {
            console.error('Error deleting document:', error);
            this.showMessage('Error deleting document', 'error');
        }
    }

    async searchDocuments(query) {
        if (!query) {
            await this.loadDocuments();
            return;
        }

        try {
            const response = await API.request(`/documents/search?q=${encodeURIComponent(query)}`);
            this.renderDocuments(response.documents || []);
        } catch (error) {
            console.error('Search error:', error);
            this.showMessage('Error searching documents', 'error');
        }
    }

    showMessage(message, type) {
        const messageContainer = document.getElementById('messageContainer');
        if (!messageContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = message;

        messageContainer.appendChild(messageElement);

        // Remove message after 3 seconds
        setTimeout(() => {
            messageElement.remove();
        }, 3000);
    }

    // Utility Methods
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize dashboard manager
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new DashboardManager();
});