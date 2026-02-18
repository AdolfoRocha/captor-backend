import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Mission, Target, AuditLog, AgentStats, Lead } from './api';

// ─── Collection References ────────────────────────────────────
const missionsCol = collection(db, 'missions');
const targetsCol = collection(db, 'targets');
const auditLogsCol = collection(db, 'auditLogs');

// ─── Helpers ──────────────────────────────────────────────────
const toDate = (ts: Timestamp | null | undefined): string => {
    if (!ts) return new Date().toISOString();
    return ts.toDate().toISOString();
};

// ─── Missions ─────────────────────────────────────────────────
export const firestoreMissionsApi = {
    getAll: async (): Promise<Mission[]> => {
        const snap = await getDocs(query(missionsCol, orderBy('createdAt', 'desc')));
        return snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                title: data.title,
                promptInstruction: data.promptInstruction,
                sourceUrl: data.sourceUrl || null,
                targetLimit: data.targetLimit || null,
                missionType: data.missionType || 'cliente_oculto',
                searchNiche: data.searchNiche || null,
                searchLocation: data.searchLocation || null,
                status: data.status,
                createdAt: toDate(data.createdAt),
                updatedAt: toDate(data.updatedAt),
                _count: { targets: data._count?.targets || 0 },
            } as Mission;
        });
    },

    getById: async (id: string): Promise<Mission & { targets: Target[] }> => {
        const missionDoc = await getDoc(doc(db, 'missions', id));
        const missionData = missionDoc.data()!;

        const targetsSnap = await getDocs(
            query(targetsCol, where('missionId', '==', id))
        );
        const targets = targetsSnap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                name: data.name,
                phone: data.phone,
                scrapedBio: data.scrapedBio || null,
                auditStatus: data.auditStatus,
                lastInteraction: data.lastInteraction ? toDate(data.lastInteraction) : null,
                missionId: data.missionId,
            } as Target;
        });

        return {
            id: missionDoc.id,
            title: missionData.title,
            promptInstruction: missionData.promptInstruction,
            sourceUrl: missionData.sourceUrl || null,
            targetLimit: missionData.targetLimit || null,
            missionType: missionData.missionType || 'cliente_oculto',
            searchNiche: missionData.searchNiche || null,
            searchLocation: missionData.searchLocation || null,
            status: missionData.status,
            createdAt: toDate(missionData.createdAt),
            updatedAt: toDate(missionData.updatedAt),
            targets,
        };
    },

    create: async (data: {
        title: string;
        promptInstruction: string;
        sourceUrl?: string;
        targetLimit?: number;
        missionType?: string;
        searchNiche?: string;
        searchLocation?: string;
    }): Promise<Mission> => {
        const docRef = await addDoc(missionsCol, {
            ...data,
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        const snap = await getDoc(docRef);
        const d = snap.data()!;
        return {
            id: docRef.id,
            title: d.title,
            promptInstruction: d.promptInstruction,
            sourceUrl: d.sourceUrl || null,
            targetLimit: d.targetLimit || null,
            missionType: d.missionType || 'cliente_oculto',
            searchNiche: d.searchNiche || null,
            searchLocation: d.searchLocation || null,
            status: d.status,
            createdAt: toDate(d.createdAt),
            updatedAt: toDate(d.updatedAt),
        };
    },

    update: async (id: string, data: Partial<Mission>): Promise<Mission> => {
        const ref = doc(db, 'missions', id);
        await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
        const snap = await getDoc(ref);
        const d = snap.data()!;
        return {
            id,
            title: d.title,
            promptInstruction: d.promptInstruction,
            sourceUrl: d.sourceUrl || null,
            targetLimit: d.targetLimit || null,
            missionType: d.missionType || 'cliente_oculto',
            searchNiche: d.searchNiche || null,
            searchLocation: d.searchLocation || null,
            status: d.status,
            createdAt: toDate(d.createdAt),
            updatedAt: toDate(d.updatedAt),
        };
    },

    delete: async (id: string): Promise<void> => {
        // Delete associated targets and their audit logs first
        const targetsSnap = await getDocs(
            query(targetsCol, where('missionId', '==', id))
        );
        for (const targetDoc of targetsSnap.docs) {
            const logsSnap = await getDocs(
                query(auditLogsCol, where('targetId', '==', targetDoc.id))
            );
            for (const logDoc of logsSnap.docs) {
                await deleteDoc(logDoc.ref);
            }
            await deleteDoc(targetDoc.ref);
        }
        await deleteDoc(doc(db, 'missions', id));
    },

    finalizeScraping: async (id: string): Promise<Mission> => {
        const ref = doc(db, 'missions', id);
        await updateDoc(ref, { status: 'completed', updatedAt: serverTimestamp() });
        const snap = await getDoc(ref);
        const d = snap.data()!;
        return {
            id,
            title: d.title,
            promptInstruction: d.promptInstruction,
            sourceUrl: d.sourceUrl || null,
            targetLimit: d.targetLimit || null,
            missionType: d.missionType || 'cliente_oculto',
            searchNiche: d.searchNiche || null,
            searchLocation: d.searchLocation || null,
            status: d.status,
            createdAt: toDate(d.createdAt),
            updatedAt: toDate(d.updatedAt),
        };
    },
};

// ─── Targets ──────────────────────────────────────────────────
export const firestoreTargetsApi = {
    getAll: async (filters?: { missionId?: string; status?: string }): Promise<Target[]> => {
        let q = query(targetsCol, orderBy('createdAt', 'desc'));

        if (filters?.missionId) {
            q = query(targetsCol, where('missionId', '==', filters.missionId), orderBy('createdAt', 'desc'));
        }

        const snap = await getDocs(q);
        let results = snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                name: data.name,
                phone: data.phone,
                scrapedBio: data.scrapedBio || null,
                auditStatus: data.auditStatus,
                lastInteraction: data.lastInteraction ? toDate(data.lastInteraction) : null,
                missionId: data.missionId,
            } as Target;
        });

        if (filters?.status) {
            results = results.filter(t => t.auditStatus === filters.status);
        }

        return results;
    },

    getById: async (id: string): Promise<Target & { auditLogs: AuditLog[] }> => {
        const targetDoc = await getDoc(doc(db, 'targets', id));
        const targetData = targetDoc.data()!;

        const logsSnap = await getDocs(
            query(auditLogsCol, where('targetId', '==', id), orderBy('timestamp', 'asc'))
        );
        const auditLogs = logsSnap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                targetId: data.targetId,
                role: data.role,
                message: data.message,
                timestamp: toDate(data.timestamp),
            } as AuditLog;
        });

        return {
            id: targetDoc.id,
            name: targetData.name,
            phone: targetData.phone,
            scrapedBio: targetData.scrapedBio || null,
            auditStatus: targetData.auditStatus,
            lastInteraction: targetData.lastInteraction ? toDate(targetData.lastInteraction) : null,
            missionId: targetData.missionId,
            auditLogs,
        };
    },

    create: async (data: {
        name: string;
        phone: string;
        missionId: string;
        scrapedBio?: string;
    }): Promise<Target> => {
        const docRef = await addDoc(targetsCol, {
            ...data,
            auditStatus: 'pending',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        const snap = await getDoc(docRef);
        const d = snap.data()!;
        return {
            id: docRef.id,
            name: d.name,
            phone: d.phone,
            scrapedBio: d.scrapedBio || null,
            auditStatus: d.auditStatus,
            lastInteraction: null,
            missionId: d.missionId,
        };
    },

    createBulk: async (
        targets: { name: string; phone: string; scrapedBio?: string }[],
        missionId: string
    ): Promise<{ count: number }> => {
        let count = 0;
        for (const target of targets) {
            await addDoc(targetsCol, {
                ...target,
                missionId,
                auditStatus: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            count++;
        }
        return { count };
    },

    update: async (id: string, data: Partial<Target>): Promise<Target> => {
        const ref = doc(db, 'targets', id);
        await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
        const snap = await getDoc(ref);
        const d = snap.data()!;
        return {
            id,
            name: d.name,
            phone: d.phone,
            scrapedBio: d.scrapedBio || null,
            auditStatus: d.auditStatus,
            lastInteraction: d.lastInteraction ? toDate(d.lastInteraction) : null,
            missionId: d.missionId,
        };
    },

    delete: async (id: string): Promise<void> => {
        // Delete audit logs first
        const logsSnap = await getDocs(
            query(auditLogsCol, where('targetId', '==', id))
        );
        for (const logDoc of logsSnap.docs) {
            await deleteDoc(logDoc.ref);
        }
        await deleteDoc(doc(db, 'targets', id));
    },
};

// ─── Agent (stub for production — agent runs locally) ─────────
export const firestoreAgentApi = {
    getStats: async (): Promise<AgentStats> => {
        const snap = await getDocs(targetsCol);
        const targets = snap.docs.map(d => d.data());
        return {
            pending: targets.filter(t => t.auditStatus === 'pending').length,
            inProgress: targets.filter(t => t.auditStatus === 'in_progress').length,
            completed: targets.filter(t => t.auditStatus === 'completed').length,
            failed: targets.filter(t => t.auditStatus === 'failed').length,
            total: targets.length,
        };
    },

    getStatus: async () => ({
        status: 'DISCONNECTED',
        currentAction: 'Agente local não conectado',
        lastUpdate: new Date().toISOString(),
    }),

    getLogs: async () => [] as Array<{ timestamp: string; type: string; message: string }>,
};


// ─── Scraper (stub — scraper runs locally only) ───────────────
export const firestoreScraperApi = {
    start: async () => ({
        success: false,
        jobId: '',
        message: 'Scraper disponível apenas em ambiente local',
        sourceUrl: '',
        maxTargets: 0,
        error: undefined as string | undefined,
    }),
    stop: async () => ({ success: false, stoppedCount: 0, message: 'N/A' }),
    getStatus: async () => ({ id: '', status: 'unavailable', output: [] as string[], error: undefined as string | undefined }),
    getJobs: async () => [] as Array<{ id: string; status: string; startedAt: string }>,
};

// ─── Leads ────────────────────────────────────────────────────
const leadsCol = collection(db, 'leads');

export const firestoreLeadsApi = {
    getAll: async (filters?: { niche?: string; location?: string; imported?: boolean }): Promise<Lead[]> => {
        let q = query(leadsCol, orderBy('createdAt', 'desc'));

        // Firestore simple query limitations might require client-side filtering or composite indexes
        // For now, we'll fetch and filter client-side if needed, or use simple where clauses
        if (filters?.imported !== undefined) {
            q = query(leadsCol, where('imported', '==', filters.imported), orderBy('createdAt', 'desc'));
        }

        const snap = await getDocs(q);
        let results = snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                name: data.name,
                phone: data.phone,
                phoneRaw: data.phoneRaw,
                category: data.category,
                address: data.address,
                website: data.website,
                rating: data.rating,
                reviews: data.reviews,
                isWhatsapp: data.isWhatsapp,
                waConfidence: data.waConfidence,
                searchQuery: data.searchQuery,
                searchLocation: data.searchLocation,
                imported: data.imported,
                createdAt: toDate(data.createdAt),
            } as Lead;
        });

        if (filters?.niche) {
            results = results.filter(l => l.searchQuery.toLowerCase().includes(filters.niche!.toLowerCase()));
        }
        if (filters?.location) {
            results = results.filter(l => l.searchLocation.toLowerCase().includes(filters.location!.toLowerCase()));
        }

        return results;
    },

    create: async (data: Omit<Lead, 'id' | 'createdAt'>): Promise<Lead> => {
        const docRef = await addDoc(leadsCol, {
            ...data,
            createdAt: serverTimestamp(),
        });
        const snap = await getDoc(docRef);
        const d = snap.data()!;
        return {
            id: docRef.id,
            ...data,
            createdAt: toDate(d.createdAt),
        };
    },

    delete: async (id: string): Promise<void> => {
        await deleteDoc(doc(db, 'leads', id));
    },

    importToMission: async (leadIds: string[], missionId: string): Promise<{ imported: number; duplicates: number }> => {
        let imported = 0;
        let duplicates = 0;

        // Get mission to associate (optional check)

        // Fetch existing targets for this mission to check duplicates (by phone)
        const currentTargets = await firestoreTargetsApi.getAll({ missionId });
        const currentPhones = new Set(currentTargets.map(t => t.phone));

        for (const leadId of leadIds) {
            const leadDocRef = doc(db, 'leads', leadId);
            const leadSnap = await getDoc(leadDocRef);

            if (!leadSnap.exists()) continue;

            const leadData = leadSnap.data();
            const phone = leadData.phoneRaw || leadData.phone; // Use raw phone or formatted

            if (currentPhones.has(phone)) {
                duplicates++;
                // Still mark as imported? Maybe. Let's mark it.
                await updateDoc(leadDocRef, { imported: true });
                continue;
            }

            // Create Target
            await firestoreTargetsApi.create({
                name: leadData.name,
                phone: phone,
                missionId: missionId,
                scrapedBio: `${leadData.category || ''} - ${leadData.searchQuery} em ${leadData.searchLocation}`.trim(),
            });

            // Mark lead as imported
            await updateDoc(leadDocRef, { imported: true });
            imported++;
            currentPhones.add(phone);
        }

        return { imported, duplicates };
    },

    getStats: async () => {
        const snap = await getDocs(leadsCol);
        const leads = snap.docs.map(d => d.data());
        return {
            total: leads.length,
            whatsapp: leads.filter(l => l.isWhatsapp).length,
            imported: leads.filter(l => l.imported).length
        };
    }
};

