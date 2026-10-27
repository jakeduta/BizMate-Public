import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getAuthToken } from '@/api/dbClient';

const WorkspaceContext = createContext(null);

const API = '/api/workspace';

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
    };
}

export function WorkspaceProvider({ children }) {
    const { user } = useAuth();
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(false);

    const canCustomize = ['Admin', 'Manager'].includes(user?.role);

    // ── Fetch enabled modules (used by sidebar) ────────────────────────────────
    const fetchModules = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/modules`, { headers: authHeaders() });
            if (res.ok) setModules(await res.json());
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, [user]);

    // ── Fetch all modules including disabled (customize page) ─────────────────
    const fetchAllModules = useCallback(async () => {
        const res = await fetch(`${API}/modules/all`, { headers: authHeaders() });
        if (!res.ok) throw new Error((await res.json()).error);
        return res.json();
    }, []);

    // Re-fetch whenever the logged-in user changes
    useEffect(() => {
        if (user) fetchModules();
        else setModules([]);
    }, [user]);

    // ── Module helpers ────────────────────────────────────────────────────────
    const getModuleBySlug = useCallback(
        (slug) => modules.find(m => m.slug === slug) ?? null,
        [modules]
    );

    // ── API wrappers ──────────────────────────────────────────────────────────
    async function createModule(name, icon) {
        const res = await fetch(`${API}/modules`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ name, icon }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        await fetchModules();
        return data;
    }

    async function updateModule(moduleId, updates) {
        const res = await fetch(`${API}/modules/${moduleId}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(updates),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        await fetchModules();
        return data;
    }

    async function reorderModules(orderings) {
        const res = await fetch(`${API}/modules/reorder`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ orderings }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        await fetchModules();
    }

    async function deleteModule(moduleId) {
        const res = await fetch(`${API}/modules/${moduleId}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        if (!res.ok) throw new Error((await res.json()).error);
        await fetchModules();
    }

    // Fields
    async function getFields(moduleId) {
        const res = await fetch(`${API}/modules/${moduleId}/fields`, { headers: authHeaders() });
        if (!res.ok) throw new Error((await res.json()).error);
        return res.json();
    }

    async function saveField(moduleId, fieldData) {
        const res = await fetch(`${API}/modules/${moduleId}/fields`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(fieldData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        return data;
    }

    async function deleteField(moduleId, fieldId) {
        const res = await fetch(`${API}/modules/${moduleId}/fields/${fieldId}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        if (!res.ok) throw new Error((await res.json()).error);
    }

    // Records
    async function getRecords(moduleId) {
        const res = await fetch(`${API}/modules/${moduleId}/records`, { headers: authHeaders() });
        if (!res.ok) throw new Error((await res.json()).error);
        return res.json();
    }

    async function createRecord(moduleId, data) {
        const res = await fetch(`${API}/modules/${moduleId}/records`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(data),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        return body;
    }

    async function updateRecord(moduleId, recordId, data) {
        const res = await fetch(`${API}/modules/${moduleId}/records/${recordId}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(data),
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        return body;
    }

    async function deleteRecord(moduleId, recordId) {
        const res = await fetch(`${API}/modules/${moduleId}/records/${recordId}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
        if (!res.ok) throw new Error((await res.json()).error);
    }

    return (
        <WorkspaceContext.Provider value={{
            modules,
            loading,
            canCustomize,
            getModuleBySlug,
            fetchModules,
            fetchAllModules,
            createModule,
            updateModule,
            reorderModules,
            deleteModule,
            getFields,
            saveField,
            deleteField,
            getRecords,
            createRecord,
            updateRecord,
            deleteRecord,
        }}>
            {children}
        </WorkspaceContext.Provider>
    );
}

export const useWorkspace = () => useContext(WorkspaceContext);
