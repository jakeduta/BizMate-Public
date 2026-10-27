import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getAuthToken } from '@/api/dbClient';

const PermissionsContext = createContext(null);

const API = '/api/permissions';

function authHeaders() {
    return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAuthToken()}`,
    };
}

export function PermissionsProvider({ children }) {
    const { user } = useAuth();

    // Set of permission keys granted to the current user
    const [grantedKeys, setGrantedKeys] = useState(new Set());
    const [loading, setLoading]         = useState(false);

    // Full matrix — only loaded for Admin/Manager on the Settings page
    const [matrix, setMatrix] = useState([]);
    const [allKeys, setAllKeys] = useState([]);

    const isAdmin = user?.role === 'Admin';

    // ── Load the current user's permissions ───────────────────────────────────
    const loadMyPermissions = useCallback(async () => {
        if (!user?.businessId) return;

        if (isAdmin) {
            // Admin has everything — signal with a wildcard sentinel
            setGrantedKeys(new Set(['*']));
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API}/me`, { headers: authHeaders() });
            if (!res.ok) return;
            const { grantedKeys: keys } = await res.json();
            setGrantedKeys(new Set(keys));
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, [user]);

    useEffect(() => {
        if (user?.businessId) {
            loadMyPermissions();
        } else {
            setGrantedKeys(new Set());
            setMatrix([]);
        }
    }, [user]);

    // ── Permission check ──────────────────────────────────────────────────────
    function hasPermission(key) {
        if (!user) return false;
        if (isAdmin) return true;
        // '*' sentinel means Admin (shouldn't be reached, but defensive)
        if (grantedKeys.has('*')) return true;
        return grantedKeys.has(key);
    }

    // ── Matrix management (Settings > Permissions tab) ────────────────────────
    const loadMatrix = useCallback(async () => {
        const res = await fetch(`${API}`, { headers: authHeaders() });
        if (!res.ok) throw new Error((await res.json()).error);
        const data = await res.json();
        setMatrix(data.permissions);
        setAllKeys(data.allKeys);
        return data;
    }, []);

    const updatePermission = useCallback(async (role, permissionKey, granted) => {
        const res = await fetch(`${API}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ role, permissionKey, granted }),
        });
        if (!res.ok) throw new Error((await res.json()).error);

        // Optimistically update local matrix
        setMatrix(prev => prev.map(p =>
            p.role === role && p.permission_key === permissionKey
                ? { ...p, granted: granted ? 1 : 0 }
                : p
        ));
    }, []);

    return (
        <PermissionsContext.Provider value={{
            hasPermission,
            loading,
            loadMyPermissions,
            loadMatrix,
            updatePermission,
            matrix,
            allKeys,
        }}>
            {children}
        </PermissionsContext.Provider>
    );
}

export const usePermissions = () => useContext(PermissionsContext);
