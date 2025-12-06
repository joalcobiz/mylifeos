import React, { useState, useMemo } from 'react';
import { 
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, 
    Filter, Clock, Tag, List, Grid3x3, MapPin, DollarSign, BookOpen, FolderKanban,
    Flame, Target, Plane, ShoppingBag, CreditCard, Eye, EyeOff
} from 'lucide-react';
import { CalendarEvent, View, ProjectItem, FinancialItem, JournalEntry, Habit, Goal, Itinerary, Purchase, Loan } from '../../types';
import Modal from '../../components/Modal';
import { useFirestore } from '../../services/firestore';
import { Card, Button, Badge, Input, Select, Tabs, EmptyState } from '../../components/ui';

interface CalendarViewProps {
    onNavigate?: (view: View, params?: any) => void;
}

interface EventTypeToggle {
    type: string;
    label: string;
    icon: any;
    color: string;
    bgColor: string;
    enabled: boolean;
}

const CalendarView: React.FC<CalendarViewProps> = ({ onNavigate }) => {
    const { data: projects } = useFirestore<ProjectItem>('projects');
    const { data: financial } = useFirestore<FinancialItem>('financial');
    const { data: journal } = useFirestore<JournalEntry>('journal');
    const { data: habits } = useFirestore<Habit>('habits');
    const { data: goals } = useFirestore<Goal>('goals');
    const { data: itineraries } = useFirestore<Itinerary>('itineraries');
    const { data: purchases } = useFirestore<Purchase>('purchases');
    const { data: loans } = useFirestore<Loan>('loans');
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    
    const [eventToggles, setEventToggles] = useState<Record<string, boolean>>({
        project: true,
        financial: true,
        journal: true,
        habit: true,
        goal: true,
        itinerary: true,
        purchase: true,
        loan: true
    });

    const EVENT_TYPES: EventTypeToggle[] = [
        { type: 'project', label: 'Projects', icon: FolderKanban, color: 'text-orange-600', bgColor: 'bg-orange-500', enabled: eventToggles.project },
        { type: 'financial', label: 'Bills', icon: DollarSign, color: 'text-emerald-600', bgColor: 'bg-emerald-500', enabled: eventToggles.financial },
        { type: 'journal', label: 'Journal', icon: BookOpen, color: 'text-pink-600', bgColor: 'bg-pink-500', enabled: eventToggles.journal },
        { type: 'habit', label: 'Habits', icon: Flame, color: 'text-amber-600', bgColor: 'bg-amber-500', enabled: eventToggles.habit },
        { type: 'goal', label: 'Goals', icon: Target, color: 'text-violet-600', bgColor: 'bg-violet-500', enabled: eventToggles.goal },
        { type: 'itinerary', label: 'Itineraries', icon: Plane, color: 'text-blue-600', bgColor: 'bg-blue-500', enabled: eventToggles.itinerary },
        { type: 'purchase', label: 'Purchases', icon: ShoppingBag, color: 'text-rose-600', bgColor: 'bg-rose-500', enabled: eventToggles.purchase },
        { type: 'loan', label: 'Loans', icon: CreditCard, color: 'text-purple-600', bgColor: 'bg-purple-500', enabled: eventToggles.loan }
    ];

    const toggleEventType = (type: string) => {
        setEventToggles(prev => ({ ...prev, [type]: !prev[type] }));
    };

    const allEvents = useMemo(() => {
        const events: CalendarEvent[] = [];

        if (eventToggles.project) {
            projects.forEach(p => {
                if (p.dueDate && p.status !== 'Completed') {
                    events.push({
                        id: p.id,
                        title: p.name,
                        date: new Date(p.dueDate),
                        type: 'project',
                        color: 'bg-orange-500',
                        icon: FolderKanban
                    });
                }
            });
        }

        if (eventToggles.financial) {
            financial.forEach(f => {
                if (f.type === 'expense' && f.isEnabled && f.dueDay) {
                    const eventDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), f.dueDay);
                    events.push({
                        id: f.id,
                        title: f.description,
                        date: eventDate,
                        type: 'financial',
                        color: 'bg-emerald-500',
                        icon: DollarSign
                    });
                }
            });
        }

        if (eventToggles.journal) {
            journal.forEach(j => {
                if (j.date) {
                    events.push({
                        id: j.id,
                        title: j.title,
                        date: new Date(j.date),
                        type: 'journal',
                        color: 'bg-pink-500',
                        icon: BookOpen
                    });
                }
            });
        }

        if (eventToggles.habit) {
            habits.forEach(h => {
                h.history?.forEach(dateStr => {
                    events.push({
                        id: `${h.id}-${dateStr}`,
                        title: h.name,
                        date: new Date(dateStr),
                        type: 'habit',
                        color: 'bg-amber-500',
                        icon: Flame
                    });
                });
            });
        }

        if (eventToggles.goal) {
            goals.forEach(g => {
                if (g.deadline) {
                    events.push({
                        id: g.id,
                        title: g.name,
                        date: new Date(g.deadline),
                        type: 'goal',
                        color: 'bg-violet-500',
                        icon: Target
                    });
                }
            });
        }

        if (eventToggles.itinerary) {
            itineraries.forEach(it => {
                if (it.startDate) {
                    events.push({
                        id: it.id,
                        title: it.name,
                        date: new Date(it.startDate),
                        endDate: it.endDate ? new Date(it.endDate) : undefined,
                        type: 'itinerary',
                        color: 'bg-blue-500',
                        icon: Plane
                    });
                }
            });
        }

        if (eventToggles.purchase) {
            purchases.forEach(p => {
                if (p.date) {
                    events.push({
                        id: p.id,
                        title: p.itemName,
                        date: new Date(p.date),
                        type: 'purchase',
                        color: 'bg-rose-500',
                        icon: ShoppingBag
                    });
                }
            });
        }

        if (eventToggles.loan) {
            loans.forEach(l => {
                if (l.dueDate && !l.isArchived) {
                    const eventDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), l.dueDate);
                    events.push({
                        id: l.id,
                        title: l.name,
                        date: eventDate,
                        type: 'loan',
                        color: 'bg-purple-500',
                        icon: CreditCard
                    });
                }
            });
        }

        return events;
    }, [projects, financial, journal, habits, goals, itineraries, purchases, loans, currentDate, eventToggles]);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay();

        const days: (Date | null)[] = [];
        
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }
        
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const getEventsForDate = (date: Date) => {
        return allEvents.filter(e => 
            e.date.getDate() === date.getDate() &&
            e.date.getMonth() === date.getMonth() &&
            e.date.getFullYear() === date.getFullYear()
        );
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (direction === 'prev') {
                newDate.setMonth(newDate.getMonth() - 1);
            } else {
                newDate.setMonth(newDate.getMonth() + 1);
            }
            return newDate;
        });
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    const days = getDaysInMonth(currentDate);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const eventCounts = useMemo(() => {
        const counts: Record<string, number> = { all: allEvents.length };
        EVENT_TYPES.forEach(et => {
            counts[et.type] = allEvents.filter(e => e.type === et.type).length;
        });
        return counts;
    }, [allEvents]);

    const enabledCount = Object.values(eventToggles).filter(v => v).length;

    return (
        <div className="space-y-6 animate-enter">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                        <CalendarIcon size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Calendar</h2>
                        <p className="text-white/80 text-sm">
                            {allEvents.length} events from {enabledCount} sources
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                >
                    Today
                </button>
            </div>

            {/* Event Type Toggle Cards */}
            <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                {EVENT_TYPES.map(et => {
                    const Icon = et.icon;
                    return (
                        <button
                            key={et.type}
                            onClick={() => toggleEventType(et.type)}
                            className={`relative p-3 rounded-xl border transition-all text-center ${
                                eventToggles[et.type]
                                    ? 'border-gray-200 bg-white shadow-sm'
                                    : 'border-gray-100 bg-gray-50 opacity-60'
                            }`}
                        >
                            <div className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center ${
                                eventToggles[et.type] ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'
                            }`}>
                                {eventToggles[et.type] ? <Eye size={10} /> : <EyeOff size={10} />}
                            </div>
                            <div className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center mb-1 ${et.bgColor} text-white`}>
                                <Icon size={16} />
                            </div>
                            <p className="text-xs font-medium text-gray-700 truncate">{et.label}</p>
                            <p className={`text-lg font-bold ${et.color}`}>{eventCounts[et.type] || 0}</p>
                        </button>
                    );
                })}
            </div>

            {/* Calendar Header */}
            <Card className="p-4">
                <div className="flex items-center justify-between mb-6">
                    <button 
                        onClick={() => navigateMonth('prev')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <h3 className="text-xl font-bold text-gray-900">
                        {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button 
                        onClick={() => navigateMonth('next')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                    {weekDays.map(day => (
                        <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                            {day}
                        </div>
                    ))}
                    
                    {days.map((date, index) => {
                        if (!date) {
                            return <div key={`empty-${index}`} className="h-24 bg-gray-50/50 rounded-lg" />;
                        }

                        const dayEvents = getEventsForDate(date);
                        const today = isToday(date);
                        
                        return (
                            <button
                                key={date.toISOString()}
                                onClick={() => setSelectedDate(date)}
                                className={`h-24 p-1 rounded-lg border transition-all text-left overflow-hidden ${
                                    today 
                                        ? 'border-primary bg-primary-muted ring-2 ring-primary/20' 
                                        : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <div className={`text-xs font-medium mb-1 ${today ? 'text-primary' : 'text-gray-600'}`}>
                                    {date.getDate()}
                                </div>
                                <div className="space-y-0.5 overflow-hidden">
                                    {dayEvents.slice(0, 3).map((event, i) => (
                                        <div 
                                            key={i}
                                            className={`text-[10px] px-1 py-0.5 rounded truncate text-white ${event.color}`}
                                        >
                                            {event.title}
                                        </div>
                                    ))}
                                    {dayEvents.length > 3 && (
                                        <div className="text-[10px] text-gray-500 px-1">
                                            +{dayEvents.length - 3} more
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </Card>

            {/* Day Detail Modal */}
            {selectedDate && (
                <Modal 
                    isOpen={!!selectedDate} 
                    onClose={() => setSelectedDate(null)}
                    title={selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                >
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {getEventsForDate(selectedDate).length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>No events on this day</p>
                            </div>
                        ) : (
                            getEventsForDate(selectedDate).map((event, i) => {
                                const Icon = event.icon || CalendarIcon;
                                return (
                                    <div 
                                        key={i}
                                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                        onClick={() => {
                                            if (onNavigate) {
                                                onNavigate(event.type as View, { focusId: event.id });
                                            }
                                            setSelectedDate(null);
                                        }}
                                    >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${event.color}`}>
                                            <Icon size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{event.title}</p>
                                            <p className="text-xs text-gray-500 capitalize">{event.type}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default CalendarView;
