import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
    Plus, Tag, Search, ShoppingBag, Sparkles, Loader2, Trash2, Edit2, 
    Filter, LayoutGrid, List, Star, DollarSign, Zap, MapPin, Store, Users, Clock
} from 'lucide-react';
import { Purchase, UrgencyLevel, Place, UrgencyType, normalizeUrgencyToDate } from '../../types';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useFirestore } from '../../services/firestore';
import { Card, Button, Badge, Input, Select, Tabs, EmptyState, StatCard } from '../../components/ui';
import { ConfiguredModuleHeader } from '../../components/ModuleHeader';
import HighlightText from '../../components/HighlightText';
import { researchItem } from '../../services/gemini';
import UrgencySelector, { UrgencyBadge } from '../../components/UrgencySelector';
import { useAuth, MOCK_USERS } from '../../contexts/AuthContext';
import { useSharing, filterDataBySharing, SharingMode } from '../../contexts/SharingContext';
import SharingFilter, { OwnerBadge } from '../../components/SharingFilter';

interface GooglePrediction {
    place_id: string;
    description: string;
    structured_formatting?: {
        main_text: string;
        secondary_text: string;
    };
}

const CATEGORIES = ['General', 'Electronics', 'Home', 'Fashion', 'Health', 'Sports', 'Other'];
const STATUSES = ['Wishlist', 'Researching', 'Ready to Buy', 'Ordered', 'Delivered'];

