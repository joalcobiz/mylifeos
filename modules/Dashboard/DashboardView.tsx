import React, { useState, useMemo } from 'react';
import { 
    LayoutDashboard, CheckCircle, Clock, TrendingUp, AlertCircle, 
    Calendar as CalendarIcon, MapPin, Search, ArrowRight, FolderKanban, 
    Wallet, BookOpen, X, Sparkles, Plus, Send, ChevronRight, ShoppingBag, Utensils,
    Flame, Target, FileText, Banknote, Check, MoreHorizontal, Eye, Zap,
    Settings, GripVertical, ChevronUp, ChevronDown, EyeOff, ListTodo,
    Sun, Cloud, Phone, Users, Bell, History, AlertOctagon, Star, Heart,
    Gift, Cake, Route
} from 'lucide-react';
import { useFirestore } from '../../services/firestore';
import { ProjectItem, FinancialItem, JournalEntry, Place, SearchResult, GroceryItem, Purchase, Habit, Goal, Itinerary, Settings as SettingsType, DashboardWidget } from '../../types';
import { Card, Button, Badge, Progress, StatCard, Input, EmptyState } from '../../components/ui';
import HighlightText from '../../components/HighlightText';
import { useAuth } from '../../contexts/AuthContext';
import { useSharing, filterDataBySharing, SharingMode } from '../../contexts/SharingContext';

interface CollapsibleSectionProps {
    title: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: 'red' | 'orange' | 'blue' | 'purple' | 'teal' | 'green';
    children: React.ReactNode;
    defaultExpanded?: boolean;
    actionButton?: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    icon,
    badge,
    badgeColor = 'blue',
    children,
    defaultExpanded = true,
    actionButton
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    
    const badgeColors = {
        red: 'bg-red-500 text-white',
        orange: 'bg-orange-500 text-white',
        blue: 'bg-blue-500 text-white',
        purple: 'bg-purple-500 text-white',
        teal: 'bg-teal-500 text-white',
        green: 'bg-green-500 text-white',
    };
    
