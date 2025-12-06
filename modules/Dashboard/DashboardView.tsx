import React, { useState, useMemo } from 'react';
import { 
    LayoutDashboard, CheckCircle, Clock, TrendingUp, AlertCircle, 
    Calendar as CalendarIcon, MapPin, Search, ArrowRight, FolderKanban, 
    Wallet, BookOpen, X, Sparkles, Plus, Send, ChevronRight, ShoppingBag, Utensils,
    Flame, Target, FileText, Banknote, Check, MoreHorizontal, Eye, Zap,
    Settings, GripVertical, ChevronUp, ChevronDown, EyeOff, ListTodo
} from 'lucide-react';
import { useFirestore } from '../../services/firestore';
import { ProjectItem, FinancialItem, JournalEntry, Place, SearchResult, GroceryItem, Purchase, Habit, Goal, Itinerary, Settings as SettingsType, DashboardWidget } from '../../types';
import { Card, Button, Badge, Progress, StatCard, Input, EmptyState } from '../../components/ui';
import HighlightText from '../../components/HighlightText';
import { useAuth } from '../../contexts/AuthContext';
import { useSharing, filterDataBySharing, SharingMode } from '../../contexts/SharingContext';
import { TaskStream, StreamItem } from '../../components/TaskStream';

const DEFAULT_WIDGETS: DashboardWidget[] = [
    { id: 'w1', type: 'quickCapture', isVisible: true, order: 0 },
    { id: 'w2', type: 'taskStream', isVisible: true, order: 1 },
    { id: 'w3', type: 'stats', isVisible: true, order: 2 },
    { id: 'w4', type: 'habits', isVisible: true, order: 3 },
    { id: 'w5', type: 'upcoming', isVisible: true, order: 4 },
    { id: 'w6', type: 'goals', isVisible: true, order: 5 },
    { id: 'w7', type: 'journal', isVisible: true, order: 6 },
    { id: 'w8', type: 'groceries', isVisible: true, order: 7 },
    { id: 'w9', type: 'trips', isVisible: true, order: 8 },
];

const WIDGET_LABELS: Record<string, string> = {
    quickCapture: 'Quick Capture',
    taskStream: 'Task Stream',
    stats: 'Stats Overview',
    habits: 'Today\'s Habits',
    upcoming: 'Upcoming Events',
    goals: 'Goals Progress',
    journal: 'Recent Journal',
    groceries: 'Grocery List',
    trips: 'Upcoming Itineraries',
};

interface DashboardViewProps {
    autoFocusSearch?: boolean;
}

