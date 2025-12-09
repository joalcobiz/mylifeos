import React, { useState, useMemo } from 'react';
import {
    Rocket, Plus, Search, LayoutGrid, List, Filter, ChevronDown, ChevronUp,
    Edit3, Trash2, Package, Wrench, Bug, Sparkles, X, Save, Paperclip,
    DollarSign, Clock, CheckCircle, AlertCircle, Target, FileText, Upload
} from 'lucide-react';
import { useFirestore } from '../../services/firestore';
import { UpcomingFeature, Settings as SettingsType } from '../../types';
import Modal from '../../components/Modal';
import ModuleHeader from '../../components/ModuleHeader';
import { useAuth } from '../../contexts/AuthContext';

type ViewMode = 'cards' | 'table';
type GroupBy = 'none' | 'status' | 'type' | 'difficulty' | 'priority';
type SortBy = 'name' | 'status' | 'type' | 'difficulty' | 'priority' | 'createdAt' | 'dueDate';

const DEFAULT_STATUSES = ['Planned', 'In Progress', 'Testing', 'Completed', 'On Hold', 'Cancelled'];
const DEFAULT_TYPES = ['module', 'improvement', 'bugfix', 'enhancement'];
const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard'];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

const TYPE_ICONS: Record<string, React.ReactNode> = {
    module: <Package size={16} className="text-indigo-600" />,
    improvement: <Wrench size={16} className="text-amber-600" />,
    bugfix: <Bug size={16} className="text-red-600" />,
    enhancement: <Sparkles size={16} className="text-purple-600" />
};

const TYPE_COLORS: Record<string, string> = {
    module: 'bg-indigo-100 text-indigo-700',
    improvement: 'bg-amber-100 text-amber-700',
    bugfix: 'bg-red-100 text-red-700',
    enhancement: 'bg-purple-100 text-purple-700'
};

const DIFFICULTY_COLORS: Record<string, string> = {
    Easy: 'bg-green-100 text-green-700',
    Medium: 'bg-yellow-100 text-yellow-700',
    Hard: 'bg-red-100 text-red-700'
};

const PRIORITY_COLORS: Record<string, string> = {
    Low: 'bg-gray-100 text-gray-600',
    Medium: 'bg-blue-100 text-blue-700',
    High: 'bg-orange-100 text-orange-700',
    Critical: 'bg-red-100 text-red-700'
};

const STATUS_COLORS: Record<string, string> = {
    'Planned': 'bg-gray-100 text-gray-600',
    'In Progress': 'bg-blue-100 text-blue-700',
    'Testing': 'bg-amber-100 text-amber-700',
    'Completed': 'bg-green-100 text-green-700',
    'On Hold': 'bg-purple-100 text-purple-700',
    'Cancelled': 'bg-red-100 text-red-700'
};

interface FeatureModalState {
    isOpen: boolean;
    feature: Partial<UpcomingFeature>;
    isEditing: boolean;
}

