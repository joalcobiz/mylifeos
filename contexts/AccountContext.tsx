import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useFirestore } from '../services/firestore';
import { Account, AccountMember, AccountRole, AccountStatus, AccountScoped } from '../types';

interface AccountContextType {
    accounts: Account[];
    currentAccount: Account | null;
    currentAccountId: string | null;
    isLoading: boolean;
    setCurrentAccountId: (accountId: string | null) => void;
    createAccount: (name: string, description?: string, parentAccountId?: string) => Promise<Account>;
    updateAccount: (accountId: string, updates: Partial<Account>) => Promise<void>;
    deleteAccount: (accountId: string) => Promise<void>;
    addMember: (accountId: string, uid: string, displayName: string, role: AccountRole) => Promise<void>;
    removeMember: (accountId: string, uid: string) => Promise<void>;
    updateMemberRole: (accountId: string, uid: string, newRole: AccountRole) => Promise<void>;
    getUserRole: (accountId?: string) => AccountRole | null;
    canManageAccount: (accountId?: string) => boolean;
    canViewAccount: (accountId: string) => boolean;
    getAccountHierarchy: () => Account[];
    getChildAccounts: (parentId: string) => Account[];
    filterByCurrentAccount: <T extends AccountScoped>(items: T[]) => T[];
    getAccountById: (accountId: string) => Account | undefined;
}

const AccountContext = createContext<AccountContextType | null>(null);

const PERSONAL_ACCOUNT_ID = 'personal';

