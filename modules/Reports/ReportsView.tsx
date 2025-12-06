import React, { useMemo } from 'react';
import { 
    BarChart2, Activity, TrendingUp, TrendingDown, Target, Flame, 
    DollarSign, FolderKanban, BookOpen, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import { useFirestore } from '../../services/firestore';
import { ProjectItem, Goal, Habit, FinancialItem, JournalEntry, Purchase } from '../../types';
import { Card, Badge, Progress, StatCard } from '../../components/ui';

const ReportsView: React.FC = () => {
    const { data: projects } = useFirestore<ProjectItem>('projects');
    const { data: goals } = useFirestore<Goal>('goals');
    const { data: habits } = useFirestore<Habit>('habits');
    const { data: financial } = useFirestore<FinancialItem>('financial');
    const { data: journal } = useFirestore<JournalEntry>('journal');
    const { data: purchases } = useFirestore<Purchase>('purchases');

    const projectStats = useMemo(() => {
        const total = projects.filter(p => p.type === 'project').length;
        const completed = projects.filter(p => p.status === 'Completed').length;
        const inProgress = projects.filter(p => p.status === 'In Progress').length;
        const avgProgress = total > 0 
            ? Math.round(projects.filter(p => p.type === 'project').reduce((sum, p) => sum + (p.progress || 0), 0) / total)
            : 0;
        return { total, completed, inProgress, avgProgress };
    }, [projects]);

    const goalStats = useMemo(() => {
        const total = goals.length;
        const achieved = goals.filter(g => g.status === 'Achieved').length;
        const avgProgress = total > 0 
            ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / total)
            : 0;
        return { total, achieved, avgProgress };
    }, [goals]);

    const habitStats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const completedToday = habits.filter(h => h.history.includes(today)).length;
        const totalStreak = habits.reduce((sum, h) => sum + h.streak, 0);
        const longestStreak = habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0;
        return { total: habits.length, completedToday, totalStreak, longestStreak };
    }, [habits]);

    const financeStats = useMemo(() => {
        const income = financial.filter(f => f.type === 'income' && f.isEnabled).reduce((sum, f) => sum + f.amount, 0);
        const expenses = financial.filter(f => f.type === 'expense' && f.isEnabled).reduce((sum, f) => sum + f.amount, 0);
        const net = income - expenses;
        const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;
        return { income, expenses, net, savingsRate };
    }, [financial]);

    const journalStats = useMemo(() => {
        const thisMonth = journal.filter(j => new Date(j.date).getMonth() === new Date().getMonth()).length;
        const moodCounts: Record<string, number> = {};
        journal.forEach(j => { moodCounts[j.mood] = (moodCounts[j.mood] || 0) + 1; });
        const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
        return { total: journal.length, thisMonth, topMood: topMood ? topMood[0] : 'None' };
    }, [journal]);

    const purchaseStats = useMemo(() => {
        const mustHaves = purchases.filter(p => p.urgency === 'Must Have');
        const totalValue = purchases.reduce((sum, p) => sum + (p.price || 0), 0);
        const oldMustHaves = mustHaves.filter(p => {
            const daysOld = Math.ceil((Date.now() - new Date(p.date || Date.now()).getTime()) / (1000 * 60 * 60 * 24));
            return daysOld > 30;
        });
        return { total: purchases.length, mustHaves: mustHaves.length, totalValue, oldMustHaves: oldMustHaves.length };
    }, [purchases]);

    return (
        <div className="space-y-6 animate-enter">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                        <BarChart2 size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Reports & Insights</h2>
                        <p className="text-white/80 text-sm">Analytics across all your life modules</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    title="Projects"
                    value={projectStats.total.toString()}
                    subtitle={`${projectStats.completed} completed`}
                    icon={FolderKanban}
                    color="orange"
                />
                <StatCard
                    title="Goals"
                    value={`${goalStats.avgProgress}%`}
                    subtitle={`${goalStats.achieved} achieved`}
                    icon={Target}
                    color="rose"
                />
                <StatCard
                    title="Habit Streak"
                    value={habitStats.longestStreak.toString()}
                    subtitle={`${habitStats.completedToday}/${habitStats.total} today`}
                    icon={Flame}
                    color="amber"
                />
                <StatCard
                    title="Net Savings"
                    value={`$${Math.abs(financeStats.net).toLocaleString()}`}
                    subtitle={`${financeStats.savingsRate}% savings rate`}
                    icon={DollarSign}
                    color={financeStats.net >= 0 ? 'green' : 'rose'}
                    trend={{ value: financeStats.savingsRate }}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <FolderKanban className="text-orange-500" size={20} />
                        <h3 className="font-bold text-gray-900">Projects Overview</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600">Completion Rate</span>
                                <span className="font-bold">{projectStats.total > 0 ? Math.round((projectStats.completed / projectStats.total) * 100) : 0}%</span>
                            </div>
                            <Progress value={projectStats.total > 0 ? (projectStats.completed / projectStats.total) * 100 : 0} variant="gradient" />
                        </div>
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-gray-900">{projectStats.total}</p>
                                <p className="text-xs text-gray-500">Total</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-amber-600">{projectStats.inProgress}</p>
                                <p className="text-xs text-gray-500">In Progress</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-green-600">{projectStats.completed}</p>
                                <p className="text-xs text-gray-500">Completed</p>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="text-green-500" size={20} />
                        <h3 className="font-bold text-gray-900">Financial Summary</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="text-green-600" size={16} />
                                <span className="text-sm font-medium text-gray-700">Monthly Income</span>
                            </div>
                            <span className="font-bold text-green-600">${financeStats.income.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                            <div className="flex items-center gap-2">
                                <TrendingDown className="text-red-600" size={16} />
                                <span className="text-sm font-medium text-gray-700">Monthly Expenses</span>
                            </div>
                            <span className="font-bold text-red-600">${financeStats.expenses.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border-2 border-gray-200">
                            <div className="flex items-center gap-2">
                                <DollarSign className="text-gray-600" size={16} />
                                <span className="text-sm font-medium text-gray-700">Net Savings</span>
                            </div>
                            <span className={`font-bold ${financeStats.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {financeStats.net >= 0 ? '+' : '-'}${Math.abs(financeStats.net).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <Flame className="text-orange-500" size={20} />
                        <h3 className="font-bold text-gray-900">Habits Performance</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-orange-50 rounded-xl text-center">
                            <p className="text-3xl font-bold text-orange-600">{habitStats.longestStreak}</p>
                            <p className="text-xs text-gray-500 mt-1">Best Streak</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-xl text-center">
                            <p className="text-3xl font-bold text-green-600">{habitStats.completedToday}</p>
                            <p className="text-xs text-gray-500 mt-1">Done Today</p>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-xl text-center">
                            <p className="text-3xl font-bold text-purple-600">{habitStats.total}</p>
                            <p className="text-xs text-gray-500 mt-1">Active Habits</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-xl text-center">
                            <p className="text-3xl font-bold text-blue-600">{habitStats.totalStreak}</p>
                            <p className="text-xs text-gray-500 mt-1">Combined Days</p>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <AlertCircle className="text-red-500" size={20} />
                        <h3 className="font-bold text-gray-900">Attention Needed</h3>
                    </div>
                    <div className="space-y-3">
                        {purchaseStats.oldMustHaves > 0 && (
                            <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                                <div>
                                    <p className="font-medium text-gray-900">Stale Must-Haves</p>
                                    <p className="text-xs text-gray-500">Items marked "Must Have" for 30+ days</p>
                                </div>
                                <Badge variant="danger" size="sm">{purchaseStats.oldMustHaves}</Badge>
                            </div>
                        )}
                        {goalStats.total > 0 && goalStats.avgProgress < 25 && (
                            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                                <div>
                                    <p className="font-medium text-gray-900">Goals Need Attention</p>
                                    <p className="text-xs text-gray-500">Average progress is below 25%</p>
                                </div>
                                <Badge variant="warning" size="sm">{goalStats.avgProgress}%</Badge>
                            </div>
                        )}
                        {habitStats.total > 0 && habitStats.completedToday < habitStats.total / 2 && (
                            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100">
                                <div>
                                    <p className="font-medium text-gray-900">Habits Incomplete</p>
                                    <p className="text-xs text-gray-500">Less than half completed today</p>
                                </div>
                                <Badge variant="warning" size="sm">{habitStats.completedToday}/{habitStats.total}</Badge>
                            </div>
                        )}
                        {purchaseStats.oldMustHaves === 0 && goalStats.avgProgress >= 25 && habitStats.completedToday >= habitStats.total / 2 && (
                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                                <div>
                                    <p className="font-medium text-gray-900">All Good!</p>
                                    <p className="text-xs text-gray-500">No urgent items need your attention</p>
                                </div>
                                <CheckCircle className="text-green-600" size={20} />
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            <Card>
                <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="text-pink-500" size={20} />
                    <h3 className="font-bold text-gray-900">Journal Insights</h3>
                </div>
                <div className="grid grid-cols-3 gap-6">
                    <div className="text-center">
                        <p className="text-4xl font-bold text-gray-900">{journalStats.total}</p>
                        <p className="text-sm text-gray-500 mt-1">Total Entries</p>
                    </div>
                    <div className="text-center">
                        <p className="text-4xl font-bold text-pink-600">{journalStats.thisMonth}</p>
                        <p className="text-sm text-gray-500 mt-1">This Month</p>
                    </div>
                    <div className="text-center">
                        <p className="text-4xl font-bold text-purple-600">{journalStats.topMood}</p>
                        <p className="text-sm text-gray-500 mt-1">Most Common Mood</p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ReportsView;
