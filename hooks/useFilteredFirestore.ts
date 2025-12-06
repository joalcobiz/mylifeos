import { useMemo } from 'react';
import { useFirestore } from '../services/firestore';
import { useSharing, filterDataBySharing, SharingMode } from '../contexts/SharingContext';
import { useAuth } from '../contexts/AuthContext';

interface UseFilteredFirestoreOptions {
    mode?: SharingMode;
    moduleName?: string;
}

interface FilteredItem {
    id: string;
    owner?: string;
    isShared?: boolean;
    sharedWith?: string[];
    assignedTo?: string;
    [key: string]: any;
}

export function useFilteredFirestore<T extends FilteredItem>(
    collectionName: string,
    options: UseFilteredFirestoreOptions = {}
) {
    const { user } = useAuth();
    const { settings, getModuleSharingMode, getOwnerName, isOwner, canEdit } = useSharing();
    const firestore = useFirestore<T>(collectionName);
    
    const effectiveMode = options.mode || (
        options.moduleName 
            ? getModuleSharingMode(options.moduleName) 
            : settings.globalDefaultMode
    );

    const filteredData = useMemo(() => {
        if (!user) return [];
        return filterDataBySharing(
            firestore.data,
            user.uid,
            effectiveMode,
            user.isAdmin || user.isSystemAdmin
        );
    }, [firestore.data, user, effectiveMode]);

    const dataWithMeta = useMemo(() => {
        return filteredData.map(item => ({
            ...item,
            _ownerName: getOwnerName(item.owner || ''),
            _isOwner: isOwner(item.owner || ''),
            _canEdit: canEdit(item)
        }));
    }, [filteredData, getOwnerName, isOwner, canEdit]);

    const stats = useMemo(() => {
        const all = firestore.data;
        const userId = user?.uid || '';
        
        return {
            total: all.length,
            mine: all.filter(item => item.owner === userId).length,
            shared: all.filter(item => 
                item.owner !== userId && (item.isShared || item.sharedWith?.includes(userId))
            ).length,
            assigned: all.filter(item => 
                item.assignedTo === userId && item.owner !== userId
            ).length
        };
    }, [firestore.data, user]);

    return {
        ...firestore,
        data: dataWithMeta,
        rawData: firestore.data,
        stats,
        effectiveMode,
        showOwnerLabels: settings.showOwnerLabels
    };
}

export default useFilteredFirestore;
