import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { setAuthToken, getAuthToken } from '@/api/dbClient';

const AuthContext = createContext(null);

const BASE = '';

// Safely parse JSON from a fetch Response — returns null if body is empty
async function safeJson(res) {
    try { return await res.json(); } catch { return null; }
}

export function AuthProvider({ children }) {
    const [user,        setUser]        = useState(null);
    const [memberships, setMemberships] = useState([]);
    const [loading,     setLoading]     = useState(true);
    const refreshTimerRef = useRef(null);

    // ── Apply a new access token ───────────────────────────────────────────────
    const applyToken = useCallback((accessToken, incomingMemberships) => {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));

        setAuthToken(accessToken);
        setUser({
            id:         payload.userId,
            businessId: payload.businessId ?? null,
            role:       payload.role ?? null,
        });

        if (incomingMemberships !== undefined) {
            setMemberships(incomingMemberships);
        }

        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        const msUntilRefresh = (payload.exp * 1000) - Date.now() - 60_000;
        if (msUntilRefresh > 0) {
            refreshTimerRef.current = setTimeout(() => silentRefresh(), msUntilRefresh);
        }
    }, []);

    // ── Silent refresh ────────────────────────────────────────────────────────
    const silentRefresh = useCallback(async () => {
        try {
            const res = await fetch(`${BASE}/auth/refresh`, {
                method: 'POST', credentials: 'include',
            });
            if (res.ok) {
                const data = await res.json();
                applyToken(data.accessToken);
            } else {
                clearAuth();
            }
        } catch {
            clearAuth();
        }
    }, [applyToken]);

    function clearAuth() {
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        setAuthToken(null);
        setUser(null);
        setMemberships([]);
    }

    // ── On mount: restore session ─────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`${BASE}/auth/refresh`, {
                    method: 'POST', credentials: 'include',
                });
                if (res.ok) {
                    const data = await res.json();
                    applyToken(data.accessToken);
                }
            } catch { /* no session */ }
            finally { setLoading(false); }
        })();
    }, []);

    // ── Login — email + password only ─────────────────────────────────────────
    const login = useCallback(async ({ email, password }) => {
        const res = await fetch(`${BASE}/auth/login`, {
            method:      'POST',
            credentials: 'include',
            headers:     { 'Content-Type': 'application/json' },
            body:        JSON.stringify({ email, password }),
        });

        const data = await safeJson(res);
        if (!res.ok) {
            const msg = data?.errors?.[0]?.msg ?? data?.error ?? 'Login failed';
            throw new Error(msg);
        }

        applyToken(data.accessToken, data.memberships ?? []);
        return { user: data.user, memberships: data.memberships ?? [] };
    }, [applyToken]);

    // ── Register ──────────────────────────────────────────────────────────────
    const register = useCallback(async (payload) => {
        const res = await fetch(`${BASE}/auth/register`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
        });

        const data = await safeJson(res);
        if (!res.ok) {
            const msg = data?.errors?.[0]?.msg ?? data?.error ?? 'Registration failed';
            throw new Error(msg);
        }

        return data; // includes businessCode for Business registrations
    }, []);

    // ── Logout ────────────────────────────────────────────────────────────────
    const logout = useCallback(async () => {
        try {
            await fetch(`${BASE}/auth/logout`, {
                method: 'POST', credentials: 'include',
            });
        } catch { /* best-effort */ }
        clearAuth();
    }, []);

    // ── Switch business context ───────────────────────────────────────────────
    const switchBusiness = useCallback(async (targetBusinessId) => {
        const currentToken = getAuthToken();
        const res = await fetch(`${BASE}/auth/switch-business`, {
            method:      'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                Authorization:  `Bearer ${currentToken}`,
            },
            body: JSON.stringify({ targetBusinessId }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Switch failed');
        applyToken(data.accessToken, memberships);
    }, [applyToken, memberships]);

    // ── Join a business by code ───────────────────────────────────────────────
    const joinBusiness = useCallback(async (businessCode) => {
        const currentToken = getAuthToken();
        const res = await fetch(`${BASE}/auth/businesses/join`, {
            method:  'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization:  `Bearer ${currentToken}`,
            },
            body: JSON.stringify({ businessCode }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to join business');
        // Refresh memberships
        const meRes = await fetch(`${BASE}/auth/me`, {
            headers: { Authorization: `Bearer ${currentToken}` },
        });
        if (meRes.ok) {
            const me = await meRes.json();
            setMemberships(me.memberships ?? []);
        }
        return data;
    }, []);

    // ── Search businesses ─────────────────────────────────────────────────────
    const searchBusinesses = useCallback(async (query) => {
        const res = await fetch(
            `${BASE}/auth/businesses/search?q=${encodeURIComponent(query)}`
        );
        if (!res.ok) throw new Error('Search failed');
        return res.json();
    }, []);

    return (
        <AuthContext.Provider value={{
            user, memberships, loading,
            login, register, logout,
            switchBusiness, joinBusiness, searchBusinesses,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