const FeaturesView: React.FC = () => {
    const { user } = useAuth();
    const { data: features, add, update, remove } = useFirestore<UpcomingFeature>('features');
    const { data: settingsData, update: updateSettings } = useFirestore<SettingsType>('settings');
    const settings = settingsData[0] || { featureStatuses: DEFAULT_STATUSES, featureTypes: DEFAULT_TYPES };
    
    const [viewMode, setViewMode] = useState<ViewMode>('cards');
    const [searchQuery, setSearchQuery] = useState('');
    const [groupBy, setGroupBy] = useState<GroupBy>('status');
    const [sortBy, setSortBy] = useState<SortBy>('createdAt');
    const [sortAsc, setSortAsc] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);
    
    const [modal, setModal] = useState<FeatureModalState>({
        isOpen: false,
        feature: {},
        isEditing: false
    });
    
    const [newStatus, setNewStatus] = useState('');
    const [showAddStatus, setShowAddStatus] = useState(false);

    const statuses = settings.featureStatuses || DEFAULT_STATUSES;
    const types = settings.featureTypes || DEFAULT_TYPES;

    const filteredFeatures = useMemo(() => {
        let result = [...features];
        
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(f => 
                f.name.toLowerCase().includes(query) ||
                f.description?.toLowerCase().includes(query) ||
                f.targetModule?.toLowerCase().includes(query)
            );
        }
        
        if (filterStatus !== 'all') {
            result = result.filter(f => f.status === filterStatus);
        }
        
        if (filterType !== 'all') {
            result = result.filter(f => f.type === filterType);
        }
        
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'status':
                    comparison = (a.status || '').localeCompare(b.status || '');
                    break;
                case 'type':
                    comparison = (a.type || '').localeCompare(b.type || '');
                    break;
                case 'difficulty':
                    const diffOrder = { Easy: 1, Medium: 2, Hard: 3 };
                    comparison = (diffOrder[a.difficulty] || 0) - (diffOrder[b.difficulty] || 0);
                    break;
                case 'priority':
                    const prioOrder = { Low: 1, Medium: 2, High: 3, Critical: 4 };
                    comparison = (prioOrder[a.priority || 'Low'] || 0) - (prioOrder[b.priority || 'Low'] || 0);
                    break;
                case 'createdAt':
                    comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
                    break;
                case 'dueDate':
                    comparison = new Date(a.dueDate || '9999').getTime() - new Date(b.dueDate || '9999').getTime();
                    break;
            }
            return sortAsc ? comparison : -comparison;
        });
        
        return result;
    }, [features, searchQuery, filterStatus, filterType, sortBy, sortAsc]);

    const groupedFeatures = useMemo(() => {
        if (groupBy === 'none') return { 'All Features': filteredFeatures };
        
        const groups: Record<string, UpcomingFeature[]> = {};
        filteredFeatures.forEach(feature => {
            const key = feature[groupBy] || 'Uncategorized';
            if (!groups[key]) groups[key] = [];
            groups[key].push(feature);
        });
        return groups;
    }, [filteredFeatures, groupBy]);

    const openNewFeature = () => {
        setModal({
            isOpen: true,
            feature: {
                name: '',
                type: 'improvement',
                status: 'Planned',
                difficulty: 'Medium',
                priority: 'Medium',
                createdAt: new Date().toISOString()
            },
            isEditing: false
        });
    };

    const openEditFeature = (feature: UpcomingFeature) => {
        setModal({
            isOpen: true,
            feature: { ...feature },
            isEditing: true
        });
    };

    const handleSave = async () => {
        const { feature, isEditing } = modal;
        if (!feature.name?.trim()) {
            alert('Name is required');
            return;
        }
        
        try {
            if (isEditing && feature.id) {
                await update(feature.id, {
                    ...feature,
                    updatedAt: new Date().toISOString()
                } as UpcomingFeature);
            } else {
                await add({
                    ...feature,
                    createdAt: new Date().toISOString(),
                    createdBy: user?.uid
                } as UpcomingFeature);
            }
            setModal({ isOpen: false, feature: {}, isEditing: false });
        } catch (error) {
            console.error('Failed to save feature:', error);
            alert('Failed to save feature');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this feature?')) {
            try {
                await remove(id);
            } catch (error) {
                console.error('Failed to delete:', error);
            }
        }
    };

    const handleAddStatus = async () => {
        if (!newStatus.trim()) return;
        if (statuses.includes(newStatus.trim())) {
            alert('Status already exists');
            return;
        }
        try {
            const updatedStatuses = [...statuses, newStatus.trim()];
            if (settings.id) {
                await updateSettings(settings.id, { featureStatuses: updatedStatuses });
            }
            setNewStatus('');
            setShowAddStatus(false);
        } catch (error) {
            console.error('Failed to add status:', error);
        }
    };

    const renderFeatureCard = (feature: UpcomingFeature) => (
        <div
            key={feature.id}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${TYPE_COLORS[feature.type] || 'bg-gray-100'}`}>
                        {TYPE_ICONS[feature.type] || <Package size={16} />}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{feature.name}</h3>
                        {feature.targetModule && (
                            <span className="text-xs text-gray-500">{feature.targetModule}</span>
                        )}
                    </div>
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => openEditFeature(feature)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                    >
                        <Edit3 size={14} />
                    </button>
                    <button
                        onClick={() => handleDelete(feature.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
            
            {feature.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{feature.description}</p>
            )}
            
            <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[feature.status] || 'bg-gray-100 text-gray-600'}`}>
                    {feature.status}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_COLORS[feature.difficulty] || 'bg-gray-100'}`}>
                    {feature.difficulty}
                </span>
                {feature.priority && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[feature.priority]}`}>
                        {feature.priority}
                    </span>
                )}
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-3">
                    {feature.budget && (
                        <span className="flex items-center gap-1">
                            <DollarSign size={12} />
                            {feature.budget}
                        </span>
                    )}
                    {feature.complexity && (
                        <span className="flex items-center gap-1">
                            <Target size={12} />
                            {feature.complexity}/10
                        </span>
                    )}
                    {feature.attachments && feature.attachments.length > 0 && (
                        <span className="flex items-center gap-1">
                            <Paperclip size={12} />
                            {feature.attachments.length}
                        </span>
                    )}
                </div>
                {feature.dueDate && (
                    <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(feature.dueDate).toLocaleDateString()}
                    </span>
                )}
            </div>
            
            {feature.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500 line-clamp-2">
                        <FileText size={10} className="inline mr-1" />
                        {feature.notes}
                    </p>
                </div>
            )}
        </div>
    );

    const renderTableView = () => (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Difficulty</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Priority</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Budget</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Due</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredFeatures.map(feature => (
                            <tr key={feature.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {TYPE_ICONS[feature.type]}
                                        <div>
                                            <span className="font-medium text-gray-900">{feature.name}</span>
                                            {feature.targetModule && (
                                                <span className="text-xs text-gray-400 ml-2">({feature.targetModule})</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[feature.type]}`}>
                                        {feature.type}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[feature.status] || 'bg-gray-100'}`}>
                                        {feature.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${DIFFICULTY_COLORS[feature.difficulty]}`}>
                                        {feature.difficulty}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {feature.priority && (
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[feature.priority]}`}>
                                            {feature.priority}
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                    {feature.budget ? `$${feature.budget}` : '-'}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">
                                    {feature.dueDate ? new Date(feature.dueDate).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex justify-end gap-1">
                                        <button
                                            onClick={() => openEditFeature(feature)}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(feature.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-enter">
            <ModuleHeader
                module="features"
                title="Feature Roadmap"
                description="Track upcoming features, improvements, and bug fixes"
                icon={<Rocket className="text-violet-600" />}
                iconBgColor="bg-violet-100"
                actions={
                    <button
                        onClick={openNewFeature}
                        className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        New Feature
                    </button>
                }
            />

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
                    <div className="relative flex-1 md:max-w-xs">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search features..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 rounded-lg border transition-colors ${showFilters ? 'bg-violet-50 border-violet-200 text-violet-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                    >
                        <Filter size={16} />
                    </button>
                </div>
                
                <div className="flex items-center gap-2">
                    <select
                        value={groupBy}
                        onChange={e => setGroupBy(e.target.value as GroupBy)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-500 outline-none"
                    >
                        <option value="none">No Grouping</option>
                        <option value="status">Group by Status</option>
                        <option value="type">Group by Type</option>
                        <option value="difficulty">Group by Difficulty</option>
                        <option value="priority">Group by Priority</option>
                    </select>
                    
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as SortBy)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-500 outline-none"
                    >
                        <option value="createdAt">Sort by Created</option>
                        <option value="name">Sort by Name</option>
                        <option value="status">Sort by Status</option>
                        <option value="difficulty">Sort by Difficulty</option>
                        <option value="priority">Sort by Priority</option>
                        <option value="dueDate">Sort by Due Date</option>
                    </select>
                    
                    <button
                        onClick={() => setSortAsc(!sortAsc)}
                        className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                        {sortAsc ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    
                    <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setViewMode('cards')}
                            className={`p-2 transition-colors ${viewMode === 'cards' ? 'bg-violet-100 text-violet-600' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-violet-100 text-violet-600' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {showFilters && (
                <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-500 outline-none"
                        >
                            <option value="all">All Statuses</option>
                            {statuses.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                        <select
                            value={filterType}
                            onChange={e => setFilterType(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-500 outline-none"
                        >
                            <option value="all">All Types</option>
                            {types.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {viewMode === 'table' ? (
                renderTableView()
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedFeatures).map(([group, items]) => (
                        <div key={group}>
                            {groupBy !== 'none' && (
                                <div className="flex items-center gap-2 mb-3">
                                    <h3 className="font-semibold text-gray-700">{group}</h3>
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                                        {items.length}
                                    </span>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {items.map(renderFeatureCard)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {filteredFeatures.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <Rocket size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="font-semibold text-gray-700 mb-2">No features found</h3>
                    <p className="text-gray-500 text-sm mb-4">Add your first feature to start tracking your roadmap</p>
                    <button
                        onClick={openNewFeature}
                        className="inline-flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
                    >
                        <Plus size={16} />
                        Add Feature
                    </button>
                </div>
            )}

            <Modal
                isOpen={modal.isOpen}
                onClose={() => setModal({ isOpen: false, feature: {}, isEditing: false })}
                title={modal.isEditing ? 'Edit Feature' : 'New Feature'}
                size="lg"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                            <input
                                type="text"
                                value={modal.feature.name || ''}
                                onChange={e => setModal({ ...modal, feature: { ...modal.feature, name: e.target.value } })}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                                placeholder="Feature name"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                                value={modal.feature.type || 'improvement'}
                                onChange={e => setModal({ ...modal, feature: { ...modal.feature, type: e.target.value as any } })}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-violet-500 outline-none"
                            >
                                {types.map(t => (
                                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Target Module</label>
                            <input
                                type="text"
                                value={modal.feature.targetModule || ''}
                                onChange={e => setModal({ ...modal, feature: { ...modal.feature, targetModule: e.target.value } })}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 outline-none"
                                placeholder="e.g., Dashboard, Financial"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <div className="flex gap-2">
                                <select
                                    value={modal.feature.status || 'Planned'}
                                    onChange={e => setModal({ ...modal, feature: { ...modal.feature, status: e.target.value } })}
                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-violet-500 outline-none"
                                >
                                    {statuses.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setShowAddStatus(true)}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
                                    title="Add new status"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                            <select
                                value={modal.feature.difficulty || 'Medium'}
                                onChange={e => setModal({ ...modal, feature: { ...modal.feature, difficulty: e.target.value as any } })}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-violet-500 outline-none"
                            >
                                {DIFFICULTY_OPTIONS.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <select
                                value={modal.feature.priority || 'Medium'}
                                onChange={e => setModal({ ...modal, feature: { ...modal.feature, priority: e.target.value as any } })}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-violet-500 outline-none"
                            >
                                {PRIORITY_OPTIONS.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Complexity (1-10)</label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={modal.feature.complexity || ''}
                                onChange={e => setModal({ ...modal, feature: { ...modal.feature, complexity: parseInt(e.target.value) || undefined } })}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 outline-none"
                                placeholder="1-10"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={modal.feature.budget || ''}
                                    onChange={e => setModal({ ...modal, feature: { ...modal.feature, budget: parseFloat(e.target.value) || undefined } })}
                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 outline-none"
                                    placeholder="Amount"
                                />
                                <select
                                    value={modal.feature.currency || 'USD'}
                                    onChange={e => setModal({ ...modal, feature: { ...modal.feature, currency: e.target.value } })}
                                    className="w-20 border border-gray-200 rounded-lg px-2 py-2.5 bg-white focus:ring-2 focus:ring-violet-500 outline-none"
                                >
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                </select>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                            <input
                                type="date"
                                value={modal.feature.dueDate || ''}
                                onChange={e => setModal({ ...modal, feature: { ...modal.feature, dueDate: e.target.value } })}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 outline-none"
                            />
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={modal.feature.description || ''}
                                onChange={e => setModal({ ...modal, feature: { ...modal.feature, description: e.target.value } })}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 outline-none resize-none"
                                rows={2}
                                placeholder="Brief description of the feature"
                            />
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                            <textarea
                                value={modal.feature.notes || ''}
                                onChange={e => setModal({ ...modal, feature: { ...modal.feature, notes: e.target.value } })}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 outline-none resize-none"
                                rows={3}
                                placeholder="Detailed notes, implementation details, etc."
                            />
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            onClick={() => setModal({ isOpen: false, feature: {}, isEditing: false })}
                            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2"
                        >
                            <Save size={16} />
                            {modal.isEditing ? 'Update' : 'Create'}
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal
                isOpen={showAddStatus}
                onClose={() => { setShowAddStatus(false); setNewStatus(''); }}
                title="Add New Status"
                size="sm"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status Name</label>
                        <input
                            type="text"
                            value={newStatus}
                            onChange={e => setNewStatus(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-violet-500 outline-none"
                            placeholder="e.g., Under Review"
                            onKeyDown={e => e.key === 'Enter' && handleAddStatus()}
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => { setShowAddStatus(false); setNewStatus(''); }}
                            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddStatus}
                            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                        >
                            Add Status
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default FeaturesView;
