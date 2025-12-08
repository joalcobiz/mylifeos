
import React, { useState, useEffect, useCallback } from 'react';
import { 
    Settings as SettingsIcon, Plus, Save, AlertTriangle, ArrowRight, RefreshCw, Edit3, Trash2, 
    Users, Key, Globe, LayoutDashboard, Calendar as CalendarIcon, PieChart, FolderKanban, 
    Wallet, CreditCard, BookOpen, Route, MapPin, Utensils, Grid, FileText, ChevronDown, Check, ShoppingBag,
    ArrowUp, ArrowDown as ArrowDownIcon, Eye, EyeOff, Menu, Database, Loader2, Undo2, Flame, Target,
    Cloud, CloudOff, CheckCircle, XCircle, HardDrive, Activity, Wifi, WifiOff, Zap, DollarSign,
    Coins, History, Lock, User, TrendingUp, TrendingDown, Download, FileJson, Search, ChevronRight, Shield, Share2,
    Building2, Home, UserPlus, UserMinus, Crown, Sparkles, HelpCircle, Info
} from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '../../services/firestore';
import { Settings, ProjectItem, FinancialItem, JournalEntry, Place, GroceryItem, Loan, UserProfile, Template, CurrencyEntry, CurrencyRateHistory, Itinerary, Purchase, Document, Habit, Goal, CalendarEvent } from '../../types';
import Modal from '../../components/Modal';
import SectionCard from '../../components/SectionCard';
import { useAuth, isUserDeletable, User as AuthUser } from '../../contexts/AuthContext';
import { generateTestData, clearTestData } from '../../services/testData';
import { DEFAULT_CURRENCIES, fetchExchangeRates, createHistoryEntry } from '../../services/currency';
import UserDeletionModal, { DeletionOption } from '../../components/UserDeletionModal';
import { exportUserData, downloadExportAsJson, deleteUserData } from '../../services/userDataExport';
import { useSharing, SharingMode } from '../../contexts/SharingContext';
import { useAccount } from '../../contexts/AccountContext';
import { Account, AccountMember, AccountRole } from '../../types';
import SharingFilter from '../../components/SharingFilter';

// --- CONSTANTS ---
const DEFAULT_SETTINGS: Settings = {
    id: 'global',
    currency: 'USD',
    exchangeRates: { 'USD': 1, 'EUR': 0.92, 'GBP': 0.79, 'COP': 4000 },
    exchangeRateHistory: [],
    labelColors: {},
    users: [],
    menuLayout: [
        { id: 'm1', type: 'view', view: 'dashboard', isVisible: true },
        { id: 'd1', type: 'divider', isVisible: true },
        { id: 'm15', type: 'view', view: 'calendar', isVisible: true },
        { id: 'm11', type: 'view', view: 'documents', isVisible: true },
        { id: 'm4', type: 'view', view: 'financial', isVisible: true },
        { id: 'm16', type: 'view', view: 'genealogy', isVisible: true },
        { id: 'm13', type: 'view', view: 'goals', isVisible: true },
        { id: 'm10', type: 'view', view: 'groceries', isVisible: true },
        { id: 'm12', type: 'view', view: 'habits', isVisible: true },
        { id: 'm6', type: 'view', view: 'journal', isVisible: true },
        { id: 'm5', type: 'view', view: 'loans', isVisible: true },
        { id: 'm8', type: 'view', view: 'places', isVisible: true },
        { id: 'm3', type: 'view', view: 'projects', isVisible: true },
        { id: 'm9', type: 'view', view: 'purchases', isVisible: true },
        { id: 'm14', type: 'view', view: 'templates', isVisible: true },
        { id: 'm7', type: 'view', view: 'itineraries', isVisible: true },
    ],
    // Module Lists
    accounts: ['Chase Checking', 'Chase Savings', 'Wise USD', 'Wise EUR', 'Cash'],
    expenseCategories: ['Rent', 'Utilities', 'Groceries', 'Dining', 'Transport', 'Health'],
    incomeCategories: ['Salary', 'Freelance', 'Investment'],
    projectStatuses: ['Not Started', 'In Progress', 'On Hold', 'Completed'],
    journalMoods: ['Happy', 'Neutral', 'Sad', 'Excited', 'Anxious', 'Calm'],
    journalTags: ['Work', 'Personal', 'Health', 'Travel'],
    groceryCategories: ['Produce', 'Dairy', 'Pantry', 'Meat', 'Frozen'],
    placeTypes: ['Restaurant', 'Cafe', 'Park', 'Gym', 'Shop'],
    placeCollections: ['Date Night', 'Work Spots', 'Vacation Ideas'],
    loanTypes: ['Mortgage', 'Personal', 'Auto', 'Student', 'Credit Card'],
    documentCategories: ['Insurance', 'Medical', 'Personal', 'Legal', 'Financial'],
    listCategories: ['Home', 'Tech', 'Clothing', 'Gifts'],
    itineraryTypes: ['Vacation', 'Business', 'Day Trip'],
    collectionCategories: ['Media', 'Food', 'Tech', 'Travel'],
    habitCategories: ['Health', 'Productivity', 'Learning', 'Wellness', 'Fitness'],
    goalCategories: ['Personal', 'Career', 'Health', 'Financial', 'Learning'],
    goalPriorities: ['High', 'Medium', 'Low'],
    googleApiKey: '',
    currencyApiKey: ''
};

const PASTEL_PALETTE = ['#fee2e2', '#e0e7ff', '#dcfce7', '#fef9c3', '#f3e8ff', '#fae8ff', '#cffafe', '#fff7ed'];
const THEME_COLORS = [
    { key: 'blue', hex: '#2563eb' },
    { key: 'purple', hex: '#7c3aed' },
    { key: 'emerald', hex: '#059669' },
    { key: 'orange', hex: '#ea580c' },
    { key: 'rose', hex: '#e11d48' },
    { key: 'cyan', hex: '#0891b2' },
    { key: 'slate', hex: '#475569' }
];

const THEMES = {
    blue: { main: '#2563eb', hover: '#1d4ed8', light: '#dbeafe', muted: '#eff6ff' },
    purple: { main: '#7c3aed', hover: '#6d28d9', light: '#ede9fe', muted: '#f5f3ff' },
    emerald: { main: '#059669', hover: '#047857', light: '#d1fae5', muted: '#ecfdf5' },
    orange: { main: '#ea580c', hover: '#c2410c', light: '#ffedd5', muted: '#fff7ed' },
    rose: { main: '#e11d48', hover: '#be123c', light: '#ffe4e6', muted: '#fff1f2' },
    cyan: { main: '#0891b2', hover: '#0e7490', light: '#cffafe', muted: '#ecfeff' },
    slate: { main: '#475569', hover: '#334155', light: '#e2e8f0', muted: '#f8fafc' },
};

type SettingsSection = 'General' | 'Navigation' | 'Users' | 'Accounts' | 'Sharing' | 'Currencies' | 'Integrations' | 'Firebase' | 'Data' | 'Projects' | 'Financial' | 'Debts' | 'Journal' | 'Itineraries' | 'Places' | 'Shopping' | 'Groceries' | 'Collections' | 'Documents' | 'Habits' | 'Goals' | 'Calendar';

