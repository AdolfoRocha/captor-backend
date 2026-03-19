
import { firestoreMissionsApi, firestoreTargetsApi, firestoreAgentApi, firestoreScraperApi, firestoreLeadsApi } from './firestore';

export const isProduction = import.meta.env.MODE === 'production';

export const API_BASE = 'https://illustrated-labor-tribes-elephant.trycloudflare.com/api';

// Helper for Fetch API
const api = {
    get: async <T>(url: string): Promise<T> => {
        const res = await fetch(`${API_BASE}${url}`);
        return res.json();
    },
    post: async <T>(url: string, data: any): Promise<T> => {
        const res = await fetch(`${API_BASE}${url}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    patch: async <T>(url: string, data: any): Promise<T> => {
        const res = await fetch(`${API_BASE}${url}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },
    delete: async <T>(url: string): Promise<T> => {
        const res = await fetch(`${API_BASE}${url}`, { method: 'DELETE' });
        return res.json();
    }
};

export interface Mission {
    id: string;
    title: string;
    promptInstruction: string;
    useAiCopy: boolean;
    sourceUrl?: string;
    targetLimit?: number | null;
    missionType: string;
    searchNiche?: string;
    searchLocation?: string;
    status: string;
    fileUrl?: string;
    fileName?: string;
    fileMimeType?: string;
    agentKnowledgeBase?: string;
    agentProductInfo?: string;
    agentPaymentLink?: string;
    agentSchedulingUrl?: string;
    agentDocuments?: string;
    cadenceConfig?: string;
    createdAt: string;
    updatedAt: string;
    targets?: Target[];
}

export interface Target {
    id: string;
    name: string;
    phone: string;
    scrapedBio?: string;
    auditStatus: string;
    funnelStage: string;
    retryCount: number;
    missionId: string;
    createdAt: string;
}

export interface AgentStats {
    totalTargets: number;
    processedTargets: number;
    successRate: number;
    activeMissions: number;
}

const localMissionsApi = {
    getAll: async (): Promise<Mission[]> => api.get<Mission[]>('/missions'),
    getById: async (id: string): Promise<Mission & { targets: Target[] }> => api.get<Mission & { targets: Target[] }>(`/missions/${id}`),
    
    uploadFile: async (file: File): Promise<{ success: boolean; fileUrl: string; fileName: string; fileMimeType: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });
        return res.json();
    },

    create: async (data: Partial<Mission>): Promise<Mission> => api.post<Mission>('/missions', data),
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
    finalizeScraping: async (id: string): Promise<Mission> => api.post<Mission>(`/missions/${id}/finalize-scraping`, {})
};

