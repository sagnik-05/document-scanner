// public/js/upload.js
class UploadManager {
    constructor() {
        this.uploadForm = document.getElementById('uploadForm');
        this.fileInput = document.getElementById('documentFile');
        this.uploadButton = this.uploadForm?.querySelector('button[type="submit"]');
        this.progressBar = this.createProgressBar();
        
        this.bindEvents();
    }

    createProgressBar() {
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar hidden';
        progressBar.innerHTML = `
            <div class="progress-fill"></div>
            <div class="progress-text">0%</div>
        `;
        this.uploadForm?.appendChild(progressBar);
        return progressBar;
    }

    bindEvents() {
        if (this.uploadForm) {
            this.uploadForm.addEventListener('submit', (e) => this.handleUpload(e));
        }
        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            const validTypes = ['text/plain', 'application/pdf', 'application/msword'];
            if (!validTypes.includes(file.type)) {
                this.showMessage('Invalid file type. Please upload a .txt, .doc, or .pdf file.', 'error');
                this.fileInput.value = '';
                return;
            }

            // Validate file size (5MB limit)
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                this.showMessage('File is too large. Maximum size is 5MB.', 'error');
                this.fileInput.value = '';
                return;
            }
        }
    }

    async handleUpload(e) {
        e.preventDefault();

        const file = this.fileInput?.files[0];
        if (!file) {
            this.showMessage('Please select a file to upload', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('document', file);

        try {
            this.startUpload();
            const response = await this.uploadWithProgress(formData);
            this.completeUpload();
            this.handleUploadSuccess(response);
        } catch (error) {
            this.handleUploadError(error);
        }
    }

    async uploadWithProgress(formData) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    this.updateProgress(percentComplete);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error(xhr.responseText));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed'));
            });

            xhr.open('POST', `${API.baseUrl}/documents/upload`);
            
            const token = localStorage.getItem('token');
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            xhr.send(formData);
        });
    }

    startUpload() {
        if (this.uploadButton) this.uploadButton.disabled = true;
        this.progressBar.classList.remove('hidden');
        this.updateProgress(0);
    }

    completeUpload() {
        if (this.uploadButton) this.uploadButton.disabled = false;
        if (this.fileInput) this.fileInput.value = '';
        setTimeout(() => {
            this.progressBar.classList.add('hidden');
            this.updateProgress(0);
        }, 1000);
    }

    updateProgress(percent) {
        const fill = this.progressBar.querySelector('.progress-fill');
        const text = this.progressBar.querySelector('.progress-text');
        
        if (fill) fill.style.width = `${percent}%`;
        if (text) text.textContent = `${Math.round(percent)}%`;
    }

    handleUploadSuccess(response) {
        this.showMessage('Document uploaded successfully!', 'success');
        
        if (window.DashboardManager) {
            window.DashboardManager.loadDocuments();
        }

        if (response.matches && response.matches.length > 0) {
            this.showMatches(response.matches);
        }
    }

    handleUploadError(error) {
        this.completeUpload();
        this.showMessage(
            error.message || 'Error uploading document', 
            'error'
        );
    }

    showMessage(message, type) {
        const messageContainer = document.getElementById('messageContainer');
        if (!messageContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = `message ${type}`;
        messageElement.textContent = message;

        messageContainer.appendChild(messageElement);

        setTimeout(() => {
            messageElement.remove();
        }, 3000);
    }
}

// Initialize upload manager
document.addEventListener('DOMContentLoaded', () => {
    new UploadManager();
});