// ─────────────────────────────────────────────────────────────────────────────
//  api.js  —  RegAlert Frontend API Layer
//  All fetch() calls to the Node.js backend at /api/*
//  This file connects the frontend to the real MongoDB database.
// ─────────────────────────────────────────────────────────────────────────────

const API = {

    base: '', // same origin — server serves both frontend and API

    async get(url) {
        try {
            const res = await fetch(this.base + url, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ra_token') || ''}`
                }
            });
            const data = await res.json();
            return data;
        } catch (e) {
            console.warn('[API] GET failed:', url, e.message);
            return null;
        }
    },

    async post(url, body) {
        try {
            const res = await fetch(this.base + url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('ra_token') || ''}`
                },
                body: JSON.stringify(body)
            });
            return await res.json();
        } catch (e) {
            console.warn('[API] POST failed:', url, e.message);
            return null;
        }
    },

    async patch(url, body) {
        try {
            const res = await fetch(this.base + url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('ra_token') || ''}`
                },
                body: JSON.stringify(body)
            });
            return await res.json();
        } catch (e) {
            console.warn('[API] PATCH failed:', url, e.message);
            return null;
        }
    },

    async del(url) {
        try {
            const res = await fetch(this.base + url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('ra_token') || ''}`
                }
            });
            return await res.json();
        } catch (e) {
            console.warn('[API] DELETE failed:', url, e.message);
            return null;
        }
    },

    // ── ALERTS ─────────────────────────────────────────────────────────────────
    getAlerts(sector, urgency, reg) {
        let url = '/api/alerts?';
        if (sector) url += `sector=${sector}&`;
        if (urgency) url += `urgency=${urgency}&`;
        if (reg) url += `reg=${reg}&`;
        return this.get(url);
    },

    searchAlerts(q) {
        return this.get(`/api/alerts/search?q=${encodeURIComponent(q)}`);
    },

    // ── OBLIGATIONS ────────────────────────────────────────────────────────────
    getObligations(sector) {
        return this.get(`/api/obligations?sector=${sector}`);
    },

    createObligation(data) {
        return this.post('/api/obligations', data);
    },

    toggleOblStatus(id) {
        return this.patch(`/api/obligations/${id}/status`, {});
    },

    deleteObligation(id) {
        return this.del(`/api/obligations/${id}`);
    },

    // ── PROFILE ────────────────────────────────────────────────────────────────
    getProfile() {
        return this.get('/api/profile');
    },

    updateProfile(data) {
        return this.patch('/api/profile', data);
    },

    async addTeamMember(body) { return await this.post('/api/profile/team', body); },
    async notifyTeam(id, body) { return await this.post(`/api/obligations/${id}/notify`, body); },
    async notifyAlert(id, body) { return await this.post(`/api/alerts/${id}/notify`, body); },

    // ── AUDIT LOG ──────────────────────────────────────────────────────────────
    getAuditLog(sector, limit) {
        return this.get(`/api/auditlog?sector=${sector || 'FinTech'}&limit=${limit || 10}`);
    },

    addAuditLog(entry) {
        return this.post('/api/auditlog', entry);
    },

    // ── STATS ──────────────────────────────────────────────────────────────────
    getStats(sector) {
        return this.get(`/api/stats?sector=${sector}`);
    },

    // ── HEALTH ─────────────────────────────────────────────────────────────────
    async isOnline() {
        const res = await this.get('/api/health');
        return res && res.status === 'ok';
    }
};
