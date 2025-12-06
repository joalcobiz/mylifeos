import React from 'react';
import { Users, User, Share2, UserCheck } from 'lucide-react';
import { SharingMode } from '../contexts/SharingContext';

interface SharingFilterProps {
    mode: SharingMode;
    onChange: (mode: SharingMode) => void;
    stats?: {
        total: number;
        mine: number;
        shared: number;
        assigned: number;
    };
    compact?: boolean;
    className?: string;
}

const MODES: { id: SharingMode; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'all', label: 'All', icon: Users, color: 'blue' },
    { id: 'mine', label: 'Mine', icon: User, color: 'emerald' },
    { id: 'shared', label: 'Shared', icon: Share2, color: 'purple' },
    { id: 'assigned', label: 'Assigned', icon: UserCheck, color: 'amber' }
];

const SharingFilter: React.FC<SharingFilterProps> = ({
    mode,
    onChange,
    stats,
    compact = false,
    className = ''
}) => {
    if (compact) {
        return (
            <div className={`flex items-center gap-1 bg-gray-100 rounded-lg p-1 ${className}`}>
                {MODES.map(m => {
                    const Icon = m.icon;
                    const count = stats?.[m.id === 'all' ? 'total' : m.id] || 0;
                    const isActive = mode === m.id;
                    
                    return (
                        <button
                            key={m.id}
                            onClick={() => onChange(m.id)}
                            title={`${m.label}${stats ? ` (${count})` : ''}`}
                            className={`p-1.5 rounded transition-all ${
                                isActive 
                                    ? 'bg-white shadow text-primary' 
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <Icon size={14} />
                        </button>
                    );
                })}
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 flex-wrap ${className}`}>
            {MODES.map(m => {
                const Icon = m.icon;
                const count = stats?.[m.id === 'all' ? 'total' : m.id] || 0;
                const isActive = mode === m.id;
                
                return (
                    <button
                        key={m.id}
                        onClick={() => onChange(m.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            isActive 
                                ? m.color === 'blue'
                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                    : m.color === 'emerald'
                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                        : m.color === 'purple'
                                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                                : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        <Icon size={14} />
                        <span>{m.label}</span>
                        {stats && (
                            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                                isActive 
                                    ? 'bg-white/50'
                                    : 'bg-gray-200'
                            }`}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

export const OwnerBadge: React.FC<{ 
    ownerName: string; 
    isOwner: boolean;
    size?: 'xs' | 'sm';
}> = ({ ownerName, isOwner, size = 'xs' }) => {
    if (isOwner) return null;
    
    return (
        <span className={`inline-flex items-center gap-1 ${
            size === 'xs' 
                ? 'text-[10px] px-1.5 py-0.5' 
                : 'text-xs px-2 py-0.5'
        } rounded-full bg-gray-100 text-gray-600`}>
            <User size={size === 'xs' ? 10 : 12} />
            {ownerName}
        </span>
    );
};

export default SharingFilter;