const DashboardView: React.FC<DashboardViewProps> = ({ autoFocusSearch }) => {
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
    
    const filteredGroceries = useMemo(() => 
        filterDataBySharing(groceries as any[], user?.uid || '', dashboardSharingMode, isAdmin) as GroceryItem[],
    [groceries, dashboardSharingMode, user?.uid, isAdmin]);
    
    const filteredPurchases = useMemo(() => 
        filterDataBySharing(purchases as any[], user?.uid || '', dashboardSharingMode, isAdmin) as Purchase[],
    [purchases, dashboardSharingMode, user?.uid, isAdmin]);
    
    const filteredGoals = useMemo(() => 
        filterDataBySharing(goals as any[], user?.uid || '', dashboardSharingMode, isAdmin) as Goal[],
    [goals, dashboardSharingMode, user?.uid, isAdmin]);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchExpanded, setIsSearchExpanded] = useState(!!autoFocusSearch);
    const [quickNote, setQuickNote] = useState('');
    const [quickNoteSuccess, setQuickNoteSuccess] = useState<{id: string, name: string} | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    
    const settings = settingsData[0];
    const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS);
    
    React.useEffect(() => {
        if (settings?.dashboardWidgets && settings.dashboardWidgets.length > 0) {
            setWidgets(settings.dashboardWidgets);
        }
    }, [settings?.dashboardWidgets]);
    
    const sortedWidgets = useMemo(() => 
        [...widgets].sort((a, b) => a.order - b.order),
    [widgets]);
    
    const moveWidget = (widgetId: string, direction: 'up' | 'down') => {
        const idx = sortedWidgets.findIndex(w => w.id === widgetId);
        if (idx === -1) return;
        if (direction === 'up' && idx === 0) return;
        if (direction === 'down' && idx === sortedWidgets.length - 1) return;
        
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        const newWidgets = [...widgets];
        
        const widgetA = newWidgets.find(w => w.id === sortedWidgets[idx].id)!;
        const widgetB = newWidgets.find(w => w.id === sortedWidgets[swapIdx].id)!;
        
        const tempOrder = widgetA.order;
        widgetA.order = widgetB.order;
        widgetB.order = tempOrder;
        
        setWidgets(newWidgets);
    };
    
    const toggleWidgetVisibility = (widgetId: string) => {
        const newWidgets = widgets.map(w => 
            w.id === widgetId ? { ...w, isVisible: !w.isVisible } : w
        );
        setWidgets(newWidgets);
    };
    
    const saveLayout = async () => {
        if (settings?.id) {
            await updateSettings(settings.id, { dashboardWidgets: widgets });
        }
        setIsEditMode(false);
    };
    
    const cancelEdit = () => {
        if (settings?.dashboardWidgets) {
            setWidgets(settings.dashboardWidgets);
        } else {
            setWidgets(DEFAULT_WIDGETS);
        }
        setIsEditMode(false);
    };

    const today = new Date().toISOString().split('T')[0];

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
            dueDate: today,
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

    const toggleHabitToday = async (habit: Habit) => {
        const isDone = habit.history.includes(today);
        let newHistory = isDone ? habit.history.filter(d => d !== today) : [...habit.history, today];
        let newStreak = isDone ? Math.max(0, habit.streak - 1) : habit.streak + 1;
        await updateHabit(habit.id, { history: newHistory, streak: newStreak });
    };

    const handleCompleteStreamItem = async (item: StreamItem) => {
        switch (item.sourceCollection) {
            case 'projects':
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
                
                const projectToUpdate = projects.find(p => {
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
                break;
                
            case 'groceries':
                await updateGrocery(item.id, { completed: true });
                break;
                
            case 'purchases':
                await updatePurchase(item.id, { status: 'Delivered' });
                break;
                
            case 'goals':
                await updateGoal(item.id, { status: 'Achieved', progress: 100 });
                break;
        }
    };

    const handleNavigateFromStream = (type: string, id: string) => {
        const moduleMap: Record<string, string> = {
            'projects': 'projects',
            'groceries': 'groceries', 
            'purchases': 'purchases',
            'goals': 'goals'
        };
        const viewName = moduleMap[type];
        if (viewName && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('lifeos-navigate', { detail: { view: viewName, itemId: id } }));
        }
    };

    const searchResults = useMemo<SearchResult[]>(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase();
        const hits: SearchResult[] = [];

        const searchProjects = (items: ProjectItem[]) => {
            items.forEach(p => {
                if (p.name.toLowerCase().includes(q)) hits.push({ id: p.id, type: 'projects', title: p.name, subtitle: p.status, matchField: 'Name' });
                if (p.subtasks) searchProjects(p.subtasks);
            });
        };
        searchProjects(projects);

        financial.forEach(f => {
            if (f.description.toLowerCase().includes(q)) {
                hits.push({ id: f.id, type: 'financial', title: f.description, subtitle: `${f.type} - $${f.amount}`, matchField: 'Description' });
            }
        });

        journal.forEach(j => {
            if (j.title.toLowerCase().includes(q) || j.body.toLowerCase().includes(q)) {
                hits.push({ id: j.id, type: 'journal', title: j.title, subtitle: j.mood, matchField: 'Content' });
            }
        });

        places.forEach(p => {
            if (p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q)) {
                hits.push({ id: p.id, type: 'places', title: p.name, subtitle: `${p.city}, ${p.state}`, matchField: 'Location' });
            }
        });

        return hits.slice(0, 10);
    }, [searchQuery, projects, financial, journal, places]);

    const stats = useMemo(() => {
        const activeProjects = projects.filter(p => p.status === 'In Progress').length;
        const completedTasks = projects.reduce((acc, p) => {
            const countCompleted = (items: ProjectItem[]): number => {
                return items.reduce((sum, item) => {
                    const itemComplete = item.status === 'Completed' ? 1 : 0;
                    const subtaskComplete = item.subtasks ? countCompleted(item.subtasks) : 0;
                    return sum + itemComplete + subtaskComplete;
                }, 0);
            };
            return acc + countCompleted([p]);
        }, 0);
        
        const totalIncome = financial.filter(f => f.type === 'income' && f.isEnabled).reduce((s, f) => s + f.amount, 0);
        const totalExpenses = financial.filter(f => f.type === 'expense' && f.isEnabled).reduce((s, f) => s + f.amount, 0);
        
        const todayHabits = habits.filter(h => h.history.includes(today)).length;
        const activeGoals = goals.filter(g => g.status === 'In Progress').length;
        
        return { activeProjects, completedTasks, totalIncome, totalExpenses, todayHabits, totalHabits: habits.length, activeGoals };
    }, [projects, financial, habits, goals, today]);

    const upcomingEvents = useMemo(() => {
        const events: { id: string, title: string, date: Date, type: string, icon: any, color: string }[] = [];
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        projects.forEach(p => {
            if (p.dueDate && p.status !== 'Completed') {
                const dueDate = new Date(p.dueDate);
                if (dueDate >= now && dueDate <= weekFromNow) {
                    events.push({ id: p.id, title: p.name, date: dueDate, type: 'Project', icon: FolderKanban, color: 'orange' });
                }
            }
        });

        goals.forEach(g => {
            if (g.deadline && g.status !== 'Achieved') {
                const deadline = new Date(g.deadline);
                if (deadline >= now && deadline <= weekFromNow) {
                    events.push({ id: g.id, title: g.name, date: deadline, type: 'Goal', icon: Target, color: 'red' });
                }
            }
        });

        return events.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 5);
    }, [projects, goals]);

    const recentJournals = journal.slice(0, 3);
    const activeTrips = itineraries.filter(i => i.status === 'Planned' || i.status === 'Active').slice(0, 2);
    const pendingGroceries = groceries.filter(g => !g.completed).slice(0, 5);

    const WidgetWrapper = ({ widget, children, className = '' }: { widget: DashboardWidget, children: React.ReactNode, className?: string }) => {
        if (!widget.isVisible && !isEditMode) return null;
        
        return (
            <div className={`relative ${!widget.isVisible ? 'opacity-50' : ''} ${className}`}>
                {isEditMode && (
                    <div className="absolute -top-2 -right-2 z-10 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1">
                        <button
                            onClick={() => moveWidget(widget.id, 'up')}
                            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                            title="Move up"
                        >
                            <ChevronUp size={14} className="text-gray-600" />
                        </button>
                        <button
                            onClick={() => moveWidget(widget.id, 'down')}
                            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
                            title="Move down"
                        >
                            <ChevronDown size={14} className="text-gray-600" />
                        </button>
                        <button
                            onClick={() => toggleWidgetVisibility(widget.id)}
                            className={`p-1.5 rounded-md transition-colors ${widget.isVisible ? 'hover:bg-gray-100' : 'bg-red-50 hover:bg-red-100'}`}
                            title={widget.isVisible ? 'Hide widget' : 'Show widget'}
                        >
                            {widget.isVisible ? <Eye size={14} className="text-gray-600" /> : <EyeOff size={14} className="text-red-600" />}
                        </button>
                    </div>
                )}
                {children}
            </div>
        );
    };

    const renderWidget = (widget: DashboardWidget) => {
        switch (widget.type) {
            case 'quickCapture':
                return (
                    <WidgetWrapper widget={widget}>
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
                                <div className="absolute -bottom-10 left-0 right-0 flex justify-center animate-slide-up">
                                    <Badge variant="success" dot>Added "{quickNoteSuccess.name.slice(0, 30)}{quickNoteSuccess.name.length > 30 ? '...' : ''}"</Badge>
                                </div>
                            )}
                        </form>
                    </WidgetWrapper>
                );
            
            case 'taskStream':
                return (
                    <WidgetWrapper widget={widget} className="md:col-span-2">
                        <Card>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                    <ListTodo size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Task Stream</h3>
                                    <p className="text-sm text-gray-500">Everything that needs your attention</p>
                                </div>
                            </div>
                            <TaskStream
                                projects={filteredProjects}
                                groceries={filteredGroceries}
                                purchases={filteredPurchases}
                                goals={filteredGoals}
                                onCompleteTask={handleCompleteStreamItem}
                                onNavigate={handleNavigateFromStream}
                                maxItems={8}
                                showFilters={true}
                            />
                        </Card>
                    </WidgetWrapper>
                );

            case 'stats':
                return (
                    <WidgetWrapper widget={widget}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard
                                title="Active Projects"
                                value={stats.activeProjects}
                                subtitle={`${stats.completedTasks} tasks done`}
                                icon={FolderKanban}
                                color="orange"
                            />
                            <StatCard
                                title="Monthly Income"
                                value={`$${stats.totalIncome.toLocaleString()}`}
                                subtitle={`-$${stats.totalExpenses.toLocaleString()} expenses`}
                                icon={Wallet}
                                color="green"
                                trend={{ value: stats.totalIncome > stats.totalExpenses ? 12 : -8, label: 'vs last month' }}
                            />
                            <StatCard
                                title="Habits Today"
                                value={`${stats.todayHabits}/${stats.totalHabits}`}
                                subtitle="Keep the streak going!"
                                icon={Flame}
                                color="orange"
                            />
                            <StatCard
                                title="Active Goals"
                                value={stats.activeGoals}
                                subtitle={`${goals.filter(g => g.status === 'Achieved').length} achieved`}
                                icon={Target}
                                color="purple"
                            />
                        </div>
                    </WidgetWrapper>
                );
            
            case 'habits':
                return (
                    <WidgetWrapper widget={widget}>
                        <Card className="h-full">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Flame size={18} className="text-orange-500" />
                                    Today's Habits
                                </h3>
                                <Button variant="ghost" size="xs" icon={ArrowRight} iconPosition="right">View All</Button>
                            </div>
                            
                            {habits.length === 0 ? (
                                <EmptyState
                                    icon={Flame}
                                    title="No habits yet"
                                    description="Start building better routines"
                                    actionLabel="Add Habit"
                                    onAction={() => {}}
                                />
                            ) : (
                                <div className="space-y-3">
                                    {habits.slice(0, 4).map(habit => {
                                        const isDone = habit.history.includes(today);
                                        return (
                                            <div key={habit.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => toggleHabitToday(habit)}
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                                            isDone 
                                                                ? 'bg-green-500 text-white shadow-md shadow-green-500/30' 
                                                                : 'bg-white border-2 border-gray-200 text-gray-300 hover:border-green-400 hover:text-green-400'
                                                        }`}
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <div>
                                                        <p className={`font-medium ${isDone ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{habit.name}</p>
                                                        <p className="text-xs text-gray-500">{habit.streak} day streak</p>
                                                    </div>
                                                </div>
                                                <Badge variant={isDone ? 'success' : 'default'} size="xs">
                                                    {isDone ? 'Done' : habit.frequency}
                                                </Badge>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    </WidgetWrapper>
                );
            
            case 'upcoming':
                return (
                    <WidgetWrapper widget={widget}>
                        <Card className="h-full">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <CalendarIcon size={18} className="text-blue-500" />
                                    Upcoming
                                </h3>
                            </div>
                            
                            {upcomingEvents.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-6">No upcoming events this week</p>
                            ) : (
                                <div className="space-y-3">
                                    {upcomingEvents.map(event => {
                                        const Icon = event.icon;
                                        return (
                                            <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                                                <div className={`w-10 h-10 rounded-xl bg-${event.color}-50 flex items-center justify-center`}>
                                                    <Icon size={18} className={`text-${event.color}-600`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{event.title}</p>
                                                    <p className="text-xs text-gray-500">{event.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                                                </div>
                                                <Badge variant="default" size="xs">{event.type}</Badge>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    </WidgetWrapper>
                );
            
            case 'goals':
                return (
                    <WidgetWrapper widget={widget}>
                        <Card className="h-full">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Target size={18} className="text-red-500" />
                                    Goals Progress
                                </h3>
                            </div>
                            
                            {goals.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-4">No goals set</p>
                            ) : (
                                <div className="space-y-4">
                                    {goals.slice(0, 3).map(goal => (
                                        <div key={goal.id}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-sm font-medium text-gray-900 truncate max-w-[70%]">{goal.name}</span>
                                                <span className="text-xs text-gray-500">{goal.progress}%</span>
                                            </div>
                                            <Progress value={goal.progress} size="sm" variant={goal.progress === 100 ? 'success' : 'gradient'} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </WidgetWrapper>
                );
            
            case 'journal':
                return (
                    <WidgetWrapper widget={widget}>
                        <Card className="h-full">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <BookOpen size={18} className="text-pink-500" />
                                    Recent Journal
                                </h3>
                            </div>
                            
                            {recentJournals.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-4">No journal entries</p>
                            ) : (
                                <div className="space-y-3">
                                    {recentJournals.map(entry => (
                                        <div key={entry.id} className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm font-medium text-gray-900">{entry.title}</span>
                                                <Badge variant="primary" size="xs">{entry.mood}</Badge>
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-2">{entry.body}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </WidgetWrapper>
                );
            
            case 'groceries':
                return (
                    <WidgetWrapper widget={widget}>
                        <Card className="h-full">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <Utensils size={18} className="text-lime-600" />
                                    Grocery List
                                </h3>
                                <Badge variant="warning" size="xs">{pendingGroceries.length} items</Badge>
                            </div>
                            
                            {pendingGroceries.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-4">Shopping list is empty</p>
                            ) : (
                                <div className="space-y-2">
                                    {pendingGroceries.map(item => (
                                        <div key={item.id} className="flex items-center gap-2 text-sm text-gray-700">
                                            <div className="w-1.5 h-1.5 rounded-full bg-lime-500"></div>
                                            <span>{item.name}</span>
                                            <Badge variant="default" size="xs" className="ml-auto">{item.category}</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </WidgetWrapper>
                );
            
            case 'trips':
                if (activeTrips.length === 0) return null;
                return (
                    <WidgetWrapper widget={widget}>
                        <Card variant="glass" className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-200/50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                    <MapPin size={18} className="text-indigo-600" />
                                    Upcoming Itineraries
                                </h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeTrips.map(trip => (
                                    <div key={trip.id} className="bg-white/80 backdrop-blur rounded-xl p-4 border border-white/50">
                                        <h4 className="font-semibold text-gray-900">{trip.name}</h4>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {trip.startDate && new Date(trip.startDate).toLocaleDateString()} - {trip.endDate && new Date(trip.endDate).toLocaleDateString()}
                                        </p>
                                        <div className="flex items-center gap-2 mt-3">
                                            <Badge variant="info" size="xs">{trip.stops?.length || 0} stops</Badge>
                                            <Badge variant={trip.status === 'Active' ? 'success' : 'default'} size="xs">{trip.status}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </WidgetWrapper>
                );
            
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6 animate-enter">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.displayName?.split(' ')[0] || 'there'}
                    </h2>
                    <p className="text-gray-500 mt-1">Here's what's happening in your life today</p>
                </div>
                
                <div className="flex items-center gap-3">
                    {isEditMode ? (
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                            <Button variant="primary" size="sm" onClick={saveLayout}>Save Layout</Button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsEditMode(true)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Customize dashboard"
                        >
                            <Settings size={18} />
                        </button>
                    )}
                    <div className="relative">
                        <Input
                            icon={Search}
                            placeholder="Search everything..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full md:w-72"
                        />
                        {searchResults.length > 0 && (
                            <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-20 max-h-80 overflow-y-auto">
                                {searchResults.map(result => (
                                    <button key={result.id} className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors">
                                        <div className="w-8 h-8 rounded-lg bg-primary-muted flex items-center justify-center">
                                            <Search size={14} className="text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{result.title}</p>
                                            <p className="text-xs text-gray-500">{result.type} • {result.subtitle}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {isEditMode && (
                <Card variant="glass" className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Settings size={18} className="text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-blue-900">Customize Your Dashboard</h3>
                            <p className="text-sm text-blue-700 mt-1">
                                Use the arrow buttons on each widget to reorder them. Click the eye icon to show/hide widgets. 
                                Click "Save Layout" when you're done.
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            <div className="space-y-6">
                {sortedWidgets.map(widget => (
                    <React.Fragment key={widget.id}>
                        {renderWidget(widget)}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default DashboardView;
