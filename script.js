// Cloudflare Dashboard JavaScript
class CloudflareDashboard {
    constructor() {
        this.apiToken = '';
        this.currentZone = '';
        this.updateInterval = null;
        this.isAutoUpdateEnabled = false;
        
        this.initializeElements();
        this.bindEvents();
        this.loadSavedSettings();
    }

    initializeElements() {
        this.elements = {
            repoInput: document.getElementById('repo-input'), // จะใช้เป็น zone input
            connectBtn: document.getElementById('connect-btn'),
            statusIndicator: document.getElementById('status-indicator'),
            statusText: document.getElementById('status-text'),
            repoDetails: document.getElementById('repo-details'),
            repoName: document.getElementById('repo-name'),
            repoDescription: document.getElementById('repo-description'),
            repoStars: document.getElementById('repo-stars'), // จะแสดง DNS records
            repoForks: document.getElementById('repo-forks'), // จะแสดง Page Rules
            repoIssues: document.getElementById('repo-issues'), // จะแสดง SSL status
            lastUpdate: document.getElementById('last-update'),
            commitsList: document.getElementById('commits-list'), // จะแสดง Analytics
            autoUpdateToggle: document.getElementById('auto-update-toggle')
        };
        
        // เปลี่ยน placeholder
        this.elements.repoInput.placeholder = 'domain.com หรือ Zone ID';
    }