export const AccountProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { data: accounts, add, update, remove } = useFirestore<Account>('accounts');
    const [currentAccountId, setCurrentAccountIdState] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem('lifeos_current_account');
        if (stored) {
            setCurrentAccountIdState(stored);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        if (!user) {
            setCurrentAccountIdState(null);
            return;
        }

        const userAccounts = accounts.filter(acc => 
            acc.status === 'active' && 
            acc.members.some(m => m.uid === user.uid)
        );

        if (userAccounts.length === 0 && accounts.length > 0) {
            createPersonalAccount();
        } else if (!currentAccountId && userAccounts.length > 0) {
            const defaultAccount = userAccounts.find(a => a.id === PERSONAL_ACCOUNT_ID) || userAccounts[0];
            setCurrentAccountId(defaultAccount.id);
        }
    }, [user, accounts]);

    const createPersonalAccount = async () => {
        if (!user) return;
        
        const existingPersonal = accounts.find(a => 
            a.id === PERSONAL_ACCOUNT_ID || 
            (a.name === 'Personal' && a.members.some(m => m.uid === user.uid))
        );
        
        if (existingPersonal) return;

        const personalAccount: Account = {
            id: PERSONAL_ACCOUNT_ID,
            name: 'Personal',
            description: 'Your personal workspace',
            parentAccountId: null,
            path: [],
            members: [{
                uid: user.uid,
                displayName: user.displayName || 'User',
                role: 'owner',
                joinedAt: new Date().toISOString()
            }],
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy: user.uid,
            updatedAt: new Date().toISOString(),
            color: '#6366f1',
            icon: 'home'
        };

        try {
            await add(personalAccount);
            setCurrentAccountId(personalAccount.id);
        } catch (error) {
            console.error('Failed to create personal account:', error);
        }
    };

    const setCurrentAccountId = (accountId: string | null) => {
        setCurrentAccountIdState(accountId);
        if (accountId) {
            localStorage.setItem('lifeos_current_account', accountId);
        } else {
            localStorage.removeItem('lifeos_current_account');
        }
    };

    const currentAccount = useMemo(() => {
        if (!currentAccountId) return null;
        return accounts.find(a => a.id === currentAccountId) || null;
    }, [currentAccountId, accounts]);

    const createAccount = async (name: string, description?: string, parentAccountId?: string): Promise<Account> => {
        if (!user) throw new Error('User not authenticated');

        const parentPath = parentAccountId 
            ? (accounts.find(a => a.id === parentAccountId)?.path || []).concat(parentAccountId)
            : [];

        const newAccount: Account = {
            id: `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            description,
            parentAccountId: parentAccountId || null,
            path: parentPath,
            members: [{
                uid: user.uid,
                displayName: user.displayName || 'User',
                role: 'owner',
                joinedAt: new Date().toISOString()
            }],
            status: 'active',
            createdAt: new Date().toISOString(),
            createdBy: user.uid,
            updatedAt: new Date().toISOString()
        };

        await add(newAccount);
        return newAccount;
    };

    const checkManagePermission = (accountId: string): void => {
        if (!user) throw new Error('User not authenticated');
        if (user.isSystemAdmin) return;
        
        const account = accounts.find(a => a.id === accountId);
        if (!account) throw new Error('Account not found');
        
        const member = account.members.find(m => m.uid === user.uid);
        if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
            throw new Error('You do not have permission to manage this account');
        }
    };

    const updateAccount = async (accountId: string, updates: Partial<Account>): Promise<void> => {
        checkManagePermission(accountId);
        
        await update(accountId, {
            ...updates,
            updatedAt: new Date().toISOString()
        });
    };

    const deleteAccount = async (accountId: string): Promise<void> => {
        checkManagePermission(accountId);
        
        const account = accounts.find(a => a.id === accountId);
        if (!account) throw new Error('Account not found');
        
        const userMember = account.members.find(m => m.uid === user?.uid);
        if (userMember?.role !== 'owner' && !user?.isSystemAdmin) {
            throw new Error('Only account owners can delete accounts');
        }

        const childAccounts = accounts.filter(a => a.parentAccountId === accountId);
        if (childAccounts.length > 0) {
            throw new Error('Cannot delete account with child accounts. Please delete or reassign children first.');
        }

        if (accountId === PERSONAL_ACCOUNT_ID) {
            throw new Error('Cannot delete personal account.');
        }

        await remove(accountId);

        if (currentAccountId === accountId) {
            const remainingAccounts = accounts.filter(a => a.id !== accountId && a.status === 'active');
            const personalOrFirst = remainingAccounts.find(a => a.id === PERSONAL_ACCOUNT_ID) || remainingAccounts[0];
            setCurrentAccountId(personalOrFirst?.id || null);
        }
    };

    const addMember = async (accountId: string, uid: string, displayName: string, role: AccountRole): Promise<void> => {
        checkManagePermission(accountId);
        
        const account = accounts.find(a => a.id === accountId);
        if (!account) throw new Error('Account not found');

        const existingMember = account.members.find(m => m.uid === uid);
        if (existingMember) throw new Error('User is already a member');
        
        if (role === 'owner') {
            const userMember = account.members.find(m => m.uid === user?.uid);
            if (userMember?.role !== 'owner' && !user?.isSystemAdmin) {
                throw new Error('Only owners can add other owners');
            }
        }

        const newMember: AccountMember = {
            uid,
            displayName,
            role,
            joinedAt: new Date().toISOString()
        };

        await update(accountId, {
            members: [...account.members, newMember],
            updatedAt: new Date().toISOString()
        });
    };

    const removeMember = async (accountId: string, uid: string): Promise<void> => {
        checkManagePermission(accountId);
        
        const account = accounts.find(a => a.id === accountId);
        if (!account) throw new Error('Account not found');

        const owners = account.members.filter(m => m.role === 'owner');
        const memberToRemove = account.members.find(m => m.uid === uid);
        
        if (memberToRemove?.role === 'owner' && owners.length === 1) {
            throw new Error('Cannot remove the last owner. Transfer ownership first.');
        }
        
        if (memberToRemove?.role === 'owner') {
            const userMember = account.members.find(m => m.uid === user?.uid);
            if (userMember?.role !== 'owner' && !user?.isSystemAdmin) {
                throw new Error('Only owners can remove other owners');
            }
        }

        await update(accountId, {
            members: account.members.filter(m => m.uid !== uid),
            updatedAt: new Date().toISOString()
        });
    };

    const updateMemberRole = async (accountId: string, uid: string, newRole: AccountRole): Promise<void> => {
        checkManagePermission(accountId);
        
        const account = accounts.find(a => a.id === accountId);
        if (!account) throw new Error('Account not found');

        const member = account.members.find(m => m.uid === uid);
        if (!member) throw new Error('Member not found');

        const owners = account.members.filter(m => m.role === 'owner');
        if (member.role === 'owner' && newRole !== 'owner' && owners.length === 1) {
            throw new Error('Cannot demote the last owner. Assign another owner first.');
        }
        
        if (newRole === 'owner' || member.role === 'owner') {
            const userMember = account.members.find(m => m.uid === user?.uid);
            if (userMember?.role !== 'owner' && !user?.isSystemAdmin) {
                throw new Error('Only owners can change owner roles');
            }
        }

        await update(accountId, {
            members: account.members.map(m => 
                m.uid === uid ? { ...m, role: newRole } : m
            ),
            updatedAt: new Date().toISOString()
        });
    };

    const getUserRole = (accountId?: string): AccountRole | null => {
        if (!user) return null;
        const targetAccountId = accountId || currentAccountId;
        if (!targetAccountId) return null;

        const account = accounts.find(a => a.id === targetAccountId);
        if (!account) return null;

        const member = account.members.find(m => m.uid === user.uid);
        return member?.role || null;
    };

    const canManageAccount = (accountId?: string): boolean => {
        if (!user) return false;
        if (user.isSystemAdmin) return true;

        const role = getUserRole(accountId);
        return role === 'owner' || role === 'admin';
    };

    const canViewAccount = (accountId: string): boolean => {
        if (!user) return false;
        if (user.isSystemAdmin) return true;

        const account = accounts.find(a => a.id === accountId);
        if (!account) return false;

        const isMember = account.members.some(m => m.uid === user.uid);
        if (isMember) return true;

        for (const ancestorId of account.path) {
            const ancestor = accounts.find(a => a.id === ancestorId);
            if (ancestor) {
                const ancestorMember = ancestor.members.find(m => m.uid === user.uid);
                if (ancestorMember && (ancestorMember.role === 'owner' || ancestorMember.role === 'admin')) {
                    return true;
                }
            }
        }

        return false;
    };

    const getAccountHierarchy = (): Account[] => {
        if (!user) return [];

        const userAccounts = accounts.filter(acc => 
            acc.status === 'active' && canViewAccount(acc.id)
        );

        const rootAccounts = userAccounts.filter(a => !a.parentAccountId);
        
        const buildTree = (parentId: string | null): Account[] => {
            const children = userAccounts.filter(a => a.parentAccountId === parentId);
            return children.sort((a, b) => a.name.localeCompare(b.name));
        };

        const sortedAccounts: Account[] = [];
        const addWithChildren = (account: Account, depth: number = 0) => {
            sortedAccounts.push(account);
            const children = buildTree(account.id);
            children.forEach(child => addWithChildren(child, depth + 1));
        };

        rootAccounts.forEach(root => addWithChildren(root));
        return sortedAccounts;
    };

    const getChildAccounts = (parentId: string): Account[] => {
        return accounts.filter(a => a.parentAccountId === parentId && a.status === 'active');
    };

    const filterByCurrentAccount = <T extends AccountScoped>(items: T[]): T[] => {
        if (!currentAccountId) return items;

        return items.filter(item => {
            if (!item.accountId) return true;
            if (item.accountId === currentAccountId) return true;
            if (item.accountPath?.includes(currentAccountId)) return true;
            return false;
        });
    };

    const getAccountById = (accountId: string): Account | undefined => {
        return accounts.find(a => a.id === accountId);
    };

    const value: AccountContextType = {
        accounts,
        currentAccount,
        currentAccountId,
        isLoading,
        setCurrentAccountId,
        createAccount,
        updateAccount,
        deleteAccount,
        addMember,
        removeMember,
        updateMemberRole,
        getUserRole,
        canManageAccount,
        canViewAccount,
        getAccountHierarchy,
        getChildAccounts,
        filterByCurrentAccount,
        getAccountById
    };

    return (
        <AccountContext.Provider value={value}>
            {children}
        </AccountContext.Provider>
    );
};

export const useAccount = (): AccountContextType => {
    const context = useContext(AccountContext);
    if (!context) {
        throw new Error('useAccount must be used within an AccountProvider');
    }
    return context;
};

export default AccountContext;
