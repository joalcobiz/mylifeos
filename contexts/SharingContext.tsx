import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth, MOCK_USERS } from './AuthContext';

export type SharingMode = 'all' | 'mine' | 'shared' | 'assigned';

export interface ModuleSharingPreference {
    defaultMode: SharingMode;
    showOwnerLabels: boolean;
}

export interface SharingSettings {
    globalDefaultMode: SharingMode;
    showOwnerLabels: boolean;
    modulePreferences: Record<string, ModuleSharingPreference>;
}

interface SharingContextType {
    settings: SharingSettings;
    updateGlobalDefault: (mode: SharingMode) => void;
    updateModulePreference: (moduleName: string, pref: Partial<ModuleSharingPreference>) => void;
    toggleOwnerLabels: (show: boolean) => void;
    getModuleSharingMode: (moduleName: string, currentMode?: SharingMode) => SharingMode;
    getOwnerName: (ownerId: string) => string;
    isOwner: (ownerId: string) => boolean;
    canEdit: (item: { owner?: string; sharedWith?: string[]; assignedTo?: string }) => boolean;
}

const DEFAULT_SETTINGS: SharingSettings = {
    globalDefaultMode: 'all',
    showOwnerLabels: true,
    modulePreferences: {}
};

const SharingContext = createContext<SharingContextType | null>(null);

export const SharingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<SharingSettings>(DEFAULT_SETTINGS);

    useEffect(() => {
        const stored = localStorage.getItem('lifeos_sharing_settings');
        if (stored) {
            try {
                setSettings(JSON.parse(stored));
            } catch (e) {
                console.error('Failed to parse sharing settings:', e);
            }
        }
    }, []);

    const saveSettings = (newSettings: SharingSettings) => {
        setSettings(newSettings);
        localStorage.setItem('lifeos_sharing_settings', JSON.stringify(newSettings));
    };

    const updateGlobalDefault = (mode: SharingMode) => {
        saveSettings({ ...settings, globalDefaultMode: mode });
    };

    const updateModulePreference = (moduleName: string, pref: Partial<ModuleSharingPreference>) => {
        const current = settings.modulePreferences[moduleName] || { 
            defaultMode: settings.globalDefaultMode,
            showOwnerLabels: settings.showOwnerLabels
        };
        saveSettings({
            ...settings,
            modulePreferences: {
                ...settings.modulePreferences,
                [moduleName]: { ...current, ...pref }
            }
        });
    };

    const toggleOwnerLabels = (show: boolean) => {
        saveSettings({ ...settings, showOwnerLabels: show });
    };

    const getModuleSharingMode = (moduleName: string, currentMode?: SharingMode): SharingMode => {
        if (currentMode) return currentMode;
        const modulePref = settings.modulePreferences[moduleName];
        if (modulePref?.defaultMode) return modulePref.defaultMode;
        return settings.globalDefaultMode;
    };

    const getOwnerName = (ownerId: string): string => {
        if (!ownerId) return 'Unknown';
        const mockUser = MOCK_USERS.find(u => u.uid === ownerId);
        if (mockUser) return mockUser.displayName || 'Unknown';
        const parts = ownerId.split('-');
        if (parts.length > 1) {
            return parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
        }
        return 'Unknown';
    };

    const isOwner = (ownerId: string): boolean => {
        if (!user) return false;
        return ownerId === user.uid;
    };

    const canEdit = (item: { owner?: string; sharedWith?: string[]; assignedTo?: string }): boolean => {
        if (!user) return false;
        if (user.isAdmin || user.isSystemAdmin) return true;
        if (item.owner === user.uid) return true;
        if (item.assignedTo === user.uid) return true;
        if (item.sharedWith?.includes(user.uid)) return true;
        return false;
    };

    return (
        <SharingContext.Provider value={{
            settings,
            updateGlobalDefault,
            updateModulePreference,
            toggleOwnerLabels,
            getModuleSharingMode,
            getOwnerName,
            isOwner,
            canEdit
        }}>
            {children}
        </SharingContext.Provider>
    );
};

export const useSharing = (): SharingContextType => {
    const context = useContext(SharingContext);
    if (!context) {
        throw new Error('useSharing must be used within a SharingProvider');
    }
    return context;
};

export const filterDataBySharing = <T extends { 
    owner?: string; 
    isShared?: boolean; 
    sharedWith?: string[]; 
    assignedTo?: string 
}>(
    data: T[],
    userId: string,
    mode: SharingMode,
    isAdmin: boolean = false
): T[] => {
    if (isAdmin && mode === 'all') {
        return data;
    }

    switch (mode) {
        case 'all':
            return data.filter(item => 
                item.owner === userId ||
                item.isShared ||
                item.sharedWith?.includes(userId) ||
                item.assignedTo === userId
            );
        case 'mine':
            return data.filter(item => item.owner === userId);
        case 'shared':
            return data.filter(item => 
                item.owner !== userId && (
                    item.isShared ||
                    item.sharedWith?.includes(userId)
                )
            );
        case 'assigned':
            return data.filter(item => 
                item.assignedTo === userId && item.owner !== userId
            );
        default:
            return data;
    }
};

export default SharingContext;
