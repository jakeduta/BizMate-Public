import { useState, useEffect } from 'react';
import { useWorkspace } from '@/context/WorkspaceContext';

/**
 * useExtraFields(moduleSlug)
 *
 * Fetches user-defined extra fields for a core module (e.g. 'customers', 'employees').
 * Returns an empty array while loading or if no extra fields exist.
 */
export function useExtraFields(moduleSlug) {
    const { getModuleBySlug, getFields } = useWorkspace();
    const [extraFields, setExtraFields] = useState([]);

    useEffect(() => {
        if (!moduleSlug) return;
        const mod = getModuleBySlug(moduleSlug);
        if (!mod) return;
        getFields(mod.id).then(setExtraFields).catch(() => {});
    }, [moduleSlug]);

    return extraFields;
}
