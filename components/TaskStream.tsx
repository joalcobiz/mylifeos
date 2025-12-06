import React, { useMemo, useState } from 'react';
import { 
    CheckCircle, Clock, AlertTriangle, Calendar, ShoppingCart, 
    Apple, Target, FolderKanban, StickyNote, ChevronRight,
    Filter, User, Bell, MoreHorizontal, Check, X
} from 'lucide-react';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { OwnerBadge } from './SharingFilter';
import { ProjectItem, GroceryItem, Purchase, Goal } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSharing } from '../contexts/SharingContext';

export type TaskStreamFilter = 'all' | 'overdue' | 'today' | 'week' | 'assigned';

export interface StreamItem {
    id: string;
    title: string;
    subtitle?: string;
    type: 'project' | 'task' | 'quicknote' | 'grocery' | 'purchase' | 'goal';
    dueDate?: string | null;
    urgency?: string;
    status?: string;
    priority?: string;
    owner?: string;
    assignedTo?: string;
    isCompleted: boolean;
    hasReminder?: boolean;
    sourceCollection: string;
    originalItem: any;
}

interface TaskStreamProps {
    projects: ProjectItem[];
    groceries: GroceryItem[];
    purchases: Purchase[];
    goals: Goal[];
    onCompleteTask?: (item: StreamItem) => void;
    onNavigate?: (type: string, id: string) => void;
    maxItems?: number;
    showFilters?: boolean;
}

const getUrgencyColor = (urgency?: string, dueDate?: string | null): string => {
    if (!urgency && !dueDate) return 'gray';
    
    if (dueDate) {
        const due = new Date(dueDate);
        const now = new Date();
        const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'red';
        if (diffDays === 0) return 'amber';
        if (diffDays <= 2) return 'orange';
        if (diffDays <= 7) return 'yellow';
        return 'green';
    }
    
    switch (urgency) {
        case 'today': return 'red';
        case 'tomorrow': return 'orange';
        case 'dayAfter': return 'amber';
        case 'thisWeek': return 'yellow';
        case '30days': return 'blue';
        case 'date': return 'cyan';
        case 'none': return 'gray';
        default: return 'gray';
    }
};