const localGmapsApi = {
    search: async (data: { missionId?: string; groupId?: string; query: string; location: string; maxResults?: number }): Promise<{ success: boolean; jobId: string; message: string; query: string; location: string; maxResults: number }> => {
        const res = await fetch(`${API_BASE}/gmaps/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    estimate: async (data: { query: string; location: string }): Promise<{ estimated_total: number; estimated_wa: number; preview_names: string[]; error?: string }> => {
        const res = await fetch(`${API_BASE}/gmaps/estimate`, {
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

const localWebScraperApi = {
    start: async (data: { missionId?: string; url: string; prompt: string; maxResults?: number }): Promise<{ success: boolean; jobId: string; message: string; targetUrl: string }> => {
        const res = await fetch(`${API_BASE}/webscraper/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    stop: async (options: { jobId?: string }): Promise<{ success: boolean; stoppedCount: number; message: string }> => {
        const res = await fetch(`${API_BASE}/webscraper/stop`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options)
        });
        return res.json();
    },

    getStatus: async (jobId: string): Promise<{ id: string; status: string; output: string[]; error?: string }> => {
        const res = await fetch(`${API_BASE}/webscraper/status/${jobId}`);
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

    getById: async (id: string): Promise<Target & { auditLogs: any[] }> => {
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
    getStats: async (): Promise<AgentStats> => api.get<AgentStats>('/agent/stats'),
    getStatus: async (): Promise<{ status: string; currentAction: string; lastUpdate: string }> => api.get<{ status: string; currentAction: string; lastUpdate: string }>('/agent/status'),
    getLogs: async (since?: string): Promise<Array<{ timestamp: string; type: string; message: string }>> => {
        const params = since ? `?since=${encodeURIComponent(since)}` : '';
        return api.get<Array<{ timestamp: string; type: string; message: string }>>(`/agent/logs${params}`);
    }
};

const localScraperApi = {
    start: async (missionId: string): Promise<{ success: boolean; jobId: string; message: string; sourceUrl: string; maxTargets: number; error?: string }> => 
        api.post<{ success: boolean; jobId: string; message: string; sourceUrl: string; maxTargets: number; error?: string }>('/scraper/start', { missionId }),
    stop: async (options: { jobId?: string; missionId?: string }): Promise<{ success: boolean; stoppedCount: number; message: string }> => 
        api.post<{ success: boolean; stoppedCount: number; message: string }>('/scraper/stop', options),
    getStatus: async (jobId: string): Promise<{ id: string; status: string; output: string[]; error?: string }> => 
        api.get<{ id: string; status: string; output: string[]; error?: string }>(`/scraper/status/${jobId}`),
    getJobs: async (missionId: string): Promise<Array<{ id: string; status: string; startedAt: string }>> => 
        api.get<Array<{ id: string; status: string; startedAt: string }>>(`/scraper/jobs/${missionId}`)
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
    groupId?: string;
    group?: LeadGroup;
    createdAt: string;
}

export interface LeadGroup {
    id: string;
    name: string;
    _count?: { leads: number };
}

const localLeadsApi = {
    getAll: async (filters?: { query?: string; location?: string; whatsappOnly?: boolean; notImported?: boolean; groupId?: string }): Promise<Lead[]> => {
        const params = new URLSearchParams();
        if (filters?.query) params.append('query', filters.query);
        if (filters?.location) params.append('location', filters.location);
        if (filters?.whatsappOnly) params.append('whatsappOnly', 'true');
        if (filters?.notImported) params.append('notImported', 'true');
        if (filters?.groupId) params.append('groupId', filters.groupId);

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
    },

    // Groups
    getGroups: async (): Promise<LeadGroup[]> => {
        const res = await fetch(`${API_BASE}/leads/groups`);
        return res.json();
    },

    createGroup: async (name: string): Promise<LeadGroup> => {
        const res = await fetch(`${API_BASE}/leads/groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        return res.json();
    },

    deleteGroup: async (id: string): Promise<void> => {
        await fetch(`${API_BASE}/leads/groups/${id}`, { method: 'DELETE' });
    },

    assignToGroup: async (leadIds: string[], groupId: string): Promise<{ success: boolean }> => {
        const res = await fetch(`${API_BASE}/leads/assign-group`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leadIds, groupId })
        });
        return res.json();
    },
    
    importFile: async (file: File, groupId?: string): Promise<{ success: boolean; count: number; totalExtracted: number }> => {
        const formData = new FormData();
        formData.append('file', file);
        if (groupId) formData.append('groupId', groupId);
        
        const res = await fetch(`${API_BASE}/leads/import-file`, {
            method: 'POST',
            body: formData
        });
        return res.json();
    }
};

// ─── Gmaps Stub (runs locally only) ───────────────────────────
export const firestoreGmapsApi = {
    search: async (data: any) => ({
        success: false,
        jobId: '',
        message: 'Google Maps scraper disponível apenas em ambiente local',
        query: '',
        location: '',
        maxResults: 0,
    }),
    estimate: async (data: { query: string; location: string }): Promise<{ estimated_total: number; estimated_wa: number; preview_names: string[]; error?: string }> => ({
        estimated_total: 0,
        estimated_wa: 0,
        preview_names: [],
        error: 'Disponível apenas em ambiente local'
    }),
    stop: async () => ({ success: false, stoppedCount: 0, message: 'N/A' }),
    getStatus: async () => ({ id: '', status: 'unavailable', output: [] as string[], error: undefined as string | undefined }),
    getJobs: async () => [] as Array<{ id: string; status: string; startedAt: string }>,
};

export const firestoreUploadApiFallback = {
    uploadFile: async (file: File): Promise<{ success: boolean; fileUrl: string; fileName: string; fileMimeType: string }> => {
        throw new Error('Upload is only supported via the local backend currently.');
    }
}

// ─── Exported API (auto-selects based on environment) ─────────
const useBackend = true; // Always use backend for this deployment

export const missionsApi = localMissionsApi;
export const targetsApi = localTargetsApi;
export const agentApi = localAgentApi;
export const leadsApi = localLeadsApi;

export const scraperApi = localScraperApi;
export const gmapsApi = localGmapsApi;
export const webScraperApi = localWebScraperApi;

// export const leadsApi = isProduction ? firestoreLeadsApiStub : localLeadsApi;

// ─── Evolution API (always local) ─────────────────────────────
export const evolutionApi = {
    getStatus: async (): Promise<{ connected: boolean; state: string; instanceName: string }> => {
        const res = await fetch(`${API_BASE}/evolution/status`);
        return res.json();
    },

    sendText: async (phone: string, message: string): Promise<{ success: boolean }> => {
        const res = await fetch(`${API_BASE}/evolution/send-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, message }),
        });
        return res.json();
    },

    sendMedia: async (phone: string, mediaUrl: string, caption?: string): Promise<{ success: boolean }> => {
        const res = await fetch(`${API_BASE}/evolution/send-media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, mediaUrl, caption }),
        });
        return res.json();
    }
};
