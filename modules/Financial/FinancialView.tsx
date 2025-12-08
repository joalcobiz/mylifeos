import React, { useState, useMemo } from 'react';
import { 
    Plus, Edit2, EyeOff, Eye, Search, Wallet, TrendingUp, TrendingDown, 
    DollarSign, CreditCard, Calendar, ArrowUpRight, ArrowDownRight, PieChart,
    User, RefreshCw, LayoutGrid, List, Clock, FileText, History, ChevronDown, ChevronUp
} from 'lucide-react';
import { ConfiguredModuleHeader } from '../../components/ModuleHeader';
import { FinancialItem, TransactionType, CurrencyCode, Settings, BalanceHistoryEntry } from '../../types';
import Modal from '../../components/Modal';
import { useFirestore } from '../../services/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button, Badge, Input, Select, Tabs, EmptyState, StatCard } from '../../components/ui';
import HighlightText from '../../components/HighlightText';
import { useSharing, filterDataBySharing, SharingMode } from '../../contexts/SharingContext';
import SharingFilter, { OwnerBadge } from '../../components/SharingFilter';

const EXPENSE_SUBTYPES = ['Bill', 'Subscription', 'Fixed', 'Variable', 'Loan Payment', 'Insurance', 'Other'];
const INCOME_SUBTYPES = ['Salary', 'Freelance', 'Investment', 'Rental', 'Gift', 'Bonus', 'Other'];

const DEFAULT_ACCOUNTS = ['Chase Checking', 'Savings', 'Cash'];
const DEFAULT_EXP_CATS = ['Housing', 'Food', 'Transport', 'Utilities', 'Entertainment', 'Health', 'Other'];
const DEFAULT_INC_CATS = ['Salary', 'Freelance', 'Investment', 'Other'];