const SettingsView: React.FC = () => {
    const { user, isDemo, availableUsers, updateUserProfile, deleteUserProfile, refreshAvailableUsers } = useAuth();
    const { settings: sharingSettings, updateGlobalDefault, toggleOwnerLabels, updateModulePreference } = useSharing();
    const { 
        accounts: userAccounts, 
        currentAccount, 
        createAccount, 
        updateAccount, 
        deleteAccount,
        addMember, 
        removeMember, 
        updateMemberRole,
        canManageAccount 
    } = useAccount();
    const { data: settingsList, add, update } = useFirestore<Settings>('settings');
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [originalSettings, setOriginalSettings] = useState<Settings | null>(null);
    const [activeSection, setActiveSection] = useState<SettingsSection>('General');
    const [isDirty, setIsDirty] = useState(false);
    
    // Load Data for usage checks and statistics
    const { data: projects } = useFirestore<ProjectItem>('projects');
    const { data: financial } = useFirestore<FinancialItem>('financial');
    const { data: journal } = useFirestore<JournalEntry>('journal');
    const { data: places } = useFirestore<Place>('places');
    const { data: groceries } = useFirestore<GroceryItem>('groceries');
    const { data: loans } = useFirestore<Loan>('loans');
    const { data: itineraries } = useFirestore<Itinerary>('itineraries');
    const { data: purchases } = useFirestore<Purchase>('purchases');
    const { data: documents } = useFirestore<Document>('documents');
    const { data: habits } = useFirestore<Habit>('habits');
    const { data: goals } = useFirestore<Goal>('goals');
    const { data: calendarEvents } = useFirestore<CalendarEvent>('calendar');
    // Load Collections for Field Editing
    const { data: userCollections, update: updateCollection } = useFirestore<Template>('collections');

    // Data Statistics
    const getDataStats = () => {
        const allModules = [
            { name: 'Projects', icon: <FolderKanban size={16} />, data: projects, color: 'blue' },
            { name: 'Financial', icon: <Wallet size={16} />, data: financial, color: 'green' },
            { name: 'Journal', icon: <BookOpen size={16} />, data: journal, color: 'amber' },
            { name: 'Places & Events', icon: <MapPin size={16} />, data: places, color: 'purple' },
            { name: 'Groceries', icon: <Utensils size={16} />, data: groceries, color: 'emerald' },
            { name: 'Money Flows', icon: <CreditCard size={16} />, data: loans, color: 'rose' },
            { name: 'Itineraries', icon: <Route size={16} />, data: itineraries, color: 'cyan' },
            { name: 'Shopping', icon: <ShoppingBag size={16} />, data: purchases, color: 'orange' },
            { name: 'Documents', icon: <FileText size={16} />, data: documents, color: 'slate' },
            { name: 'Habits', icon: <Flame size={16} />, data: habits, color: 'red' },
            { name: 'Goals', icon: <Target size={16} />, data: goals, color: 'indigo' },
            { name: 'Collections', icon: <Grid size={16} />, data: userCollections, color: 'pink' },
            { name: 'Calendar', icon: <CalendarIcon size={16} />, data: calendarEvents, color: 'teal' },
        ];

        const userStats: Record<string, Record<string, number>> = {};
        const allUsers = availableUsers.length > 0 
            ? availableUsers.map(u => ({
                uid: u.uid,
                displayName: u.displayName || u.email?.split('@')[0] || 'User',
                email: u.email,
                isSystemAdmin: u.isSystemAdmin
            }))
            : [{
                uid: user?.uid || 'user-administrator',
                displayName: user?.displayName || 'Administrator',
                email: user?.email || 'admin@lifeos.app',
                isSystemAdmin: true
            }];
        
        allUsers.forEach(u => {
            userStats[u.uid] = {};
            allModules.forEach(m => {
                userStats[u.uid][m.name] = 0;
            });
        });

        allModules.forEach(m => {
            (m.data || []).forEach((item: any) => {
                const owner = item.owner || 'user-administrator';
                if (userStats[owner]) {
                    userStats[owner][m.name] = (userStats[owner][m.name] || 0) + 1;
                }
            });
        });

        const totalByModule: Record<string, number> = {};
        allModules.forEach(m => {
            totalByModule[m.name] = (m.data || []).length;
        });

        const grandTotal = Object.values(totalByModule).reduce((sum, count) => sum + count, 0);

        return { allModules, allUsers, userStats, totalByModule, grandTotal };
    };

    const dataStats = getDataStats();

    // Modals & State
    const [reassignModal, setReassignModal] = useState<{isOpen: boolean; key: keyof Settings; oldValue: string; newValue: string; affectedCount: number;}>({ isOpen: false, key: 'accounts', oldValue: '', newValue: '', affectedCount: 0 });
    const [editItemModal, setEditItemModal] = useState<{isOpen: boolean; key: keyof Settings; value: string; newColor: string; newName: string;} | null>(null);
    const [userModal, setUserModal] = useState<{ isOpen: boolean, user: Partial<UserProfile> }>({ isOpen: false, user: {} });
    const [showUserPassword, setShowUserPassword] = useState(false);
    const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
    const [deletionModal, setDeletionModal] = useState<{ isOpen: boolean; userToDelete: UserProfile | null }>({ isOpen: false, userToDelete: null });
    
    // Data Management State
    const [isGenerating, setIsGenerating] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    // Collection Field Editor State
    const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
    const [selectedFieldKey, setSelectedFieldKey] = useState<string>('');
    const [newOption, setNewOption] = useState('');

    // Currency Management State
    const [currencyModal, setCurrencyModal] = useState<{isOpen: boolean, currency: Partial<CurrencyEntry> | null, isEditing: boolean}>({ isOpen: false, currency: null, isEditing: false });
    const [currencySource, setCurrencySource] = useState<'api' | 'manual'>('manual');
    const [isFetchingRates, setIsFetchingRates] = useState(false);
    const [showCurrencyHistory, setShowCurrencyHistory] = useState(false);

    // Firebase Status State
    const [firebaseStatus, setFirebaseStatus] = useState<{
        connected: boolean;
        lastChecked: Date | null;
        isChecking: boolean;
        offlineEnabled: boolean;
        dataCount: Record<string, number>;
    }>({
        connected: false,
        lastChecked: null,
        isChecking: false,
        offlineEnabled: true,
        dataCount: {}
    });

    // Firebase connection test
    const testFirebaseConnection = useCallback(async () => {
        setFirebaseStatus(prev => ({ ...prev, isChecking: true }));
        try {
            const dataCount = {
                projects: projects.length,
                financial: financial.length,
                journal: journal.length,
                places: places.length,
                groceries: groceries.length,
                loans: loans.length,
                collections: userCollections.length
            };
            setFirebaseStatus({
                connected: !isDemo,
                lastChecked: new Date(),
                isChecking: false,
                offlineEnabled: true,
                dataCount
            });
        } catch (error) {
            setFirebaseStatus(prev => ({
                ...prev,
                connected: false,
                lastChecked: new Date(),
                isChecking: false
            }));
        }
    }, [projects, financial, journal, places, groceries, loans, userCollections, isDemo]);

    // Firebase Admin State
    const ADMIN_COLLECTION_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
        projects: { icon: FolderKanban, label: 'Projects', color: 'orange' },
        financial: { icon: Wallet, label: 'Financial', color: 'emerald' },
        journal: { icon: BookOpen, label: 'Journal', color: 'pink' },
        places: { icon: MapPin, label: 'Places', color: 'red' },
        purchases: { icon: ShoppingBag, label: 'Shopping', color: 'amber' },
        documents: { icon: FileText, label: 'Documents', color: 'sky' },
        habits: { icon: Flame, label: 'Habits', color: 'orange' },
        goals: { icon: Target, label: 'Goals', color: 'red' },
        templates: { icon: Grid, label: 'Collections', color: 'violet' },
        itineraries: { icon: Route, label: 'Itineraries', color: 'indigo' },
        loans: { icon: CreditCard, label: 'Money Flows', color: 'rose' },
        groceries: { icon: Utensils, label: 'Groceries', color: 'lime' },
        settings: { icon: Shield, label: 'Settings', color: 'slate' }
    };
    
    const [firebaseAdminTab, setFirebaseAdminTab] = useState<'connection' | 'architecture' | 'collections' | 'export'>('connection');
    const [adminStats, setAdminStats] = useState<{name: string; count: number; icon: any; color: string}[]>([]);
    const [adminLoading, setAdminLoading] = useState(false);
    const [adminSelectedCollection, setAdminSelectedCollection] = useState<string | null>(null);
    const [adminDocuments, setAdminDocuments] = useState<{id: string; [key: string]: any}[]>([]);
    const [adminLoadingDocs, setAdminLoadingDocs] = useState(false);
    const [adminSearchQuery, setAdminSearchQuery] = useState('');
    const [adminEditModal, setAdminEditModal] = useState<{ isOpen: boolean; doc: any | null }>({ isOpen: false, doc: null });
    const [adminEditData, setAdminEditData] = useState<string>('');
    const [adminDeleteConfirm, setAdminDeleteConfirm] = useState<string | null>(null);
    const [adminExporting, setAdminExporting] = useState(false);
    const [adminExportCollections, setAdminExportCollections] = useState<string[]>([]);

    const loadAdminStats = async () => {
        if (!user?.isSystemAdmin) return;
        setAdminLoading(true);
        try {
            const collections = Object.keys(ADMIN_COLLECTION_CONFIG);
            const statsData: {name: string; count: number; icon: any; color: string}[] = [];
            for (const collName of collections) {
                try {
                    const snapshot = await getDocs(collection(db, collName));
                    const config = ADMIN_COLLECTION_CONFIG[collName];
                    statsData.push({ name: collName, count: snapshot.size, icon: config.icon, color: config.color });
                } catch (e) {
                    statsData.push({ name: collName, count: 0, icon: ADMIN_COLLECTION_CONFIG[collName].icon, color: ADMIN_COLLECTION_CONFIG[collName].color });
                }
            }
            setAdminStats(statsData);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
        setAdminLoading(false);
    };

    const loadAdminCollectionDocs = async (collectionName: string) => {
        if (!user?.isSystemAdmin) return;
        setAdminLoadingDocs(true);
        setAdminSelectedCollection(collectionName);
        try {
            const snapshot = await getDocs(collection(db, collectionName));
            const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setAdminDocuments(docs);
        } catch (error) {
            console.error('Error loading documents:', error);
            setAdminDocuments([]);
        }
        setAdminLoadingDocs(false);
    };

    const handleAdminDeleteDocument = async (docId: string) => {
        if (!user?.isSystemAdmin) return;
        if (!adminSelectedCollection) return;
        try {
            await deleteDoc(doc(db, adminSelectedCollection, docId));
            setAdminDocuments(adminDocuments.filter(d => d.id !== docId));
            setAdminDeleteConfirm(null);
            loadAdminStats();
        } catch (error) {
            console.error('Error deleting document:', error);
        }
    };

    const handleAdminEditDocument = (document: any) => {
        if (!user?.isSystemAdmin) return;
        setAdminEditData(JSON.stringify(document, null, 2));
        setAdminEditModal({ isOpen: true, doc: document });
    };

    const handleAdminSaveEdit = async () => {
        if (!user?.isSystemAdmin) return;
        if (!adminSelectedCollection || !adminEditModal.doc) return;
        try {
            const parsed = JSON.parse(adminEditData);
            const { id, ...updateData } = parsed;
            await updateDoc(doc(db, adminSelectedCollection, adminEditModal.doc.id), updateData);
            setAdminDocuments(adminDocuments.map(d => d.id === adminEditModal.doc?.id ? { ...parsed, id: adminEditModal.doc.id } : d));
            setAdminEditModal({ isOpen: false, doc: null });
        } catch (error) {
            console.error('Error saving document:', error);
            alert('Invalid JSON or save error');
        }
    };

    const handleAdminExport = async (format: 'json' | 'csv') => {
        if (!user?.isSystemAdmin) return;
        if (adminExportCollections.length === 0) {
            alert('Please select at least one collection to export');
            return;
        }
        setAdminExporting(true);
        try {
            const exportData: Record<string, any[]> = {};
            for (const collName of adminExportCollections) {
                const snapshot = await getDocs(collection(db, collName));
                exportData[collName] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            }
            let content: string;
            let filename: string;
            let mimeType: string;
            if (format === 'json') {
                content = JSON.stringify(exportData, null, 2);
                filename = `lifeos-export-${new Date().toISOString().split('T')[0]}.json`;
                mimeType = 'application/json';
            } else {
                const allRows: string[] = [];
                for (const [collName, docs] of Object.entries(exportData)) {
                    if (docs.length > 0) {
                        const headers = Object.keys(docs[0]);
                        allRows.push(`# ${collName}`);
                        allRows.push(headers.join(','));
                        docs.forEach(d => {
                            allRows.push(headers.map(h => {
                                const val = d[h];
                                if (typeof val === 'object') return JSON.stringify(val).replace(/,/g, ';');
                                return String(val || '').replace(/,/g, ';');
                            }).join(','));
                        });
                        allRows.push('');
                    }
                }
                content = allRows.join('\n');
                filename = `lifeos-export-${new Date().toISOString().split('T')[0]}.csv`;
                mimeType = 'text/csv';
            }
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting:', error);
            alert('Export failed');
        }
        setAdminExporting(false);
    };

    const toggleAdminExportCollection = (name: string) => {
        if (!user?.isSystemAdmin) return;
        setAdminExportCollections(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);
    };

    const filteredAdminDocs = adminDocuments.filter(d => JSON.stringify(d).toLowerCase().includes(adminSearchQuery.toLowerCase()));
    const adminTotalRecords = adminStats.reduce((sum, s) => sum + s.count, 0);

    useEffect(() => {
        if (activeSection === 'Firebase' && user?.isSystemAdmin) {
            loadAdminStats();
        }
    }, [activeSection, user?.isSystemAdmin]);
    
    useEffect(() => {
        if (!user?.isSystemAdmin) {
            setAdminStats([]);
            setAdminDocuments([]);
            setAdminSelectedCollection(null);
            setAdminEditModal({ isOpen: false, doc: null });
            setAdminEditData('');
            setAdminDeleteConfirm(null);
            setAdminExportCollections([]);
        }
    }, [user?.isSystemAdmin]);

    useEffect(() => {
        testFirebaseConnection();
    }, []);

    // Load settings from Firestore
    useEffect(() => {
        if (settingsList.length > 0 && !originalSettings) {
            const loaded = { ...DEFAULT_SETTINGS, ...settingsList[0] };
            setSettings(loaded);
            setOriginalSettings(JSON.parse(JSON.stringify(loaded)));
        }
    }, [settingsList]);

    // Check for changes
    useEffect(() => {
        if (originalSettings) {
            const currentJson = JSON.stringify(settings);
            const originalJson = JSON.stringify(originalSettings);
            setIsDirty(currentJson !== originalJson);
        }
    }, [settings, originalSettings]);

    const handleSave = async () => {
        if (settingsList.length > 0) {
            await update(settingsList[0].id, settings);
        } else {
            const { id, ...dataToSave } = settings;
            await add(dataToSave);
        }
        setOriginalSettings(JSON.parse(JSON.stringify(settings)));
        setIsDirty(false);
        // Toast could go here
    };

    const handleDiscard = () => {
        if (originalSettings) {
            setSettings(originalSettings);
            setIsDirty(false);
        }
    };

    const handleNavigation = (section: SettingsSection) => {
        if (activeSection === section) return;
        if (isDirty) {
            if (window.confirm("You have unsaved changes. Discard them and switch tabs?")) {
                handleDiscard();
                setActiveSection(section);
            }
        } else {
            setActiveSection(section);
        }
    };

    const getRandomColor = () => PASTEL_PALETTE[Math.floor(Math.random() * PASTEL_PALETTE.length)];

    // Generic Add/Edit/Delete Logic
    const addItem = (key: keyof Settings, value: string) => {
        if (!value.trim()) return;
        const currentList = (settings[key] as string[]) || [];
        if (!currentList.includes(value)) {
            setSettings({ 
                ...settings, 
                [key]: [...currentList, value],
                labelColors: { ...settings.labelColors, [value]: getRandomColor() }
            });
        }
    };

    const checkUsage = (key: keyof Settings, value: string): number => {
        switch(key) {
            case 'projectStatuses': return projects.filter(p => p.status === value).length;
            case 'accounts': return financial.filter(f => f.account === value).length;
            case 'expenseCategories': return financial.filter(f => f.type === 'expense' && f.category === value).length;
            case 'incomeCategories': return financial.filter(f => f.type === 'income' && f.category === value).length;
            case 'journalMoods': return journal.filter(j => j.mood === value).length;
            case 'journalTags': return journal.filter(j => j.tags.includes(value)).length;
            case 'placeTypes': return places.filter(p => p.type === value).length;
            case 'groceryCategories': return groceries.filter(g => g.category === value).length;
            case 'loanTypes': return loans.filter(l => l.type === value).length;
            default: return 0;
        }
    };

    const attemptRemoveItem = (key: keyof Settings, value: string) => {
        const count = checkUsage(key, value);
        if (count > 0) {
            setReassignModal({ isOpen: true, key, oldValue: value, newValue: '', affectedCount: count });
        } else {
            const currentList = settings[key] as string[];
            setSettings({ ...settings, [key]: currentList.filter(i => i !== value) });
            if (editItemModal) setEditItemModal(null);
        }
    };

    const handleReassignAndRemove = () => {
        if (!reassignModal.newValue) return alert("Please select a new value.");
        const currentList = settings[reassignModal.key] as string[];
        setSettings({ ...settings, [reassignModal.key]: currentList.filter(i => i !== reassignModal.oldValue) });
        setReassignModal({ ...reassignModal, isOpen: false });
        if (editItemModal) setEditItemModal(null);
    };

    const handleItemRenameSave = () => {
        if (!editItemModal || !editItemModal.newName.trim()) return;
        const { key, value, newName, newColor } = editItemModal;
        const currentList = settings[key] as string[];
        const newList = currentList.map(item => item === value ? newName : item);
        const newColors = { ...settings.labelColors };
        newColors[newName] = newColor;
        if (newName !== value) delete newColors[value];
        setSettings({ ...settings, [key]: newList, labelColors: newColors });
        setEditItemModal(null);
    };

    const [userErrors, setUserErrors] = useState<Record<string, string>>({});

    const validateUser = (user: Partial<UserProfile>): Record<string, string> => {
        const errors: Record<string, string> = {};
        if (!user.name?.trim()) errors.name = 'Name is required';
        if (!user.email?.trim()) errors.email = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) errors.email = 'Invalid email format';
        
        const existingUsers = settings.users || [];
        const emailExists = existingUsers.some(u => 
            u.email.toLowerCase() === user.email?.toLowerCase() && u.id !== user.id
        );
        if (emailExists) errors.email = 'Email already exists';
        
        return errors;
    };

    const hashPassword = async (password: string): Promise<string> => {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const handleSaveUser = async () => {
        const editedUser = userModal.user;
        
        if (!editedUser.id) {
            alert('Cannot save: User ID is required');
            return;
        }
        
        try {
            await updateUserProfile(editedUser.id, {
                displayName: editedUser.name?.trim() || '',
                role: editedUser.role || 'User',
                isSystemAdmin: editedUser.role === 'Admin' ? (editedUser.isSystemAdmin || false) : false,
                theme: editedUser.theme || 'blue'
            });
            
            setUserModal({ isOpen: false, user: {} });
            setUserErrors({});
        } catch (error) {
            console.error('Failed to update user:', error);
            alert('Failed to update user profile. Please try again.');
        }
    };

    const handleOpenDeletionModal = (userProfile: UserProfile) => {
        setDeletionModal({ isOpen: true, userToDelete: userProfile });
    };

    const handleExportUserData = async () => {
        if (!deletionModal.userToDelete) return;
        const userId = deletionModal.userToDelete.id;
        const userName = deletionModal.userToDelete.name;
        try {
            const data = await exportUserData(userId, userName);
            downloadExportAsJson(data);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export user data. Please try again.');
        }
    };

    const handleConfirmUserDeletion = async (option: DeletionOption, transferTo?: string) => {
        if (!deletionModal.userToDelete) return;
        const userId = deletionModal.userToDelete.id;
        const userName = deletionModal.userToDelete.name;
        
        try {
            const stats = await deleteUserData(userId, option, transferTo);
            console.log('Deletion stats:', stats);
            
            await deleteUserProfile(userId);
            
            setDeletionModal({ isOpen: false, userToDelete: null });
            
            const message = option === 'delete-all' 
                ? `Deleted ${stats.deletedCount} items for ${userName}.`
                : option === 'transfer'
                    ? `Transferred ${stats.transferredCount} items from ${userName}.`
                    : `Processed ${stats.deletedCount} deleted, ${stats.preservedCount} preserved items for ${userName}.`;
            
            alert(message);
        } catch (error) {
            console.error('Deletion failed:', error);
            alert('Failed to delete user. Please try again.');
        }
    };

    const handleAddCollectionOption = async () => {
        if (!selectedCollectionId || !selectedFieldKey || !newOption.trim()) return;
        const collection = userCollections.find(c => c.id === selectedCollectionId);
        if (!collection) return;
        const newFields = collection.fields.map(f => {
            if (f.key === selectedFieldKey) return { ...f, options: [...(f.options || []), newOption.trim()] };
            return f;
        });
        await updateCollection(collection.id, { fields: newFields });
        setNewOption('');
    };

    const handleRemoveCollectionOption = async (option: string) => {
        if (!selectedCollectionId || !selectedFieldKey) return;
        const collection = userCollections.find(c => c.id === selectedCollectionId);
        if (!collection) return;
        if (window.confirm(`Remove "${option}" from options?`)) {
            const newFields = collection.fields.map(f => {
                if (f.key === selectedFieldKey) return { ...f, options: (f.options || []).filter(o => o !== option) };
                return f;
            });
            await updateCollection(collection.id, { fields: newFields });
        }
    };

    // --- DATA MANAGEMENT ---
    const handleGenerateData = async () => {
        if (!user) return;
        if (!window.confirm("Generate ~150 realistic test items? This may take a few seconds.")) return;
        setIsGenerating(true);
        try {
            await generateTestData(user.uid, isDemo);
            alert("Test Data Generated Successfully! Check your Dashboard.");
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert("Error generating data.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleClearData = async () => {
        if (!user) return;
        if (!window.confirm("Remove ALL generated test data? Your manually added data will be safe.")) return;
        setIsClearing(true);
        try {
            await clearTestData(user.uid, isDemo);
            alert("Test Data Removed.");
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert("Error clearing data.");
        } finally {
            setIsClearing(false);
        }
    };

    // Clear stale settings cache and force refresh
    const repairSettingsCache = useCallback(() => {
        if (!user) return;
        const storageKey = `lifeos-${user.uid}-settings`;
        localStorage.removeItem(storageKey);
        window.location.reload();
    }, [user]);

    // --- MENU EDITOR LOGIC ---
    const saveMenuLayout = async (newLayout: any[]) => {
        const updatedSettings = { ...settings, menuLayout: newLayout };
        setSettings(updatedSettings);
        
        const { id, ...dataToSave } = updatedSettings;
        
        // Check if we have a valid Firestore document ID
        const hasValidFirestoreId = settingsList.length > 0 
            && settingsList[0].id 
            && !settingsList[0].id.startsWith('temp-');
        
        if (hasValidFirestoreId) {
            await update(settingsList[0].id, updatedSettings);
        } else {
            await add(dataToSave as any);
        }
        
        setOriginalSettings(JSON.parse(JSON.stringify(updatedSettings)));
    };

    const moveMenuItem = async (index: number, direction: 'up' | 'down') => {
        const newLayout = (settings.menuLayout || DEFAULT_SETTINGS.menuLayout).map(item => ({...item}));
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex >= 0 && targetIndex < newLayout.length) {
            [newLayout[index], newLayout[targetIndex]] = [newLayout[targetIndex], newLayout[index]];
            await saveMenuLayout(newLayout);
        }
    };

    const toggleMenuItem = async (index: number) => {
        const newLayout = (settings.menuLayout || DEFAULT_SETTINGS.menuLayout).map(item => ({...item}));
        newLayout[index].isVisible = !newLayout[index].isVisible;
        await saveMenuLayout(newLayout);
    };

    const addMenuDivider = async () => {
        const newLayout = (settings.menuLayout || DEFAULT_SETTINGS.menuLayout).map(item => ({...item}));
        newLayout.push({ id: `d-${Date.now()}`, type: 'divider', isVisible: true });
        await saveMenuLayout(newLayout);
    };

    const removeMenuItem = async (index: number) => {
        const newLayout = (settings.menuLayout || DEFAULT_SETTINGS.menuLayout).map(item => ({...item}));
        newLayout.splice(index, 1);
        await saveMenuLayout(newLayout);
    };

    // --- CURRENCY MANAGEMENT ---
    const currencies = settings.currencies || DEFAULT_CURRENCIES;
    const currencyHistory = settings.currencyRateHistory || [];

    const handleFetchApiRates = async () => {
        setIsFetchingRates(true);
        try {
            const rates = await fetchExchangeRates();
            if (rates) {
                const updatedCurrencies = currencies.map(curr => {
                    const newRate = rates[curr.code];
                    if (newRate !== undefined && newRate !== curr.rateToUSD) {
                        return { ...curr, rateToUSD: newRate, source: 'api' as const, lastUpdated: new Date().toISOString() };
                    }
                    return curr;
                });
                
                const newHistory: CurrencyRateHistory[] = [];
                updatedCurrencies.forEach(curr => {
                    const oldCurr = currencies.find(c => c.code === curr.code);
                    if (oldCurr && oldCurr.rateToUSD !== curr.rateToUSD) {
                        newHistory.push(createHistoryEntry(curr.code, curr.rateToUSD, 'api', user?.displayName || 'System'));
                    }
                });

                setSettings({
                    ...settings,
                    currencies: updatedCurrencies,
                    currencyRateHistory: [...currencyHistory, ...newHistory],
                    exchangeRates: Object.fromEntries(updatedCurrencies.map(c => [c.code, c.rateToUSD]))
                });
            }
        } catch (error) {
            console.error('Error fetching rates:', error);
        } finally {
            setIsFetchingRates(false);
        }
    };

    const handleSaveCurrency = () => {
        if (!currencyModal.currency) return;
        const curr = currencyModal.currency as CurrencyEntry;
        if (!curr.code || !curr.name || curr.rateToUSD === undefined) return;

        const existingIndex = currencies.findIndex(c => c.code === curr.code);
        let newCurrencies: CurrencyEntry[];
        const historyEntry = createHistoryEntry(curr.code, curr.rateToUSD, currencySource, user?.displayName || 'Manual');

        if (existingIndex >= 0) {
            newCurrencies = currencies.map(c => c.code === curr.code ? { ...curr, source: currencySource, lastUpdated: new Date().toISOString() } : c);
        } else {
            newCurrencies = [...currencies, { ...curr, source: currencySource, lastUpdated: new Date().toISOString() }];
        }

        setSettings({
            ...settings,
            currencies: newCurrencies,
            currencyRateHistory: [...currencyHistory, historyEntry],
            exchangeRates: Object.fromEntries(newCurrencies.map(c => [c.code, c.rateToUSD]))
        });
        setCurrencyModal({ isOpen: false, currency: null, isEditing: false });
    };

    const handleDeleteCurrency = (code: string) => {
        if (code === 'USD') return;
        if (!window.confirm(`Delete currency ${code}?`)) return;
        const newCurrencies = currencies.filter(c => c.code !== code);
        setSettings({
            ...settings,
            currencies: newCurrencies,
            exchangeRates: Object.fromEntries(newCurrencies.map(c => [c.code, c.rateToUSD]))
        });
    };

    // UI Components
    const NavButton = ({ section, icon: Icon, label }: { section: SettingsSection, icon: any, label: string }) => {
        const isActive = activeSection === section;
        return (
            <button 
                onClick={() => handleNavigation(section)}
                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-all flex items-center gap-3 rounded-full mb-1
                    ${isActive 
                        ? 'bg-blue-50 text-blue-700 shadow-sm' 
                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                    }
                `}
            >
                <Icon size={18} className={isActive ? 'text-blue-600' : 'text-gray-400'} /> 
                {label}
            </button>
        );
    };

    // Access Level Configuration for each settings section
    const SECTION_ACCESS_LEVELS: Record<SettingsSection, { level: 'super-admin' | 'admin' | 'all-users'; description: string; color: string; bgColor: string }> = {
        'General': { level: 'all-users', description: 'All authenticated users', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
        'Navigation': { level: 'all-users', description: 'All authenticated users', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
        'Users': { level: 'admin', description: 'Admins & Super Admins only', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
        'Accounts': { level: 'admin', description: 'Admins & Super Admins only', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
        'Sharing': { level: 'all-users', description: 'All authenticated users', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
        'Currencies': { level: 'all-users', description: 'All authenticated users', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
        'Integrations': { level: 'super-admin', description: 'Super Admin only - API Keys', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-300' },
        'Firebase': { level: 'super-admin', description: 'Super Admin only - Database', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-300' },
        'Data': { level: 'super-admin', description: 'Super Admin only - Data Management', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-300' },
        'Projects': { level: 'all-users', description: 'All authenticated users', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
        'Financial': { level: 'all-users', description: 'All authenticated users', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
        'Debts': { level: 'all-users', description: 'All authenticated users', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
        'Journal': { level: 'all-users', description: 'All authenticated users', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
        'Itineraries': { level: 'all-users', description: 'All authenticated users', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
        'Places': { level: 'all-users', description: 'All authenticated users', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
        'Shopping': { level: 'all-users', description: 'All authenticated users', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
        'Groceries': { level: 'all-users', description: 'All authenticated users', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
        'Collections': { level: 'all-users', description: 'All authenticated users', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
        'Documents': { level: 'all-users', description: 'All authenticated users', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
        'Habits': { level: 'all-users', description: 'All authenticated users', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
        'Goals': { level: 'all-users', description: 'All authenticated users', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
        'Calendar': { level: 'all-users', description: 'All authenticated users', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
    };

    const AccessLevelBadge = ({ section }: { section: SettingsSection }) => {
        const access = SECTION_ACCESS_LEVELS[section];
        if (!access) return null;
        
        const icons = {
            'super-admin': <Crown size={12} className="text-amber-600" />,
            'admin': <Shield size={12} className="text-blue-600" />,
            'all-users': <Users size={12} className="text-green-600" />
        };
        
        const labels = {
            'super-admin': 'Super Admin Only',
            'admin': 'Admins Only',
            'all-users': 'All Users'
        };
        
        return (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide border ${access.bgColor} ${access.color} mb-4`}>
                {icons[access.level]}
                <span>{labels[access.level]}</span>
            </div>
        );
    };

    const ListEditor = ({ title, listKey }: { title: string, listKey: keyof Settings }) => {
        const [newItem, setNewItem] = useState('');
        const list = (settings[listKey] as string[]) || [];

        return (
            <div className={title ? "bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 animate-enter" : ""}>
                {title && <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>}
                <div className="flex gap-2 mb-4">
                    <input 
                        type="text" 
                        className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-gray-50 focus:bg-white transition-colors"
                        placeholder={`Add new option...`}
                        value={newItem}
                        onChange={e => setNewItem(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && newItem.trim()) { addItem(listKey, newItem); setNewItem(''); } }}
                    />
                    <button 
                        onClick={() => { if(newItem.trim()) { addItem(listKey, newItem); setNewItem(''); }}} 
                        disabled={!newItem.trim()}
                        className="bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                        <Plus size={18} />
                    </button>
                </div>
                {list.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
                        No options added yet. Add your first option above.
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {list.map(item => {
                            const color = settings.labelColors?.[item] || '#f3f4f6';
                            return (
                                <div 
                                    key={item} 
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border border-black/5 shadow-sm transition-all cursor-pointer hover:shadow-md hover:scale-105 select-none group"
                                    style={{ backgroundColor: color }}
                                    onClick={() => setEditItemModal({ isOpen: true, key: listKey, value: item, newName: item, newColor: color === '#f3f4f6' ? '#ffffff' : color })}
                                >
                                    <span className="font-medium text-gray-800">{item}</span>
                                    <Edit3 size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto pb-20">
            {/* Action Bar (Top) - Clean, no full header */}
            <div className="flex items-center justify-between py-4 mb-2 animate-slide-down">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg"><SettingsIcon className="w-6 h-6 text-gray-600" /></div>
                    Settings
                </h1>
                <div className="flex items-center gap-3">
                    {isDirty && (
                        <button 
                            onClick={handleDiscard}
                            className="text-gray-500 hover:text-gray-700 px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 rounded-lg hover:bg-gray-100"
                        >
                            <Undo2 size={16} /> Discard Changes
                        </button>
                    )}
                    <button 
                        onClick={handleSave} 
                        disabled={!isDirty}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium shadow-sm transition-all duration-300 ${
                            isDirty 
                            ? 'bg-primary text-white hover:bg-primary-hover shadow-md transform hover:-translate-y-0.5' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        <Save size={18} /> {isDirty ? 'Save Changes' : 'Saved'}
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row min-h-[600px] gap-8 mt-6">
                
                {/* Sidebar - Google AI Studio Style (Detached Pills) */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <div className="space-y-8 sticky top-6">
                        <div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-4">System</div>
                            <div className="space-y-1">
                                <NavButton section="General" icon={SettingsIcon} label="General" />
                                <NavButton section="Navigation" icon={Menu} label="Menu Editor" />
                                <NavButton section="Users" icon={Users} label="Users" />
                                <NavButton section="Accounts" icon={Building2} label="Accounts" />
                                <NavButton section="Sharing" icon={Share2} label="Sharing" />
                                <NavButton section="Currencies" icon={Coins} label="Currencies" />
                                <NavButton section="Firebase" icon={Cloud} label="Firebase" />
                                <NavButton section="Data" icon={Database} label="Data Management" />
                                <NavButton section="Integrations" icon={Key} label="Integrations" />
                            </div>
                        </div>

                        <div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-4">Modules</div>
                            <div className="space-y-1">
                                <NavButton section="Calendar" icon={CalendarIcon} label="Calendar" />
                                <NavButton section="Collections" icon={Grid} label="Collections" />
                                <NavButton section="Documents" icon={FileText} label="Documents" />
                                <NavButton section="Financial" icon={Wallet} label="Financial" />
                                <NavButton section="Goals" icon={Target} label="Goals" />
                                <NavButton section="Groceries" icon={Utensils} label="Groceries" />
                                <NavButton section="Habits" icon={Flame} label="Habits" />
                                <NavButton section="Journal" icon={BookOpen} label="Journal" />
                                <NavButton section="Debts" icon={CreditCard} label="Money Flows" />
                                <NavButton section="Places" icon={MapPin} label="Places & Events" />
                                <NavButton section="Projects" icon={FolderKanban} label="Projects" />
                                <NavButton section="Shopping" icon={ShoppingBag} label="Shopping" />
                                <NavButton section="Itineraries" icon={Route} label="Itineraries" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0">
                    
                    {/* Header for Section with Access Level */}
                    <div className="mb-6 pb-3 border-b border-gray-100">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <h2 className="text-xl font-bold text-gray-900">
                                {activeSection === 'Navigation' ? 'Menu Editor' : activeSection === 'Data' ? 'Data Management' : `${activeSection} Settings`}
                            </h2>
                            <AccessLevelBadge section={activeSection} />
                        </div>
                    </div>

                    {/* SYSTEM */}
                    {activeSection === 'General' && (
                        <div className="space-y-6 animate-enter">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                <h3 className="font-semibold text-gray-900 mb-4">Application Settings</h3>
                                <p className="text-sm text-gray-500">Configure general application preferences. Currency settings have been moved to the Currencies section.</p>
                            </div>
                        </div>
                    )}

                    {activeSection === 'Firebase' && (
                        <div className="space-y-6 animate-enter">
                            {/* Admin Tabs - Only show for system admins */}
                            {user?.isSystemAdmin && (
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {[
                                        { id: 'connection', label: 'Connection', icon: Cloud },
                                        { id: 'architecture', label: 'Architecture', icon: FileText },
                                        { id: 'collections', label: 'Collections', icon: Database },
                                        { id: 'export', label: 'Export Data', icon: Download }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setFirebaseAdminTab(tab.id as any)}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                                                firebaseAdminTab === tab.id
                                                    ? 'bg-green-600 text-white shadow-md'
                                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                            }`}
                                        >
                                            <tab.icon size={16} />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Connection Tab */}
                            {(firebaseAdminTab === 'connection' || !user?.isSystemAdmin) && (
                                <>
                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-start gap-4">
                                                <div className={`p-3 rounded-xl ${isDemo ? 'bg-amber-50 text-amber-600' : firebaseStatus.connected ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                    {isDemo ? <HardDrive size={24} /> : firebaseStatus.connected ? <Cloud size={24} /> : <CloudOff size={24} />}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900">Firebase Connection</h3>
                                                    <p className="text-sm text-gray-500 mt-1">
                                                        {isDemo 
                                                            ? 'Running in Demo Mode - Data is stored locally in your browser' 
                                                            : firebaseStatus.connected 
                                                                ? 'Connected to Firebase Firestore' 
                                                                : 'Unable to connect to Firebase'
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={testFirebaseConnection}
                                                disabled={firebaseStatus.isChecking}
                                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {firebaseStatus.isChecking ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw size={16} />}
                                                Test Connection
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                            <div className={`p-4 rounded-xl border ${isDemo ? 'bg-amber-50 border-amber-200' : firebaseStatus.connected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    {isDemo ? <HardDrive size={16} className="text-amber-500" /> : firebaseStatus.connected ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                                                    <span className="text-xs font-bold text-gray-600 uppercase">Mode</span>
                                                </div>
                                                <p className="font-bold text-gray-900">{isDemo ? 'Demo' : 'Production'}</p>
                                            </div>
                                            <div className="p-4 rounded-xl border bg-blue-50 border-blue-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Activity size={16} className="text-blue-500" />
                                                    <span className="text-xs font-bold text-gray-600 uppercase">Status</span>
                                                </div>
                                                <p className="font-bold text-gray-900">{firebaseStatus.connected || isDemo ? 'Active' : 'Offline'}</p>
                                            </div>
                                            <div className="p-4 rounded-xl border bg-purple-50 border-purple-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Wifi size={16} className="text-purple-500" />
                                                    <span className="text-xs font-bold text-gray-600 uppercase">Offline Cache</span>
                                                </div>
                                                <p className="font-bold text-gray-900">{firebaseStatus.offlineEnabled ? 'Enabled' : 'Disabled'}</p>
                                            </div>
                                            <div className="p-4 rounded-xl border bg-cyan-50 border-cyan-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Zap size={16} className="text-cyan-500" />
                                                    <span className="text-xs font-bold text-gray-600 uppercase">Last Check</span>
                                                </div>
                                                <p className="font-bold text-gray-900">{firebaseStatus.lastChecked ? firebaseStatus.lastChecked.toLocaleTimeString() : 'Never'}</p>
                                            </div>
                                        </div>

                                        {/* Admin Overview Stats */}
                                        {user?.isSystemAdmin && (
                                            <div className="border-t border-gray-100 pt-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                                        <Database size={16} /> Collection Statistics
                                                    </h4>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm text-gray-500">{adminTotalRecords} total records</span>
                                                        <button onClick={loadAdminStats} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors">
                                                            <RefreshCw size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                                {adminLoading ? (
                                                    <div className="flex items-center justify-center py-8">
                                                        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                        {adminStats.map(stat => {
                                                            const Icon = stat.icon;
                                                            return (
                                                                <button
                                                                    key={stat.name}
                                                                    onClick={() => { setFirebaseAdminTab('collections'); loadAdminCollectionDocs(stat.name); }}
                                                                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors text-left group"
                                                                >
                                                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100 text-green-600">
                                                                        <Icon size={16} />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="font-medium text-gray-900 text-sm truncate">{ADMIN_COLLECTION_CONFIG[stat.name]?.label || stat.name}</p>
                                                                        <p className="text-xs text-gray-500">{stat.count} records</p>
                                                                    </div>
                                                                    <ChevronRight size={14} className="text-gray-400 group-hover:text-gray-600" />
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Non-admin simple stats */}
                                        {!user?.isSystemAdmin && (
                                            <div className="border-t border-gray-100 pt-6">
                                                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                    <Database size={16} /> Data Statistics
                                                </h4>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {Object.entries(firebaseStatus.dataCount).map(([key, count]) => (
                                                        <div key={key} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                                            <p className="text-xs text-gray-500 capitalize mb-1">{key}</p>
                                                            <p className="text-lg font-bold text-gray-900">{count}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                        <h3 className="font-semibold text-gray-900 mb-4">Firebase Project Info</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="p-4 bg-gray-50 rounded-lg">
                                                <p className="text-xs text-gray-500 mb-1">Project ID</p>
                                                <p className="font-mono text-sm text-gray-700">lifeos-e00ed</p>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded-lg">
                                                <p className="text-xs text-gray-500 mb-1">Storage Bucket</p>
                                                <p className="font-mono text-sm text-gray-700">lifeos-e00ed.firebasestorage.app</p>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded-lg">
                                                <p className="text-xs text-gray-500 mb-1">Auth Domain</p>
                                                <p className="font-mono text-sm text-gray-700">lifeos-e00ed.firebaseapp.com</p>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded-lg">
                                                <p className="text-xs text-gray-500 mb-1">Data Persistence</p>
                                                <p className="font-mono text-sm text-gray-700">IndexedDB (Local Cache)</p>
                                            </div>
                                        </div>
                                    </div>

                                    {isDemo && (
                                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="font-semibold text-amber-900">Demo Mode Active</h4>
                                                    <p className="text-sm text-amber-800 mt-1">
                                                        Your data is stored in your browser's localStorage. To enable cloud sync and 
                                                        access your data across devices, sign in with Google.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Architecture Tab - Admin Only */}
                            {firebaseAdminTab === 'architecture' && user?.isSystemAdmin && (
                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                                                <FileText size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">Firebase Architecture Guide</h3>
                                                <p className="text-sm text-gray-500 mt-1">
                                                    Technical documentation for developers working on LIFEOS
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                    <Database size={16} className="text-blue-600" />
                                                    Data Structure Overview
                                                </h4>
                                                <div className="font-mono text-sm bg-white p-4 rounded-lg border border-blue-100 overflow-x-auto">
                                                    <pre className="text-gray-700">{`Firestore Database
├── users/
│   └── {userId}/
│       ├── projects/        # Project items
│       ├── financial/       # Income & expenses
│       ├── journal/         # Journal entries
│       ├── places/          # Places & events
│       ├── groceries/       # Grocery items
│       ├── loans/           # Money flows
│       ├── itineraries/     # Trip planners
│       ├── purchases/       # Shopping lists
│       ├── documents/       # Document storage
│       ├── habits/          # Habit tracking
│       ├── goals/           # Goal tracking
│       ├── templates/       # Collections
│       ├── calendar/        # Calendar events
│       └── settings/        # User preferences
├── userProfiles/{userId}/   # User profile & roles
├── publicItineraries/{token}/ # Public trip shares
└── settings/                # Global app settings`}</pre>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                                                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                                        <Shield size={16} className="text-green-600" />
                                                        Security Model
                                                    </h4>
                                                    <ul className="text-sm text-gray-700 space-y-1.5">
                                                        <li className="flex items-start gap-2">
                                                            <span className="text-green-500 mt-0.5">•</span>
                                                            <span><strong>User isolation:</strong> Each user can only access their own data under <code className="bg-green-100 px-1 rounded">users/{'{userId}'}/</code></span>
                                                        </li>
                                                        <li className="flex items-start gap-2">
                                                            <span className="text-green-500 mt-0.5">•</span>
                                                            <span><strong>Admin access:</strong> Admins can read (not write) any user's data</span>
                                                        </li>
                                                        <li className="flex items-start gap-2">
                                                            <span className="text-green-500 mt-0.5">•</span>
                                                            <span><strong>SystemAdmin:</strong> Full access + user management + this panel</span>
                                                        </li>
                                                    </ul>
                                                </div>

                                                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                                                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                                        <Users size={16} className="text-purple-600" />
                                                        User Roles
                                                    </h4>
                                                    <div className="space-y-2 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-2 py-0.5 bg-gray-200 rounded text-gray-700 font-medium">User</span>
                                                            <span className="text-gray-600">Read/write own data only</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-2 py-0.5 bg-blue-200 rounded text-blue-700 font-medium">Admin</span>
                                                            <span className="text-gray-600">+ Read any user's data</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-2 py-0.5 bg-amber-200 rounded text-amber-700 font-medium">SystemAdmin</span>
                                                            <span className="text-gray-600">+ Full system access</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                    <HardDrive size={16} className="text-amber-600" />
                                                    Data Flow & Caching
                                                </h4>
                                                <div className="font-mono text-xs bg-white p-4 rounded-lg border border-amber-100 overflow-x-auto">
                                                    <pre className="text-gray-700">{`┌─────────────────────────────────────────────────────────────┐
│  Layer 1: React State (useFirestore hook)                   │
│  → Immediate UI updates (optimistic)                        │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: LocalStorage Cache                                │
│  → Key: lifeos-{userId}-{collection}                        │
│  → Persists across page refreshes                           │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Firestore IndexedDB Cache                         │
│  → Handles offline/online sync automatically                │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Layer 4: Cloud Firestore (Google Cloud)                    │
│  → Source of truth, real-time sync                          │
└─────────────────────────────────────────────────────────────┘`}</pre>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
                                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                    <AlertTriangle size={16} className="text-rose-600" />
                                                    Common Issues & Solutions
                                                </h4>
                                                <div className="space-y-3 text-sm">
                                                    <div className="p-3 bg-white rounded-lg border border-rose-100">
                                                        <p className="font-medium text-gray-900">Data disappears after entry</p>
                                                        <p className="text-gray-600 mt-1">
                                                            <strong>Cause:</strong> Firestore rejects <code className="bg-rose-100 px-1 rounded">undefined</code> values.
                                                            <br />
                                                            <strong>Solution:</strong> All data is sanitized before writes to remove undefined fields.
                                                        </p>
                                                    </div>
                                                    <div className="p-3 bg-white rounded-lg border border-rose-100">
                                                        <p className="font-medium text-gray-900">Cache persistence conflicts</p>
                                                        <p className="text-gray-600 mt-1">
                                                            <strong>Cause:</strong> Multiple tabs fighting for IndexedDB lock.
                                                            <br />
                                                            <strong>Solution:</strong> System falls back to memory cache; data syncs on next single-tab session.
                                                        </p>
                                                    </div>
                                                    <div className="p-3 bg-white rounded-lg border border-rose-100">
                                                        <p className="font-medium text-gray-900">Permission denied errors</p>
                                                        <p className="text-gray-600 mt-1">
                                                            <strong>Cause:</strong> Security rules blocking access.
                                                            <br />
                                                            <strong>Solution:</strong> Verify user is authenticated and accessing their own data path.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                                                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                                    <FileText size={16} className="text-gray-600" />
                                                    Key Files for Developers
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm font-mono">
                                                    <div className="p-2 bg-white rounded border border-gray-200">
                                                        <span className="text-blue-600">services/firebase.ts</span>
                                                        <span className="text-gray-400 ml-2">- Firebase init</span>
                                                    </div>
                                                    <div className="p-2 bg-white rounded border border-gray-200">
                                                        <span className="text-blue-600">services/firestore.ts</span>
                                                        <span className="text-gray-400 ml-2">- useFirestore hook</span>
                                                    </div>
                                                    <div className="p-2 bg-white rounded border border-gray-200">
                                                        <span className="text-blue-600">contexts/AuthContext.tsx</span>
                                                        <span className="text-gray-400 ml-2">- Auth state</span>
                                                    </div>
                                                    <div className="p-2 bg-white rounded border border-gray-200">
                                                        <span className="text-blue-600">firestore.rules</span>
                                                        <span className="text-gray-400 ml-2">- Security rules</span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-3">
                                                    Full documentation available in <code className="bg-gray-200 px-1 rounded">FIREBASE_SETUP.md</code> at project root.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Collections Tab - Admin Only */}
                            {firebaseAdminTab === 'collections' && user?.isSystemAdmin && (
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm lg:col-span-1">
                                        <h3 className="font-semibold text-gray-900 mb-3">Collections</h3>
                                        <div className="space-y-1">
                                            {adminStats.map(stat => {
                                                const config = ADMIN_COLLECTION_CONFIG[stat.name];
                                                const Icon = stat.icon;
                                                return (
                                                    <button
                                                        key={stat.name}
                                                        onClick={() => loadAdminCollectionDocs(stat.name)}
                                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                                            adminSelectedCollection === stat.name
                                                                ? 'bg-green-600 text-white'
                                                                : 'hover:bg-gray-100 text-gray-700'
                                                        }`}
                                                    >
                                                        <Icon size={16} />
                                                        <span className="flex-1 text-left">{config?.label || stat.name}</span>
                                                        <span className={`text-xs px-1.5 py-0.5 rounded ${adminSelectedCollection === stat.name ? 'bg-white/20' : 'bg-gray-200'}`}>
                                                            {stat.count}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm lg:col-span-3">
                                        {!adminSelectedCollection ? (
                                            <div className="text-center py-12 text-gray-500">
                                                <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                                <p>Select a collection to view documents</p>
                                            </div>
                                        ) : adminLoadingDocs ? (
                                            <div className="flex items-center justify-center py-12">
                                                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="font-semibold text-gray-900">
                                                        {ADMIN_COLLECTION_CONFIG[adminSelectedCollection]?.label || adminSelectedCollection}
                                                        <span className="text-gray-400 font-normal ml-2">({adminDocuments.length})</span>
                                                    </h3>
                                                    <div className="relative w-64">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            placeholder="Search documents..."
                                                            value={adminSearchQuery}
                                                            onChange={e => setAdminSearchQuery(e.target.value)}
                                                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                                    {filteredAdminDocs.map(d => (
                                                        <div key={d.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-300 transition-all group">
                                                            <div className="flex items-start justify-between gap-4">
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-medium text-gray-900 truncate">{d.name || d.title || d.id}</p>
                                                                    <p className="text-xs text-gray-500 truncate mt-0.5">ID: {d.id}</p>
                                                                    {d.owner && <p className="text-xs text-gray-400 mt-0.5">Owner: {d.owner}</p>}
                                                                </div>
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => handleAdminEditDocument(d)}
                                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                        title="Edit"
                                                                    >
                                                                        <Edit3 size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setAdminDeleteConfirm(d.id)}
                                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            
                                                            {adminDeleteConfirm === d.id && (
                                                                <div className="mt-2 p-2 bg-red-50 rounded-lg flex items-center justify-between">
                                                                    <span className="text-sm text-red-700">Delete this document?</span>
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => setAdminDeleteConfirm(null)}
                                                                            className="px-2 py-1 text-xs bg-white text-gray-600 rounded hover:bg-gray-100"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleAdminDeleteDocument(d.id)}
                                                                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    
                                                    {filteredAdminDocs.length === 0 && (
                                                        <div className="text-center py-8 text-gray-500">
                                                            No documents found
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Export Tab - Admin Only */}
                            {firebaseAdminTab === 'export' && user?.isSystemAdmin && (
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">Export Data</h3>
                                            <p className="text-sm text-gray-500">Download your data in JSON or CSV format</p>
                                        </div>
                                    </div>
                                    
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-3">Select collections to export:</label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            <button
                                                onClick={() => setAdminExportCollections(adminExportCollections.length === adminStats.length ? [] : adminStats.map(s => s.name))}
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                    adminExportCollections.length === adminStats.length
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                {adminExportCollections.length === adminStats.length ? 'Deselect All' : 'Select All'}
                                            </button>
                                            {adminStats.map(stat => (
                                                <button
                                                    key={stat.name}
                                                    onClick={() => toggleAdminExportCollection(stat.name)}
                                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                        adminExportCollections.includes(stat.name)
                                                            ? 'bg-green-100 text-green-700 border-2 border-green-300'
                                                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                                                    }`}
                                                >
                                                    {ADMIN_COLLECTION_CONFIG[stat.name]?.label || stat.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleAdminExport('json')}
                                            disabled={adminExporting || adminExportCollections.length === 0}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <FileJson size={16} />
                                            {adminExporting ? 'Exporting...' : 'Export as JSON'}
                                        </button>
                                        <button
                                            onClick={() => handleAdminExport('csv')}
                                            disabled={adminExporting || adminExportCollections.length === 0}
                                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <FileText size={16} />
                                            {adminExporting ? 'Exporting...' : 'Export as CSV'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeSection === 'Data' && (
                        <div className="space-y-6 animate-enter">
                            {/* Data Statistics Section */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><PieChart size={24} /></div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-gray-900">Data Statistics</h3>
                                            <div className="flex items-center gap-2 bg-gradient-to-r from-purple-100 to-indigo-100 px-4 py-2 rounded-xl">
                                                <Database size={18} className="text-purple-600" />
                                                <span className="text-lg font-bold text-purple-700">{dataStats.grandTotal}</span>
                                                <span className="text-sm text-purple-600">Total Records</span>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">Overview of data distribution across all modules and users.</p>
                                    </div>
                                </div>

                                {/* Module Statistics */}
                                <div className="border-t border-gray-100 pt-6">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-4">By Module</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                        {dataStats.allModules.map(m => (
                                            <div key={m.name} className="bg-gray-50 p-3 rounded-lg border border-gray-100 hover:border-gray-300 transition-all">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-gray-500">{m.icon}</span>
                                                    <span className="text-xs font-medium text-gray-600">{m.name}</span>
                                                </div>
                                                <div className="text-2xl font-bold text-gray-900">{dataStats.totalByModule[m.name]}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* User Statistics */}
                                <div className="border-t border-gray-100 pt-6">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-4">By User</h4>
                                    <div className="space-y-4">
                                        {dataStats.allUsers.map(u => {
                                            const userTotal = Object.values(dataStats.userStats[u.uid] || {}).reduce((sum: number, count: number) => sum + count, 0);
                                            return (
                                                <div key={u.uid} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                                                                {u.displayName?.charAt(0) || '?'}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-gray-900">{u.displayName}</div>
                                                                <div className="text-xs text-gray-500">{u.email}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {u.isSystemAdmin && (
                                                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full flex items-center gap-1">
                                                                    <Lock size={10} /> System Admin
                                                                </span>
                                                            )}
                                                            <span className="text-lg font-bold text-gray-900">{userTotal}</span>
                                                            <span className="text-xs text-gray-500">records</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {dataStats.allModules.map(m => {
                                                            const count = dataStats.userStats[u.uid]?.[m.name] || 0;
                                                            if (count === 0) return null;
                                                            return (
                                                                <span key={m.name} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded-full flex items-center gap-1">
                                                                    {m.icon}
                                                                    <span className="text-gray-600">{m.name}:</span>
                                                                    <span className="font-medium text-gray-900">{count}</span>
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Test Data Section */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Database size={24} /></div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Testing & Data Population</h3>
                                        <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                                            Generate realistic dummy data across all modules to validate reports, dashboards, and app logic.
                                            This data is tagged as "Test Data" and can be removed easily without affecting your manual entries.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-6">
                                    <div className="p-5 border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all cursor-pointer group">
                                        <h4 className="font-bold text-gray-800 mb-2 group-hover:text-primary transition-colors">Generate Data</h4>
                                        <p className="text-xs text-gray-500 mb-4">Creates ~150 items: Projects, Expenses, Loans, Journal entries, Places, and more.</p>
                                        <button 
                                            onClick={handleGenerateData} 
                                            disabled={isGenerating}
                                            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 hover:border-primary hover:text-primary py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
                                        >
                                            {isGenerating ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus size={16} />}
                                            {isGenerating ? 'Generating...' : 'Generate Test Data'}
                                        </button>
                                    </div>

                                    <div className="p-5 border border-red-100 rounded-xl bg-red-50/30 hover:bg-red-50 transition-all cursor-pointer group">
                                        <h4 className="font-bold text-red-900 mb-2">Clean Up</h4>
                                        <p className="text-xs text-red-800/70 mb-4">Removes ALL items tagged as 'Test Data' from every module. Safe for real data.</p>
                                        <button 
                                            onClick={handleClearData} 
                                            disabled={isClearing}
                                            className="w-full flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-100 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
                                        >
                                            {isClearing ? <Loader2 className="animate-spin w-4 h-4" /> : <Trash2 size={16} />}
                                            {isClearing ? 'Clearing...' : 'Remove Test Data'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'Navigation' && (
                        <div className="space-y-6 animate-enter">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Sidebar Layout</h3>
                                        <p className="text-sm text-gray-500">Reorder modules, add dividers, or toggle visibility.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button 
                                            onClick={async () => {
                                                const currentLayout = (settings.menuLayout || []).map(item => ({...item}));
                                                const currentViews = new Set(currentLayout.filter(i => i.type === 'view').map(i => i.view));
                                                const missingModules = DEFAULT_SETTINGS.menuLayout
                                                    .filter(i => i.type === 'view' && !currentViews.has(i.view))
                                                    .map(item => ({...item}));
                                                if (missingModules.length === 0) {
                                                    alert('All modules are already in your menu!');
                                                    return;
                                                }
                                                const newLayout = [...currentLayout, ...missingModules];
                                                await saveMenuLayout(newLayout);
                                                alert(`Added ${missingModules.length} missing module(s): ${missingModules.map(m => m.view).join(', ')}`);
                                            }} 
                                            className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
                                        >
                                            <Plus size={14} /> Add Missing
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                const resetLayout = (settings.menuLayout || DEFAULT_SETTINGS.menuLayout).map(item => ({...item, isVisible: true}));
                                                await saveMenuLayout(resetLayout);
                                            }} 
                                            className="text-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
                                        >
                                            <Eye size={14} /> Show All
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                if (confirm('Reset menu to default layout? This will restore all modules in default order.')) {
                                                    const newLayout = DEFAULT_SETTINGS.menuLayout.map(item => ({...item}));
                                                    await saveMenuLayout(newLayout);
                                                }
                                            }} 
                                            className="text-sm bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
                                        >
                                            <Undo2 size={14} /> Reset Default
                                        </button>
                                        <button onClick={addMenuDivider} className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-gray-700">
                                            <Plus size={14} /> Add Divider
                                        </button>
                                        <button 
                                            onClick={() => {
                                                if (confirm('Clear cached settings and reload? This fixes save issues.')) {
                                                    repairSettingsCache();
                                                }
                                            }} 
                                            className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium"
                                        >
                                            <RefreshCw size={14} /> Repair Cache
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    {(settings.menuLayout || DEFAULT_SETTINGS.menuLayout).map((item, idx) => (
                                        <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-lg group hover:border-gray-300 transition-all">
                                            <div className="flex flex-col gap-1 text-gray-400">
                                                <button onClick={() => moveMenuItem(idx, 'up')} disabled={idx === 0} className="hover:text-primary disabled:opacity-30"><ArrowUp size={14} /></button>
                                                <button onClick={() => moveMenuItem(idx, 'down')} disabled={idx === (settings.menuLayout || []).length - 1} className="hover:text-primary disabled:opacity-30"><ArrowDownIcon size={14} /></button>
                                            </div>
                                            
                                            <div className="flex-1 flex items-center gap-3">
                                                {item.type === 'divider' ? (
                                                    <div className="w-full h-px bg-gray-300 border-t border-dashed"></div>
                                                ) : (
                                                    <div className="flex items-center gap-2 font-medium text-gray-700 capitalize">
                                                        {item.view === 'purchases' ? 'Shopping' : item.view === 'templates' ? 'Collections' : item.view === 'loans' ? 'Money Flows' : item.view === 'itineraries' ? 'Itineraries' : item.view === 'places' ? 'Places & Events' : item.view === 'genealogy' ? 'Family Tree' : item.view}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button onClick={() => toggleMenuItem(idx)} className={`p-1.5 rounded transition-colors ${item.isVisible ? 'text-gray-400 hover:text-gray-900' : 'text-red-400 bg-red-50'}`} title={item.isVisible ? 'Visible' : 'Hidden'}>
                                                    {item.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                                                </button>
                                                {item.type === 'divider' && (
                                                    <button onClick={() => removeMenuItem(idx)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'Users' && (
                        <div className="space-y-6 animate-enter">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Registered Users</h3>
                                        <p className="text-sm text-gray-500 mt-1">Users who have signed up for this LIFEOS instance.</p>
                                    </div>
                                    <button onClick={() => refreshAvailableUsers()} className="flex items-center gap-2 text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 shadow-sm transition-colors"><RefreshCw size={14} /> Refresh</button>
                                </div>
                                
                                {availableUsers.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 font-medium">No other users yet</p>
                                        <p className="text-sm text-gray-400 mt-1">Users can sign up from the login screen.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {availableUsers.map(u => {
                                            const initials = u.displayName 
                                                ? u.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                                : u.email?.charAt(0).toUpperCase() || '?';
                                            const userTheme = u.theme as keyof typeof THEMES || 'blue';
                                            return (
                                                <div key={u.uid} className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-gray-300 transition-all group">
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-sm border-2 border-white" style={{ backgroundColor: THEMES[userTheme]?.main || THEMES.blue.main }}>
                                                                {initials}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-900">{u.displayName || 'User'}</div>
                                                                <div className="text-xs text-gray-500">{u.email}</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            {u.isSystemAdmin && (
                                                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                                                                    System
                                                                </span>
                                                            )}
                                                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${u.isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'}`}>
                                                                {u.isAdmin ? 'Admin' : 'User'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                                                        <button 
                                                            onClick={() => setUserModal({ 
                                                                isOpen: true, 
                                                                user: { 
                                                                    id: u.uid,
                                                                    name: u.displayName || '', 
                                                                    email: u.email || '', 
                                                                    role: u.isAdmin ? 'Admin' : 'User',
                                                                    isSystemAdmin: u.isSystemAdmin,
                                                                    theme: (u.theme || 'blue') as any
                                                                } 
                                                            })} 
                                                            className="p-2 text-gray-400 hover:text-primary rounded bg-white transition-colors shadow-sm"
                                                        >
                                                            <Edit3 size={14} />
                                                        </button>
                                                        {!u.isSystemAdmin && u.uid !== user?.uid ? (
                                                            <button 
                                                                onClick={() => handleOpenDeletionModal({ 
                                                                    id: u.uid,
                                                                    name: u.displayName || '', 
                                                                    email: u.email || '', 
                                                                    isSystemAdmin: u.isSystemAdmin 
                                                                } as UserProfile)} 
                                                                className="p-2 text-gray-400 hover:text-red-600 rounded bg-white transition-colors shadow-sm"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        ) : (
                                                            <span className="p-2 text-gray-300 cursor-not-allowed" title={u.isSystemAdmin ? "System admins cannot be deleted" : "Cannot delete yourself"}><Trash2 size={14} /></span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <UserPlus size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-blue-900">Adding New Users</h4>
                                        <p className="text-sm text-blue-800 mt-1">
                                            New users can sign up directly from the login screen using their email address. 
                                            The first user to sign up automatically becomes the System Admin. After new users 
                                            sign up, click "Refresh" to see them in this list.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'Accounts' && (
                        <div className="space-y-6 animate-enter">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl">
                                            <Building2 size={24} className="text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Workspaces</h3>
                                            <p className="text-sm text-gray-500 mt-1">Organize your data into separate workspaces with team members.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            const name = prompt('Enter new account name:');
                                            if (name?.trim()) {
                                                try {
                                                    await createAccount(name.trim());
                                                } catch (error) {
                                                    alert('Failed to create account');
                                                }
                                            }
                                        }}
                                        className="flex items-center gap-2 text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                                    >
                                        <Plus size={14} /> New Account
                                    </button>
                                </div>

                                {userAccounts.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 font-medium">No accounts yet</p>
                                        <p className="text-sm text-gray-400 mt-1">Create your first workspace to organize your data.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {userAccounts.filter(a => a.status === 'active').map(account => (
                                            <div 
                                                key={account.id} 
                                                className={`p-4 rounded-xl border transition-all ${
                                                    currentAccount?.id === account.id 
                                                        ? 'bg-indigo-50 border-indigo-200' 
                                                        : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div 
                                                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                                                            style={{ backgroundColor: account.color || '#6366f1' }}
                                                        >
                                                            {account.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-semibold text-gray-900">{account.name}</h4>
                                                                {currentAccount?.id === account.id && (
                                                                    <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">Active</span>
                                                                )}
                                                                {account.id === 'personal' && (
                                                                    <Home size={14} className="text-gray-400" />
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-500">
                                                                {account.members.length} member{account.members.length !== 1 ? 's' : ''}
                                                                {account.description && ` · ${account.description}`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {canManageAccount(account.id) && account.id !== 'personal' && (
                                                        <div className="flex gap-1">
                                                            <button 
                                                                onClick={() => {
                                                                    const newName = prompt('Rename account:', account.name);
                                                                    if (newName?.trim() && newName !== account.name) {
                                                                        updateAccount(account.id, { name: newName.trim() });
                                                                    }
                                                                }}
                                                                className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-white transition-colors"
                                                            >
                                                                <Edit3 size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={async () => {
                                                                    if (confirm(`Delete "${account.name}"? This cannot be undone.`)) {
                                                                        try {
                                                                            await deleteAccount(account.id);
                                                                        } catch (error: any) {
                                                                            alert(error.message || 'Failed to delete account');
                                                                        }
                                                                    }
                                                                }}
                                                                className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-white transition-colors"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {account.members.map(member => (
                                                        <div 
                                                            key={member.uid}
                                                            className="flex items-center gap-2 px-2 py-1 bg-white rounded-lg border border-gray-200 text-xs"
                                                        >
                                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-medium">
                                                                {member.displayName.charAt(0)}
                                                            </div>
                                                            <span className="text-gray-700">{member.displayName}</span>
                                                            {member.role === 'owner' && <Crown size={10} className="text-amber-500" />}
                                                            {member.role === 'admin' && <Shield size={10} className="text-blue-500" />}
                                                            {canManageAccount(account.id) && member.uid !== user?.uid && (
                                                                <button
                                                                    onClick={() => {
                                                                        if (confirm(`Remove ${member.displayName} from this account?`)) {
                                                                            removeMember(account.id, member.uid);
                                                                        }
                                                                    }}
                                                                    className="text-gray-400 hover:text-red-500 ml-1"
                                                                >
                                                                    <XCircle size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                {canManageAccount(account.id) && (
                                                    <button
                                                        onClick={() => {
                                                            const userId = prompt('Enter user ID to add:');
                                                            const displayName = prompt('Enter display name:');
                                                            if (userId && displayName) {
                                                                addMember(account.id, userId, displayName, 'member');
                                                            }
                                                        }}
                                                        className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                                    >
                                                        <UserPlus size={12} /> Add Member
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <Building2 size={20} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-indigo-900">About Workspaces</h4>
                                        <p className="text-sm text-indigo-800 mt-1">
                                            Workspaces let you organize data into separate spaces. Each workspace can have
                                            multiple members with different roles (Owner, Admin, Member, Viewer). 
                                            Switch between workspaces using the account switcher in the header.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'Sharing' && (
                        <div className="space-y-6 animate-enter">
                            {/* Collapsible How Sharing Works Guide */}
                            <details className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl overflow-hidden group">
                                <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-purple-100/50 transition-colors list-none">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                            <HelpCircle size={20} className="text-purple-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-purple-900">How Sharing Works in LIFEOS</h4>
                                            <p className="text-xs text-purple-700">Click to learn about visibility modes and permissions</p>
                                        </div>
                                    </div>
                                    <ChevronDown size={20} className="text-purple-500 group-open:rotate-180 transition-transform" />
                                </summary>
                                <div className="px-4 pb-4 space-y-4 animate-fade-in">
                                    <div className="bg-white rounded-lg p-4 border border-purple-100">
                                        <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <Eye size={16} className="text-purple-500" /> Visibility Modes Explained
                                        </h5>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                                                <div className="w-20 flex-shrink-0 font-medium text-gray-700">All Items</div>
                                                <p className="text-gray-600">See everything in the module - your items, items shared with you, and (for admins) all other users' items.</p>
                                            </div>
                                            <div className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                                                <div className="w-20 flex-shrink-0 font-medium text-gray-700">My Items</div>
                                                <p className="text-gray-600">Only see items you created. Perfect for focusing on your personal data without distractions.</p>
                                            </div>
                                            <div className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                                                <div className="w-20 flex-shrink-0 font-medium text-gray-700">Shared</div>
                                                <p className="text-gray-600">See items that others have explicitly shared with you. Great for collaborative projects.</p>
                                            </div>
                                            <div className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg">
                                                <div className="w-20 flex-shrink-0 font-medium text-gray-700">Assigned</div>
                                                <p className="text-gray-600">See items assigned to you for action. Useful for tasks and responsibilities.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg p-4 border border-purple-100">
                                        <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <Users size={16} className="text-blue-500" /> User Roles & Permissions
                                        </h5>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg border border-amber-100">
                                                <Crown size={16} className="text-amber-600" />
                                                <div>
                                                    <span className="font-medium text-amber-900">Super Admin</span>
                                                    <span className="text-amber-700 ml-2">- Full access to all data, settings, and API keys across all users</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                                                <Shield size={16} className="text-blue-600" />
                                                <div>
                                                    <span className="font-medium text-blue-900">Admin</span>
                                                    <span className="text-blue-700 ml-2">- Can view all users' data, manage users, but no API key access</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg border border-green-100">
                                                <User size={16} className="text-green-600" />
                                                <div>
                                                    <span className="font-medium text-green-900">User</span>
                                                    <span className="text-green-700 ml-2">- Can only see own items + items shared with them or assigned to them</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg p-4 border border-purple-100">
                                        <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                            <Info size={16} className="text-green-500" /> Tips
                                        </h5>
                                        <ul className="text-sm text-gray-600 space-y-2">
                                            <li className="flex items-start gap-2">
                                                <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                                                <span>Set a <strong>Global Default</strong> that works for most modules, then override specific modules as needed.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                                                <span>Enable <strong>Owner Labels</strong> to easily see who created each item when viewing shared data.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                                                <span>Personal modules like <strong>Journal</strong> work best with "My Items Only" for privacy.</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                                                <span>Collaborative modules like <strong>Projects</strong> benefit from "All Items" to see team progress.</span>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </details>

                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl">
                                        <Share2 size={24} className="text-purple-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Default Visibility</h3>
                                        <p className="text-sm text-gray-500 mt-1">Choose what data you see by default across all modules.</p>
                                    </div>
                                </div>

                                <SharingFilter
                                    mode={sharingSettings.globalDefaultMode}
                                    onChange={updateGlobalDefault}
                                    className="mb-6"
                                />

                                <div className="pt-4 border-t border-gray-100">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={sharingSettings.showOwnerLabels}
                                            onChange={e => toggleOwnerLabels(e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <div>
                                            <span className="font-medium text-gray-900">Show Owner Labels</span>
                                            <p className="text-sm text-gray-500">Display who owns each item in list views</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl">
                                        <LayoutDashboard size={24} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Module-Specific Settings</h3>
                                        <p className="text-sm text-gray-500 mt-1">Override default visibility for specific modules.</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {[
                                        { id: 'projects', label: 'Projects', icon: FolderKanban },
                                        { id: 'financial', label: 'Financial', icon: Wallet },
                                        { id: 'journal', label: 'Journal', icon: BookOpen },
                                        { id: 'groceries', label: 'Groceries', icon: Utensils },
                                        { id: 'purchases', label: 'Shopping', icon: ShoppingBag },
                                        { id: 'places', label: 'Places & Events', icon: MapPin },
                                        { id: 'itineraries', label: 'Itineraries', icon: Route },
                                    ].map(module => {
                                        const modulePref = sharingSettings.modulePreferences[module.id];
                                        const Icon = module.icon;
                                        return (
                                            <div key={module.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <Icon size={18} className="text-gray-500" />
                                                    <span className="font-medium text-gray-700">{module.label}</span>
                                                </div>
                                                <select
                                                    value={modulePref?.defaultMode || 'inherit'}
                                                    onChange={e => {
                                                        if (e.target.value === 'inherit') {
                                                            const { [module.id]: _, ...rest } = sharingSettings.modulePreferences;
                                                            updateModulePreference(module.id, { defaultMode: undefined as any });
                                                        } else {
                                                            updateModulePreference(module.id, { defaultMode: e.target.value as SharingMode });
                                                        }
                                                    }}
                                                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary"
                                                >
                                                    <option value="inherit">Use Global Default</option>
                                                    <option value="all">All Items</option>
                                                    <option value="mine">My Items Only</option>
                                                    <option value="shared">Shared with Me</option>
                                                    <option value="assigned">Assigned to Me</option>
                                                </select>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'Currencies' && (
                        <div className="space-y-6 animate-enter">
                            {/* Base Currency */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl">
                                        <DollarSign size={24} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Base Currency</h3>
                                        <p className="text-sm text-gray-500 mt-1">Set the primary currency used for dashboard aggregations and report totals.</p>
                                    </div>
                                </div>
                                <select className="w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none" value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value as any})}>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                    <option value="COP">COP ($)</option>
                                </select>
                            </div>

                            {/* Currency Management */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl">
                                            <Coins size={24} className="text-emerald-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Currency Management</h3>
                                            <p className="text-sm text-gray-500 mt-1">Add currencies and set exchange rates via API or manual entry.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setShowCurrencyHistory(!showCurrencyHistory)}
                                            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${showCurrencyHistory ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                        >
                                            <History size={16} /> History
                                        </button>
                                        <button 
                                            onClick={handleFetchApiRates}
                                            disabled={isFetchingRates}
                                            className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors disabled:opacity-50"
                                        >
                                            {isFetchingRates ? <Loader2 className="animate-spin w-4 h-4" /> : <RefreshCw size={16} />}
                                            Fetch API Rates
                                        </button>
                                        <button 
                                            onClick={() => { setCurrencyModal({ isOpen: true, currency: { code: '', name: '', symbol: '', rateToUSD: 1 }, isEditing: false }); setCurrencySource('manual'); }}
                                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-hover shadow-sm transition-colors"
                                        >
                                            <Plus size={16} /> Add Currency
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 border-y border-gray-200">
                                            <tr>
                                                <th className="text-left text-xs font-bold text-gray-500 uppercase px-4 py-3">Flag</th>
                                                <th className="text-left text-xs font-bold text-gray-500 uppercase px-4 py-3">Code</th>
                                                <th className="text-left text-xs font-bold text-gray-500 uppercase px-4 py-3">Currency Name</th>
                                                <th className="text-left text-xs font-bold text-gray-500 uppercase px-4 py-3">Symbol</th>
                                                <th className="text-right text-xs font-bold text-gray-500 uppercase px-4 py-3">Rate (1 USD)</th>
                                                <th className="text-center text-xs font-bold text-gray-500 uppercase px-4 py-3">Source</th>
                                                <th className="text-left text-xs font-bold text-gray-500 uppercase px-4 py-3">Updated</th>
                                                <th className="text-right text-xs font-bold text-gray-500 uppercase px-4 py-3">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {currencies.map(curr => {
                                                const countryCode = curr.code === 'USD' ? 'US' : curr.code === 'EUR' ? 'EU' : curr.code === 'GBP' ? 'GB' : curr.code === 'COP' ? 'CO' : curr.code === 'JPY' ? 'JP' : curr.code === 'CAD' ? 'CA' : curr.code === 'AUD' ? 'AU' : curr.code === 'CHF' ? 'CH' : curr.code === 'CNY' ? 'CN' : curr.code === 'INR' ? 'IN' : curr.code === 'MXN' ? 'MX' : curr.code === 'BRL' ? 'BR' : curr.code === 'KRW' ? 'KR' : curr.code.slice(0, 2);
                                                return (
                                                    <tr key={curr.code} className="hover:bg-gray-50 transition-colors group">
                                                        <td className="px-4 py-4">
                                                            <img 
                                                                src={`https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`}
                                                                alt={curr.code}
                                                                className="w-6 h-auto rounded shadow-sm"
                                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <span className="font-bold text-gray-900">{curr.code}</span>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <span className="text-gray-700">{curr.name}</span>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <span className="text-xl font-semibold text-gray-600">{curr.symbol}</span>
                                                        </td>
                                                        <td className="px-4 py-4 text-right">
                                                            <span className="font-mono font-medium text-gray-900">{curr.rateToUSD.toLocaleString()}</span>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${curr.source === 'api' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                                                                {curr.source === 'api' ? 'API' : 'Manual'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <span className="text-sm text-gray-500">{new Date(curr.lastUpdated).toLocaleDateString()}</span>
                                                        </td>
                                                        <td className="px-4 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button 
                                                                    onClick={() => { setCurrencyModal({ isOpen: true, currency: curr, isEditing: true }); setCurrencySource(curr.source); }}
                                                                    className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                                                                    title="Edit"
                                                                >
                                                                    <Edit3 size={16} />
                                                                </button>
                                                                {curr.code !== 'USD' && (
                                                                    <button 
                                                                        onClick={() => handleDeleteCurrency(curr.code)}
                                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {showCurrencyHistory && (
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-enter">
                                    <div className="flex items-center gap-3 mb-4">
                                        <History size={20} className="text-gray-400" />
                                        <h3 className="font-bold text-gray-900">Rate Change History</h3>
                                    </div>
                                    {currencyHistory.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 text-sm">
                                            No history yet. Rate changes will appear here.
                                        </div>
                                    ) : (
                                        <div className="space-y-4 max-h-96 overflow-y-auto">
                                            {(() => {
                                                const sortedHistory = [...currencyHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                                                const groupedByDate: { [key: string]: typeof currencyHistory } = {};
                                                sortedHistory.forEach(entry => {
                                                    const dateKey = new Date(entry.date).toLocaleDateString();
                                                    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
                                                    groupedByDate[dateKey].push(entry);
                                                });
                                                
                                                const getTrend = (entry: typeof currencyHistory[0], allEntries: typeof currencyHistory) => {
                                                    const sameCodeEntries = allEntries.filter(e => e.code === entry.code && new Date(e.date).getTime() < new Date(entry.date).getTime());
                                                    if (sameCodeEntries.length === 0) return null;
                                                    const previousRate = sameCodeEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.rateToUSD;
                                                    if (!previousRate) return null;
                                                    const diff = entry.rateToUSD - previousRate;
                                                    const percentChange = ((diff / previousRate) * 100).toFixed(2);
                                                    return { direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same', change: Math.abs(parseFloat(percentChange)) };
                                                };
                                                
                                                return Object.entries(groupedByDate).slice(0, 10).map(([date, entries]) => (
                                                    <div key={date}>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <CalendarIcon size={14} className="text-gray-400" />
                                                            <span className="text-sm font-semibold text-gray-700">{date}</span>
                                                            <span className="text-xs text-gray-400">({entries.length} change{entries.length !== 1 ? 's' : ''})</span>
                                                        </div>
                                                        <div className="space-y-1.5 pl-5 border-l-2 border-gray-100">
                                                            {entries.map((entry, idx) => {
                                                                const trend = getTrend(entry, currencyHistory);
                                                                return (
                                                                    <div key={entry.id || idx} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="font-bold text-gray-700 w-10">{entry.code}</span>
                                                                            <span className="text-sm text-gray-600">1 USD = {entry.rateToUSD.toLocaleString()}</span>
                                                                            {trend && trend.direction !== 'same' && (
                                                                                <span className={`flex items-center gap-0.5 text-xs font-medium ${trend.direction === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                                    {trend.direction === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                                                    {trend.change}%
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-3 text-xs text-gray-400">
                                                                            <span className={`px-1.5 py-0.5 rounded-full ${entry.source === 'api' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                                                                                {entry.source}
                                                                            </span>
                                                                            {entry.updatedBy && <span className="hidden md:inline">by {entry.updatedBy}</span>}
                                                                            <span>{new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <Coins size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-emerald-900">Currency Rates</h4>
                                        <p className="text-sm text-emerald-800 mt-1">
                                            Rates are used to convert amounts for dashboard totals and reports. 
                                            Use "Fetch API Rates" for live rates or enter manually.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'Integrations' && (
                        <div className="space-y-6 animate-enter">
                            {/* Non-Admin Access Denied */}
                            {!user?.isSystemAdmin && (
                                <div className="bg-white p-8 rounded-xl border-2 border-red-200 shadow-lg text-center">
                                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Lock size={32} className="text-red-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">Access Restricted</h3>
                                    <p className="text-sm text-gray-500 mt-2">Only Super Admins can view and manage API integrations.</p>
                                    <p className="text-xs text-gray-400 mt-4">Contact your system administrator if you need access.</p>
                                </div>
                            )}

                            {/* Password Gate for Super Admin */}
                            {user?.isSystemAdmin && !showApiKeys.unlocked && (
                                <div className="bg-white p-8 rounded-xl border-2 border-amber-200 shadow-lg">
                                    <div className="text-center mb-6">
                                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Lock size={32} className="text-amber-600" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900">Protected Area</h3>
                                        <p className="text-sm text-gray-500 mt-2">Enter your password to view and manage API keys</p>
                                    </div>
                                    <div className="max-w-sm mx-auto space-y-4">
                                        <div className="relative">
                                            <input
                                                type="password"
                                                placeholder="Enter your password..."
                                                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter' && user?.isSystemAdmin) {
                                                        setShowApiKeys({...showApiKeys, unlocked: true});
                                                    }
                                                }}
                                            />
                                        </div>
                                        <button
                                            onClick={() => user?.isSystemAdmin && setShowApiKeys({...showApiKeys, unlocked: true})}
                                            className="w-full bg-amber-500 text-white py-3 rounded-lg font-medium hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Key size={18} /> Unlock API Settings
                                        </button>
                                    </div>
                                </div>
                            )}

                            {user?.isSystemAdmin && showApiKeys.unlocked && (
                                <>
                                    {/* Lock Button */}
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => setShowApiKeys({ google: false, currency: false, firebase: false, unlocked: false })}
                                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                                        >
                                            <Lock size={14} /> Lock Settings
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {/* Google Services */}
                                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl">
                                                    <Globe size={24} className="text-blue-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-gray-900">Google Maps & Places</h3>
                                                    <p className="text-xs text-gray-500 mt-0.5">Places API, Autocomplete, Maps</p>
                                                </div>
                                                <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                    Server-Side
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                <p className="text-xs text-gray-600 mb-1">Environment Variable: <code className="bg-gray-200 px-1 rounded">GOOGLE_MAPS_API_KEY</code></p>
                                                <p className="text-xs text-gray-400">Managed in Replit Secrets. Injected server-side for security.</p>
                                            </div>
                                        </div>

                                        {/* Gemini AI */}
                                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl">
                                                    <Sparkles size={24} className="text-purple-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-gray-900">Google Gemini AI</h3>
                                                    <p className="text-xs text-gray-500 mt-0.5">AI features, sentiment analysis, subtask generation</p>
                                                </div>
                                                <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                    Server-Side
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                                <p className="text-xs text-gray-600 mb-1">Environment Variable: <code className="bg-gray-200 px-1 rounded">GEMINI_API_KEY</code></p>
                                                <p className="text-xs text-gray-400">Managed in Replit Secrets. Used for AI-powered features.</p>
                                            </div>
                                        </div>

                                        {/* Firebase */}
                                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="p-3 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl">
                                                    <Cloud size={24} className="text-orange-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-gray-900">Firebase</h3>
                                                    <p className="text-xs text-gray-500 mt-0.5">Authentication, Firestore Database, Storage</p>
                                                </div>
                                                <div className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                    Connected
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 space-y-2">
                                                <p className="text-xs text-gray-600">Environment Variable: <code className="bg-gray-200 px-1 rounded">FIREBASE_API_KEY</code></p>
                                                <p className="text-xs text-gray-600">Project: <code className="bg-gray-200 px-1 rounded">lifeos-e00ed</code></p>
                                                <p className="text-xs text-gray-400">Managed in Replit Secrets. Powers auth and data storage.</p>
                                            </div>
                                        </div>

                                        {/* Currency Exchange - User Editable */}
                                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="p-3 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl">
                                                    <RefreshCw size={24} className="text-emerald-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-gray-900">Currency Exchange API</h3>
                                                    <p className="text-xs text-gray-500 mt-0.5">Real-time exchange rate updates</p>
                                                </div>
                                                <div className={`px-2 py-1 rounded-full text-xs font-medium ${settings.currencyApiKey ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {settings.currencyApiKey ? 'Connected' : 'Not Set'}
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <input 
                                                    type={showApiKeys.currency ? "text" : "password"}
                                                    placeholder="Enter currency API key..." 
                                                    value={settings.currencyApiKey || ''} 
                                                    onChange={e => setSettings({...settings, currencyApiKey: e.target.value})} 
                                                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-gray-50 focus:bg-white transition-colors" 
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowApiKeys({...showApiKeys, currency: !showApiKeys.currency})}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                >
                                                    {showApiKeys.currency ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-2">Optional. Used to fetch live currency conversion rates.</p>
                                        </div>
                                    </div>

                                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                                        <div className="flex items-start gap-3">
                                            <Shield size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="font-semibold text-amber-900">API Key Security</h4>
                                                <p className="text-sm text-amber-800 mt-1">
                                                    API keys are stored as encrypted secrets in Replit's secure environment. They are injected 
                                                    server-side and never exposed to the browser. Only Super Admins can view this section.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeSection === 'Projects' && (
                        <div className="space-y-6 animate-enter">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="p-3 bg-gradient-to-br from-violet-100 to-violet-50 rounded-xl">
                                        <FolderKanban size={24} className="text-violet-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Project Status Options</h3>
                                        <p className="text-sm text-gray-500 mt-1">Define the workflow stages for your projects. Click any status to edit its name or color.</p>
                                    </div>
                                </div>
                                <ListEditor title="" listKey="projectStatuses" />
                            </div>
                        </div>
                    )}
                    
                    {activeSection === 'Financial' && (
                        <div className="space-y-6 animate-enter">
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="p-3 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-xl">
                                            <Wallet size={24} className="text-emerald-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Accounts & Wallets</h3>
                                            <p className="text-sm text-gray-500 mt-1">Bank accounts, digital wallets, and cash.</p>
                                        </div>
                                    </div>
                                    <ListEditor title="" listKey="accounts" />
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="p-3 bg-gradient-to-br from-red-100 to-red-50 rounded-xl">
                                            <CreditCard size={24} className="text-red-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Expense Categories</h3>
                                            <p className="text-sm text-gray-500 mt-1">Categorize your spending.</p>
                                        </div>
                                    </div>
                                    <ListEditor title="" listKey="expenseCategories" />
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="p-3 bg-gradient-to-br from-green-100 to-green-50 rounded-xl">
                                        <DollarSign size={24} className="text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Income Categories</h3>
                                        <p className="text-sm text-gray-500 mt-1">Track your income sources.</p>
                                    </div>
                                </div>
                                <ListEditor title="" listKey="incomeCategories" />
                            </div>
                        </div>
                    )}

                    {activeSection === 'Debts' && (
                        <div className="space-y-6 animate-enter">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="p-3 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl">
                                        <CreditCard size={24} className="text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Loan & Debt Types</h3>
                                        <p className="text-sm text-gray-500 mt-1">Define categories for tracking loans, debts, and credits. Click to edit.</p>
                                    </div>
                                </div>
                                <ListEditor title="" listKey="loanTypes" />
                            </div>
                        </div>
                    )}

                    {activeSection === 'Journal' && (
                        <div className="space-y-6 animate-enter">
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="p-3 bg-gradient-to-br from-pink-100 to-pink-50 rounded-xl text-2xl">😊</div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Mood Options</h3>
                                            <p className="text-sm text-gray-500 mt-1">Track your emotional states.</p>
                                        </div>
                                    </div>
                                    <ListEditor title="" listKey="journalMoods" />
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="p-3 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl">
                                            <BookOpen size={24} className="text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Journal Tags</h3>
                                            <p className="text-sm text-gray-500 mt-1">Categorize your entries.</p>
                                        </div>
                                    </div>
                                    <ListEditor title="" listKey="journalTags" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'Itineraries' && (
                        <div className="space-y-6 animate-enter">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="p-3 bg-gradient-to-br from-cyan-100 to-cyan-50 rounded-xl">
                                        <Route size={24} className="text-cyan-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Itinerary Types</h3>
                                        <p className="text-sm text-gray-500 mt-1">Define categories for your travel itineraries.</p>
                                    </div>
                                </div>
                                <ListEditor title="" listKey="itineraryTypes" />
                            </div>
                        </div>
                    )}

                    {activeSection === 'Places' && (
                        <div className="space-y-6 animate-enter">
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="p-3 bg-gradient-to-br from-rose-100 to-rose-50 rounded-xl">
                                            <MapPin size={24} className="text-rose-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Place Types</h3>
                                            <p className="text-sm text-gray-500 mt-1">Categorize locations and venues.</p>
                                        </div>
                                    </div>
                                    <ListEditor title="" listKey="placeTypes" />
                                </div>
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="p-3 bg-gradient-to-br from-amber-100 to-amber-50 rounded-xl">
                                            <Grid size={24} className="text-amber-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">Place Collections</h3>
                                            <p className="text-sm text-gray-500 mt-1">Group places into themed lists.</p>
                                        </div>
                                    </div>
                                    <ListEditor title="" listKey="placeCollections" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'Shopping' && (
                        <div className="space-y-6 animate-enter">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl">
                                        <ShoppingBag size={24} className="text-purple-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Shopping Categories</h3>
                                        <p className="text-sm text-gray-500 mt-1">Organize your shopping lists by category.</p>
                                    </div>
                                </div>
                                <ListEditor title="" listKey="listCategories" />
                            </div>
                        </div>
                    )}

                    {activeSection === 'Groceries' && (
                        <div className="space-y-6 animate-enter">
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="p-3 bg-gradient-to-br from-lime-100 to-lime-50 rounded-xl">
                                        <Utensils size={24} className="text-lime-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Grocery Categories</h3>
                                        <p className="text-sm text-gray-500 mt-1">Organize grocery items by section for easy shopping.</p>
                                    </div>
                                </div>
                                <ListEditor title="" listKey="groceryCategories" />
                            </div>
                        </div>
                    )}
                    
                    {activeSection === 'Collections' && (
                        <div className="space-y-6 animate-enter">
                            <ListEditor title="Collection Categories" listKey="collectionCategories" />
                            
                            {/* Collection Option Editor */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Collection Field Options</h3>
                                        <p className="text-xs text-gray-500 mt-1">Customize dropdown options for your active collections (e.g. Statuses, Genres).</p>
                                    </div>
                                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium border border-blue-100 flex items-center gap-1">
                                        <Check size={12} /> Auto-Saves
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">1. Select Active Collection</label>
                                        <div className="relative">
                                            <select 
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white appearance-none focus:ring-primary"
                                                value={selectedCollectionId}
                                                onChange={e => { setSelectedCollectionId(e.target.value); setSelectedFieldKey(''); }}
                                            >
                                                <option value="">-- Choose Collection --</option>
                                                {userCollections.map(c => <option key={c.id} value={c.id}>{c.name} ({c.type})</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">2. Select Dropdown Field</label>
                                        <div className="relative">
                                            <select 
                                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white appearance-none focus:ring-primary"
                                                value={selectedFieldKey}
                                                onChange={e => setSelectedFieldKey(e.target.value)}
                                                disabled={!selectedCollectionId}
                                            >
                                                <option value="">-- Choose Field --</option>
                                                {userCollections.find(c => c.id === selectedCollectionId)?.fields
                                                    .filter(f => f.type === 'select')
                                                    .map(f => <option key={f.key} value={f.key}>{f.label}</option>)
                                                }
                                            </select>
                                            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                {selectedCollectionId && selectedFieldKey && (
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <div className="flex gap-2 mb-3">
                                            <input 
                                                type="text" 
                                                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary"
                                                placeholder="Add new option..."
                                                value={newOption}
                                                onChange={e => setNewOption(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') handleAddCollectionOption(); }}
                                            />
                                            <button onClick={handleAddCollectionOption} className="bg-primary text-white px-3 py-2 rounded-md hover:bg-primary-hover"><Plus size={16} /></button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {userCollections
                                                .find(c => c.id === selectedCollectionId)?.fields
                                                .find(f => f.key === selectedFieldKey)?.options?.map(opt => (
                                                    <div key={opt} className="bg-white border border-gray-200 px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-sm group hover:border-primary/30">
                                                        <span>{opt}</span>
                                                        <button 
                                                            onClick={() => handleRemoveCollectionOption(opt)}
                                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                ))
                                            }
                                            {(!userCollections.find(c => c.id === selectedCollectionId)?.fields.find(f => f.key === selectedFieldKey)?.options?.length) && (
                                                <span className="text-xs text-gray-400 italic p-2">No options defined. Add one above.</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {activeSection === 'Documents' && (
                        <div className="space-y-6 animate-enter">
                            <ListEditor title="Document Categories" listKey="documentCategories" />
                        </div>
                    )}

                    {activeSection === 'Habits' && (
                        <div className="space-y-6 animate-enter">
                            <SectionCard title="Habit Settings" icon={Flame}>
                                <p className="text-gray-500 text-sm mb-4">Configure your habit tracking preferences.</p>
                                <ListEditor title="Habit Categories" listKey="habitCategories" />
                            </SectionCard>
                            <SectionCard title="Habit Reminders" icon={CalendarIcon}>
                                <p className="text-gray-500 text-sm mb-4">Set up notifications and reminders for your habits.</p>
                                <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-400 text-sm">
                                    Reminder settings coming soon. Currently habits track daily by default.
                                </div>
                            </SectionCard>
                        </div>
                    )}

                    {activeSection === 'Goals' && (
                        <div className="space-y-6 animate-enter">
                            <SectionCard title="Goal Settings" icon={Target}>
                                <p className="text-gray-500 text-sm mb-4">Configure your goal tracking and milestone settings.</p>
                                <ListEditor title="Goal Categories" listKey="goalCategories" />
                            </SectionCard>
                            <SectionCard title="Goal Priorities" icon={AlertTriangle}>
                                <p className="text-gray-500 text-sm mb-4">Manage priority levels for goals.</p>
                                <ListEditor title="Priority Levels" listKey="goalPriorities" />
                            </SectionCard>
                        </div>
                    )}

                    {activeSection === 'Calendar' && (
                        <div className="space-y-6 animate-enter">
                            <SectionCard title="Calendar Settings" icon={CalendarIcon}>
                                <p className="text-gray-500 text-sm mb-4">Configure your unified calendar view preferences.</p>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm font-medium text-gray-700">Show Financial Due Dates</span>
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm font-medium text-gray-700">Show Project Deadlines</span>
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm font-medium text-gray-700">Show Habit Streaks</span>
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm font-medium text-gray-700">Show Goal Milestones</span>
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    </div>
                                </div>
                            </SectionCard>
                            <SectionCard title="Calendar Display" icon={Globe}>
                                <p className="text-gray-500 text-sm mb-4">Adjust how the calendar displays information.</p>
                                <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-400 text-sm">
                                    Additional display options coming soon. The calendar currently aggregates all module events.
                                </div>
                            </SectionCard>
                        </div>
                    )}

                </div>
            </div>

            {/* MODALS */}
            <Modal isOpen={userModal.isOpen} onClose={() => { setUserModal({ isOpen: false, user: {} }); setUserErrors({}); }} title="Edit User" size="md">
                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div 
                                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-sm" 
                                style={{ backgroundColor: THEMES[userModal.user.theme as keyof typeof THEMES]?.main || THEMES.blue.main }}
                            >
                                {userModal.user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                            </div>
                            <div>
                                <div className="font-semibold text-gray-900">{userModal.user.name || 'User'}</div>
                                <div className="text-sm text-gray-500">{userModal.user.email}</div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                            value={userModal.user.name || ''} 
                            onChange={e => setUserModal({...userModal, user: {...userModal.user, name: e.target.value}})}
                            placeholder="Display name" 
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select 
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white"
                            value={userModal.user.role || 'User'}
                            onChange={e => setUserModal({...userModal, user: {...userModal.user, role: e.target.value as 'Admin' | 'User'}})}
                        >
                            <option value="User">User</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>

                    {userModal.user.role === 'Admin' && (
                        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <input
                                type="checkbox"
                                id="isSystemAdmin"
                                checked={userModal.user.isSystemAdmin || false}
                                onChange={e => setUserModal({...userModal, user: {...userModal.user, isSystemAdmin: e.target.checked}})}
                                className="w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                            />
                            <label htmlFor="isSystemAdmin" className="flex-1">
                                <span className="text-sm font-medium text-amber-900">System Administrator</span>
                                <p className="text-xs text-amber-700 mt-0.5">Full access to Firebase settings and cannot be deleted.</p>
                            </label>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Interface Theme</label>
                        <div className="flex gap-3 flex-wrap">
                            {THEME_COLORS.map(theme => (
                                <button 
                                    key={theme.key}
                                    type="button"
                                    onClick={() => setUserModal({...userModal, user: {...userModal.user, theme: theme.key as any}})}
                                    className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${userModal.user.theme === theme.key ? 'border-gray-900 scale-110 shadow-lg ring-2 ring-offset-2 ring-gray-300' : 'border-white hover:scale-105 shadow'}`}
                                    style={{ backgroundColor: theme.hex }}
                                    title={theme.key.charAt(0).toUpperCase() + theme.key.slice(1)}
                                >
                                    {userModal.user.theme === theme.key && <Check size={16} className="text-white drop-shadow" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                        <p className="text-xs text-blue-700">
                            <strong>Note:</strong> Users manage their own login credentials through Firebase Authentication. 
                            They can reset their password from the login screen.
                        </p>
                    </div>

                    <div className="flex flex-col-reverse md:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
                        <button onClick={() => { setUserModal({ isOpen: false, user: {} }); setUserErrors({}); }} className="px-4 py-2.5 text-gray-600 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
                        <button 
                            onClick={handleSaveUser} 
                            className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm"
                        >
                            Update User
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Firebase Admin Edit Document Modal */}
            <Modal 
                isOpen={adminEditModal.isOpen} 
                onClose={() => setAdminEditModal({ isOpen: false, doc: null })}
                title="Edit Document"
                size="lg"
            >
                <div className="space-y-4">
                    <p className="text-sm text-gray-500">Edit the document data as JSON:</p>
                    <textarea
                        value={adminEditData}
                        onChange={e => setAdminEditData(e.target.value)}
                        className="w-full h-80 font-mono text-sm p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        spellCheck={false}
                    />
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={() => setAdminEditModal({ isOpen: false, doc: null })}
                            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleAdminSaveEdit}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!editItemModal} onClose={() => setEditItemModal(null)} title="Edit Option">
                {editItemModal && (
                    <div className="space-y-4">
                        <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label><input type="text" className="w-full border border-gray-300 rounded-md px-3 py-2" value={editItemModal.newName} onChange={e => setEditItemModal({...editItemModal, newName: e.target.value})} /></div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Badge Color</label>
                            <input type="color" className="h-10 w-full p-1 border border-gray-300 rounded-md cursor-pointer" value={editItemModal.newColor} onChange={e => setEditItemModal({...editItemModal, newColor: e.target.value})} />
                        </div>
                        <div className="flex justify-between pt-4 border-t border-gray-100">
                            <button onClick={() => attemptRemoveItem(editItemModal.key, editItemModal.value)} className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-md text-sm flex items-center gap-2"><Trash2 size={16} /> Delete</button>
                            <div className="flex gap-2"><button onClick={() => setEditItemModal(null)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md text-sm">Cancel</button><button onClick={handleItemRenameSave} className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-hover">Save</button></div>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal isOpen={reassignModal.isOpen} onClose={() => setReassignModal({...reassignModal, isOpen: false})} title="Item in Use">
                <div className="space-y-4">
                    <div className="flex items-start gap-3 bg-amber-50 p-4 rounded-lg border border-amber-100">
                        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div><h4 className="font-semibold text-amber-900">Warning</h4><p className="text-sm text-amber-800 mt-1">The option <strong>"{reassignModal.oldValue}"</strong> is used by <strong>{reassignModal.affectedCount}</strong> items.</p></div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Reassign items to:</label>
                        <select className="w-full border border-gray-300 rounded-md px-3 py-2" value={reassignModal.newValue} onChange={(e) => setReassignModal({...reassignModal, newValue: e.target.value})}>
                            <option value="">-- Select --</option>
                            {(settings[reassignModal.key] as string[]).filter(v => v !== reassignModal.oldValue).map(v => (<option key={v} value={v}>{v}</option>))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setReassignModal({...reassignModal, isOpen: false})} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm">Cancel</button>
                        <button onClick={handleReassignAndRemove} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-hover">Reassign & Delete <ArrowRight size={14} /></button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={currencyModal.isOpen} onClose={() => setCurrencyModal({ isOpen: false, currency: null, isEditing: false })} title={currencyModal.isEditing ? "Edit Currency" : "Add Currency"}>
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="source" 
                                checked={currencySource === 'manual'} 
                                onChange={() => setCurrencySource('manual')}
                                className="text-primary"
                            />
                            <span className="text-sm font-medium text-gray-700">Manual Entry</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                name="source" 
                                checked={currencySource === 'api'} 
                                onChange={() => setCurrencySource('api')}
                                className="text-primary"
                            />
                            <span className="text-sm font-medium text-gray-700">API Rate</span>
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Currency Code</label>
                            <input 
                                type="text" 
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none uppercase"
                                value={currencyModal.currency?.code || ''} 
                                onChange={e => setCurrencyModal({...currencyModal, currency: {...currencyModal.currency!, code: e.target.value.toUpperCase()}})} 
                                placeholder="USD"
                                maxLength={3}
                                disabled={currencyModal.isEditing}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Symbol</label>
                            <input 
                                type="text" 
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                value={currencyModal.currency?.symbol || ''} 
                                onChange={e => setCurrencyModal({...currencyModal, currency: {...currencyModal.currency!, symbol: e.target.value}})} 
                                placeholder="$"
                                maxLength={3}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Currency Name</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                            value={currencyModal.currency?.name || ''} 
                            onChange={e => setCurrencyModal({...currencyModal, currency: {...currencyModal.currency!, name: e.target.value}})} 
                            placeholder="US Dollar"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Exchange Rate (1 USD = X)</label>
                        <input 
                            type="number" 
                            step="0.0001"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                            value={currencyModal.currency?.rateToUSD || ''} 
                            onChange={e => setCurrencyModal({...currencyModal, currency: {...currencyModal.currency!, rateToUSD: parseFloat(e.target.value) || 0}})} 
                            placeholder="1.00"
                        />
                        <p className="text-xs text-gray-400 mt-1">Enter how many units of this currency equal 1 USD</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button 
                            onClick={() => setCurrencyModal({ isOpen: false, currency: null, isEditing: false })} 
                            className="px-4 py-2.5 text-gray-600 bg-gray-100 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSaveCurrency} 
                            className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors shadow-sm"
                        >
                            {currencyModal.isEditing ? 'Update Currency' : 'Add Currency'}
                        </button>
                    </div>
                </div>
            </Modal>

            {deletionModal.userToDelete && user && (
                <UserDeletionModal
                    isOpen={deletionModal.isOpen}
                    onClose={() => setDeletionModal({ isOpen: false, userToDelete: null })}
                    userToDelete={{
                        uid: deletionModal.userToDelete.id,
                        displayName: deletionModal.userToDelete.name,
                        email: deletionModal.userToDelete.email,
                        photoURL: null,
                        emailVerified: true,
                        isAnonymous: false,
                        isAdmin: deletionModal.userToDelete.role === 'Admin',
                        isSystemAdmin: deletionModal.userToDelete.isSystemAdmin
                    }}
                    currentUser={user}
                    availableUsers={dataStats.allUsers.map(u => ({
                        uid: u.uid,
                        displayName: u.displayName,
                        email: u.email || '',
                        photoURL: null,
                        emailVerified: true,
                        isAnonymous: false,
                        isAdmin: false,
                        isSystemAdmin: u.isSystemAdmin || false
                    }))}
                    onConfirmDeletion={handleConfirmUserDeletion}
                    onExportData={handleExportUserData}
                />
            )}
        </div>
    );
};

export default SettingsView;
