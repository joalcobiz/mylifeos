import React, { useState, useMemo } from 'react';
import { 
    Plus, CreditCard, ArrowRightLeft, History, Archive, 
    ChevronRight, CheckCircle, TrendingDown, TrendingUp,
    LayoutGrid, List, DollarSign, Search, Edit2, Trash2, User,
    ArrowDownLeft, ArrowUpRight, Calendar, Coins, X, ArrowUpDown
} from 'lucide-react';
import { Loan, LoanCategory, LoanTransaction } from '../../types';
import Modal from '../../components/Modal';
import { useFirestore } from '../../services/firestore';
import { Card, Button, Badge, Input, Select, Tabs, EmptyState, StatCard, Progress } from '../../components/ui';
import { ConfiguredModuleHeader } from '../../components/ModuleHeader';
import HighlightText from '../../components/HighlightText';

const LoansView: React.FC = () => {
    const { data: loans, add: addLoan, update: updateLoan, remove: removeLoan } = useFirestore<Loan>('loans');
    
    const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
    const [filterCategory, setFilterCategory] = useState<'All' | LoanCategory>('All');
    const [showArchived, setShowArchived] = useState(false);
    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState<Partial<Loan>>({});
    const [paymentModal, setPaymentModal] = useState<{isOpen: boolean, loan: Loan | null}>({ isOpen: false, loan: null });
    const [newPayment, setNewPayment] = useState<Partial<LoanTransaction>>({ date: new Date().toISOString().split('T')[0], amount: 0, type: 'Payment', direction: 'out', note: '' });

    const filteredLoans = useMemo(() => {
        return loans.filter(l => 
            (filterCategory === 'All' || l.category === filterCategory) && 
            l.isArchived === showArchived &&
            ((l.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
             (l.lender || '').toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [loans, filterCategory, showArchived, searchQuery]);

    const stats = useMemo(() => {
        const totalLiabilities = loans.filter(l => l.category === 'I Owe' && !l.isArchived)
            .reduce((sum, l) => sum + l.remainingBalance, 0);
        const totalAssets = loans.filter(l => l.category === 'Owed To Me' && !l.isArchived)
            .reduce((sum, l) => sum + l.remainingBalance, 0);
        const activeCount = loans.filter(l => !l.isArchived).length;
        return { totalLiabilities, totalAssets, net: totalAssets - totalLiabilities, activeCount };
    }, [loans]);

    const handleOpenAdd = () => {
        setSelectedLoan(null);
        setFormData({
            name: '',
            category: 'I Owe',
            lender: '',
            originalAmount: 0,
            remainingBalance: 0,
            interestRate: 0,
            currency: 'USD',
            status: 'Active',
            isArchived: false,
            transactions: []
        });
        setIsModalOpen(true);
    };

    const handleEdit = (loan: Loan) => {
        setSelectedLoan(loan);
        setFormData(loan);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.lender) return;

        if (selectedLoan) {
            await updateLoan(selectedLoan.id, formData);
        } else {
            await addLoan({
                ...formData,
                transactions: []
            } as any);
        }
        
        setIsModalOpen(false);
        setSelectedLoan(null);
    };

    const handleArchive = async (loan: Loan) => {
        await updateLoan(loan.id, { isArchived: !loan.isArchived });
    };

    const handleOpenPayments = (loan: Loan) => {
        setPaymentModal({ isOpen: true, loan });
        setNewPayment({ date: new Date().toISOString().split('T')[0], amount: 0, type: 'Payment', direction: loan.category === 'I Owe' ? 'out' : 'in', note: '' });
    };

    const handleAddPayment = async () => {
        if (!paymentModal.loan || !newPayment.amount) return;
        
        const payment: LoanTransaction = {
            id: `txn-${Date.now()}`,
            date: newPayment.date || new Date().toISOString(),
            amount: newPayment.amount || 0,
            type: newPayment.type || 'Payment',
            direction: newPayment.direction || 'out',
            note: newPayment.note
        };

        const currentTransactions = paymentModal.loan.transactions || [];
        const newBalance = newPayment.direction === 'out' 
            ? paymentModal.loan.remainingBalance - (newPayment.amount || 0)
            : paymentModal.loan.remainingBalance + (newPayment.amount || 0);

        payment.balanceAfter = Math.max(0, newBalance);

        await updateLoan(paymentModal.loan.id, {
            transactions: [...currentTransactions, payment],
            remainingBalance: payment.balanceAfter
        });

        setNewPayment({ date: new Date().toISOString().split('T')[0], amount: 0, type: 'Payment', direction: paymentModal.loan.category === 'I Owe' ? 'out' : 'in', note: '' });
        
        const updatedLoan = loans.find(l => l.id === paymentModal.loan?.id);
        if (updatedLoan) {
            setPaymentModal({ ...paymentModal, loan: { ...updatedLoan, transactions: [...currentTransactions, payment], remainingBalance: payment.balanceAfter } });
        }
    };

    const handleDeletePayment = async (paymentId: string) => {
        if (!paymentModal.loan) return;
        const updatedTransactions = (paymentModal.loan.transactions || []).filter(t => t.id !== paymentId);
        
        const totalPaid = updatedTransactions
            .filter(t => t.direction === 'out')
            .reduce((sum, t) => sum + t.amount, 0);
        const totalReceived = updatedTransactions
            .filter(t => t.direction === 'in')
            .reduce((sum, t) => sum + t.amount, 0);
        const newBalance = paymentModal.loan.originalAmount - totalPaid + totalReceived;

        await updateLoan(paymentModal.loan.id, {
            transactions: updatedTransactions,
            remainingBalance: Math.max(0, newBalance)
        });

        setPaymentModal({ ...paymentModal, loan: { ...paymentModal.loan, transactions: updatedTransactions, remainingBalance: Math.max(0, newBalance) } });
    };

    return (
        <div className="space-y-6 animate-enter">
            <ConfiguredModuleHeader 
                moduleKey="loans" 
                actions={
                    <Button 
                        onClick={handleOpenAdd} 
                        variant="primary"
                        icon={Plus}
                        size="sm"
                    >
                        New Entry
                    </Button>
                } 
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    title="I Owe"
                    value={`$${stats.totalLiabilities.toLocaleString()}`}
                    subtitle="Total liabilities"
                    icon={TrendingDown}
                    color="rose"
                />
                <StatCard
                    title="Owed to Me"
                    value={`$${stats.totalAssets.toLocaleString()}`}
                    subtitle="Total assets"
                    icon={TrendingUp}
                    color="green"
                />
                <StatCard
                    title="Net Position"
                    value={`$${Math.abs(stats.net).toLocaleString()}`}
                    subtitle={stats.net >= 0 ? 'Positive' : 'Negative'}
                    icon={DollarSign}
                    color={stats.net >= 0 ? 'green' : 'rose'}
                />
                <Card className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
                        <CreditCard className="text-purple-600" size={24} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.activeCount}</p>
                    <p className="text-sm text-gray-500">Active Entries</p>
                </Card>
            </div>

            <Card padding="sm">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                        <Input
                            icon={Search}
                            placeholder="Search loans..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Tabs
                            tabs={[
                                { id: 'All', label: 'All' },
                                { id: 'I Owe', label: 'I Owe' },
                                { id: 'Owed To Me', label: 'Owed to Me' }
                            ]}
                            activeTab={filterCategory}
                            onChange={(id) => setFilterCategory(id as any)}
                            size="sm"
                        />
                        <button
                            onClick={() => setShowArchived(!showArchived)}
                            className={`p-2 rounded-lg transition-colors ${
                                showArchived ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                            title={showArchived ? 'Show Active' : 'Show Archived'}
                        >
                            <Archive size={18} />
                        </button>
                        <div className="flex bg-gray-100 p-1 rounded-lg">
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
                </div>
            </Card>

            {filteredLoans.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={ArrowRightLeft}
                        title={showArchived ? "No archived entries" : "No money flows"}
                        description={showArchived ? "Archived entries will appear here" : "Track who owes you and who you owe"}
                        actionLabel={showArchived ? undefined : "Add Entry"}
                        onAction={showArchived ? undefined : handleOpenAdd}
                    />
                </Card>
            ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLoans.map(loan => {
                        const progressPct = loan.originalAmount > 0 
                            ? Math.round(((loan.originalAmount - loan.remainingBalance) / loan.originalAmount) * 100)
                            : 0;
                        
                        return (
                            <Card key={loan.id} hover className="group">
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        loan.category === 'I Owe' ? 'bg-red-50' : 'bg-green-50'
                                    }`}>
                                        {loan.category === 'I Owe' ? (
                                            <TrendingDown className="text-red-600" size={20} />
                                        ) : (
                                            <TrendingUp className="text-green-600" size={20} />
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleOpenPayments(loan)}
                                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                                            title="Payment History"
                                        >
                                            <History size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(loan)}
                                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleArchive(loan)}
                                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                                        >
                                            <Archive size={14} />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="font-semibold text-gray-900 mb-1">
                                    <HighlightText text={loan.name} highlight={searchQuery} />
                                </h3>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                                    <User size={12} />
                                    <HighlightText text={loan.lender} highlight={searchQuery} />
                                </div>

                                <div className="mb-3">
                                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                                        <span>Remaining</span>
                                        <span className="font-bold">{loan.currency} {loan.remainingBalance.toLocaleString()}</span>
                                    </div>
                                    <Progress value={progressPct} size="sm" variant={loan.category === 'I Owe' ? 'danger' : 'success'} />
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Badge variant={loan.category === 'I Owe' ? 'danger' : 'success'} size="xs">
                                            {loan.category === 'I Owe' ? 'Liability' : 'Asset'}
                                        </Badge>
                                        {(loan.transactions?.length || 0) > 0 && (
                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                <History size={10} /> {loan.transactions?.length} payments
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400">
                                        Original: {loan.currency} {loan.originalAmount.toLocaleString()}
                                    </span>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card padding="none">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left text-xs font-bold text-gray-500 uppercase px-4 py-3">Name</th>
                                    <th className="text-left text-xs font-bold text-gray-500 uppercase px-4 py-3">Type</th>
                                    <th className="text-left text-xs font-bold text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Counterparty</th>
                                    <th className="text-right text-xs font-bold text-gray-500 uppercase px-4 py-3">Balance</th>
                                    <th className="text-center text-xs font-bold text-gray-500 uppercase px-4 py-3 hidden lg:table-cell">Progress</th>
                                    <th className="text-center text-xs font-bold text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Payments</th>
                                    <th className="text-right text-xs font-bold text-gray-500 uppercase px-4 py-3 w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLoans.map(loan => {
                                    const progressPct = loan.originalAmount > 0 
                                        ? Math.round(((loan.originalAmount - loan.remainingBalance) / loan.originalAmount) * 100)
                                        : 0;
                                    const lastPayment = loan.transactions?.length 
                                        ? loan.transactions[loan.transactions.length - 1]
                                        : null;
                                    const totalPaid = loan.transactions?.reduce((sum, t) => 
                                        t.direction === 'out' ? sum + t.amount : sum - t.amount, 0) || 0;
                                    
                                    return (
                                        <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">
                                                    <HighlightText text={loan.name} highlight={searchQuery} />
                                                </div>
                                                <div className="text-xs text-gray-400 md:hidden">
                                                    <HighlightText text={loan.lender} highlight={searchQuery} />
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={loan.category === 'I Owe' ? 'danger' : 'success'} size="xs">
                                                    {loan.category === 'I Owe' ? 'Liability' : 'Asset'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                                                <HighlightText text={loan.lender} highlight={searchQuery} />
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="font-mono font-medium text-gray-900">
                                                    {loan.currency} {loan.remainingBalance.toLocaleString()}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    of {loan.currency} {loan.originalAmount.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 min-w-[80px]">
                                                        <Progress value={progressPct} size="sm" variant={loan.category === 'I Owe' ? 'danger' : 'success'} />
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-600 w-10 text-right">{progressPct}%</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center hidden md:table-cell">
                                                {loan.transactions?.length ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-sm font-medium text-gray-900">{loan.transactions.length}</span>
                                                        {lastPayment && (
                                                            <span className="text-xs text-gray-400">
                                                                Last: {new Date(lastPayment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">No payments</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleOpenPayments(loan); }}
                                                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                        title="Payment History"
                                                    >
                                                        <History size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(loan); }}
                                                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-muted rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleArchive(loan); }}
                                                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                        title={loan.isArchived ? 'Unarchive' : 'Archive'}
                                                    >
                                                        <Archive size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedLoan(null);
                }} 
                title={selectedLoan ? 'Edit Entry' : 'New Money Flow'}
                size="full"
            >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[45vh]">
                    {/* Left Column - Basic Info */}
                    <div className="lg:col-span-5 space-y-5">
                        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-5 border border-violet-100">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <ArrowUpDown size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Money Flow Details</h3>
                                    <p className="text-xs text-gray-500">Track loans and debts</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    label="Name"
                                    placeholder="e.g., Personal Loan, Credit Card..."
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                                
                                <Input
                                    label="Counterparty"
                                    placeholder="Who do you owe or who owes you?"
                                    value={formData.lender || ''}
                                    onChange={(e) => setFormData({...formData, lender: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <Button variant="secondary" fullWidth onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button 
                                variant="primary" 
                                fullWidth 
                                onClick={handleSave}
                                disabled={!formData.name || !formData.lender}
                            >
                                {selectedLoan ? 'Save Changes' : 'Add Entry'}
                            </Button>
                        </div>
                    </div>

                    {/* Right Column - Type & Amounts */}
                    <div className="lg:col-span-7 space-y-5">
                        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <ArrowUpDown size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Flow Direction</h3>
                                    <p className="text-xs text-gray-500">Are you lending or borrowing?</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {(['I Owe', 'Owed To Me'] as LoanCategory[]).map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setFormData({...formData, category: cat})}
                                        className={`p-5 rounded-xl border-2 text-center transition-all ${
                                            formData.category === cat
                                                ? cat === 'I Owe' 
                                                    ? 'border-red-500 bg-red-50'
                                                    : 'border-green-500 bg-green-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className={`text-3xl mb-2 ${formData.category === cat ? (cat === 'I Owe' ? 'text-red-500' : 'text-green-500') : 'text-gray-400'}`}>
                                            {cat === 'I Owe' ? '📤' : '📥'}
                                        </div>
                                        <span className={`font-semibold ${formData.category === cat ? (cat === 'I Owe' ? 'text-red-600' : 'text-green-600') : 'text-gray-600'}`}>
                                            {cat}
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {cat === 'I Owe' ? 'Money I need to pay' : 'Money coming to me'}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <DollarSign size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Amounts</h3>
                                    <p className="text-xs text-gray-500">Financial details</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <Input
                                    label="Original Amount"
                                    type="number"
                                    placeholder="0.00"
                                    value={formData.originalAmount || ''}
                                    onChange={(e) => setFormData({...formData, originalAmount: parseFloat(e.target.value) || 0})}
                                />
                                <Input
                                    label="Remaining Balance"
                                    type="number"
                                    placeholder="0.00"
                                    value={formData.remainingBalance || ''}
                                    onChange={(e) => setFormData({...formData, remainingBalance: parseFloat(e.target.value) || 0})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Interest Rate (%)"
                                    type="number"
                                    placeholder="0"
                                    value={formData.interestRate || ''}
                                    onChange={(e) => setFormData({...formData, interestRate: parseFloat(e.target.value) || 0})}
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
                                    onChange={(v) => setFormData({...formData, currency: v as any})}
                                />
                            </div>

                            {formData.originalAmount && formData.remainingBalance !== undefined && (
                                <div className="mt-4 bg-blue-50 rounded-lg p-3 border border-blue-100">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-blue-700">Progress</span>
                                        <span className="font-bold text-blue-900">
                                            {Math.round(((formData.originalAmount - formData.remainingBalance) / formData.originalAmount) * 100)}% paid off
                                        </span>
                                    </div>
                                    <div className="mt-2 h-2 bg-blue-200 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-500 rounded-full transition-all"
                                            style={{ width: `${Math.round(((formData.originalAmount - formData.remainingBalance) / formData.originalAmount) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal 
                isOpen={paymentModal.isOpen} 
                onClose={() => setPaymentModal({ isOpen: false, loan: null })} 
                title={`Payment History - ${paymentModal.loan?.name || ''}`}
            >
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl">
                        <div>
                            <p className="text-sm text-gray-500">Current Balance</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {paymentModal.loan?.currency} {paymentModal.loan?.remainingBalance.toLocaleString()}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Original Amount</p>
                            <p className="text-lg font-medium text-gray-600">
                                {paymentModal.loan?.currency} {paymentModal.loan?.originalAmount.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700">Add New Payment</h4>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                                <Input
                                    type="date"
                                    value={newPayment.date || ''}
                                    onChange={(e) => setNewPayment({...newPayment, date: e.target.value})}
                                    label="Date"
                                />
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={newPayment.amount || ''}
                                    onChange={(e) => setNewPayment({...newPayment, amount: parseFloat(e.target.value) || 0})}
                                    label="Amount"
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setNewPayment({...newPayment, direction: 'out'})}
                                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 ${
                                                newPayment.direction === 'out' ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                                            }`}
                                        >
                                            <ArrowUpRight size={14} /> Out
                                        </button>
                                        <button
                                            onClick={() => setNewPayment({...newPayment, direction: 'in'})}
                                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 ${
                                                newPayment.direction === 'in' ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                                            }`}
                                        >
                                            <ArrowDownLeft size={14} /> In
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-end gap-3">
                                <div className="flex-1">
                                    <Input
                                        placeholder="Add a note (optional)"
                                        value={newPayment.note || ''}
                                        onChange={(e) => setNewPayment({...newPayment, note: e.target.value})}
                                        label="Note"
                                    />
                                </div>
                                <Button 
                                    onClick={handleAddPayment}
                                    disabled={!newPayment.amount}
                                    icon={Plus}
                                >
                                    Add
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700">Transaction History</h4>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {(!paymentModal.loan?.transactions || paymentModal.loan.transactions.length === 0) ? (
                                <div className="p-8 text-center text-gray-400">
                                    <History className="mx-auto mb-2" size={24} />
                                    <p className="text-sm">No payments recorded yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {[...(paymentModal.loan?.transactions || [])].sort((a, b) => 
                                        new Date(b.date).getTime() - new Date(a.date).getTime()
                                    ).map(txn => (
                                        <div key={txn.id} className="p-3 hover:bg-gray-50 flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                    txn.direction === 'out' ? 'bg-red-50' : 'bg-green-50'
                                                }`}>
                                                    {txn.direction === 'out' ? (
                                                        <ArrowUpRight className="text-red-600" size={14} />
                                                    ) : (
                                                        <ArrowDownLeft className="text-green-600" size={14} />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-medium ${
                                                        txn.direction === 'out' ? 'text-red-600' : 'text-green-600'
                                                    }`}>
                                                        {txn.direction === 'out' ? '-' : '+'}{paymentModal.loan?.currency} {txn.amount.toLocaleString()}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                                        <Calendar size={10} />
                                                        {new Date(txn.date).toLocaleDateString()}
                                                        {txn.note && <span className="text-gray-500">• {txn.note}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDeletePayment(txn.id)}
                                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button variant="secondary" onClick={() => setPaymentModal({ isOpen: false, loan: null })}>
                            Close
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default LoansView;
