import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, CheckSquare, Square, Trash2, ShoppingCart, History, RotateCcw, X, Apple, Beef, Milk, Package, Edit3, Star, AlertCircle, DollarSign, Hash, StickyNote, Store, TrendingUp, ChevronDown, ChevronUp, MapPin, Search, Loader2, Users, List, FolderPlus, MoreVertical, Pencil } from 'lucide-react';
import { GroceryItem, GroceryList, Place, UrgencyType, normalizeUrgencyToDate } from '../../types';
import { useFirestore } from '../../services/firestore';
import { Card, Button, Badge, Input, Select, EmptyState } from '../../components/ui';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import UrgencySelector, { UrgencyBadge } from '../../components/UrgencySelector';
import { useAuth, MOCK_USERS } from '../../contexts/AuthContext';
import { useSharing, filterDataBySharing, SharingMode } from '../../contexts/SharingContext';
import SharingFilter, { OwnerBadge } from '../../components/SharingFilter';

const LIST_COLORS = [
    { value: 'blue', bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600' },
    { value: 'green', bg: 'bg-green-500', light: 'bg-green-50', text: 'text-green-600' },
    { value: 'purple', bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600' },
    { value: 'orange', bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600' },
    { value: 'pink', bg: 'bg-pink-500', light: 'bg-pink-50', text: 'text-pink-600' },
    { value: 'cyan', bg: 'bg-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-600' },
];

const CATEGORIES = [
    { value: 'Pantry', label: 'Pantry', icon: Package },
    { value: 'Dairy', label: 'Dairy', icon: Milk },
    { value: 'Produce', label: 'Produce', icon: Apple },
    { value: 'Meat', label: 'Meat', icon: Beef },
    { value: 'Frozen', label: 'Frozen', icon: Package },
    { value: 'Beverages', label: 'Beverages', icon: Package },
    { value: 'Snacks', label: 'Snacks', icon: Package },
    { value: 'Household', label: 'Household', icon: Package },
    { value: 'Personal Care', label: 'Personal Care', icon: Package }
];

const UNITS = [
    { value: 'pcs', label: 'pieces' },
    { value: 'kg', label: 'kg' },
    { value: 'lbs', label: 'lbs' },
    { value: 'oz', label: 'oz' },
    { value: 'g', label: 'grams' },
    { value: 'liters', label: 'liters' },
    { value: 'ml', label: 'ml' },
    { value: 'gal', label: 'gallons' },
    { value: 'pack', label: 'pack' },
    { value: 'box', label: 'box' },
    { value: 'bag', label: 'bag' },
    { value: 'bottle', label: 'bottle' },
    { value: 'can', label: 'can' },
    { value: 'dozen', label: 'dozen' }
];

const PRIORITIES = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-600' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'high', label: 'High', color: 'bg-red-100 text-red-700' }
];

type ViewMode = 'list' | 'history' | 'frequent';

interface StorePrediction {
    place_id: string;
    description: string;
    structured_formatting: {
        main_text: string;
        secondary_text: string;
    };
}

const GroceriesView: React.FC = () => {
    const { user } = useAuth();
    const { settings: sharingSettings, getModuleSharingMode, getOwnerName, isOwner } = useSharing();
    const { data: items, add: addItem, update: updateItem, remove: removeItem } = useFirestore<GroceryItem>('groceries');
    const { data: groceryLists, add: addList, update: updateList, remove: removeList } = useFirestore<GroceryList>('groceryLists');
    const { data: places } = useFirestore<Place>('places');
    const [newItemName, setNewItemName] = useState('');
    const [newItemCategory, setNewItemCategory] = useState('Pantry');
    const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
    const [newItemUnit, setNewItemUnit] = useState('pcs');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [editModal, setEditModal] = useState<{ isOpen: boolean; item: GroceryItem | null }>({ isOpen: false, item: null });
    const [sharingMode, setSharingMode] = useState<SharingMode>(() => getModuleSharingMode('groceries'));
    
    const [activeListId, setActiveListId] = useState<string>('default');
    const [listModal, setListModal] = useState<{ isOpen: boolean; list: Partial<GroceryList> | null; isEditing: boolean }>({ isOpen: false, list: null, isEditing: false });
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; itemId: string; itemName: string; type: 'item' | 'list' }>({ isOpen: false, itemId: '', itemName: '', type: 'item' });
    
    const userLists = useMemo(() => {
        const defaultList: GroceryList = {
            id: 'default',
            name: 'Main List',
            isDefault: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            owner: user?.uid || '',
            color: 'blue'
        };
        const lists = groceryLists.filter(l => l.owner === user?.uid || l.sharedWith?.includes(user?.uid || ''));
        return [defaultList, ...lists];
    }, [groceryLists, user]);

    const handleCreateList = async () => {
        if (!listModal.list?.name?.trim() || !user) return;
        
        const newList: GroceryList = {
            id: `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: listModal.list.name.trim(),
            description: listModal.list.description || '',
            color: listModal.list.color || 'blue',
            isDefault: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            owner: user.uid,
            isShared: false,
            sharedWith: []
        };
        
        await addList(newList);
        setListModal({ isOpen: false, list: null, isEditing: false });
        setActiveListId(newList.id);
    };

    const handleUpdateList = async () => {
        if (!listModal.list?.id || !listModal.list?.name?.trim()) return;
        
        await updateList(listModal.list.id, {
            name: listModal.list.name.trim(),
            description: listModal.list.description || '',
            color: listModal.list.color,
            updatedAt: new Date().toISOString()
        });
        setListModal({ isOpen: false, list: null, isEditing: false });
    };

    const handleDeleteList = async () => {
        if (deleteConfirm.type !== 'list' || !deleteConfirm.itemId) return;
        
        const itemsInList = items.filter(i => (i.listId || 'default') === deleteConfirm.itemId);
        for (const item of itemsInList) {
            await updateItem(item.id, { listId: 'default' });
        }
        
        await removeList(deleteConfirm.itemId);
        if (activeListId === deleteConfirm.itemId) {
            setActiveListId('default');
        }
        setDeleteConfirm({ isOpen: false, itemId: '', itemName: '', type: 'item' });
    };

    const handleConfirmDelete = async () => {
        if (deleteConfirm.type === 'list') {
            await handleDeleteList();
        } else {
            await removeItem(deleteConfirm.itemId);
            setDeleteConfirm({ isOpen: false, itemId: '', itemName: '', type: 'item' });
        }
    };

    const isAdmin = user?.isAdmin === true;

    const sharingStats = useMemo(() => {
        const userId = user?.uid || '';
        return {
            total: items.length,
            mine: items.filter(item => item.owner === userId).length,
            shared: items.filter(item => 
                item.owner !== userId && (item.isShared || item.sharedWith?.includes(userId))
            ).length,
            assigned: items.filter(item => 
                item.assignedTo === userId && item.owner !== userId
            ).length
        };
    }, [items, user]);

    const filteredBySharingItems = useMemo(() => {
        const sharingFiltered = filterDataBySharing<GroceryItem>(
            items, 
            user?.uid || '', 
            sharingMode, 
            isAdmin
        );
        const effectiveListId = activeListId || 'default';
        return sharingFiltered.filter(item => {
            const itemListId = item.listId || 'default';
            return itemListId === effectiveListId;
        });
    }, [items, user, sharingMode, isAdmin, activeListId]);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
    
    const [storeSearch, setStoreSearch] = useState('');
    const [storePredictions, setStorePredictions] = useState<StorePrediction[]>([]);
    const [isSearchingStore, setIsSearchingStore] = useState(false);
    const [showStorePredictions, setShowStorePredictions] = useState(false);
    const storeSearchRef = useRef<HTMLInputElement>(null);
    const storePredictionsRef = useRef<HTMLDivElement>(null);
    const storeDebounceTimer = useRef<NodeJS.Timeout | null>(null);

    const supermarketPlaces = useMemo(() => 
        places.filter(p => p.isSupermarket || p.type === 'Shop' || p.type === 'Store'),
    [places]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (storePredictionsRef.current && !storePredictionsRef.current.contains(event.target as Node) &&
                storeSearchRef.current && !storeSearchRef.current.contains(event.target as Node)) {
                setShowStorePredictions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const searchStores = async (query: string) => {
        if (!query.trim() || query.length < 2) {
            setStorePredictions([]);
            return;
        }

        setIsSearchingStore(true);
        try {
            const response = await fetch(
                `/api/places/autocomplete/json?input=${encodeURIComponent(query)}&types=establishment`
            );
            const data = await response.json();
            
            if (data.status === 'OK' && data.predictions) {
                setStorePredictions(data.predictions);
                setShowStorePredictions(true);
            }
        } catch (error) {
            console.error('Store search error:', error);
        } finally {
            setIsSearchingStore(false);
        }
    };

    const handleStoreSearchChange = (value: string) => {
        setStoreSearch(value);
        if (editModal.item) {
            setEditModal({ ...editModal, item: { ...editModal.item, store: value } });
        }
        
        if (storeDebounceTimer.current) {
            clearTimeout(storeDebounceTimer.current);
        }
        storeDebounceTimer.current = setTimeout(() => {
            searchStores(value);
        }, 300);
    };

    const selectStorePrediction = async (prediction: StorePrediction) => {
        const storeName = prediction.structured_formatting.main_text;
        const storeCity = prediction.structured_formatting.secondary_text?.split(',')[0] || '';
        
        if (editModal.item) {
            setEditModal({ 
                ...editModal, 
                item: { 
                    ...editModal.item, 
                    store: storeName,
                    storePlaceId: prediction.place_id,
                    storeCity: storeCity
                } 
            });
        }
        
        setStoreSearch(storeName);
        setShowStorePredictions(false);
        setStorePredictions([]);
    };

    const activeItems = filteredBySharingItems.filter(i => !i.isHistory);
    const historyItems = items.filter(i => i.isHistory);
    const frequentItems = useMemo(() => {
        return items
            .filter(i => (i.purchaseCount || 0) >= 2)
            .sort((a, b) => (b.purchaseCount || 0) - (a.purchaseCount || 0))
            .slice(0, 20);
    }, [items]);

    const toggleComplete = async (item: GroceryItem) => {
        const now = new Date().toISOString();
        await updateItem(item.id, { 
            completed: true, 
            isHistory: true,
            purchaseCount: (item.purchaseCount || 0) + 1,
            lastPurchased: now
        });
    };

    const restoreItem = async (item: GroceryItem) => {
        await updateItem(item.id, { completed: false, isHistory: false });
    };

    const quickAddFromFrequent = async (item: GroceryItem) => {
        const existingActive = activeItems.find(i => i.name.toLowerCase() === item.name.toLowerCase());
        if (existingActive) {
            await updateItem(existingActive.id, { quantity: (existingActive.quantity || 1) + 1 });
        } else {
            await addItem({
                name: item.name,
                category: item.category,
                completed: false,
                isHistory: false,
                quantity: 1,
                unit: item.unit || 'pcs',
                priority: 'medium',
                store: item.store,
                unitPrice: item.unitPrice,
                listId: activeListId || 'default',
                owner: user?.uid
            } as any);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim()) return;
        await addItem({ 
            name: newItemName, 
            category: newItemCategory, 
            completed: false, 
            isHistory: false,
            quantity: newItemQuantity,
            unit: newItemUnit,
            priority: 'medium',
            listId: activeListId || 'default',
            owner: user?.uid
        } as any);
        setNewItemName('');
        setNewItemQuantity(1);
    };

    const handleEditSave = async () => {
        if (!editModal.item) return;
        const { id, ...data } = editModal.item;
        await updateItem(id, data);
        setEditModal({ isOpen: false, item: null });
    };

    const clearHistory = async () => {
        if (confirm("Clear all history? This removes items permanently.")) {
            historyItems.forEach(i => removeItem(i.id));
        }
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const groupedItems = useMemo(() => {
        const sorted = [...activeItems].sort((a, b) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return (priorityOrder[a.priority || 'medium'] || 1) - (priorityOrder[b.priority || 'medium'] || 1);
        });
        return sorted.reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
        }, {} as Record<string, GroceryItem[]>);
    }, [activeItems]);

    const totalEstimate = useMemo(() => {
        return activeItems.reduce((sum, item) => {
            return sum + ((item.unitPrice || 0) * (item.quantity || 1));
        }, 0);
    }, [activeItems]);

    const getPriorityColor = (priority?: string) => {
        const p = PRIORITIES.find(pr => pr.value === priority);
        return p?.color || 'bg-gray-100 text-gray-600';
    };

    return (
        <div className="space-y-6 animate-enter">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                        <ShoppingCart size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Groceries</h2>
                        <p className="text-white/80 text-sm">
                            {activeItems.length} items 
                            {totalEstimate > 0 && <span className="ml-2">· Est. ${totalEstimate.toFixed(2)}</span>}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setViewMode('list')} 
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            viewMode === 'list' 
                                ? 'bg-white text-green-600' 
                                : 'bg-white/20 hover:bg-white/30 text-white'
                        }`}
                    >
                        <ShoppingCart size={14} /> List
                    </button>
                    <button 
                        onClick={() => setViewMode('frequent')} 
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            viewMode === 'frequent' 
                                ? 'bg-white text-green-600' 
                                : 'bg-white/20 hover:bg-white/30 text-white'
                        }`}
                    >
                        <TrendingUp size={14} /> Frequent
                    </button>
                    <button 
                        onClick={() => setViewMode('history')} 
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            viewMode === 'history' 
                                ? 'bg-white text-green-600' 
                                : 'bg-white/20 hover:bg-white/30 text-white'
                        }`}
                    >
                        <History size={14} /> History
                    </button>
                </div>
            </div>

            <SharingFilter
                mode={sharingMode}
                onChange={setSharingMode}
                stats={sharingStats}
                isAdmin={isAdmin}
            />

            {viewMode === 'list' && (
                <div className="bg-white rounded-xl border border-gray-200 p-3">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {userLists.map(list => {
                            const listColor = LIST_COLORS.find(c => c.value === list.color) || LIST_COLORS[0];
                            const isActive = (activeListId || 'default') === list.id;
                            const itemCount = items.filter(i => (i.listId || 'default') === list.id && !i.completed && !i.isHistory).length;
                            
                            return (
                                <div key={list.id} className="relative group">
                                    <button
                                        onClick={() => setActiveListId(list.id)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                                            isActive 
                                                ? `${listColor.bg} text-white shadow-md` 
                                                : `${listColor.light} ${listColor.text} hover:opacity-80`
                                        }`}
                                    >
                                        <List size={14} />
                                        {list.name}
                                        {itemCount > 0 && (
                                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                                                isActive ? 'bg-white/20' : 'bg-gray-200'
                                            }`}>
                                                {itemCount}
                                            </span>
                                        )}
                                    </button>
                                    {!list.isDefault && isActive && (
                                        <div className="absolute -top-1 -right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setListModal({ isOpen: true, list, isEditing: true });
                                                }}
                                                className="w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-100"
                                            >
                                                <Pencil size={10} className="text-gray-600" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeleteConfirm({ isOpen: true, itemId: list.id, itemName: list.name, type: 'list' });
                                                }}
                                                className="w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-red-100"
                                            >
                                                <Trash2 size={10} className="text-red-500" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <button
                            onClick={() => setListModal({ isOpen: true, list: { name: '', color: 'green' }, isEditing: false })}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all whitespace-nowrap"
                        >
                            <FolderPlus size={14} />
                            New List
                        </button>
                    </div>
                </div>
            )}

            {viewMode === 'list' && (
                <Card padding="sm">
                    <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-2">
                        <Input
                            placeholder="Add item (e.g., Milk)..."
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                            className="flex-1"
                        />
                        <div className="flex gap-2">
                            <input
                                type="number"
                                min="1"
                                value={newItemQuantity}
                                onChange={e => setNewItemQuantity(parseInt(e.target.value) || 1)}
                                className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-sm text-center focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                            />
                            <Select
                                options={UNITS}
                                value={newItemUnit}
                                onChange={setNewItemUnit}
                                fullWidth={false}
                                className="w-24"
                            />
                            <Select
                                options={CATEGORIES}
                                value={newItemCategory}
                                onChange={setNewItemCategory}
                                fullWidth={false}
                                className="w-32"
                            />
                            <Button type="submit" variant="primary" icon={Plus}>
                                Add
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {viewMode === 'frequent' && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <TrendingUp size={16} /> Frequently Purchased
                        </h3>
                        <span className="text-xs text-gray-500">Click to add to list</span>
                    </div>
                    
                    {frequentItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p>No frequent items yet</p>
                            <p className="text-xs mt-1">Items you buy often will appear here</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {frequentItems.map(item => (
                                <button 
                                    key={item.id} 
                                    onClick={() => quickAddFromFrequent(item)} 
                                    className="flex flex-col items-start p-3 border border-gray-100 rounded-xl hover:bg-primary-muted hover:border-primary/20 text-left transition-all group"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Star size={12} className="text-yellow-500" />
                                        <span className="text-xs text-gray-400">{item.purchaseCount}x bought</span>
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 group-hover:text-primary">{item.name}</span>
                                    <span className="text-xs text-gray-400">{item.category}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </Card>
            )}

            {viewMode === 'history' && (
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <History size={16} /> Recently Purchased
                        </h3>
                        {historyItems.length > 0 && (
                            <button onClick={clearHistory} className="text-xs text-red-500 hover:underline">
                                Clear All
                            </button>
                        )}
                    </div>
                    
                    {historyItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
                            <p>No history yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {historyItems.map(item => (
                                <button 
                                    key={item.id} 
                                    onClick={() => restoreItem(item)} 
                                    className="flex items-center gap-2 p-3 border border-gray-100 rounded-xl hover:bg-primary-muted hover:border-primary/20 text-left transition-all group"
                                >
                                    <div className="bg-gray-100 p-1.5 rounded-lg text-gray-400 group-hover:text-primary group-hover:bg-white transition-colors">
                                        <RotateCcw size={14} />
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-gray-700 group-hover:text-primary block">{item.name}</span>
                                        {item.lastPurchased && (
                                            <span className="text-xs text-gray-400">
                                                {new Date(item.lastPurchased).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </Card>
            )}

            {viewMode === 'list' && (
                <div className="space-y-4">
                    {Object.entries(groupedItems).length === 0 ? (
                        <Card>
                            <EmptyState
                                icon={ShoppingCart}
                                title="Your list is empty"
                                description="Add items to start your grocery list"
                            />
                        </Card>
                    ) : (
                        Object.entries(groupedItems).map(([category, categoryItems]) => (
                            <Card key={category} padding="none" className="overflow-hidden">
                                <button 
                                    onClick={() => toggleCategory(category)}
                                    className="w-full bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{category}</span>
                                        <Badge variant="default" size="xs">{(categoryItems as GroceryItem[]).length}</Badge>
                                    </div>
                                    {expandedCategories[category] === false ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronUp size={16} className="text-gray-400" />}
                                </button>
                                {expandedCategories[category] !== false && (
                                    <div className="divide-y divide-gray-50">
                                        {(categoryItems as GroceryItem[]).map((item: GroceryItem) => (
                                            <div 
                                                key={item.id} 
                                                className="px-4 py-3 flex justify-between items-center hover:bg-gray-50 transition-colors group"
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    {item.priority === 'high' && (
                                                        <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-medium text-gray-800">{item.name}</span>
                                                            {item.quantity && item.quantity > 1 && (
                                                                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                                    {item.quantity} {item.unit || 'pcs'}
                                                                </span>
                                                            )}
                                                            {item.unitPrice && (
                                                                <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                                                    ${(item.unitPrice * (item.quantity || 1)).toFixed(2)}
                                                                </span>
                                                            )}
                                                            <UrgencyBadge urgency={item.urgency} dueDate={item.dueDate} />
                                                        </div>
                                                        {item.notes && (
                                                            <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>
                                                        )}
                                                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                                            {item.store && (
                                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                                    <Store size={10} /> {item.store}
                                                                </span>
                                                            )}
                                                            {item.assignedTo && (
                                                                <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                    <Users size={10} />
                                                                    {MOCK_USERS.find(u => u.uid === item.assignedTo)?.displayName || 'Unknown'}
                                                                </span>
                                                            )}
                                                            {sharingSettings.showOwnerLabels && item.owner && !isOwner(item.owner) && (
                                                                <OwnerBadge 
                                                                    ownerName={getOwnerName(item.owner)} 
                                                                    isOwner={false} 
                                                                    size="xs"
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1 items-center">
                                                    <button 
                                                        onClick={() => setEditModal({ isOpen: true, item })}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => toggleComplete(item)} 
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-green-500 hover:bg-green-50 transition-all"
                                                    >
                                                        <Square size={20} />
                                                    </button>
                                                    <button 
                                                        onClick={() => removeItem(item.id)} 
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-200 hover:text-red-400 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        ))
                    )}
                </div>
            )}

            <Modal isOpen={editModal.isOpen} onClose={() => setEditModal({ isOpen: false, item: null })} title="Edit Item" size="full">
                {editModal.item && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                            <input 
                                type="text" 
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                value={editModal.item.name}
                                onChange={e => setEditModal({ ...editModal, item: { ...editModal.item!, name: e.target.value }})}
                            />
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                    value={editModal.item.quantity || 1}
                                    onChange={e => setEditModal({ ...editModal, item: { ...editModal.item!, quantity: parseInt(e.target.value) || 1 }})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                                <select
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                    value={editModal.item.unit || 'pcs'}
                                    onChange={e => setEditModal({ ...editModal, item: { ...editModal.item!, unit: e.target.value }})}
                                >
                                    {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    step="0.01"
                                    placeholder="$0.00"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                    value={editModal.item.unitPrice || ''}
                                    onChange={e => setEditModal({ ...editModal, item: { ...editModal.item!, unitPrice: parseFloat(e.target.value) || 0 }})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                    value={editModal.item.category}
                                    onChange={e => setEditModal({ ...editModal, item: { ...editModal.item!, category: e.target.value }})}
                                >
                                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                <select
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                    value={editModal.item.priority || 'medium'}
                                    onChange={e => setEditModal({ ...editModal, item: { ...editModal.item!, priority: e.target.value as 'low' | 'medium' | 'high' }})}
                                >
                                    {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                <Store size={14} className="text-gray-400" />
                                Store
                            </label>
                            <div className="relative">
                                <input 
                                    ref={storeSearchRef}
                                    type="text" 
                                    placeholder="Search for a store or select from saved places..."
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                    value={editModal.item.store || ''}
                                    onChange={e => handleStoreSearchChange(e.target.value)}
                                    onFocus={() => {
                                        if (storePredictions.length > 0) setShowStorePredictions(true);
                                    }}
                                />
                                {isSearchingStore && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                                    </div>
                                )}
                                
                                {showStorePredictions && (storePredictions.length > 0 || supermarketPlaces.length > 0) && (
                                    <div 
                                        ref={storePredictionsRef}
                                        className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
                                    >
                                        {supermarketPlaces.length > 0 && (
                                            <>
                                                <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b">
                                                    Saved Places
                                                </div>
                                                {supermarketPlaces.slice(0, 5).map(place => (
                                                    <button
                                                        key={place.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setEditModal({ 
                                                                ...editModal, 
                                                                item: { 
                                                                    ...editModal.item!, 
                                                                    store: place.name,
                                                                    storeCity: place.city || ''
                                                                } 
                                                            });
                                                            setShowStorePredictions(false);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left border-b border-gray-50"
                                                    >
                                                        <MapPin className="w-4 h-4 text-green-500" />
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{place.name}</p>
                                                            <p className="text-xs text-gray-500">{place.city}{place.state ? `, ${place.state}` : ''}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </>
                                        )}
                                        
                                        {storePredictions.length > 0 && (
                                            <>
                                                <div className="px-3 py-1.5 bg-blue-50 text-xs font-semibold text-blue-600 uppercase border-b">
                                                    Google Search Results
                                                </div>
                                                {storePredictions.map(prediction => (
                                                    <button
                                                        key={prediction.place_id}
                                                        type="button"
                                                        onClick={() => selectStorePrediction(prediction)}
                                                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left border-b border-gray-50"
                                                    >
                                                        <Search className="w-4 h-4 text-blue-500" />
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {prediction.structured_formatting.main_text}
                                                            </p>
                                                            <p className="text-xs text-gray-500 truncate">
                                                                {prediction.structured_formatting.secondary_text}
                                                            </p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            {editModal.item.storeCity && (
                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                    <MapPin size={10} /> {editModal.item.storeCity}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea 
                                placeholder="Any notes (brand preferences, etc.)"
                                rows={2}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none"
                                value={editModal.item.notes || ''}
                                onChange={e => setEditModal({ ...editModal, item: { ...editModal.item!, notes: e.target.value }})}
                            />
                        </div>

                        <div className="border-t border-gray-100 pt-4">
                            <UrgencySelector
                                urgency={editModal.item.urgency || 'none'}
                                dueDate={editModal.item.dueDate}
                                onChange={(urgency, dueDate) => setEditModal({ 
                                    ...editModal, 
                                    item: { ...editModal.item!, urgency, dueDate: dueDate || undefined } 
                                })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                <Users size={14} className="text-gray-400" />
                                Assigned To
                            </label>
                            <select
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                value={editModal.item.assignedTo || ''}
                                onChange={e => setEditModal({ ...editModal, item: { ...editModal.item!, assignedTo: e.target.value || undefined }})}
                            >
                                <option value="">Unassigned</option>
                                {MOCK_USERS.map(u => (
                                    <option key={u.uid} value={u.uid}>{u.displayName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button onClick={() => setEditModal({ isOpen: false, item: null })} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleEditSave} className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-hover transition-colors">
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={listModal.isOpen}
                onClose={() => setListModal({ isOpen: false, list: null, isEditing: false })}
                title={listModal.isEditing ? 'Edit List' : 'Create New List'}
                size="md"
            >
                <div className="space-y-4">
                    <Input
                        label="List Name"
                        placeholder="e.g., Weekly Shopping, Costco Run..."
                        value={listModal.list?.name || ''}
                        onChange={e => setListModal({ ...listModal, list: { ...listModal.list, name: e.target.value } })}
                    />
                    <Input
                        label="Description (optional)"
                        placeholder="Add a description..."
                        value={listModal.list?.description || ''}
                        onChange={e => setListModal({ ...listModal, list: { ...listModal.list, description: e.target.value } })}
                    />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                        <div className="flex gap-2">
                            {LIST_COLORS.map(color => (
                                <button
                                    key={color.value}
                                    onClick={() => setListModal({ ...listModal, list: { ...listModal.list, color: color.value } })}
                                    className={`w-8 h-8 rounded-full ${color.bg} transition-transform ${
                                        listModal.list?.color === color.value ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button 
                            onClick={() => setListModal({ isOpen: false, list: null, isEditing: false })} 
                            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={listModal.isEditing ? handleUpdateList : handleCreateList} 
                            className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 transition-colors"
                        >
                            {listModal.isEditing ? 'Save Changes' : 'Create List'}
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, itemId: '', itemName: '', type: 'item' })}
                onConfirm={handleConfirmDelete}
                title={deleteConfirm.type === 'list' ? 'Delete List' : 'Delete Item'}
                message={deleteConfirm.type === 'list' 
                    ? `Are you sure you want to delete the list "${deleteConfirm.itemName}"? Items in this list will be moved to the Main List.`
                    : `Are you sure you want to delete "${deleteConfirm.itemName}"? This action cannot be undone.`
                }
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
};

export default GroceriesView;
