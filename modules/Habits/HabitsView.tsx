import React, { useState, useMemo } from 'react';
import { Plus, Flame, Check, Calendar, Zap, Trash2, Edit2, MoreHorizontal, TrendingUp, Award, Clock } from 'lucide-react';
import { Habit } from '../../types';
import { useFirestore } from '../../services/firestore';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Card, Button, Badge, Progress, Input, EmptyState } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useSharing, filterDataBySharing, SharingMode } from '../../contexts/SharingContext';
import SharingFilter, { OwnerBadge } from '../../components/SharingFilter';
import { ConfiguredModuleHeader } from '../../components/ModuleHeader';

const HabitsView: React.FC = () => {
    const { user } = useAuth();
    const { settings: sharingSettings, getModuleSharingMode, getOwnerName, isOwner } = useSharing();
    const { data: habits, add: addHabit, update: updateHabit, remove: removeHabit } = useFirestore<Habit>('habits');
    
    const [sharingMode, setSharingMode] = useState<SharingMode>(() => getModuleSharingMode('habits'));
    const isAdmin = user?.isAdmin === true;

    const sharingStats = useMemo(() => {
        const userId = user?.uid || '';
        return {
            total: habits.length,
            mine: habits.filter(h => h.owner === userId).length,
            shared: habits.filter(h => 
                h.owner !== userId && (h.isShared || h.sharedWith?.includes(userId))
            ).length,
            assigned: habits.filter(h => 
                (h as any).assignedTo === userId && h.owner !== userId
            ).length
        };
    }, [habits, user]);

    const filteredBySharingHabits = useMemo(() => {
        return filterDataBySharing(
            habits as any[], 
            user?.uid || '', 
            sharingMode, 
            isAdmin
        ) as Habit[];
    }, [habits, user, sharingMode, isAdmin]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; habitId: string; habitName: string }>({ isOpen: false, habitId: '', habitName: '' });
    const [newHabit, setNewHabit] = useState<Partial<Habit>>({ 
        name: '', 
        description: '',
        frequency: 'Daily', 
        streak: 0, 
        history: [] 
    });

    const handleConfirmDelete = async () => {
        if (deleteConfirm.habitId) {
            await removeHabit(deleteConfirm.habitId);
            setDeleteConfirm({ isOpen: false, habitId: '', habitName: '' });
        }
    };

    const today = new Date().toISOString().split('T')[0];

    const getLast30Days = () => {
        const days = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }
        return days;
    };

    const getLast7Days = () => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push({
                date: d.toISOString().split('T')[0],
                day: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2),
                dayNum: d.getDate()
            });
        }
        return days;
    };

    const last7Days = getLast7Days();
    const last30Days = getLast30Days();

    const toggleHabit = async (habit: Habit, dateStr: string) => {
        const isCompleted = habit.history.includes(dateStr);
        let newHistory = [...habit.history];
        
        if (isCompleted) {
            newHistory = newHistory.filter(d => d !== dateStr);
        } else {
            newHistory.push(dateStr);
        }

        let newStreak = habit.streak;
        if (dateStr === today) {
            newStreak = isCompleted ? Math.max(0, newStreak - 1) : newStreak + 1;
        }

        await updateHabit(habit.id, { history: newHistory, streak: newStreak });
    };

    const handleSave = async () => {
        if (!newHabit.name) return;
        
        if (editingHabit) {
            await updateHabit(editingHabit.id, { 
                name: newHabit.name,
                description: newHabit.description,
                frequency: newHabit.frequency
            });
        } else {
            await addHabit({ 
                ...newHabit, 
                history: [], 
                streak: 0 
            } as any);
        }
        
        setIsModalOpen(false);
        setEditingHabit(null);
        setNewHabit({ name: '', description: '', frequency: 'Daily', streak: 0, history: [] });
    };

    const handleEdit = (habit: Habit) => {
        setEditingHabit(habit);
        setNewHabit({ 
            name: habit.name, 
            description: habit.description,
            frequency: habit.frequency 
        });
        setIsModalOpen(true);
    };

    const getCompletionRate = (habit: Habit) => {
        const completed = last30Days.filter(d => habit.history.includes(d)).length;
        return Math.round((completed / 30) * 100);
    };

    const stats = useMemo(() => {
        const todayCompleted = habits.filter(h => h.history.includes(today)).length;
        const totalStreak = habits.reduce((sum, h) => sum + h.streak, 0);
        const avgCompletion = habits.length > 0 
            ? Math.round(habits.reduce((sum, h) => sum + getCompletionRate(h), 0) / habits.length)
            : 0;
        const longestStreak = habits.length > 0 
            ? Math.max(...habits.map(h => h.streak))
            : 0;
        return { todayCompleted, totalStreak, avgCompletion, longestStreak };
    }, [habits, today]);

    return (
        <div className="space-y-6 animate-enter">
            <ConfiguredModuleHeader 
                moduleKey="habits" 
                actions={
                    <Button 
                        onClick={() => {
                            setEditingHabit(null);
                            setNewHabit({ name: '', description: '', frequency: 'Daily', streak: 0, history: [] });
                            setIsModalOpen(true);
                        }} 
                        variant="secondary"
                        icon={Plus}
                    >
                        New Habit
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
                <Card className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-3">
                        <Check className="text-green-600" size={24} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.todayCompleted}/{habits.length}</p>
                    <p className="text-sm text-gray-500">Today</p>
                </Card>
                <Card className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center mx-auto mb-3">
                        <Flame className="text-orange-600" size={24} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.longestStreak}</p>
                    <p className="text-sm text-gray-500">Best Streak</p>
                </Card>
                <Card className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                        <TrendingUp className="text-blue-600" size={24} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.avgCompletion}%</p>
                    <p className="text-sm text-gray-500">Avg Rate</p>
                </Card>
                <Card className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
                        <Award className="text-purple-600" size={24} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalStreak}</p>
                    <p className="text-sm text-gray-500">Total Days</p>
                </Card>
            </div>

            {filteredBySharingHabits.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={Flame}
                        title="No habits yet"
                        description="Start building better routines by adding your first habit"
                        actionLabel="Add Your First Habit"
                        onAction={() => setIsModalOpen(true)}
                    />
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredBySharingHabits.map(habit => {
                        const isDoneToday = habit.history.includes(today);
                        const completionRate = getCompletionRate(habit);
                        
                        return (
                            <Card key={habit.id} className="overflow-hidden" hover>
                                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => toggleHabit(habit, today)}
                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                                        isDoneToday 
                                                            ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/30 scale-105' 
                                                            : 'bg-gray-100 text-gray-400 hover:bg-green-50 hover:text-green-500 hover:border-green-200 border-2 border-transparent'
                                                    }`}
                                                >
                                                    <Check size={20} strokeWidth={3} />
                                                </button>
                                                <div>
                                                    <h3 className={`font-semibold text-lg ${isDoneToday ? 'text-gray-400' : 'text-gray-900'}`}>
                                                        {habit.name}
                                                    </h3>
                                                    {habit.description && (
                                                        <p className="text-sm text-gray-500 mt-0.5">{habit.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => handleEdit(habit)}
                                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => setDeleteConfirm({ isOpen: true, habitId: habit.id, habitName: habit.name })}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 mt-3 flex-wrap">
                                            <Badge variant={habit.streak > 0 ? 'warning' : 'default'} dot>
                                                <Flame size={12} className="mr-1" />
                                                {habit.streak} day streak
                                            </Badge>
                                            <Badge variant="default">
                                                <Zap size={12} className="mr-1" />
                                                {completionRate}% this month
                                            </Badge>
                                            <Badge variant="info">{habit.frequency}</Badge>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 lg:gap-3 flex-wrap lg:flex-nowrap">
                                        {last7Days.map(({ date, day, dayNum }) => {
                                            const done = habit.history.includes(date);
                                            const isToday = date === today;
                                            return (
                                                <div key={date} className="flex flex-col items-center gap-1">
                                                    <span className="text-[10px] text-gray-400 font-medium uppercase">{day}</span>
                                                    <button
                                                        onClick={() => toggleHabit(habit, date)}
                                                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm transition-all duration-200 ${
                                                            done 
                                                                ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-md' 
                                                                : 'bg-gray-50 text-gray-400 hover:bg-gray-100 border border-gray-200'
                                                        } ${isToday ? 'ring-2 ring-offset-2 ring-primary/30' : ''}`}
                                                    >
                                                        {done ? <Check size={16} strokeWidth={3} /> : dayNum}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                                        <span>30-Day Activity</span>
                                        <span>{completionRate}% completion</span>
                                    </div>
                                    <div className="flex gap-0.5">
                                        {last30Days.map(date => {
                                            const done = habit.history.includes(date);
                                            return (
                                                <div
                                                    key={date}
                                                    className={`flex-1 h-2 rounded-sm ${
                                                        done ? 'bg-green-400' : 'bg-gray-100'
                                                    }`}
                                                    title={date}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingHabit(null);
                }} 
                title={editingHabit ? "Edit Habit" : "Create New Habit"}
                size="full"
            >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[40vh]">
                    {/* Left Column - Habit Info */}
                    <div className="lg:col-span-5 space-y-5">
                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-5 border border-orange-100">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <Flame size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Habit Details</h3>
                                    <p className="text-xs text-gray-500">Build your daily routine</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    label="Habit Name"
                                    placeholder="e.g., Morning meditation, Read 30 mins..."
                                    value={newHabit.name || ''}
                                    onChange={(e) => setNewHabit({...newHabit, name: e.target.value})}
                                />
                                
                                <Input
                                    label="Description (optional)"
                                    placeholder="Why is this habit important to you?"
                                    value={newHabit.description || ''}
                                    onChange={(e) => setNewHabit({...newHabit, description: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <Button 
                                variant="secondary" 
                                fullWidth 
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setEditingHabit(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button 
                                variant="primary" 
                                fullWidth 
                                onClick={handleSave}
                                disabled={!newHabit.name}
                            >
                                {editingHabit ? 'Save Changes' : 'Create Habit'}
                            </Button>
                        </div>
                    </div>

                    {/* Right Column - Frequency */}
                    <div className="lg:col-span-7 space-y-5">
                        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <Clock size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Frequency</h3>
                                    <p className="text-xs text-gray-500">How often will you do this?</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {['Daily', 'Weekly'].map(freq => (
                                    <button
                                        key={freq}
                                        onClick={() => setNewHabit({...newHabit, frequency: freq as any})}
                                        className={`p-6 rounded-xl border-2 text-center transition-all ${
                                            newHabit.frequency === freq
                                                ? 'border-primary bg-primary-muted'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className={`text-3xl mb-2 ${newHabit.frequency === freq ? 'text-primary' : 'text-gray-400'}`}>
                                            {freq === 'Daily' ? '📅' : '📆'}
                                        </div>
                                        <span className={`text-lg font-semibold ${newHabit.frequency === freq ? 'text-primary' : 'text-gray-600'}`}>
                                            {freq}
                                        </span>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {freq === 'Daily' ? 'Every single day' : 'Once per week'}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
                            <div className="flex items-center gap-3">
                                <div className="text-3xl">💪</div>
                                <div>
                                    <h4 className="font-semibold text-gray-900">Pro Tip</h4>
                                    <p className="text-sm text-gray-600">Start small! It's better to do a habit for 5 minutes daily than to skip it because you aimed too high.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, habitId: '', habitName: '' })}
                onConfirm={handleConfirmDelete}
                title="Delete Habit"
                message={`Are you sure you want to delete "${deleteConfirm.habitName}"? Your streak and history will be lost.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
};

export default HabitsView;