const PurchasesView: React.FC = () => {
    const { user } = useAuth();
    const { settings: sharingSettings, getModuleSharingMode, getOwnerName, isOwner } = useSharing();
    const { data: purchases, add: addPurchase, update: updatePurchase, remove: removePurchase } = useFirestore<Purchase>('purchases');
    const { data: savedPlaces } = useFirestore<Place>('places');
    
    const [sharingMode, setSharingMode] = useState<SharingMode>(() => getModuleSharingMode('purchases'));
    const isAdmin = user?.isAdmin === true;

    const sharingStats = useMemo(() => {
        const userId = user?.uid || '';
        return {
            total: purchases.length,
            mine: purchases.filter(p => p.owner === userId).length,
            shared: purchases.filter(p => 
                p.owner !== userId && (p.isShared || p.sharedWith?.includes(userId))
            ).length,
            assigned: purchases.filter(p => 
                p.assignedTo === userId && p.owner !== userId
            ).length
        };
    }, [purchases, user]);

    const filteredBySharingPurchases = useMemo(() => {
        return filterDataBySharing<Purchase>(
            purchases, 
            user?.uid || '', 
            sharingMode, 
            isAdmin
        );
    }, [purchases, user, sharingMode, isAdmin]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Purchase | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterUrgency, setFilterUrgency] = useState<'All' | UrgencyLevel>('All');
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [researchingId, setResearchingId] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; itemId: string; itemName: string }>({ isOpen: false, itemId: '', itemName: '' });

    const handleConfirmDelete = async () => {
        if (deleteConfirm.itemId) {
            await removePurchase(deleteConfirm.itemId);
            setDeleteConfirm({ isOpen: false, itemId: '', itemName: '' });
        }
    };
    
    const [storeSearch, setStoreSearch] = useState('');
    const [storePredictions, setStorePredictions] = useState<GooglePrediction[]>([]);
    const [showStorePredictions, setShowStorePredictions] = useState(false);
    const [isSearchingStore, setIsSearchingStore] = useState(false);
    const storeDropdownRef = useRef<HTMLDivElement>(null);
    const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
    
    const [formData, setFormData] = useState<Partial<Purchase>>({
        itemName: '',
        store: '',
        category: 'General',
        priorityLevel: 'Would Like',
        urgency: 'none',
        price: 0,
        status: 'Wishlist'
    });
    
    const filteredSavedPlaces = useMemo(() => {
        if (!storeSearch.trim()) return savedPlaces.slice(0, 5);
        return savedPlaces.filter(p => 
            p.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
            p.address?.toLowerCase().includes(storeSearch.toLowerCase())
        ).slice(0, 5);
    }, [savedPlaces, storeSearch]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (storeDropdownRef.current && !storeDropdownRef.current.contains(event.target as Node)) {
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
        setFormData({ ...formData, store: value });
        
        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
        }
        
        if (value.length >= 2) {
            searchTimerRef.current = setTimeout(() => searchStores(value), 300);
        } else {
            setStorePredictions([]);
        }
    };

    const selectStore = (storeName: string) => {
        setFormData({ ...formData, store: storeName });
        setStoreSearch(storeName);
        setShowStorePredictions(false);
        setStorePredictions([]);
    };

    const handleResearch = async (item: Purchase, e: React.MouseEvent) => {
        e.stopPropagation();
        setResearchingId(item.id);
        try {
            const data = await researchItem(item.itemName);
            const noteUpdate = `AI Research: Avg Price $${data.averagePrice}. ${data.summary} Top Brand: ${data.topBrand}.`;
            await updatePurchase(item.id, {
                price: data.averagePrice || item.price,
                notes: item.notes ? `${item.notes}\n\n${noteUpdate}` : noteUpdate
            });
        } catch (error) {
            console.error('Research failed:', error);
        }
        setResearchingId(null);
    };

    const handleOpenAdd = () => {
        setEditingItem(null);
        setFormData({
            itemName: '',
            store: '',
            category: 'General',
            urgency: 'Would Like',
            price: 0,
            status: 'Wishlist'
        });
        setStoreSearch('');
        setStorePredictions([]);
        setShowStorePredictions(false);
        setIsModalOpen(true);
    };

    const handleEdit = (item: Purchase) => {
        setEditingItem(item);
        setFormData(item);
        setStoreSearch(item.store || '');
        setStorePredictions([]);
        setShowStorePredictions(false);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.itemName) return;

        if (editingItem) {
            await updatePurchase(editingItem.id, formData);
        } else {
            await addPurchase({
                ...formData,
                date: new Date().toISOString().split('T')[0],
                quantity: 1,
                total: formData.price || 0
            } as any);
        }
        
        setIsModalOpen(false);
        setEditingItem(null);
    };

    const filteredPurchases = useMemo(() => {
        return filteredBySharingPurchases.filter(p => {
            const matchesSearch = 
                (p.itemName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.store || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesUrgency = filterUrgency === 'All' || p.urgency === filterUrgency;
            return matchesSearch && matchesUrgency;
        });
    }, [purchases, searchQuery, filterUrgency]);

    const stats = useMemo(() => {
        const total = purchases.reduce((sum, p) => sum + (p.price || 0), 0);
        const mustHaves = purchases.filter(p => p.urgency === 'Must Have').length;
        return { total, mustHaves, count: purchases.length };
    }, [purchases]);

    const getUrgencyColor = (urgency?: UrgencyLevel) => {
        switch (urgency) {
            case 'Must Have': return 'danger';
            case 'Would Like': return 'info';
            case 'Just Curious': return 'default';
            default: return 'default';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Delivered': return 'success';
            case 'Ordered': return 'info';
            case 'Ready to Buy': return 'warning';
            default: return 'default';
        }
    };

    return (
        <div className="space-y-6 animate-enter">
            <ConfiguredModuleHeader 
                moduleKey="purchases" 
                actions={
                    <Button 
                        onClick={handleOpenAdd} 
                        variant="primary"
                        icon={Plus}
                        size="sm"
                    >
                        Add Item
                    </Button>
                } 
            />

            <SharingFilter
                mode={sharingMode}
                onChange={setSharingMode}
                stats={sharingStats}
                isAdmin={isAdmin}
            />

            <div className="grid grid-cols-3 gap-4">
                <StatCard
                    title="Total Value"
                    value={`$${stats.total.toLocaleString()}`}
                    subtitle={`${stats.count} items`}
                    icon={DollarSign}
                    color="purple"
                />
                <Card className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-3">
                        <Star className="text-red-600" size={24} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.mustHaves}</p>
                    <p className="text-sm text-gray-500">Must Haves</p>
                </Card>
                <Card className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                        <Sparkles className="text-blue-600" size={24} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{purchases.filter(p => p.notes?.includes('AI Research')).length}</p>
                    <p className="text-sm text-gray-500">Researched</p>
                </Card>
            </div>

            <Card padding="sm">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                        <Input
                            icon={Search}
                            placeholder="Search items..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Tabs
                            tabs={[
                                { id: 'All', label: 'All' },
                                { id: 'Must Have', label: 'Must Have' },
                                { id: 'Would Like', label: 'Would Like' },
                                { id: 'Just Curious', label: 'Curious' }
                            ]}
                            activeTab={filterUrgency}
                            onChange={(id) => setFilterUrgency(id as any)}
                            size="sm"
                        />
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setViewMode('card')} 
                                className={`p-1.5 rounded transition-all ${viewMode === 'card' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                            >
                                <LayoutGrid size={16} />
                            </button>
                            <button 
                                onClick={() => setViewMode('list')} 
                                className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                            >
                                <List size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </Card>

            {filteredPurchases.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={ShoppingBag}
                        title="No items found"
                        description={searchQuery ? "Try a different search" : "Start tracking items you want to buy"}
                        actionLabel={searchQuery ? undefined : "Add Item"}
                        onAction={searchQuery ? undefined : handleOpenAdd}
                    />
                </Card>
            ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPurchases.map(item => (
                        <Card key={item.id} hover className="group cursor-pointer" onClick={() => handleEdit(item)}>
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Badge variant={getUrgencyColor(item.priorityLevel)} size="sm">
                                        {item.priorityLevel || 'Would Like'}
                                    </Badge>
                                    <UrgencyBadge urgency={item.urgency as UrgencyType} dueDate={item.dueDate} />
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleResearch(item, e)}
                                        disabled={researchingId === item.id}
                                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-muted rounded-lg disabled:opacity-50"
                                        title="AI Research"
                                    >
                                        {researchingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ isOpen: true, itemId: item.id, itemName: item.name }); }}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                            
                            <h3 className="font-semibold text-gray-900 mb-1">
                                <HighlightText text={item.itemName || ''} highlight={searchQuery} />
                            </h3>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                                <Tag size={12} />
                                {item.category}
                                {item.store && (
                                    <>
                                        <span className="text-gray-300">•</span>
                                        <HighlightText text={item.store} highlight={searchQuery} />
                                    </>
                                )}
                            </div>

                            {item.assignedTo && (
                                <div className="flex items-center gap-1 text-xs text-purple-600 mb-2">
                                    <Users size={12} />
                                    <span>{MOCK_USERS.find(u => u.uid === item.assignedTo)?.displayName || 'Unknown'}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <span className="text-lg font-bold text-gray-900">
                                    ${(item.price || 0).toLocaleString()}
                                </span>
                                <Badge variant={getStatusColor(item.status)} size="xs">
                                    {item.status}
                                </Badge>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card padding="none">
                    <div className="divide-y divide-gray-100">
                        {filteredPurchases.map(item => (
                            <div 
                                key={item.id}
                                className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                                onClick={() => handleEdit(item)}
                            >
                                <Badge variant={getUrgencyColor(item.priorityLevel)} size="xs">
                                    {item.priorityLevel?.charAt(0)}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-medium text-gray-900 truncate">
                                            <HighlightText text={item.itemName || ''} highlight={searchQuery} />
                                        </h4>
                                        <UrgencyBadge urgency={item.urgency as UrgencyType} dueDate={item.dueDate} />
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>{item.category} • {item.store || 'No store'}</span>
                                        {item.assignedTo && (
                                            <span className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <Users size={10} />
                                                {MOCK_USERS.find(u => u.uid === item.assignedTo)?.displayName || 'Unknown'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <span className="font-bold text-gray-900">${(item.price || 0).toLocaleString()}</span>
                                <Badge variant={getStatusColor(item.status)} size="xs">{item.status}</Badge>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleResearch(item, e)}
                                        disabled={researchingId === item.id}
                                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary-muted rounded-lg"
                                    >
                                        {researchingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ isOpen: true, itemId: item.id, itemName: item.name }); }}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingItem(null);
                }} 
                title={editingItem ? 'Edit Item' : 'Add to Shopping List'}
                size="full"
            >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[45vh]">
                    {/* Left Column - Item Info */}
                    <div className="lg:col-span-5 space-y-5">
                        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-5 border border-pink-100">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <ShoppingBag size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Item Details</h3>
                                    <p className="text-xs text-gray-500">What do you want to buy?</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    label="Item Name"
                                    placeholder="e.g., MacBook Pro, Running Shoes..."
                                    value={formData.itemName || ''}
                                    onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                                />
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative" ref={storeDropdownRef}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Store</label>
                                        <div className="relative">
                                            <Store size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-muted focus:border-primary text-sm transition-all"
                                                placeholder="Search stores..."
                                                value={storeSearch || formData.store || ''}
                                                onChange={(e) => handleStoreSearchChange(e.target.value)}
                                                onFocus={() => setShowStorePredictions(true)}
                                            />
                                            {isSearchingStore && (
                                                <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                                            )}
                                        </div>
                                        
                                        {showStorePredictions && (filteredSavedPlaces.length > 0 || storePredictions.length > 0) && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {filteredSavedPlaces.length > 0 && (
                                                    <>
                                                        <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 flex items-center gap-2">
                                                            <Star size={12} /> Saved Places
                                                        </div>
                                                        {filteredSavedPlaces.map(place => (
                                                            <button
                                                                key={place.id}
                                                                type="button"
                                                                onClick={() => selectStore(place.name)}
                                                                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                                                            >
                                                                <MapPin size={14} className="text-primary flex-shrink-0" />
                                                                <div className="min-w-0">
                                                                    <div className="font-medium text-gray-900 truncate">{place.name}</div>
                                                                    <div className="text-xs text-gray-500 truncate">{place.address}</div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </>
                                                )}
                                                
                                                {storePredictions.length > 0 && (
                                                    <>
                                                        <div className="px-3 py-2 bg-blue-50 text-xs font-semibold text-blue-600 flex items-center gap-2">
                                                            <Search size={12} /> Google Places
                                                        </div>
                                                        {storePredictions.map(prediction => (
                                                            <button
                                                                key={prediction.place_id}
                                                                type="button"
                                                                onClick={() => selectStore(prediction.structured_formatting?.main_text || prediction.description)}
                                                                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                                                            >
                                                                <Store size={14} className="text-blue-500 flex-shrink-0" />
                                                                <div className="min-w-0">
                                                                    <div className="font-medium text-gray-900 truncate">
                                                                        {prediction.structured_formatting?.main_text || prediction.description}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 truncate">
                                                                        {prediction.structured_formatting?.secondary_text}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <Input
                                        label="Estimated Price"
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.price || ''}
                                        onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                                    />
                                </div>
                            </div>
                        </div>

                        {formData.price && formData.price > 0 && (
                            <div className="bg-green-50 rounded-xl p-4 border border-green-100 flex items-center justify-between">
                                <span className="text-sm text-green-700">Estimated Cost</span>
                                <span className="text-xl font-bold text-green-800">${formData.price.toLocaleString()}</span>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <Button variant="secondary" fullWidth onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button 
                                variant="primary" 
                                fullWidth 
                                onClick={handleSave}
                                disabled={!formData.itemName}
                            >
                                {editingItem ? 'Save Changes' : 'Add Item'}
                            </Button>
                        </div>
                    </div>

                    {/* Right Column - Classification */}
                    <div className="lg:col-span-7 space-y-5">
                        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <Tag size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Classification</h3>
                                    <p className="text-xs text-gray-500">Organize your purchase</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Category"
                                    options={CATEGORIES.map(c => ({ value: c, label: c }))}
                                    value={formData.category || 'General'}
                                    onChange={(v) => setFormData({...formData, category: v})}
                                />
                                <Select
                                    label="Status"
                                    options={STATUSES.map(s => ({ value: s, label: s }))}
                                    value={formData.status || 'Wishlist'}
                                    onChange={(v) => setFormData({...formData, status: v as any})}
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <Zap size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Priority Level</h3>
                                    <p className="text-xs text-gray-500">How badly do you need this?</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                {([
                                    { level: 'Must Have', emoji: '🔥', color: 'border-red-500 bg-red-50 text-red-600' },
                                    { level: 'Would Like', emoji: '💭', color: 'border-blue-500 bg-blue-50 text-blue-600' },
                                    { level: 'Just Curious', emoji: '🤔', color: 'border-gray-500 bg-gray-50 text-gray-600' }
                                ] as { level: UrgencyLevel; emoji: string; color: string }[]).map(({ level, emoji, color }) => (
                                    <button
                                        key={level}
                                        onClick={() => setFormData({...formData, priorityLevel: level})}
                                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                                            formData.priorityLevel === level ? color : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="text-2xl mb-1">{emoji}</div>
                                        <span className="text-sm font-medium">{level}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <Clock size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Timeline</h3>
                                    <p className="text-xs text-gray-500">When do you need to buy this?</p>
                                </div>
                            </div>

                            <UrgencySelector
                                urgency={(formData.urgency as UrgencyType) || 'none'}
                                dueDate={formData.dueDate}
                                onChange={(urgency, dueDate) => setFormData({
                                    ...formData, 
                                    urgency: urgency,
                                    dueDate: dueDate || undefined
                                })}
                                showLabel={false}
                            />
                        </div>

                        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <Users size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Assignment</h3>
                                    <p className="text-xs text-gray-500">Who is responsible for this?</p>
                                </div>
                            </div>

                            <select
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-primary-muted focus:border-primary text-sm"
                                value={formData.assignedTo || ''}
                                onChange={e => setFormData({...formData, assignedTo: e.target.value || undefined})}
                            >
                                <option value="">Unassigned</option>
                                {MOCK_USERS.map(u => (
                                    <option key={u.uid} value={u.uid}>{u.displayName}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, itemId: '', itemName: '' })}
                onConfirm={handleConfirmDelete}
                title="Delete Shopping Item"
                message={`Are you sure you want to delete "${deleteConfirm.itemName}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
};

export default PurchasesView;