    return (
        <div className="bg-white/70 backdrop-blur rounded-xl border border-gray-100 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    {icon}
                    <span className="font-semibold text-gray-800">{title}</span>
                    {badge !== undefined && badge > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeColors[badgeColor]}`}>
                            {badge}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {actionButton}
                    {isExpanded ? (
                        <ChevronUp size={18} className="text-gray-400" />
                    ) : (
                        <ChevronDown size={18} className="text-gray-400" />
                    )}
                </div>
            </button>
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100">
                    {children}
                </div>
            )}
        </div>
    );
};

interface ActionItemProps {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    subtitle: string;
    module: string;
    time?: string;
    actions?: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' }[];
    onComplete?: () => void;
    isCompleted?: boolean;
}

const ActionItem: React.FC<ActionItemProps> = ({
    icon,
    iconBg,
    title,
    subtitle,
    module,
    time,
    actions = [],
    onComplete,
    isCompleted = false
}) => {
    return (
        <div className={`flex items-start gap-3 py-3 border-b border-gray-50 last:border-0 ${isCompleted ? 'opacity-50' : ''}`}>
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className={`font-medium text-gray-900 truncate ${isCompleted ? 'line-through' : ''}`}>{title}</p>
                        <p className="text-sm text-gray-500 truncate">{subtitle}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">{module}</span>
                            {time && (
                                <>
                                    <span className="text-gray-300">•</span>
                                    <span className="text-xs text-gray-400">{time}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {onComplete && !isCompleted && (
                            <button
                                onClick={onComplete}
                                className="px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-lg hover:bg-green-600 transition-colors"
                            >
                                Complete
                            </button>
                        )}
                        {actions.map((action, idx) => (
                            <button
                                key={idx}
                                onClick={action.onClick}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                    action.variant === 'primary'
                                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

interface DashboardViewProps {
    autoFocusSearch?: boolean;
    onNavigate?: (view: string, itemId?: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ autoFocusSearch, onNavigate }) => {
    const { user } = useAuth();
    const { settings: sharingSettings, getModuleSharingMode } = useSharing();
    
    const { data: projects, add: addProject, update: updateProject } = useFirestore<ProjectItem>('projects');
    const { data: financial } = useFirestore<FinancialItem>('financial');
    const { data: places } = useFirestore<Place>('places');
    const { data: journal } = useFirestore<JournalEntry>('journal');
    const { data: groceries, update: updateGrocery } = useFirestore<GroceryItem>('groceries');
    const { data: purchases, update: updatePurchase } = useFirestore<Purchase>('purchases');
    const { data: habits, update: updateHabit } = useFirestore<Habit>('habits');
    const { data: goals, update: updateGoal } = useFirestore<Goal>('goals');
    const { data: itineraries } = useFirestore<Itinerary>('itineraries');
    const { data: settingsData, update: updateSettings } = useFirestore<SettingsType>('settings');
    
    const isAdmin = user?.isAdmin || user?.isSystemAdmin || false;
    const dashboardSharingMode = getModuleSharingMode('dashboard');
    
    const filteredProjects = useMemo(() => 
        filterDataBySharing(projects, user?.uid || '', dashboardSharingMode, isAdmin),
    [projects, dashboardSharingMode, user?.uid, isAdmin]);
    
    const filteredGoals = useMemo(() => 
        filterDataBySharing(goals as any[], user?.uid || '', dashboardSharingMode, isAdmin) as Goal[],
    [goals, dashboardSharingMode, user?.uid, isAdmin]);
    
    const filteredGroceries = useMemo(() => 
        filterDataBySharing(groceries as any[], user?.uid || '', dashboardSharingMode, isAdmin) as GroceryItem[],
    [groceries, dashboardSharingMode, user?.uid, isAdmin]);
    
    const filteredHabits = useMemo(() => 
        filterDataBySharing(habits as any[], user?.uid || '', dashboardSharingMode, isAdmin) as Habit[],
    [habits, dashboardSharingMode, user?.uid, isAdmin]);
    
    const filteredPlaces = useMemo(() => 
        filterDataBySharing(places as any[], user?.uid || '', dashboardSharingMode, isAdmin) as Place[],
    [places, dashboardSharingMode, user?.uid, isAdmin]);
    
    const filteredJournal = useMemo(() => 
        filterDataBySharing(journal as any[], user?.uid || '', dashboardSharingMode, isAdmin) as JournalEntry[],
    [journal, dashboardSharingMode, user?.uid, isAdmin]);
    
    const filteredFinancial = useMemo(() => 
        filterDataBySharing(financial as any[], user?.uid || '', dashboardSharingMode, isAdmin) as FinancialItem[],
    [financial, dashboardSharingMode, user?.uid, isAdmin]);
    
    const filteredItineraries = useMemo(() => 
        filterDataBySharing(itineraries as any[], user?.uid || '', dashboardSharingMode, isAdmin) as Itinerary[],
    [itineraries, dashboardSharingMode, user?.uid, isAdmin]);

    const [quickNote, setQuickNote] = useState('');
    const [quickNoteSuccess, setQuickNoteSuccess] = useState<{id: string, name: string} | null>(null);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const getGreeting = () => {
        const hour = today.getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };
    
    const formatDate = () => {
        return today.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    const handleQuickNoteSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickNote.trim()) return;

        const noteText = quickNote;
        setQuickNote('');

        let quickNotesProject = projects.find(p => p.isQuickNotes && p.creator === (user?.displayName || 'Me'));
        
        const newTask: ProjectItem = {
            id: `t-${Date.now()}`,
            type: 'task',
            name: noteText,
            status: 'Not Started',
            priority: 'Medium',
            assignee: user?.displayName || 'Me',
            dueDate: todayStr,
            createdDate: new Date().toISOString(),
            progress: 0,
            subtasks: [],
            notes: [],
            parentPath: ['Quick Notes']
        };

        if (quickNotesProject) {
            const updatedSubtasks = [newTask, ...(quickNotesProject.subtasks || [])];
            await updateProject(quickNotesProject.id, { subtasks: updatedSubtasks });
        } else {
            const newProject: any = {
                name: 'Quick Notes',
                type: 'project',
                isQuickNotes: true,
                status: 'In Progress',
                priority: 'Medium',
                creator: user?.displayName || 'Me',
                assignee: user?.displayName || 'Me',
                createdDate: new Date().toISOString(),
                subtasks: [newTask],
                progress: 0
            };
            await addProject(newProject);
        }

        setQuickNoteSuccess({ id: newTask.id, name: noteText });
        setTimeout(() => setQuickNoteSuccess(null), 3000);
    };

    const handleNavigate = (view: string, itemId?: string) => {
        if (onNavigate) {
            onNavigate(view, itemId);
        } else if (window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('lifeos-navigate', { detail: { view, itemId } }));
        }
    };

    const stats = useMemo(() => {
        const completedToday = filteredProjects.reduce((acc, p) => {
            const countCompletedToday = (items: ProjectItem[]): number => {
                return items.reduce((sum, item) => {
                    const isCompletedToday = item.status === 'Completed' && 
                        item.createdDate?.split('T')[0] === todayStr;
                    const subtaskCount = item.subtasks ? countCompletedToday(item.subtasks) : 0;
                    return sum + (isCompletedToday ? 1 : 0) + subtaskCount;
                }, 0);
            };
            return acc + countCompletedToday([p]);
        }, 0);
        
        const totalExpenses = filteredFinancial
            .filter(f => f.type === 'expense' && f.isEnabled && f.date?.startsWith(todayStr.substring(0, 7)))
            .reduce((s, f) => s + f.amount, 0);
        
        const todayHabits = filteredHabits.filter(h => h.history.includes(todayStr)).length;
        const journalCount = filteredJournal.filter(j => j.date?.startsWith(todayStr.substring(0, 7))).length;
        
        const streak = filteredHabits.reduce((max, h) => Math.max(max, h.streak || 0), 0);
        const tasksToday = filteredProjects.reduce((acc, p) => {
            const countTasks = (items: ProjectItem[]): number => {
                return items.reduce((sum, item) => {
                    const isDueToday = item.dueDate === todayStr && item.status !== 'Completed';
                    const subtaskCount = item.subtasks ? countTasks(item.subtasks) : 0;
                    return sum + (isDueToday ? 1 : 0) + subtaskCount;
                }, 0);
            };
            return acc + countTasks([p]);
        }, 0);
        
        const upcomingTrips = filteredItineraries.filter(i => 
            i.status === 'Planned' && i.startDate && new Date(i.startDate) > today
        ).length;
        
        return { completedToday, totalExpenses, todayHabits, totalHabits: filteredHabits.length, journalCount, streak, tasksToday, upcomingTrips };
    }, [filteredProjects, filteredFinancial, filteredHabits, filteredJournal, filteredItineraries, todayStr]);

    const overdueItems = useMemo(() => {
        const items: any[] = [];
        const now = new Date();
        
        const collectOverdue = (projectItems: ProjectItem[], parentProject?: ProjectItem) => {
            projectItems.forEach(item => {
                if (item.dueDate && item.status !== 'Completed') {
                    const dueDate = new Date(item.dueDate);
                    if (dueDate < now && dueDate.toDateString() !== now.toDateString()) {
                        const diffDays = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                        items.push({
                            ...item,
                            parentProject,
                            daysOverdue: diffDays,
                            module: 'Projects'
                        });
                    }
                }
                if (item.subtasks) collectOverdue(item.subtasks, parentProject || item);
            });
        };
        
        filteredProjects.forEach(p => collectOverdue([p]));
        
        return items.slice(0, 5);
    }, [filteredProjects]);

    const todayItems = useMemo(() => {
        const items: any[] = [];
        
        const collectToday = (projectItems: ProjectItem[], parentProject?: ProjectItem) => {
            projectItems.forEach(item => {
                if (item.dueDate === todayStr && item.status !== 'Completed') {
                    items.push({
                        ...item,
                        type: 'task',
                        parentProject,
                        module: 'Projects',
                        icon: FolderKanban,
                        iconBg: 'bg-orange-100',
                        iconColor: 'text-orange-600'
                    });
                }
                if (item.subtasks) collectToday(item.subtasks, parentProject || item);
            });
        };
        
        filteredProjects.forEach(p => collectToday([p]));
        
        filteredGroceries.filter(g => !g.completed).slice(0, 3).forEach(g => {
            items.push({
                id: g.id,
                name: `Buy ${g.name}`,
                type: 'grocery',
                module: 'Groceries',
                subtitle: g.category,
                icon: Utensils,
                iconBg: 'bg-lime-100',
                iconColor: 'text-lime-600'
            });
        });
        
        filteredHabits.filter(h => !h.history.includes(todayStr)).slice(0, 3).forEach(h => {
            items.push({
                id: h.id,
                name: h.name,
                type: 'habit',
                module: 'Habits',
                subtitle: `${h.streak} day streak`,
                icon: Flame,
                iconBg: 'bg-orange-100',
                iconColor: 'text-orange-600'
            });
        });
        
        filteredGoals.filter(g => g.status === 'In Progress').slice(0, 2).forEach(g => {
            items.push({
                id: g.id,
                name: g.name,
                type: 'goal',
                module: 'Goals',
                subtitle: `${g.progress}% complete`,
                icon: Target,
                iconBg: 'bg-red-100',
                iconColor: 'text-red-600'
            });
        });
        
        return items.slice(0, 10);
    }, [filteredProjects, filteredGroceries, filteredHabits, filteredGoals, todayStr]);

    const upcomingItems = useMemo(() => {
        const items: any[] = [];
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const collectUpcoming = (projectItems: ProjectItem[]) => {
            projectItems.forEach(item => {
                if (item.dueDate && item.status !== 'Completed') {
                    const dueDate = new Date(item.dueDate);
                    if (dueDate > now && dueDate <= weekFromNow && item.dueDate !== todayStr) {
                        items.push({
                            ...item,
                            module: 'Projects',
                            dueDate: item.dueDate
                        });
                    }
                }
                if (item.subtasks) collectUpcoming(item.subtasks);
            });
        };
        
        filteredProjects.forEach(p => collectUpcoming([p]));
        
        filteredGoals.filter(g => g.deadline && g.status !== 'Achieved').forEach(g => {
            const deadline = new Date(g.deadline!);
            if (deadline > now && deadline <= weekFromNow) {
                items.push({
                    id: g.id,
                    name: g.name,
                    module: 'Goals',
                    dueDate: g.deadline,
                    type: 'goal'
                });
            }
        });
        
        filteredItineraries.filter(i => i.startDate && i.status === 'Planned').forEach(i => {
            const startDate = new Date(i.startDate!);
            if (startDate > now && startDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
                items.push({
                    id: i.id,
                    name: i.name,
                    module: 'Itineraries',
                    dueDate: i.startDate,
                    type: 'trip'
                });
            }
        });
        
        return items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 5);
    }, [filteredProjects, filteredGoals, filteredItineraries, todayStr]);

    const forYouItems = useMemo(() => {
        const items: any[] = [];
        
        filteredPlaces.filter(p => p.lastVisited).slice(0, 2).forEach(p => {
            const lastVisit = new Date(p.lastVisited!);
            const monthsAgo = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24 * 30));
            if (monthsAgo >= 3) {
                items.push({
                    id: p.id,
                    name: `You haven't visited ${p.name} in ${monthsAgo} months`,
                    module: 'Places',
                    type: 'suggestion',
                    actions: [
                        { label: 'Plan Visit', onClick: () => handleNavigate('places', p.id) },
                        { label: 'Dismiss', onClick: () => {}, variant: 'secondary' as const }
                    ]
                });
            }
        });
        
        filteredGoals.filter(g => g.status === 'In Progress' && g.progress < 50).slice(0, 2).forEach(g => {
            items.push({
                id: g.id,
                name: `Goal check-in: "${g.name}"`,
                subtitle: `Currently at ${g.progress}%`,
                module: 'Goals',
                type: 'suggestion',
                actions: [
                    { label: 'Update', onClick: () => handleNavigate('goals', g.id), variant: 'primary' as const }
                ]
            });
        });
        
        if (filteredJournal.length === 0 || !filteredJournal.some(j => j.date === todayStr)) {
            items.push({
                id: 'journal-prompt',
                name: 'Journal: "What are you grateful for today?"',
                subtitle: 'Journal prompt',
                module: 'Journal',
                type: 'suggestion',
                actions: [
                    { label: 'Write', onClick: () => handleNavigate('journal'), variant: 'primary' as const },
                    { label: 'Skip', onClick: () => {}, variant: 'secondary' as const }
                ]
            });
        }
        
        return items.slice(0, 5);
    }, [filteredPlaces, filteredGoals, filteredJournal, todayStr]);

    const handleCompleteTask = async (item: any) => {
        if (item.type === 'task' || item.module === 'Projects') {
            const findAndUpdateProject = (items: ProjectItem[]): ProjectItem[] => {
                return items.map(p => {
                    if (p.id === item.id) {
                        return { ...p, status: 'Completed' as const };
                    }
                    if (p.subtasks) {
                        return { ...p, subtasks: findAndUpdateProject(p.subtasks) };
                    }
                    return p;
                });
            };
            
            const projectToUpdate = filteredProjects.find(p => {
                if (p.id === item.id) return true;
                const findInSubtasks = (subtasks: ProjectItem[]): boolean => {
                    return subtasks.some(s => s.id === item.id || (s.subtasks && findInSubtasks(s.subtasks)));
                };
                return p.subtasks && findInSubtasks(p.subtasks);
            });
            
            if (projectToUpdate) {
                if (projectToUpdate.id === item.id) {
                    await updateProject(projectToUpdate.id, { status: 'Completed' });
                } else {
                    const updatedSubtasks = findAndUpdateProject(projectToUpdate.subtasks || []);
                    await updateProject(projectToUpdate.id, { subtasks: updatedSubtasks });
                }
            }
        } else if (item.type === 'grocery') {
            await updateGrocery(item.id, { completed: true });
        } else if (item.type === 'habit') {
            const habit = filteredHabits.find(h => h.id === item.id);
            if (habit) {
                const newHistory = [...habit.history, todayStr];
                await updateHabit(habit.id, { history: newHistory, streak: (habit.streak || 0) + 1 });
            }
        }
    };
    
    const moduleToRoute: Record<string, string> = {
        'Projects': 'projects',
        'Goals': 'goals',
        'Itineraries': 'itineraries',
        'Trips': 'itineraries',
        'Places': 'places',
        'Journal': 'journal',
        'Habits': 'habits',
        'Groceries': 'groceries',
        'Financial': 'financial'
    };

    const getRelativeDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays <= 7) return `In ${diffDays} days`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="space-y-6 animate-enter">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold">{getGreeting()}, {user?.displayName?.split(' ')[0] || 'there'}!</h1>
                            <Sun className="text-yellow-300" size={24} />
                        </div>
                        <p className="text-indigo-100">{formatDate()}</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/20">
                    {stats.streak > 0 && (
                        <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
                            <Flame size={16} className="text-orange-300" />
                            <span className="text-sm font-medium">{stats.streak}-day streak</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
                        <CheckCircle size={16} className="text-green-300" />
                        <span className="text-sm font-medium">{stats.tasksToday} tasks today</span>
                    </div>
                    {stats.upcomingTrips > 0 && (
                        <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
                            <Route size={16} className="text-cyan-300" />
                            <span className="text-sm font-medium">{stats.upcomingTrips} upcoming trips</span>
                        </div>
                    )}
                </div>
            </div>

            <form onSubmit={handleQuickNoteSubmit} className="relative">
                <Card variant="gradient" padding="none" className="overflow-hidden">
                    <div className="flex items-center gap-3 p-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                            <Zap size={20} className="text-white" />
                        </div>
                        <input
                            type="text"
                            value={quickNote}
                            onChange={(e) => setQuickNote(e.target.value)}
                            placeholder="Quick capture: Add a task, note, or idea..."
                            className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-sm"
                        />
                        <Button type="submit" variant="primary" size="sm" icon={Send} disabled={!quickNote.trim()}>
                            Add
                        </Button>
                    </div>
                </Card>
                {quickNoteSuccess && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-green-50 text-green-800 text-sm p-3 rounded-lg border border-green-200 flex items-center gap-2 animate-enter">
                        <Check size={16} className="text-green-600" />
                        Added "{quickNoteSuccess.name}" to Quick Notes
                    </div>
                )}
            </form>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/70 backdrop-blur rounded-xl p-4 border border-gray-100 text-center">
                    <p className="text-3xl font-bold text-gray-900">{stats.completedToday}</p>
                    <p className="text-sm text-gray-500">Tasks Done</p>
                </div>
                <div className="bg-white/70 backdrop-blur rounded-xl p-4 border border-gray-100 text-center">
                    <p className="text-3xl font-bold text-gray-900">
                        {stats.totalHabits > 0 ? Math.round((stats.todayHabits / stats.totalHabits) * 100) : 0}%
                    </p>
                    <p className="text-sm text-gray-500">Habits</p>
                </div>
                <div className="bg-white/70 backdrop-blur rounded-xl p-4 border border-gray-100 text-center">
                    <p className="text-3xl font-bold text-gray-900">{stats.journalCount}</p>
                    <p className="text-sm text-gray-500">Journal Entries</p>
                </div>
                <div className="bg-white/70 backdrop-blur rounded-xl p-4 border border-gray-100 text-center">
                    <p className="text-3xl font-bold text-emerald-600">${stats.totalExpenses.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">Spent</p>
                </div>
            </div>

            <div className="space-y-4">
                {overdueItems.length > 0 && (
                    <CollapsibleSection
                        title="Overdue"
                        icon={<AlertOctagon size={20} className="text-red-500" />}
                        badge={overdueItems.length}
                        badgeColor="red"
                    >
                        <div className="pt-3">
                            {overdueItems.map(item => (
                                <ActionItem
                                    key={item.id}
                                    icon={<FolderKanban size={18} className="text-orange-600" />}
                                    iconBg="bg-orange-100"
                                    title={item.name}
                                    subtitle={item.parentProject?.name || ''}
                                    module="Projects"
                                    time={`${item.daysOverdue} days overdue`}
                                    onComplete={() => handleCompleteTask(item)}
                                />
                            ))}
                        </div>
                    </CollapsibleSection>
                )}

                <CollapsibleSection
                    title="Today"
                    icon={<CalendarIcon size={20} className="text-orange-500" />}
                    badge={todayItems.length}
                    badgeColor="orange"
                >
                    <div className="pt-3">
                        {todayItems.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">No tasks for today</p>
                        ) : (
                            todayItems.map(item => (
                                <ActionItem
                                    key={item.id}
                                    icon={<item.icon size={18} className={item.iconColor} />}
                                    iconBg={item.iconBg}
                                    title={item.name}
                                    subtitle={item.subtitle || item.parentProject?.name || ''}
                                    module={item.module}
                                    onComplete={item.type !== 'goal' ? () => handleCompleteTask(item) : undefined}
                                    actions={item.type === 'goal' ? [
                                        { label: 'View', onClick: () => handleNavigate('goals', item.id) }
                                    ] : []}
                                />
                            ))
                        )}
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Upcoming"
                    icon={<Clock size={20} className="text-blue-500" />}
                    badge={upcomingItems.length}
                    badgeColor="blue"
                    defaultExpanded={false}
                >
                    <div className="pt-3">
                        {upcomingItems.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">No upcoming items</p>
                        ) : (
                            upcomingItems.map(item => (
                                <ActionItem
                                    key={item.id}
                                    icon={
                                        item.type === 'goal' ? <Target size={18} className="text-red-600" /> :
                                        item.type === 'trip' ? <Route size={18} className="text-indigo-600" /> :
                                        <FolderKanban size={18} className="text-orange-600" />
                                    }
                                    iconBg={
                                        item.type === 'goal' ? 'bg-red-100' :
                                        item.type === 'trip' ? 'bg-indigo-100' :
                                        'bg-orange-100'
                                    }
                                    title={item.name}
                                    subtitle=""
                                    module={item.module}
                                    time={getRelativeDate(item.dueDate)}
                                    actions={[
                                        { label: 'View', onClick: () => handleNavigate(moduleToRoute[item.module] || item.module.toLowerCase(), item.id) }
                                    ]}
                                />
                            ))
                        )}
                    </div>
                </CollapsibleSection>

                {forYouItems.length > 0 && (
                    <CollapsibleSection
                        title="For You"
                        icon={<Sparkles size={20} className="text-purple-500" />}
                        badge={forYouItems.length}
                        badgeColor="purple"
                        defaultExpanded={false}
                    >
                        <div className="pt-3">
                            {forYouItems.map(item => (
                                <ActionItem
                                    key={item.id}
                                    icon={
                                        item.module === 'Places' ? <MapPin size={18} className="text-rose-600" /> :
                                        item.module === 'Goals' ? <Target size={18} className="text-red-600" /> :
                                        <BookOpen size={18} className="text-pink-600" />
                                    }
                                    iconBg={
                                        item.module === 'Places' ? 'bg-rose-100' :
                                        item.module === 'Goals' ? 'bg-red-100' :
                                        'bg-pink-100'
                                    }
                                    title={item.name}
                                    subtitle={item.subtitle || ''}
                                    module={item.module}
                                    actions={item.actions}
                                />
                            ))}
                        </div>
                    </CollapsibleSection>
                )}
            </div>
        </div>
    );
};

export default DashboardView;