const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const FinancialView: React.FC = () => {
    const { data: items, add: addItem, update: updateItem, remove: removeItem } = useFirestore<FinancialItem>('financial');
    const { data: settingsList, update: updateSettings } = useFirestore<Settings>('settings'); 
    const { user } = useAuth();
    const { settings: sharingSettings, getModuleSharingMode, getOwnerName, isOwner } = useSharing();
    
    const [sharingMode, setSharingMode] = useState<SharingMode>(() => getModuleSharingMode('financial'));
    const isAdmin = user?.isAdmin === true;

    const sharingStats = useMemo(() => {
        const userId = user?.uid || '';
        return {
            total: items.length,
            mine: items.filter(i => i.owner === userId).length,
            shared: items.filter(i => 
                i.owner !== userId && (i.isShared || i.sharedWith?.includes(userId))
            ).length,
            assigned: items.filter(i => 
                i.assignedTo === userId && i.owner !== userId
            ).length
        };
    }, [items, user]);

    const filteredBySharingItems = useMemo(() => {
        return filterDataBySharing<FinancialItem>(
            items, 
            user?.uid || '', 
            sharingMode, 
            isAdmin
        );
    }, [items, user, sharingMode, isAdmin]);

    const settings = settingsList[0] || {} as Settings;
    const accounts = settings.accounts || DEFAULT_ACCOUNTS;
    const expenseCategories = settings.expenseCategories || DEFAULT_EXP_CATS;
    const incomeCategories = settings.incomeCategories || DEFAULT_INC_CATS;

    const handleAddCategory = async (newCategory: string) => {
        if (!settingsList[0]) return;
        if (activeTab === 'income') {
            const updated = [...incomeCategories, newCategory];
            await updateSettings(settingsList[0].id, { incomeCategories: updated });
        } else {
            const updated = [...expenseCategories, newCategory];
            await updateSettings(settingsList[0].id, { expenseCategories: updated });
        }
    };

    const handleAddAccount = async (newAccount: string) => {
        if (!settingsList[0]) return;
        const updated = [...accounts, newAccount];
        await updateSettings(settingsList[0].id, { accounts: updated });
    };

    const [activeTab, setActiveTab] = useState<TransactionType>('expense');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<FinancialItem | null>(null);
    const [formData, setFormData] = useState<Partial<FinancialItem>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

    const filteredList = filteredBySharingItems.filter(item => {
        if (item.type !== activeTab) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (item.description || '').toLowerCase().includes(q) || 
                   (item.category || '').toLowerCase().includes(q);
        }
        return true;
    });

    const activeItems = filteredList.filter(item => item.isEnabled);
    const disabledItems = filteredList.filter(item => !item.isEnabled);

    const stats = useMemo(() => {
        const totalExpenses = items.filter(i => i.type === 'expense' && i.isEnabled).reduce((s, i) => s + i.amount, 0);
        const totalIncome = items.filter(i => i.type === 'income' && i.isEnabled).reduce((s, i) => s + i.amount, 0);
        const netProfit = totalIncome - totalExpenses;
        const expenseCount = items.filter(i => i.type === 'expense').length;
        const incomeCount = items.filter(i => i.type === 'income').length;
        return { totalExpenses, totalIncome, netProfit, expenseCount, incomeCount };
    }, [items]);

    const handleEdit = (item: FinancialItem) => {
        setEditingItem(item);
        setFormData(item);
        setIsModalOpen(true);
    };

    const handleToggleDisable = async (id: string) => {
        const item = items.find(i => i.id === id);
        if (item) {
            await updateItem(id, { isEnabled: !item.isEnabled });
        }
    };

    const handleOpenAdd = () => {
        setEditingItem(null);
        setFormData({
            type: activeTab,
            currency: 'USD',
            isEnabled: true,
            amount: 0,
            frequency: 'Monthly',
            dueDay: 1,
            owner: user?.displayName || 'Me'
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.description || !formData.amount) return;

        if (editingItem) {
            await updateItem(editingItem.id, formData);
        } else {
            await addItem(formData as any);
        }
        
        setIsModalOpen(false);
        setEditingItem(null);
        setFormData({});
    };

    const categoryTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        activeItems.forEach(item => {
            totals[item.category] = (totals[item.category] || 0) + item.amount;
        });
        return Object.entries(totals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }, [activeItems]);

    return (
        <div className="space-y-6 animate-enter">
            <ConfiguredModuleHeader 
                moduleKey="financial" 
                actions={
                    <Button 
                        onClick={handleOpenAdd} 
                        variant="secondary"
                        icon={Plus}
                        size="sm"
                    >
                        Add {activeTab === 'income' ? 'Income' : 'Expense'}
                    </Button>
                }
            />

            <SharingFilter
                mode={sharingMode}
                onChange={setSharingMode}
                stats={sharingStats}
                isAdmin={isAdmin}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    title="Monthly Income"
                    value={`$${stats.totalIncome.toLocaleString()}`}
                    subtitle={`${stats.incomeCount} sources`}
                    icon={TrendingUp}
                    color="green"
                />
                <StatCard
                    title="Monthly Expenses"
                    value={`$${stats.totalExpenses.toLocaleString()}`}
                    subtitle={`${stats.expenseCount} items`}
                    icon={TrendingDown}
                    color="rose"
                />
                <StatCard
                    title="Net Profit"
                    value={`$${Math.abs(stats.netProfit).toLocaleString()}`}
                    subtitle={stats.netProfit >= 0 ? 'Positive' : 'Negative'}
                    icon={DollarSign}
                    color={stats.netProfit >= 0 ? 'green' : 'rose'}
                    trend={{ value: stats.netProfit >= 0 ? 12 : -8 }}
                />
                <Card className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
                        <PieChart className="text-purple-600" size={24} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {stats.totalIncome > 0 ? Math.round((stats.totalExpenses / stats.totalIncome) * 100) : 0}%
                    </p>
                    <p className="text-sm text-gray-500">Expense Ratio</p>
                </Card>
            </div>

            <Card padding="sm">
                <div className="flex flex-col md:flex-row gap-3 mb-4">
                    <div className="flex-1">
                        <Tabs
                            tabs={[
                                { id: 'expense', label: 'Expenses', icon: <ArrowDownRight size={14} />, count: stats.expenseCount },
                                { id: 'income', label: 'Income', icon: <ArrowUpRight size={14} />, count: stats.incomeCount }
                            ]}
                            activeTab={activeTab}
                            onChange={(id) => setActiveTab(id as TransactionType)}
                        />
                    </div>
                    <Input
                        icon={Search}
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        fullWidth={false}
                        className="w-full md:w-64"
                    />
                    <div className="hidden md:flex bg-gray-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setViewMode('card')} 
                            className={`p-1.5 rounded transition-all ${viewMode === 'card' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                        >
                            <LayoutGrid size={16} />
                        </button>
                        <button 
                            onClick={() => setViewMode('table')} 
                            className={`p-1.5 rounded transition-all ${viewMode === 'table' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>

                {categoryTotals.length > 0 && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-xl">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-3">Top Categories</p>
                        <div className="flex flex-wrap gap-2">
                            {categoryTotals.map(([cat, total]) => (
                                <Badge key={cat} variant="default" size="sm">
                                    {cat}: ${total.toLocaleString()}
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}
            </Card>

            {activeItems.length === 0 && disabledItems.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={activeTab === 'income' ? TrendingUp : TrendingDown}
                        title={`No ${activeTab} items`}
                        description={`Start tracking your ${activeTab} by adding your first item`}
                        actionLabel={`Add ${activeTab === 'income' ? 'Income' : 'Expense'}`}
                        onAction={handleOpenAdd}
                    />
                </Card>
            ) : viewMode === 'table' ? (
                <Card padding="none" className="hidden md:block">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left text-xs font-bold text-gray-500 uppercase px-4 py-3">Description</th>
                                    <th className="text-left text-xs font-bold text-gray-500 uppercase px-4 py-3">Type</th>
                                    <th className="text-left text-xs font-bold text-gray-500 uppercase px-4 py-3">Category</th>
                                    <th className="text-left text-xs font-bold text-gray-500 uppercase px-4 py-3">Frequency</th>
                                    <th className="text-left text-xs font-bold text-gray-500 uppercase px-4 py-3">Owner</th>
                                    <th className="text-right text-xs font-bold text-gray-500 uppercase px-4 py-3">Amount</th>
                                    <th className="text-right text-xs font-bold text-gray-500 uppercase px-4 py-3">Balance</th>
                                    <th className="text-center text-xs font-bold text-gray-500 uppercase px-4 py-3">Due</th>
                                    <th className="text-center text-xs font-bold text-gray-500 uppercase px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {activeItems.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${item.type === 'income' ? 'bg-green-50' : 'bg-red-50'}`}>
                                                    {item.type === 'income' ? <ArrowUpRight className="text-green-600" size={12} /> : <ArrowDownRight className="text-red-600" size={12} />}
                                                </div>
                                                <span className="font-medium text-gray-900"><HighlightText text={item.description} highlight={searchQuery} /></span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {item.subType && <Badge variant="default" size="xs">{item.subType}</Badge>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{item.category}</td>
                                        <td className="px-4 py-3"><Badge variant="info" size="xs">{item.frequency}</Badge></td>
                                        <td className="px-4 py-3 text-gray-600">{item.owner}</td>
                                        <td className="px-4 py-3 text-right font-mono font-medium">
                                            <span className={item.type === 'income' ? 'text-green-600' : 'text-gray-900'}>
                                                {item.type === 'income' ? '+' : '-'}${item.amount.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-mono text-gray-500">
                                            {item.balance !== undefined ? `$${item.balance.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-600">{getOrdinal(item.dueDay)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleToggleDisable(item.id)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                                                    <EyeOff size={14} />
                                                </button>
                                                <button onClick={() => handleEdit(item)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                                                    <Edit2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            ) : (
                <div className="space-y-3">
                    {activeItems.map(item => (
                        <Card key={item.id} hover className="group">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        item.type === 'income' ? 'bg-green-50' : 'bg-red-50'
                                    }`}>
                                        {item.type === 'income' ? (
                                            <ArrowUpRight className="text-green-600" size={20} />
                                        ) : (
                                            <ArrowDownRight className="text-red-600" size={20} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-medium text-gray-900">
                                                <HighlightText text={item.description} highlight={searchQuery} />
                                            </h4>
                                            {item.subType && <Badge variant="warning" size="xs">{item.subType}</Badge>}
                                            <Badge variant="default" size="xs">{item.category}</Badge>
                                            <Badge variant="info" size="xs">{item.frequency}</Badge>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={10} />
                                                Due: {getOrdinal(item.dueDay)}
                                            </span>
                                            {item.account && (
                                                <span className="flex items-center gap-1">
                                                    <CreditCard size={10} />
                                                    {item.account}
                                                </span>
                                            )}
                                            {item.owner && (
                                                <span className="flex items-center gap-1">
                                                    <User size={10} />
                                                    {item.owner}
                                                </span>
                                            )}
                                            {item.type === 'expense' && item.balance !== undefined && item.balance > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <Wallet size={10} />
                                                    Bal: ${item.balance.toLocaleString()}
                                                </span>
                                            )}
                                            {item.type === 'income' && item.receivedMethod && (
                                                <span className="flex items-center gap-1 text-green-600">
                                                    <ArrowDownRight size={10} />
                                                    {item.receivedMethod}
                                                </span>
                                            )}
                                        </div>
                                        {item.notes && (
                                            <p className="text-xs text-gray-400 mt-1 line-clamp-1 italic">{item.notes}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className={`text-lg font-bold ${item.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                                            {item.type === 'income' ? '+' : '-'}${item.amount.toLocaleString()}
                                            {item.currency !== 'USD' && <span className="text-xs font-normal text-gray-400 ml-1">{item.currency}</span>}
                                        </p>
                                        {item.currency !== 'USD' && settings.exchangeRates?.[item.currency] && (
                                            <p className="text-xs text-gray-400">
                                                ≈ ${(item.amount / (settings.exchangeRates[item.currency] || 1)).toFixed(2)} USD
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleToggleDisable(item.id)}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                            title={item.isEnabled ? 'Disable' : 'Enable'}
                                        >
                                            {item.isEnabled ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                        <button
                                            onClick={() => handleEdit(item)}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}

                    {disabledItems.length > 0 && (
                        <div className="mt-6">
                            <p className="text-xs font-bold text-gray-400 uppercase mb-3 px-2">Disabled Items</p>
                            {disabledItems.map(item => (
                                <Card key={item.id} className="opacity-50 mb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-gray-400 line-through">{item.description}</span>
                                            <Badge variant="default" size="xs">{item.category}</Badge>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-gray-400">${item.amount}</span>
                                            <button
                                                onClick={() => handleToggleDisable(item.id)}
                                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingItem(null);
                }} 
                title={editingItem ? `Edit ${activeTab}` : `Add ${activeTab === 'income' ? 'Income' : 'Expense'}`}
                size="full"
            >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[50vh]">
                    {/* Left Column - Basic Info */}
                    <div className="lg:col-span-5 space-y-5">
                        <div className={`bg-gradient-to-br ${activeTab === 'income' ? 'from-emerald-50 to-teal-50 border-emerald-100' : 'from-red-50 to-orange-50 border-red-100'} rounded-xl p-5 border`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 bg-gradient-to-br ${activeTab === 'income' ? 'from-emerald-500 to-teal-600' : 'from-red-500 to-orange-600'} rounded-lg flex items-center justify-center text-white shadow-md`}>
                                    {activeTab === 'income' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{activeTab === 'income' ? 'Income' : 'Expense'} Details</h3>
                                    <p className="text-xs text-gray-500">Basic transaction information</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    label="Description"
                                    placeholder="e.g., Netflix subscription, Salary..."
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                />
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        label="Amount"
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.amount || ''}
                                        onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                                    />
                                    <Select
                                        label="Currency"
                                        options={[
                                            { value: 'USD', label: 'USD' },
                                            { value: 'EUR', label: 'EUR' },
                                            { value: 'GBP', label: 'GBP' },
                                            { value: 'COP', label: 'COP' }
                                        ]}
                                        value={formData.currency || 'USD'}
                                        onChange={(v) => setFormData({...formData, currency: v as CurrencyCode})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                    <textarea
                                        placeholder={activeTab === 'expense' ? 'Additional details about this expense...' : 'Additional details about this income...'}
                                        value={formData.notes || ''}
                                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* USD Equivalent display for non-USD currencies */}
                        {formData.currency && formData.currency !== 'USD' && formData.amount && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                                <span className="text-sm text-blue-700 flex items-center gap-2">
                                    <RefreshCw size={14} /> USD Equivalent
                                </span>
                                <span className="font-bold text-blue-900 text-lg">
                                    ~${((formData.amount || 0) / (settings.exchangeRates?.[formData.currency] || 1)).toFixed(2)} USD
                                </span>
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
                                disabled={!formData.description || !formData.amount}
                            >
                                {editingItem ? 'Save Changes' : 'Add'}
                            </Button>
                        </div>
                    </div>

                    {/* Right Column - Classification & Scheduling */}
                    <div className="lg:col-span-7 space-y-5">
                        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <PieChart size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Classification</h3>
                                    <p className="text-xs text-gray-500">Category and type details</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <Select
                                    label="Category"
                                    options={(activeTab === 'income' ? incomeCategories : expenseCategories).map(c => ({ value: c, label: c }))}
                                    value={formData.category || ''}
                                    onChange={(v) => setFormData({...formData, category: v})}
                                    allowAddNew
                                    onAddNew={handleAddCategory}
                                    addNewPlaceholder="New category name..."
                                />
                                <Select
                                    label="Type"
                                    options={(activeTab === 'income' ? INCOME_SUBTYPES : EXPENSE_SUBTYPES).map(t => ({ value: t, label: t }))}
                                    value={formData.subType || ''}
                                    onChange={(v) => setFormData({...formData, subType: v})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Owner"
                                    placeholder="Who is responsible?"
                                    value={formData.owner || ''}
                                    onChange={(e) => setFormData({...formData, owner: e.target.value})}
                                />
                                <Select
                                    label="Account"
                                    options={accounts.map(a => ({ value: a, label: a }))}
                                    value={formData.account || ''}
                                    onChange={(v) => setFormData({...formData, account: v})}
                                    allowAddNew
                                    onAddNew={handleAddAccount}
                                    addNewPlaceholder="New account name..."
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Scheduling</h3>
                                    <p className="text-xs text-gray-500">Frequency and timing</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <Select
                                    label="Frequency"
                                    options={[
                                        { value: 'Monthly', label: 'Monthly' },
                                        { value: 'Weekly', label: 'Weekly' },
                                        { value: 'Bi-Weekly', label: 'Bi-Weekly' },
                                        { value: 'Annually', label: 'Annually' },
                                        { value: 'One-Time', label: 'One-Time' }
                                    ]}
                                    value={formData.frequency || 'Monthly'}
                                    onChange={(v) => setFormData({...formData, frequency: v as any})}
                                />
                                <Input
                                    label="Due Day"
                                    type="number"
                                    placeholder="1-31"
                                    value={formData.dueDay || ''}
                                    onChange={(e) => setFormData({...formData, dueDay: parseInt(e.target.value) || 1})}
                                />
                            </div>

                            {/* Quick Frequency Buttons */}
                            <div className="flex flex-wrap gap-2">
                                <span className="text-xs text-gray-400 mr-2 self-center">Quick:</span>
                                {[
                                    { value: 'Weekly', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                                    { value: 'Monthly', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' },
                                    { value: 'Annually', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
                                    { value: 'One-Time', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' }
                                ].map(({ value, color }) => (
                                    <button
                                        key={value}
                                        onClick={() => setFormData({...formData, frequency: value as any})}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${color} ${formData.frequency === value ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
                                    >
                                        {value}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Income-specific: Received Method */}
                        {activeTab === 'income' && (
                            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white shadow-md">
                                        <CreditCard size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Payment Method</h3>
                                        <p className="text-xs text-gray-500">How you receive this income</p>
                                    </div>
                                </div>
                                <Select
                                    label="Received Method"
                                    options={[
                                        { value: 'Direct Deposit', label: 'Direct Deposit' },
                                        { value: 'Check', label: 'Check' },
                                        { value: 'Cash', label: 'Cash' },
                                        { value: 'Wire Transfer', label: 'Wire Transfer' },
                                        { value: 'Zelle', label: 'Zelle' },
                                        { value: 'Venmo', label: 'Venmo' },
                                        { value: 'PayPal', label: 'PayPal' },
                                        { value: 'Crypto', label: 'Crypto' },
                                        { value: 'Other', label: 'Other' }
                                    ]}
                                    value={formData.receivedMethod || ''}
                                    onChange={(v) => setFormData({...formData, receivedMethod: v})}
                                />
                            </div>
                        )}

                        {/* Expense-specific: Balance tracking with history */}
                        {activeTab === 'expense' && (
                            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white shadow-md">
                                        <Wallet size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Balance Tracking</h3>
                                        <p className="text-xs text-gray-500">Track outstanding balances with history</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <Input
                                        label="Current Balance"
                                        type="number"
                                        placeholder="Amount owed"
                                        value={formData.balance || ''}
                                        onChange={(e) => {
                                            const newBalance = parseFloat(e.target.value) || 0;
                                            const previousBalance = formData.balance;
                                            const now = new Date().toISOString();
                                            
                                            const newHistoryEntry: BalanceHistoryEntry = {
                                                id: `bh-${Date.now()}`,
                                                date: now,
                                                balance: newBalance,
                                                previousBalance: previousBalance,
                                                note: ''
                                            };
                                            
                                            const currentHistory = formData.balanceHistory || [];
                                            const lastEntry = currentHistory[currentHistory.length - 1];
                                            
                                            if (!lastEntry || Math.abs(newBalance - (lastEntry.balance || 0)) > 0.01) {
                                                setFormData({
                                                    ...formData, 
                                                    balance: newBalance, 
                                                    lastBalanceUpdate: now,
                                                    balanceHistory: [...currentHistory, newHistoryEntry]
                                                });
                                            } else {
                                                setFormData({
                                                    ...formData, 
                                                    balance: newBalance, 
                                                    lastBalanceUpdate: now
                                                });
                                            }
                                        }}
                                    />
                                    <Input
                                        label="Last Updated"
                                        type="date"
                                        value={formData.lastBalanceUpdate ? formData.lastBalanceUpdate.split('T')[0] : ''}
                                        onChange={(e) => setFormData({...formData, lastBalanceUpdate: e.target.value})}
                                    />
                                </div>
                                
                                {/* Balance History Timeline */}
                                {formData.balanceHistory && formData.balanceHistory.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <History size={14} className="text-gray-400" />
                                            <span className="text-xs font-semibold text-gray-500 uppercase">Balance History</span>
                                        </div>
                                        <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {[...formData.balanceHistory].reverse().slice(0, 10).map((entry, idx) => {
                                                const change = entry.previousBalance !== undefined 
                                                    ? entry.balance - entry.previousBalance 
                                                    : 0;
                                                return (
                                                    <div key={entry.id || idx} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg hover:bg-gray-50">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${change < 0 ? 'bg-green-500' : change > 0 ? 'bg-red-500' : 'bg-gray-400'}`} />
                                                            <span className="text-gray-500 text-xs">
                                                                {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-medium">${entry.balance.toLocaleString()}</span>
                                                            {change !== 0 && (
                                                                <span className={`text-xs font-medium ${change < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                    {change < 0 ? '▼' : '▲'} ${Math.abs(change).toLocaleString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default FinancialView;
