/**
 * Captor API Layer
 * 
 * In development (localhost), uses the local Express server.
 * In production (deployed), uses Firebase Firestore directly.
 */

import {
    firestoreMissionsApi,
    firestoreTargetsApi,
    firestoreAgentApi,
    firestoreScraperApi,
    firestoreLeadsApi,
} from './firestore';

// ─── Environment Detection ───────────────────────────────────
const isProduction = typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// ─── Types ────────────────────────────────────────────────────
export interface Mission {
    id: string;
    title: string;
    promptInstruction: string;
    sourceUrl: string | null;
    targetLimit: number | null;
    missionType: string; // 'cliente_oculto' | 'captacao_leads'
    searchNiche: string | null;
    searchLocation: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
    _count?: { targets: number };
}

export interface Target {
    id: string;
    name: string;
    phone: string;
    scrapedBio: string | null;
    auditStatus: string;
    lastInteraction: string | null;
    missionId: string;
    mission?: { title: string };
    _count?: { auditLogs: number };
}

export interface AuditLog {
    id: string;
    targetId: string;
    role: string;
    message: string;
    timestamp: string;
}

export interface AgentStats {
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
    total: number;
}

// ─── Local Express API (Development) ─────────────────────────
const localMissionsApi = {
    getAll: async (): Promise<Mission[]> => {
        const res = await fetch(`${API_BASE}/missions`);
        return res.json();
    },

    getById: async (id: string): Promise<Mission & { targets: Target[] }> => {
        const res = await fetch(`${API_BASE}/missions/${id}`);
        return res.json();
    },

    create: async (data: { title: string; promptInstruction: string; sourceUrl?: string; targetLimit?: number; missionType?: string; searchNiche?: string; searchLocation?: string }): Promise<Mission> => {
        const res = await fetch(`${API_BASE}/missions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    update: async (id: string, data: Partial<Mission>): Promise<Mission> => {
        const res = await fetch(`${API_BASE}/missions/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    delete: async (id: string): Promise<void> => {
        await fetch(`${API_BASE}/missions/${id}`, { method: 'DELETE' });
    },

    finalizeScraping: async (id: string): Promise<Mission> => {
        const res = await fetch(`${API_BASE}/missions/${id}/finalize-scraping`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        return res.json();
    }
};

const localGmapsApi = {
    search: async (data: { missionId: string; query: string; location: string; maxResults?: number }): Promise<{ success: boolean; jobId: string; message: string; query: string; location: string; maxResults: number }> => {
        const res = await fetch(`${API_BASE}/gmaps/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    stop: async (options: { jobId?: string; missionId?: string }): Promise<{ success: boolean; stoppedCount: number; message: string }> => {
        const res = await fetch(`${API_BASE}/gmaps/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options)
        });
        return res.json();
    },

    getStatus: async (jobId: string): Promise<{ id: string; status: string; output: string[]; error?: string }> => {
        const res = await fetch(`${API_BASE}/gmaps/status/${jobId}`);
        return res.json();
    },

    getJobs: async (missionId: string): Promise<Array<{ id: string; status: string; startedAt: string }>> => {
        const res = await fetch(`${API_BASE}/gmaps/jobs/${missionId}`);
        return res.json();
    }
};

const localTargetsApi = {
    getAll: async (filters?: { missionId?: string; status?: string }): Promise<Target[]> => {
        const params = new URLSearchParams();
        if (filters?.missionId) params.set('missionId', filters.missionId);
        if (filters?.status) params.set('status', filters.status);
        const res = await fetch(`${API_BASE}/targets?${params}`);
        return res.json();
    },

    getById: async (id: string): Promise<Target & { auditLogs: AuditLog[] }> => {
        const res = await fetch(`${API_BASE}/targets/${id}`);
        return res.json();
    },

    create: async (data: { name: string; phone: string; missionId: string; scrapedBio?: string }): Promise<Target> => {
        const res = await fetch(`${API_BASE}/targets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    createBulk: async (targets: { name: string; phone: string; scrapedBio?: string }[], missionId: string): Promise<{ count: number }> => {
        const res = await fetch(`${API_BASE}/targets/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targets, missionId })
        });
        return res.json();
    },

    update: async (id: string, data: Partial<Target>): Promise<Target> => {
        const res = await fetch(`${API_BASE}/targets/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    delete: async (id: string): Promise<void> => {
        await fetch(`${API_BASE}/targets/${id}`, { method: 'DELETE' });
    }
};

const localAgentApi = {
    getStats: async (): Promise<AgentStats> => {
        const res = await fetch(`${API_BASE}/agent/stats`);
        return res.json();
    },

    getStatus: async (): Promise<{ status: string; currentAction: string; lastUpdate: string }> => {
        const res = await fetch(`${API_BASE}/agent/status`);
        return res.json();
    },

    getLogs: async (since?: string): Promise<Array<{ timestamp: string; type: string; message: string }>> => {
        const params = since ? `?since=${encodeURIComponent(since)}` : '';
        const res = await fetch(`${API_BASE}/agent/logs${params}`);
        return res.json();
    }
};

const localScraperApi = {
    start: async (missionId: string): Promise<{ success: boolean; jobId: string; message: string; sourceUrl: string; maxTargets: number; error?: string }> => {
        const res = await fetch(`${API_BASE}/scraper/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ missionId })
        });
        return res.json();
    },

    stop: async (options: { jobId?: string; missionId?: string }): Promise<{ success: boolean; stoppedCount: number; message: string }> => {
        const res = await fetch(`${API_BASE}/scraper/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options)
        });
        return res.json();
    },

    getStatus: async (jobId: string): Promise<{ id: string; status: string; output: string[]; error?: string }> => {
        const res = await fetch(`${API_BASE}/scraper/status/${jobId}`);
        return res.json();
    },

    getJobs: async (missionId: string): Promise<Array<{ id: string; status: string; startedAt: string }>> => {
        const res = await fetch(`${API_BASE}/scraper/jobs/${missionId}`);
        return res.json();
    }
};

// ─── Lead API (Local) ─────────────────────────────────────────

export interface Lead {
    id: string;
    name: string;
    phone: string;
    phoneRaw?: string;
    category?: string;
    address?: string;
    website?: string;
    rating?: string;
    reviews?: string;
    isWhatsapp: boolean;
    waConfidence?: string; // high, medium, low
    searchQuery: string;   // nicho buscado
    searchLocation: string; // localização buscada
    imported: boolean;     // já foi importado para alguma missão
    createdAt: string;
}

const localLeadsApi = {
    getAll: async (filters?: { query?: string; location?: string; whatsappOnly?: boolean; notImported?: boolean }): Promise<Lead[]> => {
        const params = new URLSearchParams();
        if (filters?.query) params.append('query', filters.query);
        if (filters?.location) params.append('location', filters.location);
        if (filters?.whatsappOnly) params.append('whatsappOnly', 'true');
        if (filters?.notImported) params.append('notImported', 'true');

        const res = await fetch(`${API_BASE}/leads?${params.toString()}`);
        return res.json();
    },

    importToMission: async (leadIds: string[], missionId: string): Promise<{ imported: number; message: string }> => {
        const res = await fetch(`${API_BASE}/leads/import-to-mission`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadIds, missionId })
        });
        return res.json();
    },

    delete: async (id: string): Promise<void> => {
        await fetch(`${API_BASE}/leads/${id}`, { method: 'DELETE' });
    },

    clear: async (): Promise<void> => {
        await fetch(`${API_BASE}/leads`, { method: 'DELETE' });
    }
};

// ─── Gmaps Stub (runs locally only) ───────────────────────────
export const firestoreGmapsApi = {
    search: async () => ({
        success: false,
        jobId: '',
        message: 'Google Maps scraper disponível apenas em ambiente local',
        query: '',
        location: '',
        maxResults: 0,
    }),
    stop: async () => ({ success: false, stoppedCount: 0, message: 'N/A' }),
    getStatus: async () => ({ id: '', status: 'unavailable', output: [] as string[], error: undefined as string | undefined }),
    getJobs: async () => [] as Array<{ id: string; status: string; startedAt: string }>,
};



// ─── Exported API (auto-selects based on environment) ─────────
export const missionsApi = isProduction ? firestoreMissionsApi : localMissionsApi;
export const targetsApi = isProduction ? firestoreTargetsApi : localTargetsApi;
export const agentApi = isProduction ? firestoreAgentApi : localAgentApi;
export const scraperApi = isProduction ? firestoreScraperApi : localScraperApi;
export const gmapsApi = isProduction ? firestoreGmapsApi : localGmapsApi;
export const leadsApi = isProduction ? firestoreLeadsApi : localLeadsApi;
