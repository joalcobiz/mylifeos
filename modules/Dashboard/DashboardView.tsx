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

    const moduleCards = useMemo(() => [
        {
            id: 'projects',
            name: 'Projects',
            icon: FolderKanban,
            count: filteredProjects.filter(p => p.status !== 'Completed').length,
            color: 'from-blue-500 to-blue-600',
            bgTint: 'bg-blue-50',
            borderColor: 'border-blue-100'
        },
        {
            id: 'goals',
            name: 'Goals',
            icon: Target,
            count: filteredGoals.filter(g => g.status !== 'Completed').length,
            color: 'from-red-500 to-rose-600',
            bgTint: 'bg-red-50',
            borderColor: 'border-red-100'
        },
        {
            id: 'habits',
            name: 'Habits',
            icon: Flame,
            count: filteredHabits.length,
            color: 'from-orange-500 to-amber-600',
            bgTint: 'bg-orange-50',
            borderColor: 'border-orange-100'
        },
        {
            id: 'itineraries',
            name: 'Trips',
            icon: Route,
            count: filteredItineraries.filter(t => t.status !== 'Completed').length,
            color: 'from-cyan-500 to-teal-600',
            bgTint: 'bg-cyan-50',
            borderColor: 'border-cyan-100'
        },
        {
            id: 'places',
            name: 'Places',
            icon: MapPin,
            count: filteredPlaces.length,
            color: 'from-rose-500 to-pink-600',
            bgTint: 'bg-rose-50',
            borderColor: 'border-rose-100'
        },
        {
            id: 'financial',
            name: 'Financial',
            icon: Wallet,
            count: filteredFinancial.length,
            color: 'from-emerald-500 to-green-600',
            bgTint: 'bg-emerald-50',
            borderColor: 'border-emerald-100'
        },
        {
            id: 'groceries',
            name: 'Groceries',
            icon: ShoppingBag,
            count: filteredGroceries.filter(g => !g.completed).length,
            color: 'from-lime-500 to-green-600',
            bgTint: 'bg-lime-50',
            borderColor: 'border-lime-100'
        },
        {
            id: 'journal',
            name: 'Journal',
            icon: BookOpen,
            count: filteredJournal.length,
            color: 'from-amber-500 to-yellow-600',
            bgTint: 'bg-amber-50',
            borderColor: 'border-amber-100'
        }
    ], [filteredProjects, filteredGoals, filteredHabits, filteredItineraries, filteredPlaces, filteredFinancial, filteredGroceries, filteredJournal]);

    return (
        <div className="space-y-6 animate-enter">
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6 text-white shadow-lg">
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {moduleCards.map(card => {
                    const IconComponent = card.icon;
                    return (
                        <button
                            key={card.id}
                            onClick={() => handleNavigate(card.id)}
                            className={`${card.bgTint} ${card.borderColor} border rounded-xl p-4 text-left hover:shadow-md transition-all group`}
                        >
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                <IconComponent size={20} className="text-white" />
                            </div>
                            <p className="font-semibold text-gray-900">{card.name}</p>
                            <p className="text-sm text-gray-500">{card.count} active</p>
                        </button>
                    );
                })}
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

            <div className="bg-gradient-to-r from-slate-50 via-gray-50 to-zinc-50 rounded-2xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center">
                            <Clock size={16} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
                            <p className="text-xs text-gray-500">Your latest updates</p>
                        </div>
                    </div>
                </div>
                <div className="p-4">
                    {recentItems.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-4">No recent activity</p>
                    ) : (
                        <div className="space-y-3">
                            {recentItems.map(item => {
                                const IconComponent = item.icon;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => handleNavigate(moduleToRoute[item.module] || item.module.toLowerCase(), item.id)}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/80 transition-colors text-left"
                                    >
                                        <div className={`w-10 h-10 rounded-lg ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                                            <IconComponent size={18} className={item.iconColor} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{item.title}</p>
                                            <p className="text-xs text-gray-500">{item.module} • {item.subtitle}</p>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardView;
