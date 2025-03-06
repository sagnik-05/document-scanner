// public/js/analytics.js
class AnalyticsManager {
    constructor() {
        this.initializeCharts();
        this.loadAnalytics();
    }

    async loadAnalytics() {
        try {
            const response = await API.request('/analytics/user-stats');
            this.updateStats(response.stats);
            this.updateActivityChart(response.activity);
            this.updateDocumentTypes(response.documentTypes);
            this.updateActivityLog(response.recentActivity);
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showMessage('Error loading analytics', 'error');
        }
    }

    updateStats(stats) {
        document.getElementById('totalDocuments').textContent = stats.totalDocuments || 0;
        document.getElementById('totalScans').textContent = stats.totalScans || 0;
        document.getElementById('creditsUsed').textContent = stats.creditsUsed || 0;
        document.getElementById('activeDays').textContent = stats.activeDays || 0;
    }

    updateActivityChart(activity) {
        const ctx = document.getElementById('activityChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: activity.map(a => a.date),
                datasets: [{
                    label: 'Document Scans',
                    data: activity.map(a => a.scans),
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    updateDocumentTypes(types) {
        const container = document.getElementById('documentTypes');
        container.innerHTML = types.map(type => `
            <div class="document-type-item">
                <div class="count">${type.count}</div>
                <div class="label">${type.type}</div>
            </div>
        `).join('');
    }

    updateActivityLog(activity) {
        const tbody = document.getElementById('activityLog');
        tbody.innerHTML = activity.map(item => `
            <tr>
                <td>${new Date(item.date).toLocaleDateString()}</td>
                <td>${item.action}</td>
                <td>${item.document}</td>
                <td>${item.credits}</td>
            </tr>
        `).join('');
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

// Initialize analytics manager
document.addEventListener('DOMContentLoaded', () => {
    window.AnalyticsManager = new AnalyticsManager();
});