    bindEvents() {
        // ตรวจสอบว่า element มีอยู่ก่อน bind
        const saveTokenBtn = document.getElementById('save-token-btn');
        const apiTokenInput = document.getElementById('api-token-input');
        const autoUpdateToggle = document.getElementById('auto-update-toggle');
        
        if (this.elements.connectBtn) {
            this.elements.connectBtn.addEventListener('click', () => this.connectToZone());
        }
        
        if (this.elements.repoInput) {
            this.elements.repoInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.connectToZone();
            });
        }
        
        if (autoUpdateToggle) {
            autoUpdateToggle.addEventListener('change', (e) => {
                this.toggleAutoUpdate(e.target.checked);
            });
        }
        
        if (saveTokenBtn) {
            saveTokenBtn.addEventListener('click', () => this.saveApiToken());
        }
        
        if (apiTokenInput) {
            apiTokenInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.saveApiToken();
            });
        }
    }

    loadSavedSettings() {
        const savedZone = localStorage.getItem('cloudflare-dashboard-zone');
        const autoUpdate = localStorage.getItem('cloudflare-dashboard-auto-update') === 'true';
        const savedToken = localStorage.getItem('cloudflare-api-token');
        
        if (savedZone) {
            this.elements.repoInput.value = savedZone;
        }
        
        if (savedToken) {
            document.getElementById('api-token-input').value = savedToken;
            this.apiToken = savedToken;
        }
        
        if (autoUpdate) {
            this.elements.autoUpdateToggle.checked = true;
            this.isAutoUpdateEnabled = true;
        }
    }

    saveApiToken() {
        const tokenInput = document.getElementById('api-token-input');
        this.apiToken = tokenInput.value.trim();
        
        if (this.apiToken) {
            localStorage.setItem('cloudflare-api-token', this.apiToken);
            this.showSuccess('API Token saved successfully!');
        } else {
            this.showError('Please enter a valid API Token');
        }
    }

    saveSettings() {
        localStorage.setItem('cloudflare-dashboard-zone', this.currentZone);
        localStorage.setItem('cloudflare-dashboard-auto-update', this.isAutoUpdateEnabled.toString());
    }

    async connectToZone() {
        if (!this.apiToken) {
            this.showError('กรุณาใส่ Cloudflare API Token ก่อน');
            return;
        }

        const zoneInput = this.elements.repoInput.value.trim();
        
        if (!zoneInput) {
            this.showError('กรุณาใส่ domain หรือ Zone ID');
            return;
        }

        this.setConnecting(true);
        
        try {
            const zoneData = await this.fetchZoneData(zoneInput);
            this.currentZone = zoneData.id;
            this.updateStatus('online', 'Connected');
            this.saveSettings();
            
            await this.fetchZoneAnalytics(zoneData.id);
            
            if (this.isAutoUpdateEnabled) {
                this.startAutoUpdate();
            }
        } catch (error) {
            this.showError('ไม่สามารถเชื่อมต่อ Cloudflare ได้: ' + error.message);
            this.updateStatus('offline', 'Connection failed');
        } finally {
            this.setConnecting(false);
        }
    }

    async fetchZoneData(zoneInput) {
        let url;
        
        // ตรวจสอบว่าเป็น Zone ID หรือ domain name
        if (zoneInput.length === 32 && /^[a-f0-9]+$/.test(zoneInput)) {
            // Zone ID
            url = `https://api.cloudflare.com/client/v4/zones/${zoneInput}`;
        } else {
            // Domain name - ค้นหา zone
            url = `https://api.cloudflare.com/client/v4/zones?name=${zoneInput}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.errors[0]?.message || 'Unknown error');
        }
        
        let zoneData;
        if (data.result.length) {
            zoneData = data.result[0]; // สำหรับการค้นหาด้วย domain name
        } else {
            zoneData = data.result; // สำหรับการเรียกด้วย Zone ID
        }
        
        if (!zoneData) {
            throw new Error('Zone not found');
        }
        
        // แสดงข้อมูล Zone
        this.displayZoneData(zoneData);
        
        // Fetch DNS records
        await this.fetchDnsRecords(zoneData.id);
        
        return zoneData;
    }

    async fetchDnsRecords(zoneId) {
        try {
            const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.displayDnsRecords(data.result || []);
            }
        } catch (error) {
            console.error('Failed to fetch DNS records:', error);
        }
    }

    async fetchZoneAnalytics(zoneId) {
        try {
            const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
            const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/analytics/dashboard?since=${since}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.displayAnalytics(data.result || {});
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        }
    }

    displayZoneData(data) {
        this.elements.repoName.textContent = data.name;
        this.elements.repoDescription.textContent = `Status: ${data.status} | Plan: ${data.plan?.name || 'Free'}`;
        
        // เปลี่ยนการแสดงผล
        document.querySelector('[for="repo-stars"] p').textContent = 'DNS Records';
        document.querySelector('[for="repo-forks"] p').textContent = 'SSL Status';
        document.querySelector('[for="repo-issues"] p').textContent = 'Dev Mode';
        
        this.elements.repoStars.textContent = '...'; // จะอัปเดตเมื่อได้ DNS records
        this.elements.repoForks.textContent = data.ssl?.status || 'Unknown';
        this.elements.repoIssues.textContent = data.development_mode > 0 ? 'ON' : 'OFF';
        
        this.elements.repoDetails.style.display = 'block';
    }

    displayDnsRecords(records) {
        this.elements.repoStars.textContent = records.length.toString();
        
        // แสดง DNS records ใน commits list
        if (records.length === 0) {
            this.elements.commitsList.innerHTML = '<p class="no-data">No DNS records found</p>';
            return;
        }

        const recordsHtml = records.slice(0, 10).map(record => {
            const iconClass = this.getDnsRecordIcon(record.type);
            
            return `
                <div class="commit-item">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                        ${record.type}
                    </div>
                    <div class="commit-info">
                        <div class="commit-message">${this.escapeHtml(record.name)}</div>
                        <div class="commit-meta">
                            <strong>Type:</strong> ${record.type} • 
                            <strong>Content:</strong> ${this.escapeHtml(record.content.length > 50 ? record.content.substring(0, 50) + '...' : record.content)} • 
                            <span class="commit-sha">TTL: ${record.ttl === 1 ? 'Auto' : record.ttl}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.elements.commitsList.innerHTML = recordsHtml;
    }

    displayAnalytics(analytics) {
        // แสดงข้อมูล analytics ในส่วนที่เหมาะสม
        console.log('Analytics data:', analytics);
    }

    getDnsRecordIcon(type) {
        const icons = {
            'A': '🌐',
            'AAAA': '🌐',
            'CNAME': '🔗',
            'MX': '📧',
            'TXT': '📝',
            'NS': '🏢',
            'SRV': '⚙️'
        };
        return icons[type] || '📄';
    }

    toggleAutoUpdate(enabled) {
        this.isAutoUpdateEnabled = enabled;
        
        if (enabled) {
            if (this.currentZone) {
                this.startAutoUpdate();
            }
        } else {
            this.stopAutoUpdate();
        }
        
        this.saveSettings();
    }

    startAutoUpdate() {
        this.stopAutoUpdate();
        
        this.updateInterval = setInterval(async () => {
            if (this.currentZone && this.apiToken) {
                try {
                    await this.fetchZoneData(this.currentZone);
                    await this.fetchZoneAnalytics(this.currentZone);
                    this.updateLastUpdateTime();
                } catch (error) {
                    console.error('Auto-update failed:', error);
                }
            }
        }, 30000);
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    setConnecting(isConnecting) {
        this.elements.connectBtn.disabled = isConnecting;
        this.elements.connectBtn.innerHTML = isConnecting 
            ? '<span class="loading"></span> Connecting...' 
            : 'Connect';
    }

    updateStatus(status, text) {
        this.elements.statusIndicator.className = `status-dot ${status}`;
        this.elements.statusText.textContent = text;
    }

    updateLastUpdateTime() {
        const now = new Date();
        this.elements.lastUpdate.textContent = now.toLocaleString('th-TH');
    }

    showError(message) {
        alert('❌ ' + message);
    }

    showSuccess(message) {
        alert('✅ ' + message);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

    async connectToRepo() {
        const repoPath = this.elements.repoInput.value.trim();
        
        if (!repoPath || !repoPath.includes('/')) {
            this.showError('กรุณาใส่ repository ในรูปแบบ username/repository');
            return;
        }

        this.setConnecting(true);
        
        try {
            await this.fetchRepoData(repoPath);
            this.currentRepo = repoPath;
            this.updateStatus('online', 'Connected');
            this.saveSettings();
            
            if (this.isAutoUpdateEnabled) {
                this.startAutoUpdate();
            }
        } catch (error) {
            this.showError('ไม่สามารถเชื่อมต่อ repository ได้: ' + error.message);
            this.updateStatus('offline', 'Connection failed');
        } finally {
            this.setConnecting(false);
        }
    }

    async fetchRepoData(repoPath) {
        const [owner, repo] = repoPath.split('/');
        
        // Fetch repository information
        const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        if (!repoResponse.ok) {
            throw new Error(`Repository not found (${repoResponse.status})`);
        }
        const repoData = await repoResponse.json();
        
        // Fetch recent commits
        const commitsResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`);
        if (!commitsResponse.ok) {
            throw new Error(`Failed to fetch commits (${commitsResponse.status})`);
        }
        const commitsData = await commitsResponse.json();
        
        this.displayRepoData(repoData);
        this.displayCommits(commitsData);
        this.updateLastUpdateTime();
    }

    displayRepoData(data) {
        this.elements.repoName.textContent = data.full_name;
        this.elements.repoDescription.textContent = data.description || 'No description available';
        this.elements.repoStars.textContent = this.formatNumber(data.stargazers_count);
        this.elements.repoForks.textContent = this.formatNumber(data.forks_count);
        this.elements.repoIssues.textContent = this.formatNumber(data.open_issues_count);
        
        this.elements.repoDetails.style.display = 'block';
    }

    displayCommits(commits) {
        if (!commits || commits.length === 0) {
            this.elements.commitsList.innerHTML = '<p class="no-data">No commits found</p>';
            return;
        }

        const commitsHtml = commits.map(commit => {
            const date = new Date(commit.commit.committer.date);
            const timeAgo = this.getTimeAgo(date);
            
            return `
                <div class="commit-item">
                    <img src="${commit.author?.avatar_url || 'https://github.com/identicons/default.png'}" 
                         alt="${commit.commit.author.name}" class="commit-avatar">
                    <div class="commit-info">
                        <div class="commit-message">${this.escapeHtml(commit.commit.message.split('\n')[0])}</div>
                        <div class="commit-meta">
                            <strong>${this.escapeHtml(commit.commit.author.name)}</strong> • 
                            ${timeAgo} • 
                            <span class="commit-sha">${commit.sha.substring(0, 7)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.elements.commitsList.innerHTML = commitsHtml;
    }

    toggleAutoUpdate(enabled) {
        this.isAutoUpdateEnabled = enabled;
        
        if (enabled) {
            if (this.currentRepo) {
                this.startAutoUpdate();
            }
        } else {
            this.stopAutoUpdate();
        }
        
        this.saveSettings();
    }

    startAutoUpdate() {
        this.stopAutoUpdate(); // Clear any existing interval
        
        this.updateInterval = setInterval(() => {
            if (this.currentRepo) {
                this.fetchRepoData(this.currentRepo).catch(error => {
                    console.error('Auto-update failed:', error);
                });
            }
        }, 30000); // Update every 30 seconds
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    setConnecting(isConnecting) {
        this.elements.connectBtn.disabled = isConnecting;
        this.elements.connectBtn.innerHTML = isConnecting 
            ? '<span class="loading"></span> Connecting...' 
            : 'Connect';
    }

    updateStatus(status, text) {
        this.elements.statusIndicator.className = `status-dot ${status}`;
        this.elements.statusText.textContent = text;
    }

    updateLastUpdateTime() {
        const now = new Date();
        this.elements.lastUpdate.textContent = now.toLocaleString('th-TH');
    }

    showError(message) {
        alert(message); // Simple error display - could be enhanced with toast notifications
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return 'just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days > 1 ? 's' : ''} ago`;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the dashboard when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CloudflareDashboard();
});
