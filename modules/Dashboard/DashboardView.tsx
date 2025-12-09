import React, { useState, useMemo } from 'react';
import { 
    LayoutDashboard, CheckCircle, Clock, TrendingUp, AlertCircle, 
    Calendar as CalendarIcon, MapPin, Search, ArrowRight, FolderKanban, 
    Wallet, BookOpen, X, Sparkles, Plus, Send, ChevronRight, ChevronLeft, ShoppingBag, Utensils,
    Flame, Target, FileText, Banknote, Check, MoreHorizontal, Eye, Zap,
    Settings, GripVertical, ChevronUp, ChevronDown, EyeOff, ListTodo,
    Sun, Cloud, Phone, Users, Bell, History, AlertOctagon, Star, Heart,
    Gift, Cake, Route, Camera, Plane, User
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
    pillColor?: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    actionButton?: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    icon,
    badge,
    pillColor = 'bg-gray-100 text-gray-700',
    children,
    defaultExpanded = true,
    actionButton
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    
    return (
        <div className="bg-white rounded-xl overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-all duration-150"
            >
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${pillColor}`}>
                    {icon}
                    <span className="font-semibold text-sm">{title}</span>
                    {badge !== undefined && badge > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-white/30">
                            {badge}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {actionButton}
                    {isExpanded ? (
                        <ChevronUp size={16} className="text-gray-400" />
                    ) : (
                        <ChevronDown size={16} className="text-gray-400" />
                    )}
                </div>
            </button>
            {isExpanded && (
                <div className="px-3 pb-3">
                    {children}
                </div>
            )}
        </div>
    );
};

interface ActionItemProps {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    module: string;
    time?: string;
    hoverColor?: string;
    actions?: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' }[];
    onComplete?: () => void;
    isCompleted?: boolean;
}

const ActionItem: React.FC<ActionItemProps> = ({
    icon,
    title,
    subtitle,
    module,
    time,
    hoverColor = 'hover:bg-gray-100',
    actions = [],
    onComplete,
    isCompleted = false
}) => {
    return (
        <div className={`flex items-center gap-3 py-2.5 px-3 my-2 rounded-lg bg-gray-50 border border-gray-200 shadow-sm ${hoverColor} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer ${isCompleted ? 'opacity-50' : ''}`}>
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className={`font-medium text-gray-900 text-sm truncate ${isCompleted ? 'line-through' : ''}`}>{title}</p>
                <p className="text-xs text-gray-400 truncate">{module}{subtitle ? ` • ${subtitle}` : ''}</p>
            </div>
            {time && <span className="text-xs text-gray-500 flex-shrink-0">{time}</span>}
            <div className="flex items-center gap-1 flex-shrink-0">
                {onComplete && !isCompleted && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onComplete(); }}
                        className="px-3 py-1 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-gray-800 transition-all"
                    >
                        Complete
                    </button>
                )}
                {actions.map((action, idx) => (
                    <button
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); action.onClick(); }}
                        className="px-3 py-1 text-xs font-medium border border-gray-200 text-gray-700 rounded-md hover:bg-gray-100 transition-all"
                    >
                        {action.label}
                    </button>
                ))}
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
    const [onThisDayIndex, setOnThisDayIndex] = useState(0);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    
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

    const onThisDayItems = useMemo(() => {
        const items: Array<{
            id: string;
            type: 'trip' | 'journal' | 'place' | 'family';
            title: string;
            subtitle: string;
            year: number;
            yearsAgo: number;
            icon: typeof Plane;
            iconBg: string;
            iconColor: string;
            image?: string;
        }> = [];
        
        const currentYear = today.getFullYear();
        
        filteredItineraries.forEach(trip => {
            if (trip.startDate) {
                const tripDate = new Date(trip.startDate);
                if (tripDate.getMonth() === todayMonth && tripDate.getDate() === todayDay && tripDate.getFullYear() < currentYear) {
                    const yearsAgo = currentYear - tripDate.getFullYear();
                    items.push({
                        id: trip.id,
                        type: 'trip',
                        title: trip.name,
                        subtitle: `Trip from ${yearsAgo} year${yearsAgo > 1 ? 's' : ''} ago`,
                        year: tripDate.getFullYear(),
                        yearsAgo,
                        icon: Plane,
                        iconBg: 'bg-cyan-100',
                        iconColor: 'text-cyan-600',
                        image: trip.coverImage
                    });
                }
            }
        });
        
        filteredJournal.forEach(entry => {
            if (entry.date) {
                const entryDate = new Date(entry.date);
                if (entryDate.getMonth() === todayMonth && entryDate.getDate() === todayDay && entryDate.getFullYear() < currentYear) {
                    const yearsAgo = currentYear - entryDate.getFullYear();
                    items.push({
                        id: entry.id,
                        type: 'journal',
                        title: entry.title || 'Journal Entry',
                        subtitle: `Written ${yearsAgo} year${yearsAgo > 1 ? 's' : ''} ago`,
                        year: entryDate.getFullYear(),
                        yearsAgo,
                        icon: BookOpen,
                        iconBg: 'bg-amber-100',
                        iconColor: 'text-amber-600'
                    });
                }
            }
        });
        
        filteredPlaces.forEach(place => {
            if (place.lastVisited) {
                const visitDate = new Date(place.lastVisited);
                if (visitDate.getMonth() === todayMonth && visitDate.getDate() === todayDay && visitDate.getFullYear() < currentYear) {
                    const yearsAgo = currentYear - visitDate.getFullYear();
                    items.push({
                        id: place.id,
                        type: 'place',
                        title: place.name,
                        subtitle: `Visited ${yearsAgo} year${yearsAgo > 1 ? 's' : ''} ago`,
                        year: visitDate.getFullYear(),
                        yearsAgo,
                        icon: MapPin,
                        iconBg: 'bg-rose-100',
                        iconColor: 'text-rose-600'
                    });
                }
            }
            place.visitHistory?.forEach(visit => {
                const visitDate = new Date(visit.date);
                if (visitDate.getMonth() === todayMonth && visitDate.getDate() === todayDay && visitDate.getFullYear() < currentYear) {
                    const yearsAgo = currentYear - visitDate.getFullYear();
                    if (!items.find(i => i.id === `${place.id}-${visit.id}`)) {
                        items.push({
                            id: `${place.id}-${visit.id}`,
                            type: 'place',
                            title: place.name,
                            subtitle: `Visited ${yearsAgo} year${yearsAgo > 1 ? 's' : ''} ago`,
                            year: visitDate.getFullYear(),
                            yearsAgo,
                            icon: Camera,
                            iconBg: 'bg-violet-100',
                            iconColor: 'text-violet-600'
                        });
                    }
                }
            });
        });
        
        const mockFamilyEvents = [
            { id: 'fam-1', name: 'Grandma Rose', event: 'birthday', month: todayMonth, day: todayDay, year: 1935 },
            { id: 'fam-2', name: 'Uncle James', event: 'anniversary', month: todayMonth, day: todayDay, year: 1990 },
        ];
        
        mockFamilyEvents.forEach(member => {
            if (member.month === todayMonth && member.day === todayDay) {
                items.push({
                    id: member.id,
                    type: 'family',
                    title: member.event === 'birthday' 
                        ? `Remembering ${member.name}` 
                        : `${member.name}'s Anniversary`,
                    subtitle: member.event === 'birthday'
                        ? `Would be ${currentYear - member.year} years old today`
                        : `${currentYear - member.year} years since this day`,
                    year: member.year,
                    yearsAgo: currentYear - member.year,
                    icon: member.event === 'birthday' ? Cake : Heart,
                    iconBg: member.event === 'birthday' ? 'bg-pink-100' : 'bg-red-100',
                    iconColor: member.event === 'birthday' ? 'text-pink-600' : 'text-red-600'
                });
            }
        });
        
        return items.sort((a, b) => b.yearsAgo - a.yearsAgo);
    }, [filteredItineraries, filteredJournal, filteredPlaces, todayMonth, todayDay, today]);

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

    const recentItems = useMemo(() => {
        const items: Array<{
            id: string;
            type: string;
            title: string;
            subtitle: string;
            module: string;
            date: string;
            icon: typeof FolderKanban;
            iconBg: string;
            iconColor: string;
        }> = [];
        
        filteredProjects.slice(0, 3).forEach(p => {
            if (p.createdDate) {
                items.push({
                    id: p.id,
                    type: 'project',
                    title: p.name,
                    subtitle: p.status,
                    module: 'Projects',
                    date: p.createdDate,
                    icon: FolderKanban,
                    iconBg: 'bg-blue-100',
                    iconColor: 'text-blue-600'
                });
            }
        });
        
        filteredJournal.slice(0, 2).forEach(j => {
            items.push({
                id: j.id,
                type: 'journal',
                title: j.title || 'Journal Entry',
                subtitle: j.mood || '',
                module: 'Journal',
                date: j.date,
                icon: BookOpen,
                iconBg: 'bg-amber-100',
                iconColor: 'text-amber-600'
            });
        });
        
        filteredItineraries.slice(0, 2).forEach(t => {
            items.push({
                id: t.id,
                type: 'trip',
                title: t.name,
                subtitle: t.status,
                module: 'Trips',
                date: t.startDate || '',
                icon: Route,
                iconBg: 'bg-cyan-100',
                iconColor: 'text-cyan-600'
            });
        });
        
        return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    }, [filteredProjects, filteredJournal, filteredItineraries]);

    const familyActivityItems = useMemo(() => {
        const items: { id: string; title: string; action: string; module: string; timestamp: Date; icon: any; iconBg: string; iconColor: string }[] = [];
        
        const sharedProjects = filteredProjects.filter(p => (p as any).sharedWith?.length > 0 || (p as any).sharingMode === 'Shared');
        sharedProjects.slice(0, 3).forEach(p => {
            items.push({
                id: p.id,
                title: p.name,
                action: 'updated project',
                module: 'Projects',
                timestamp: new Date((p as any).updatedAt || (p as any).createdAt || Date.now()),
                icon: FolderKanban,
                iconBg: 'bg-orange-100',
                iconColor: 'text-orange-600'
            });
        });
        
        const sharedJournal = filteredJournal.filter(j => (j as any).sharedWith?.length > 0 || (j as any).sharingMode === 'Shared');
        sharedJournal.slice(0, 2).forEach(j => {
            items.push({
                id: j.id,
                title: j.title || 'Journal entry',
                action: 'wrote',
                module: 'Journal',
                timestamp: new Date(j.date || Date.now()),
                icon: BookOpen,
                iconBg: 'bg-pink-100',
                iconColor: 'text-pink-600'
            });
        });
        
        return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5);
    }, [filteredProjects, filteredJournal]);

    const moduleCards = useMemo(() => [
        {
            id: 'projects',
            name: 'Projects',
            icon: FolderKanban,
            count: filteredProjects.filter(p => p.status !== 'Completed').length,
            pillColor: 'bg-orange-100 text-orange-700',
            cardHover: 'hover:bg-orange-50'
        },
        {
            id: 'financial',
            name: 'Financial',
            icon: Wallet,
            count: filteredFinancial.length,
            pillColor: 'bg-emerald-100 text-emerald-700',
            cardHover: 'hover:bg-emerald-50'
        },
        {
            id: 'journal',
            name: 'Journal',
            icon: BookOpen,
            count: filteredJournal.length,
            pillColor: 'bg-pink-100 text-pink-700',
            cardHover: 'hover:bg-pink-50'
        },
        {
            id: 'itineraries',
            name: 'Trips',
            icon: Route,
            count: filteredItineraries.filter(t => t.status !== 'Completed').length,
            pillColor: 'bg-indigo-100 text-indigo-700',
            cardHover: 'hover:bg-indigo-50'
        },
        {
            id: 'places',
            name: 'Places',
            icon: MapPin,
            count: filteredPlaces.length,
            pillColor: 'bg-rose-100 text-rose-700',
            cardHover: 'hover:bg-rose-50'
        },
        {
            id: 'groceries',
            name: 'Groceries',
            icon: Utensils,
            count: filteredGroceries.filter(g => !g.completed).length,
            pillColor: 'bg-lime-100 text-lime-700',
            cardHover: 'hover:bg-lime-50'
        },
        {
            id: 'habits',
            name: 'Habits',
            icon: Flame,
            count: filteredHabits.length,
            pillColor: 'bg-amber-100 text-amber-700',
            cardHover: 'hover:bg-amber-50'
        },
        {
            id: 'goals',
            name: 'Goals',
            icon: Target,
            count: filteredGoals.filter(g => g.status !== 'Completed').length,
            pillColor: 'bg-red-100 text-red-700',
            cardHover: 'hover:bg-red-50'
        }
    ], [filteredProjects, filteredGoals, filteredHabits, filteredItineraries, filteredPlaces, filteredFinancial, filteredGroceries, filteredJournal]);

    return (
        <div className="space-y-4 animate-enter bg-white -m-6 p-6">
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-5 text-white shadow-lg">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold">{getGreeting()}, {user?.displayName?.split(' ')[0] || 'there'}!</h1>
                            <Sun className="text-yellow-400" size={24} />
                        </div>
                        <p className="text-gray-400">{formatDate()}</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/10">
                    {stats.streak > 0 && (
                        <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                            <Flame size={16} className="text-orange-400" />
                            <span className="text-sm font-medium">{stats.streak}-day streak</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                        <CheckCircle size={16} className="text-green-400" />
                        <span className="text-sm font-medium">{stats.tasksToday} tasks today</span>
                    </div>
                    {stats.upcomingTrips > 0 && (
                        <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
                            <Route size={16} className="text-cyan-400" />
                            <span className="text-sm font-medium">{stats.upcomingTrips} upcoming trips</span>
                        </div>
                    )}
                </div>
            </div>

            {onThisDayItems.length > 0 && (
                <div className="bg-gradient-to-r from-purple-50 via-violet-50 to-indigo-50 rounded-2xl border border-purple-100 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-purple-100">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                <History size={16} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">On This Day</h3>
                                <p className="text-xs text-gray-500">Memories from years past</p>
                            </div>
                        </div>
                        {onThisDayItems.length > 1 && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">{onThisDayIndex + 1} of {onThisDayItems.length}</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setOnThisDayIndex((prev) => (prev === 0 ? onThisDayItems.length - 1 : prev - 1))}
                                        className="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-sm border border-purple-100 transition-colors"
                                    >
                                        <ChevronLeft size={16} className="text-gray-600" />
                                    </button>
                                    <button
                                        onClick={() => setOnThisDayIndex((prev) => (prev === onThisDayItems.length - 1 ? 0 : prev + 1))}
                                        className="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-sm border border-purple-100 transition-colors"
                                    >
                                        <ChevronRight size={16} className="text-gray-600" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-4">
                        <div className="flex items-center gap-4 transition-all duration-300">
                            {(() => {
                                const item = onThisDayItems[onThisDayIndex];
                                if (!item) return null;
                                const IconComponent = item.icon;
                                return (
                                    <div className="flex items-center gap-4 w-full">
                                        <div className={`w-14 h-14 rounded-xl ${item.iconBg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                                            <IconComponent size={24} className={item.iconColor} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 truncate">{item.title}</p>
                                            <p className="text-sm text-gray-500">{item.subtitle}</p>
                                            <p className="text-xs text-purple-600 mt-1 font-medium">{item.year}</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                if (item.type === 'trip') handleNavigate('itineraries', item.id);
                                                else if (item.type === 'journal') handleNavigate('journal', item.id);
                                                else if (item.type === 'place') handleNavigate('places', item.id.split('-')[0]);
                                                else if (item.type === 'family') handleNavigate('genealogy', item.id);
                                            }}
                                            className="px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600 transition-colors flex-shrink-0"
                                        >
                                            View
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                        {onThisDayItems.length > 1 && (
                            <div className="flex justify-center gap-1.5 mt-4">
                                {onThisDayItems.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setOnThisDayIndex(idx)}
                                        className={`w-2 h-2 rounded-full transition-colors ${
                                            idx === onThisDayIndex ? 'bg-purple-500' : 'bg-purple-200 hover:bg-purple-300'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {overdueItems.length > 0 && (
                    <CollapsibleSection
                        title="Overdue"
                        icon={<AlertOctagon size={16} className="text-red-600" />}
                        badge={overdueItems.length}
                        pillColor="bg-red-100 text-red-700"
                    >
                        <div className="pt-2">
                            {overdueItems.map(item => (
                                <ActionItem
                                    key={item.id}
                                    icon={<FolderKanban size={16} className="text-gray-500" />}
                                    title={item.name}
                                    subtitle={item.parentProject?.name || ''}
                                    module="Projects"
                                    time={`${item.daysOverdue}d overdue`}
                                    hoverColor="hover:bg-red-50"
                                    onComplete={() => handleCompleteTask(item)}
                                />
                            ))}
                        </div>
                    </CollapsibleSection>
                )}

                <CollapsibleSection
                    title="Today"
                    icon={<CalendarIcon size={16} className="text-orange-600" />}
                    badge={todayItems.length}
                    pillColor="bg-orange-100 text-orange-700"
                >
                    <div className="pt-1">
                        {todayItems.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">No tasks for today</p>
                        ) : (
                            todayItems.map(item => (
                                <ActionItem
                                    key={item.id}
                                    icon={<item.icon size={16} className="text-gray-500" />}
                                    title={item.name}
                                    subtitle={item.subtitle || item.parentProject?.name || ''}
                                    module={item.module}
                                    hoverColor="hover:bg-orange-50"
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
                    icon={<Clock size={16} className="text-blue-600" />}
                    badge={upcomingItems.length}
                    pillColor="bg-blue-100 text-blue-700"
                    defaultExpanded={false}
                >
                    <div className="pt-1">
                        {upcomingItems.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-4">No upcoming items</p>
                        ) : (
                            upcomingItems.map(item => (
                                <ActionItem
                                    key={item.id}
                                    icon={
                                        item.type === 'goal' ? <Target size={16} className="text-gray-500" /> :
                                        item.type === 'trip' ? <Route size={16} className="text-gray-500" /> :
                                        <FolderKanban size={16} className="text-gray-500" />
                                    }
                                    title={item.name}
                                    subtitle=""
                                    module={item.module}
                                    time={getRelativeDate(item.dueDate)}
                                    hoverColor="hover:bg-blue-50"
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
                        icon={<Sparkles size={16} className="text-purple-600" />}
                        badge={forYouItems.length}
                        pillColor="bg-purple-100 text-purple-700"
                        defaultExpanded={false}
                    >
                        <div className="pt-1">
                            {forYouItems.map(item => (
                                <ActionItem
                                    key={item.id}
                                    icon={
                                        item.module === 'Places' ? <MapPin size={16} className="text-gray-500" /> :
                                        item.module === 'Goals' ? <Target size={16} className="text-gray-500" /> :
                                        <BookOpen size={16} className="text-gray-500" />
                                    }
                                    title={item.name}
                                    subtitle={item.subtitle || ''}
                                    module={item.module}
                                    hoverColor="hover:bg-purple-50"
                                    actions={item.actions}
                                />
                            ))}
                        </div>
                    </CollapsibleSection>
                )}

                {familyActivityItems.length > 0 && (
                    <CollapsibleSection
                        title="Family Activity"
                        icon={<Users size={16} className="text-teal-600" />}
                        badge={familyActivityItems.length}
                        pillColor="bg-teal-100 text-teal-700"
                        defaultExpanded={false}
                    >
                        <div className="pt-1">
                            {familyActivityItems.map(item => {
                                const IconComponent = item.icon;
                                const timeAgo = Math.floor((Date.now() - item.timestamp.getTime()) / (1000 * 60 * 60 * 24));
                                return (
                                    <ActionItem
                                        key={item.id}
                                        icon={<IconComponent size={16} className="text-gray-500" />}
                                        title={item.title}
                                        subtitle={item.action}
                                        module={item.module}
                                        time={timeAgo === 0 ? 'Today' : `${timeAgo}d ago`}
                                        hoverColor="hover:bg-teal-50"
                                        actions={[
                                            { label: 'View', onClick: () => handleNavigate(moduleToRoute[item.module] || item.module.toLowerCase(), item.id) }
                                        ]}
                                    />
                                );
                            })}
                        </div>
                    </CollapsibleSection>
                )}
            </div>

            <CollapsibleSection
                title="Recent Activity"
                icon={<Clock size={16} className="text-slate-600" />}
                badge={recentItems.length}
                pillColor="bg-slate-100 text-slate-700"
                defaultExpanded={true}
            >
                <div className="pt-1">
                    {recentItems.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-2">No recent activity</p>
                    ) : (
                        recentItems.map(item => {
                            const IconComponent = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavigate(moduleToRoute[item.module] || item.module.toLowerCase(), item.id)}
                                    className="w-full flex items-center gap-3 py-2.5 px-3 my-2 rounded-lg bg-gray-50 border border-gray-200 shadow-sm hover:bg-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left"
                                >
                                    <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                        <IconComponent size={14} className="text-gray-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-medium text-gray-900 text-sm truncate block">{item.title}</span>
                                        <span className="text-xs text-gray-400 truncate block">{item.module} • {item.subtitle}</span>
                                    </div>
                                    <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                                </button>
                            );
                        })
                    )}
                </div>
            </CollapsibleSection>

            <div className="space-y-3">
                {moduleCards.map(card => {
                    const IconComponent = card.icon;
                    const getModuleItems = () => {
                        switch (card.id) {
                            case 'projects': return filteredProjects.slice(0, 5);
                            case 'goals': return filteredGoals.slice(0, 5);
                            case 'habits': return filteredHabits.slice(0, 5);
                            case 'itineraries': return filteredItineraries.slice(0, 5);
                            case 'places': return filteredPlaces.slice(0, 5);
                            case 'financial': return filteredFinancial.slice(0, 5);
                            case 'groceries': return filteredGroceries.filter(g => !g.completed).slice(0, 5);
                            case 'journal': return filteredJournal.slice(0, 5);
                            default: return [];
                        }
                    };
                    const items = getModuleItems();
                    
                    return (
                        <CollapsibleSection
                            key={card.id}
                            title={card.name}
                            icon={<IconComponent size={16} />}
                            badge={card.count}
                            pillColor={card.pillColor}
                            defaultExpanded={false}
                        >
                            <div className="pt-1">
                                {items.length === 0 ? (
                                    <p className="text-gray-400 text-sm text-center py-4">No items</p>
                                ) : (
                                    items.map((item: any) => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleNavigate(card.id, item.id)}
                                            className={`w-full flex items-center gap-3 py-2.5 px-3 my-2 rounded-lg text-left bg-gray-50 border border-gray-200 shadow-sm ${card.cardHover} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                <IconComponent size={14} className="text-gray-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="font-medium text-gray-900 text-sm truncate block">{item.name || item.title || item.description}</span>
                                                <span className="text-xs text-gray-400 truncate block">{item.status || item.type || item.mood || ''}</span>
                                            </div>
                                            <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                                        </button>
                                    ))
                                )}
                            </div>
                        </CollapsibleSection>
                    );
                })}
            </div>
        </div>
    );
};

export default DashboardView;