const getRelativeDate = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.ceil((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays <= 7) return `In ${diffDays} days`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getTypeIcon = (type: string) => {
    switch (type) {
        case 'project': return FolderKanban;
        case 'task': return CheckCircle;
        case 'quicknote': return StickyNote;
        case 'grocery': return Apple;
        case 'purchase': return ShoppingCart;
        case 'goal': return Target;
        default: return CheckCircle;
    }
};

const getTypeColor = (type: string) => {
    switch (type) {
        case 'project': return 'orange';
        case 'task': return 'blue';
        case 'quicknote': return 'purple';
        case 'grocery': return 'green';
        case 'purchase': return 'pink';
        case 'goal': return 'red';
        default: return 'gray';
    }
};

export const TaskStream: React.FC<TaskStreamProps> = ({
    projects,
    groceries,
    purchases,
    goals,
    onCompleteTask,
    onNavigate,
    maxItems = 10,
    showFilters = true
}) => {
    const { user } = useAuth();
    const { settings, getOwnerName, isOwner } = useSharing();
    const [filter, setFilter] = useState<TaskStreamFilter>('all');
    const [expandedItem, setExpandedItem] = useState<string | null>(null);

    const streamItems = useMemo<StreamItem[]>(() => {
        const items: StreamItem[] = [];
        const now = new Date();
        
        const collectProjectTasks = (projectItems: ProjectItem[], parentPath: string[] = []) => {
            projectItems.forEach(item => {
                if (item.isArchived) return;
                
                const isQuickNote = item.isQuickNotes;
                const hasActionableDate = item.dueDate || item.reminder;
                
                if ((item.status as string) !== 'Completed' && (hasActionableDate || item.priority === 'High' || (item.priority as string) === 'Critical')) {
                    items.push({
                        id: item.id,
                        title: item.name,
                        subtitle: parentPath.length > 0 ? parentPath.join(' > ') : undefined,
                        type: isQuickNote ? 'quicknote' : (item.type === 'project' ? 'project' : 'task'),
                        dueDate: item.dueDate || null,
                        status: item.status,
                        priority: item.priority,
                        owner: item.owner,
                        assignedTo: item.assignee,
                        isCompleted: (item.status as string) === 'Completed',
                        hasReminder: !!item.reminder,
                        sourceCollection: 'projects',
                        originalItem: item
                    });
                }
                
                if (item.subtasks && item.subtasks.length > 0) {
                    collectProjectTasks(item.subtasks, [...parentPath, item.name]);
                }
            });
        };
        
        collectProjectTasks(projects);
        
        groceries.filter(g => !g.completed && !g.isHistory).forEach(grocery => {
            if (grocery.urgency || grocery.dueDate || grocery.priority === 'high') {
                items.push({
                    id: grocery.id,
                    title: grocery.name,
                    subtitle: grocery.store || grocery.category,
                    type: 'grocery',
                    dueDate: grocery.dueDate || null,
                    urgency: grocery.urgency,
                    owner: grocery.owner,
                    assignedTo: grocery.assignedTo,
                    isCompleted: grocery.completed,
                    sourceCollection: 'groceries',
                    originalItem: grocery
                });
            }
        });
        
        purchases.filter(p => p.status !== 'Delivered' && p.status !== 'Cancelled').forEach(purchase => {
            if (purchase.urgency || purchase.dueDate || purchase.priorityLevel === 'Must Have') {
                items.push({
                    id: purchase.id,
                    title: purchase.itemName,
                    subtitle: purchase.store,
                    type: 'purchase',
                    dueDate: purchase.dueDate || null,
                    urgency: purchase.urgency,
                    status: purchase.status,
                    owner: purchase.owner,
                    assignedTo: purchase.assignedTo,
                    isCompleted: purchase.status === 'Delivered',
                    sourceCollection: 'purchases',
                    originalItem: purchase
                });
            }
        });
        
        goals.filter(g => g.status !== 'Achieved' && g.status !== 'Abandoned').forEach(goal => {
            if (goal.deadline) {
                const deadline = new Date(goal.deadline);
                const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                
                if (daysUntil <= 30) {
                    items.push({
                        id: goal.id,
                        title: goal.name,
                        subtitle: `${goal.progress}% complete`,
                        type: 'goal',
                        dueDate: goal.deadline,
                        status: goal.status,
                        owner: goal.owner,
                        isCompleted: goal.status === 'Achieved',
                        sourceCollection: 'goals',
                        originalItem: goal
                    });
                }
            }
        });
        
        return items.sort((a, b) => {
            const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            
            if (aDate === Infinity && bDate === Infinity) {
                const priorityOrder: Record<string, number> = { 'Critical': 0, 'High': 1, 'Medium': 2, 'Low': 3 };
                return (priorityOrder[a.priority || 'Medium'] || 2) - (priorityOrder[b.priority || 'Medium'] || 2);
            }
            
            return aDate - bDate;
        });
    }, [projects, groceries, purchases, goals]);

    const filteredItems = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        let filtered = streamItems;
        
        switch (filter) {
            case 'overdue':
                filtered = streamItems.filter(item => {
                    if (!item.dueDate) return false;
                    return new Date(item.dueDate) < today;
                });
                break;
            case 'today':
                filtered = streamItems.filter(item => {
                    if (!item.dueDate) return item.urgency === 'today';
                    const dueDay = new Date(item.dueDate);
                    return dueDay.toDateString() === today.toDateString();
                });
                break;
            case 'week':
                filtered = streamItems.filter(item => {
                    if (!item.dueDate) return ['today', 'tomorrow', 'this_week'].includes(item.urgency || '');
                    const due = new Date(item.dueDate);
                    return due >= today && due <= weekFromNow;
                });
                break;
            case 'assigned':
                filtered = streamItems.filter(item => 
                    item.assignedTo === user?.uid || item.assignedTo === user?.displayName
                );
                break;
        }
        
        return filtered.slice(0, maxItems);
    }, [streamItems, filter, maxItems, user]);

    const stats = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        return {
            total: streamItems.length,
            overdue: streamItems.filter(i => i.dueDate && new Date(i.dueDate) < today).length,
            today: streamItems.filter(i => {
                if (!i.dueDate) return i.urgency === 'today';
                return new Date(i.dueDate).toDateString() === today.toDateString();
            }).length,
            assigned: streamItems.filter(i => 
                i.assignedTo === user?.uid || i.assignedTo === user?.displayName
            ).length
        };
    }, [streamItems, user]);

    const filterButtons: { key: TaskStreamFilter; label: string; count?: number; color?: string }[] = [
        { key: 'all', label: 'All', count: stats.total },
        { key: 'overdue', label: 'Overdue', count: stats.overdue, color: 'red' },
        { key: 'today', label: 'Today', count: stats.today, color: 'amber' },
        { key: 'week', label: 'This Week' },
        { key: 'assigned', label: 'Assigned to Me', count: stats.assigned }
    ];

    if (streamItems.length === 0) {
        return (
            <Card className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="text-green-600" size={24} />
                </div>
                <h3 className="font-semibold text-gray-900">All caught up!</h3>
                <p className="text-sm text-gray-500 mt-1">No urgent tasks or deadlines coming up</p>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {showFilters && (
                <div className="flex flex-wrap gap-2">
                    {filterButtons.map(btn => (
                        <button
                            key={btn.key}
                            onClick={() => setFilter(btn.key)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                filter === btn.key
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {btn.label}
                            {btn.count !== undefined && btn.count > 0 && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    filter === btn.key 
                                        ? 'bg-white/20 text-white' 
                                        : btn.color === 'red' 
                                            ? 'bg-red-100 text-red-700'
                                            : btn.color === 'amber'
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-gray-200 text-gray-700'
                                }`}>
                                    {btn.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            <div className="space-y-2">
                {filteredItems.map(item => {
                    const Icon = getTypeIcon(item.type);
                    const typeColor = getTypeColor(item.type);
                    const urgencyColor = getUrgencyColor(item.urgency, item.dueDate);
                    const relativeDate = getRelativeDate(item.dueDate);
                    const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();
                    
                    return (
                        <div
                            key={`${item.sourceCollection}-${item.id}`}
                            className={`group bg-white rounded-xl border transition-all hover:shadow-md cursor-pointer ${
                                isOverdue ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
                            }`}
                            onClick={() => onNavigate?.(item.sourceCollection, item.id)}
                        >
                            <div className="flex items-center gap-3 p-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                    item.isCompleted 
                                        ? 'bg-green-100 text-green-600' 
                                        : `bg-${typeColor}-50 text-${typeColor}-600`
                                }`} style={{
                                    backgroundColor: item.isCompleted ? undefined : `var(--${typeColor}-50, #f0f9ff)`,
                                    color: item.isCompleted ? undefined : `var(--${typeColor}-600, #0284c7)`
                                }}>
                                    <Icon size={18} />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className={`font-medium text-sm truncate ${
                                            item.isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'
                                        }`}>
                                            {item.title}
                                        </h4>
                                        {item.hasReminder && (
                                            <Bell size={12} className="text-purple-500 flex-shrink-0" />
                                        )}
                                        {item.owner && settings.showOwnerLabels && (
                                            <OwnerBadge 
                                                ownerName={getOwnerName(item.owner)} 
                                                isOwner={isOwner(item.owner)} 
                                                size="xs" 
                                            />
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {item.subtitle && (
                                            <span className="text-xs text-gray-500 truncate">{item.subtitle}</span>
                                        )}
                                        {relativeDate && (
                                            <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                                                isOverdue ? 'text-red-600' : 
                                                urgencyColor === 'amber' ? 'text-amber-600' :
                                                urgencyColor === 'orange' ? 'text-orange-600' :
                                                'text-gray-500'
                                            }`}>
                                                <Clock size={10} />
                                                {relativeDate}
                                            </span>
                                        )}
                                        {item.priority && ['High', 'Critical'].includes(item.priority) && (
                                            <Badge 
                                                variant={item.priority === 'Critical' ? 'danger' : 'warning'} 
                                                size="xs"
                                            >
                                                {item.priority}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                    {onCompleteTask && !item.isCompleted && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCompleteTask(item);
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Mark complete"
                                        >
                                            <Check size={16} />
                                        </button>
                                    )}
                                    <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-400" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {filteredItems.length < streamItems.length && filter === 'all' && (
                <p className="text-center text-xs text-gray-500 pt-2">
                    Showing {filteredItems.length} of {streamItems.length} items
                </p>
            )}
        </div>
    );
};

export default TaskStream;
