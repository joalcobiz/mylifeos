import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Plus, Check, Home, Users, Settings, ChevronRight } from 'lucide-react';
import { useAccount } from '../contexts/AccountContext';
import { Account } from '../types';

interface AccountSwitcherProps {
    compact?: boolean;
    showCreateButton?: boolean;
    onSettingsClick?: () => void;
}

export const AccountSwitcher: React.FC<AccountSwitcherProps> = ({
    compact = false,
    showCreateButton = true,
    onSettingsClick
}) => {
    const {
        accounts,
        currentAccount,
        currentAccountId,
        setCurrentAccountId,
        createAccount,
        getAccountHierarchy,
        getUserRole,
        canManageAccount
    } = useAccount();

    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newAccountName, setNewAccountName] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setIsCreating(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hierarchicalAccounts = getAccountHierarchy();

    const handleCreateAccount = async () => {
        if (!newAccountName.trim()) return;
        try {
            const newAccount = await createAccount(newAccountName.trim());
            setCurrentAccountId(newAccount.id);
            setNewAccountName('');
            setIsCreating(false);
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to create account:', error);
        }
    };

    const getAccountIcon = (account: Account) => {
        if (account.id === 'personal' || account.name === 'Personal') {
            return <Home size={14} className="text-gray-500" />;
        }
        if (account.members.length > 1) {
            return <Users size={14} className="text-gray-500" />;
        }
        return <Building2 size={14} className="text-gray-500" />;
    };

    const getAccountDepth = (account: Account): number => {
        return account.path.length;
    };

    const getRoleBadge = (account: Account) => {
        const role = getUserRole(account.id);
        if (!role) return null;
        
        const roleColors: Record<string, string> = {
            owner: 'bg-purple-100 text-purple-700',
            admin: 'bg-blue-100 text-blue-700',
            member: 'bg-green-100 text-green-700',
            viewer: 'bg-gray-100 text-gray-600'
        };

        return (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${roleColors[role] || roleColors.viewer}`}>
                {role}
            </span>
        );
    };

    if (compact) {
        return (
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
            >
                <Building2 size={12} className="text-gray-500" />
                <span className="max-w-[80px] truncate">{currentAccount?.name || 'Personal'}</span>
                <ChevronDown size={10} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 backdrop-blur border border-gray-200 hover:border-gray-300 hover:bg-white transition-all shadow-sm"
            >
                <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: currentAccount?.color || '#6366f1' }}
                >
                    {currentAccount?.name?.charAt(0) || 'P'}
                </div>
                <div className="text-left min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                        {currentAccount?.name || 'Personal'}
                    </div>
                    <div className="text-[10px] text-gray-500">
                        {currentAccount?.members.length || 1} member{(currentAccount?.members.length || 1) !== 1 ? 's' : ''}
                    </div>
                </div>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ml-1 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                    <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                        <p className="text-xs font-semibold text-gray-700">Switch Account</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">Select a workspace to view</p>
                    </div>

                    <div className="max-h-64 overflow-y-auto p-2">
                        {hierarchicalAccounts.length === 0 ? (
                            <div className="text-center py-4 text-gray-500 text-sm">
                                No accounts available
                            </div>
                        ) : (
                            hierarchicalAccounts.map(account => {
                                const depth = getAccountDepth(account);
                                const isSelected = account.id === currentAccountId;
                                
                                return (
                                    <button
                                        key={account.id}
                                        onClick={() => {
                                            setCurrentAccountId(account.id);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors ${
                                            isSelected 
                                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                                                : 'hover:bg-gray-50 text-gray-700'
                                        }`}
                                        style={{ paddingLeft: `${12 + depth * 16}px` }}
                                    >
                                        {depth > 0 && (
                                            <ChevronRight size={12} className="text-gray-300 -ml-4" />
                                        )}
                                        <div 
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                            style={{ backgroundColor: account.color || '#6366f1' }}
                                        >
                                            {account.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium truncate">{account.name}</span>
                                                {getRoleBadge(account)}
                                            </div>
                                            <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                                {getAccountIcon(account)}
                                                <span>{account.members.length} member{account.members.length !== 1 ? 's' : ''}</span>
                                            </div>
                                        </div>
                                        {isSelected && <Check size={16} className="text-indigo-600 flex-shrink-0" />}
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {isCreating ? (
                        <div className="p-3 border-t border-gray-100 bg-gray-50">
                            <input
                                type="text"
                                value={newAccountName}
                                onChange={(e) => setNewAccountName(e.target.value)}
                                placeholder="Account name..."
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateAccount();
                                    if (e.key === 'Escape') {
                                        setIsCreating(false);
                                        setNewAccountName('');
                                    }
                                }}
                            />
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={handleCreateAccount}
                                    disabled={!newAccountName.trim()}
                                    className="flex-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Create
                                </button>
                                <button
                                    onClick={() => {
                                        setIsCreating(false);
                                        setNewAccountName('');
                                    }}
                                    className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-2 border-t border-gray-100 bg-gray-50 flex gap-2">
                            {showCreateButton && (
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                >
                                    <Plus size={14} />
                                    New Account
                                </button>
                            )}
                            {onSettingsClick && canManageAccount() && (
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        onSettingsClick();
                                    }}
                                    className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <Settings size={14} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AccountSwitcher;
