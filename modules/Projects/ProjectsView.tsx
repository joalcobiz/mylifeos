import React, { useState, useMemo, useEffect } from 'react';
import { 
    Plus, ChevronRight, ChevronDown, Edit2, CheckSquare, Square, MessageSquare,
    User, Search, Trash2, Send, Paperclip, MoreHorizontal, StickyNote, FilePlus,
    FolderKanban, Calendar, Flag, Clock, Users, Target, ArrowRight, Inbox, 
    LayoutList, Table2, UserCheck, Filter, Bell, BellRing, AlertCircle, X
} from 'lucide-react';
import { ProjectItem, SortConfig, StatusLevel, PriorityLevel, Note, Goal, Reminder } from '../../types';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useFirestore } from '../../services/firestore';
import { useAuth, MOCK_USERS } from '../../contexts/AuthContext';
import { useSharing, filterDataBySharing, SharingMode } from '../../contexts/SharingContext';
import { Card, Button, Badge, Progress, Input, Textarea, Select, EmptyState } from '../../components/ui';
import HighlightText from '../../components/HighlightText';
import { ShareToggle } from '../../components/ShareToggle';
import SharingFilter, { OwnerBadge } from '../../components/SharingFilter';

type ViewFilterType = 'Default' | 'By Assignee' | 'By Creator' | 'By Due Date' | 'By Priority' | 'By Status' | 'Not Completed' | 'View Completed' | 'View Archived';
type ViewModeType = 'list' | 'table';

interface ProjectsViewProps {
    focusId?: string;
}

const ProjectsView: React.FC<ProjectsViewProps> = ({ focusId }) => {
    const { data: firestoreItems, add: addItem, update: updateItem, remove: removeItem } = useFirestore<ProjectItem>('projects');
    const { data: goals } = useFirestore<Goal>('goals');
    const { user } = useAuth();
    const { settings: sharingSettings, getModuleSharingMode, getOwnerName, isOwner } = useSharing();
    
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [filterBy, setFilterBy] = useState<ViewFilterType>('Default'); 
    const [searchQuery, setSearchQuery] = useState('');
    const [modalMode, setModalMode] = useState<'create-project' | 'create-subtask' | 'create-quicknote' | 'edit' | 'none'>('none');
    const [selectedItem, setSelectedItem] = useState<ProjectItem | null>(null);
    const [formData, setFormData] = useState<Partial<ProjectItem>>({});
    const [viewMode, setViewMode] = useState<ViewModeType>('list');
    const [viewingUser, setViewingUser] = useState<string>('all');
    const [newComment, setNewComment] = useState('');
    const [showConvertPicker, setShowConvertPicker] = useState(false);
    const [sharingMode, setSharingMode] = useState<SharingMode>(() => getModuleSharingMode('projects'));
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; itemId: string; itemName: string }>({ isOpen: false, itemId: '', itemName: '' });

    const handleDeleteClick = (id: string, name: string) => {
        setDeleteConfirm({ isOpen: true, itemId: id, itemName: name });
    };

    const handleConfirmDelete = async () => {
        if (deleteConfirm.itemId) {
            await removeItem(deleteConfirm.itemId);
            setDeleteConfirm({ isOpen: false, itemId: '', itemName: '' });
        }
    };

    const isAdmin = user?.isAdmin === true;

    const sharingStats = useMemo(() => {
        const userId = user?.uid || '';
        return {
            total: firestoreItems.length,
            mine: firestoreItems.filter(item => item.owner === userId).length,
            shared: firestoreItems.filter(item => 
                item.owner !== userId && (item.isShared || item.sharedWith?.includes(userId))
            ).length,
            assigned: firestoreItems.filter(item => 
                item.assignedTo === userId && item.owner !== userId
            ).length
        };
    }, [firestoreItems, user]);

    const items = useMemo<ProjectItem[]>(() => {
        const filteredBySharing = filterDataBySharing<ProjectItem>(
            firestoreItems, 
            user?.uid || '', 
            sharingMode, 
            isAdmin
        );
        
        const withExpansion = (nodes: ProjectItem[]): ProjectItem[] => {
            return nodes.map(node => ({
                ...node,
                isExpanded: expandedIds.has(node.id),
                subtasks: node.subtasks && node.subtasks.length > 0 ? withExpansion(node.subtasks) : []
            }));
        };
        return withExpansion(filteredBySharing);
    }, [firestoreItems, expandedIds, sharingMode, user, isAdmin]);

    const toggleExpand = (id: string) => {
        const newSet = new Set(expandedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedIds(newSet);
    };

    const handleOpenCreate = (parentItem?: ProjectItem, isQuickNote: boolean = false) => {
        setSelectedItem(parentItem || null);
        setFormData({
            name: '',
            description: '',
            status: 'Not Started',
            priority: 'Medium',
            assignee: user?.displayName || 'Me',
            creator: user?.displayName || 'Me',
            dueDate: '',
            progress: 0,
            isQuickNotes: isQuickNote,
            reminder: undefined
        });
        if (isQuickNote) {
            setModalMode('create-quicknote');
        } else {
            setModalMode(parentItem ? 'create-subtask' : 'create-project');
        }
    };

    const handleOpenEdit = (item: ProjectItem) => {
        setSelectedItem(item);
        setFormData({
            name: item.name,
            description: item.description,
            status: item.status,
            priority: item.priority,
            assignee: item.assignee,
            dueDate: item.dueDate,
            progress: item.progress,
            isQuickNotes: item.isQuickNotes,
            owner: item.owner,
            isShared: item.isShared,
            sharedWith: item.sharedWith,
            reminder: item.reminder,
            notes: item.notes || []
        });
        setNewComment('');
        setShowConvertPicker(false);
        setModalMode('edit');
    };

    const handleToggleShare = async (itemId: string) => {
        const item = items.find(i => i.id === itemId);
        if (item) {
            await updateItem(itemId, { isShared: !item.isShared });
        }
    };

    const handleSave = async () => {
        if (!formData.name) return;

        if (modalMode === 'create-project' || modalMode === 'create-quicknote') {
            const newProject: any = {
                type: modalMode === 'create-quicknote' ? 'task' : 'project',
                name: formData.name,
                description: formData.description || '',
                status: formData.status || 'Not Started',
                priority: formData.priority || 'Medium',
                creator: user?.displayName || 'Me',
                assignee: formData.assignee || user?.displayName || 'Me',
                dueDate: formData.dueDate || '',
                createdDate: new Date().toISOString(),
                progress: 0,
                subtasks: [],
                notes: formData.notes || [],
                isQuickNotes: modalMode === 'create-quicknote',
                owner: user?.uid || 'default',
                isShared: false,
                sharedWith: [],
                reminder: formData.reminder
            };
            await addItem(newProject);
        } else if (modalMode === 'create-subtask' && selectedItem) {
            const newTask: ProjectItem = {
                id: `task-${Date.now()}`,
                type: 'task',
                name: formData.name,
                description: formData.description || '',
                status: formData.status || 'Not Started',
                priority: formData.priority || 'Medium',
                assignee: formData.assignee || user?.displayName || 'Me',
                dueDate: formData.dueDate || '',
                createdDate: new Date().toISOString(),
                progress: 0,
                subtasks: [],
                notes: [],
                parentPath: [...(selectedItem.parentPath || []), selectedItem.name]
            };
            const updatedSubtasks = [...(selectedItem.subtasks || []), newTask];
            await updateItem(selectedItem.id, { subtasks: updatedSubtasks });
        } else if (modalMode === 'edit' && selectedItem) {
            await updateItem(selectedItem.id, formData);
        }

        setModalMode('none');
        setSelectedItem(null);
        setFormData({});
    };

    const handleToggleStatus = async (item: ProjectItem, e: React.MouseEvent) => {
        e.stopPropagation();
        const newStatus: StatusLevel = item.status === 'Completed' ? 'Not Started' : 'Completed';
        const newProgress = newStatus === 'Completed' ? 100 : 0;
        await updateItem(item.id, { status: newStatus, progress: newProgress });
    };

    const handleConvertToProject = async (item: ProjectItem) => {
        await updateItem(item.id, { 
            type: 'project', 
            isQuickNotes: false,
            subtasks: item.subtasks || [],
            notes: item.notes || [],
            progress: item.progress || 0,
            status: item.status || 'Not Started',
            priority: item.priority || 'Medium',
            parentPath: []
        });
    };

    const getLinkedGoals = (projectId: string) => {
        return goals.filter(g => g.linkedProjectIds?.includes(projectId));
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'High': return 'danger';
            case 'Medium': return 'warning';
            case 'Low': return 'default';
            default: return 'default';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return 'success';
            case 'In Progress': return 'info';
            case 'On Hold': return 'warning';
            default: return 'default';
        }
    };

    const quickNotes = useMemo(() => {
        return items.filter(i => i.isQuickNotes === true);
    }, [items]);

    const assignedToMe = useMemo(() => {
        const userName = user?.displayName;
        if (!userName) return [];
        return items.filter(i => 
            !i.isQuickNotes && 
            i.assignee === userName && 
            i.creator !== userName
        );
    }, [items, user]);

    const getUserDisplayName = (uid: string): string => {
        const foundUser = MOCK_USERS.find(u => u.uid === uid);
        return foundUser?.displayName || uid;
    };

    const regularProjects = useMemo(() => {
        let result = items.filter(i => !i.isQuickNotes && i.type === 'project');
        
        if (!isAdmin || viewingUser !== 'all') {
            const filterDisplayName = viewingUser === 'all' ? user?.displayName : getUserDisplayName(viewingUser);
            result = result.filter(p => 
                p.creator === filterDisplayName || 
                p.assignee === filterDisplayName
            );
        }
        
        return result;
    }, [items, isAdmin, viewingUser, user]);

    const filteredItems = useMemo(() => {
        let result = regularProjects;
        
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const filterRecursive = (items: ProjectItem[]): ProjectItem[] => {
                return items.filter(item => {
                    const matches = item.name.toLowerCase().includes(q) || 
                                    item.description?.toLowerCase().includes(q);
                    const hasMatchingSubtasks = item.subtasks && filterRecursive(item.subtasks).length > 0;
                    return matches || hasMatchingSubtasks;
                });
            };
            result = filterRecursive(result);
        }

        if (filterBy === 'Not Completed') {
            result = result.filter(p => p.status !== 'Completed');
        } else if (filterBy === 'View Completed') {
            result = result.filter(p => p.status === 'Completed');
        }

        return result;
    }, [regularProjects, searchQuery, filterBy]);


    const renderQuickNoteRow = (item: ProjectItem) => {
        const isCompleted = item.status === 'Completed';
        const hasDueDate = !!item.dueDate;
        const hasReminder = !!item.reminder;
        const isOverdue = hasDueDate && !isCompleted && new Date(item.dueDate) < new Date(new Date().setHours(0, 0, 0, 0));
        const isDueToday = hasDueDate && !isCompleted && new Date(item.dueDate).toDateString() === new Date().toDateString();
        const isDueSoon = hasDueDate && !isCompleted && !isOverdue && !isDueToday && 
            new Date(item.dueDate) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

        return (
            <div 
                key={item.id}
                className={`group flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                    isCompleted ? 'bg-gray-50 opacity-60' : 
                    isOverdue ? 'bg-red-50/70 border border-red-200' :
                    isDueToday ? 'bg-amber-50/70 border border-amber-200' :
                    'bg-amber-50/50 hover:bg-amber-50'
                }`}
            >
                <button
                    onClick={(e) => handleToggleStatus(item, e)}
                    className={`w-5 h-5 rounded flex items-center justify-center transition-all flex-shrink-0 ${
                        isCompleted 
                            ? 'bg-green-500 text-white' 
                            : 'border-2 border-amber-400 text-transparent hover:border-green-400 hover:text-green-400'
                    }`}
                >
                    <CheckSquare size={12} />
                </button>

                <div className="flex-1 min-w-0">
                    <span className={`text-sm ${isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        <HighlightText text={item.name} highlight={searchQuery} />
                    </span>
                    
                    {(hasDueDate || hasReminder) && !isCompleted && (
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {hasDueDate && (
                                <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                                    isOverdue ? 'bg-red-100 text-red-700' :
                                    isDueToday ? 'bg-amber-100 text-amber-700' :
                                    isDueSoon ? 'bg-orange-100 text-orange-700' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                    <Calendar size={10} />
                                    {isOverdue ? 'Overdue' : isDueToday ? 'Due today' : new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                            )}
                            {hasReminder && (
                                <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                                    <Bell size={10} />
                                    {item.reminder?.type === 'daily' ? 'Daily' : 
                                     item.reminder?.type === 'weekly' ? 'Weekly' : 
                                     new Date(item.reminder?.datetime || '').toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => handleConvertToProject(item)}
                        className="p-1 text-amber-600 hover:text-amber-700 hover:bg-amber-100 rounded transition-colors"
                        title="Convert to Project"
                    >
                        <FolderKanban size={14} />
                    </button>
                    <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Edit"
                    >
                        <Edit2 size={14} />
                    </button>
                    <button
                        onClick={() => handleDeleteClick(item.id, item.name)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
        );
    };

    const renderAssignedRow = (item: ProjectItem) => {
        const isCompleted = item.status === 'Completed';

        return (
            <div 
                key={item.id}
                className={`group flex items-center gap-3 p-2 bg-blue-50/50 hover:bg-blue-50 rounded-lg transition-all ${
                    isCompleted ? 'opacity-60' : ''
                }`}
            >
                <button
                    onClick={(e) => handleToggleStatus(item, e)}
                    className={`w-5 h-5 rounded flex items-center justify-center transition-all flex-shrink-0 ${
                        isCompleted 
                            ? 'bg-green-500 text-white' 
                            : 'border-2 border-blue-400 text-transparent hover:border-green-400 hover:text-green-400'
                    }`}
                >
                    <CheckSquare size={12} />
                </button>

                <span className={`flex-1 text-sm ${isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    <HighlightText text={item.name} highlight={searchQuery} />
                </span>

                <Badge variant="info" size="xs">
                    <User size={10} className="mr-1" />
                    From: {item.creator}
                </Badge>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Edit"
                    >
                        <Edit2 size={14} />
                    </button>
                </div>
            </div>
        );
    };

    const renderProjectRow = (item: ProjectItem, level: number = 0) => {
        const hasSubtasks = item.subtasks && item.subtasks.length > 0;
        const linkedGoals = getLinkedGoals(item.id);
        const isCompleted = item.status === 'Completed';
        const indentWidth = level * 24;

        return (
            <React.Fragment key={item.id}>
                <div 
                    id={`row-${item.id}`}
                    className={`group bg-white hover:bg-gray-50 border border-gray-100 rounded-xl p-3 md:py-2 md:px-3 mb-2 transition-all ${
                        isCompleted ? 'opacity-60' : ''
                    }`}
                    style={{ marginLeft: `${indentWidth}px` }}
                >
                    {/* Mobile Layout - Card Style */}
                    <div className="md:hidden">
                        <div className="flex items-start gap-3">
                            <button
                                onClick={(e) => handleToggleStatus(item, e)}
                                className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                                    isCompleted 
                                        ? 'bg-green-500 text-white' 
                                        : 'border-2 border-gray-300 text-transparent hover:border-green-400 hover:text-green-400'
                                }`}
                            >
                                <CheckSquare size={14} />
                            </button>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {hasSubtasks && (
                                        <button 
                                            onClick={() => toggleExpand(item.id)}
                                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                                        >
                                            {item.isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </button>
                                    )}
                                    <h4 className={`font-medium ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                        <HighlightText text={item.name} highlight={searchQuery} />
                                    </h4>
                                </div>
                                
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                    <Badge variant={getPriorityColor(item.priority) as any} size="xs">
                                        <Flag size={10} className="mr-1" />
                                        {item.priority}
                                    </Badge>
                                    <Badge variant={getStatusColor(item.status) as any} size="xs">
                                        {item.status}
                                    </Badge>
                                    {sharingSettings.showOwnerLabels && item.owner && !isOwner(item.owner) && (
                                        <OwnerBadge 
                                            ownerName={getOwnerName(item.owner)} 
                                            isOwner={isOwner(item.owner)} 
                                            size="xs"
                                        />
                                    )}
                                </div>

                                {item.description && (
                                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{item.description}</p>
                                )}

                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                                    {item.assignee && (
                                        <span className="flex items-center gap-1">
                                            <User size={12} />
                                            {item.assignee}
                                        </span>
                                    )}
                                    {item.dueDate && (
                                        <span className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            {new Date(item.dueDate).toLocaleDateString()}
                                        </span>
                                    )}
                                    {hasSubtasks && (
                                        <span className="flex items-center gap-1">
                                            <FolderKanban size={12} />
                                            {item.subtasks?.length} subtasks
                                        </span>
                                    )}
                                    {linkedGoals.length > 0 && (
                                        <span className="flex items-center gap-1 text-purple-600">
                                            <Target size={12} />
                                            {linkedGoals.length} goal{linkedGoals.length > 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>

                                {item.type === 'project' && item.progress !== undefined && (
                                    <div className="mt-3">
                                        <Progress value={item.progress} size="sm" variant="gradient" showLabel />
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-100">
                            <button
                                onClick={() => handleOpenCreate(item)}
                                className="flex-1 flex items-center justify-center gap-1 p-2 text-gray-500 hover:text-primary hover:bg-primary-muted rounded-lg transition-colors text-xs"
                            >
                                <Plus size={14} /> Add
                            </button>
                            <button
                                onClick={() => handleOpenEdit(item)}
                                className="flex-1 flex items-center justify-center gap-1 p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-xs"
                            >
                                <Edit2 size={14} /> Edit
                            </button>
                            <button
                                onClick={() => handleDeleteClick(item.id, item.name)}
                                className="flex-1 flex items-center justify-center gap-1 p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors text-xs"
                            >
                                <Trash2 size={14} /> Delete
                            </button>
                        </div>
                    </div>

                    {/* Desktop Layout - Single Line with Right-Aligned Pills */}
                    <div className="hidden md:flex items-center gap-2">
                        <button
                            onClick={(e) => handleToggleStatus(item, e)}
                            className={`w-5 h-5 rounded flex items-center justify-center transition-all flex-shrink-0 ${
                                isCompleted 
                                    ? 'bg-green-500 text-white' 
                                    : 'border-2 border-gray-300 text-transparent hover:border-green-400 hover:text-green-400'
                            }`}
                        >
                            <CheckSquare size={12} />
                        </button>

                        {hasSubtasks && (
                            <button 
                                onClick={() => toggleExpand(item.id)}
                                className="p-0.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                            >
                                {item.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                        )}

                        <span className={`font-medium truncate ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`} style={{ minWidth: '120px', maxWidth: '300px' }}>
                            <HighlightText text={item.name} highlight={searchQuery} />
                        </span>

                        {/* Spacer to push everything else right */}
                        <div className="flex-1 min-w-0" />

                        {/* Right-aligned metadata and badges */}
                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-shrink-0">
                            {item.assignee && (
                                <span className="flex items-center gap-1">
                                    <User size={11} />
                                    {item.assignee}
                                </span>
                            )}
                            {item.dueDate && (
                                <span className="flex items-center gap-1">
                                    <Calendar size={11} />
                                    {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                            )}
                            {hasSubtasks && (
                                <span className="flex items-center gap-1">
                                    <FolderKanban size={11} />
                                    {item.subtasks?.length}
                                </span>
                            )}
                            {linkedGoals.length > 0 && (
                                <span className="flex items-center gap-1 text-purple-600">
                                    <Target size={11} />
                                    {linkedGoals.length}
                                </span>
                            )}
                            
                            {item.type === 'project' && item.progress !== undefined && (
                                <div className="w-16">
                                    <Progress value={item.progress} size="xs" variant="gradient" />
                                </div>
                            )}
                        </div>

                        {/* Attribution and Badges */}
                        <div className="flex items-center gap-1.5 flex-shrink-0 justify-end">
                            {sharingSettings.showOwnerLabels && item.owner && !isOwner(item.owner) && (
                                <OwnerBadge 
                                    ownerName={getOwnerName(item.owner)} 
                                    isOwner={isOwner(item.owner)} 
                                    size="xs"
                                />
                            )}
                            <Badge variant={getPriorityColor(item.priority) as any} size="xs">
                                <Flag size={10} className="mr-1" />
                                {item.priority}
                            </Badge>
                            <Badge variant={getStatusColor(item.status) as any} size="xs">
                                {item.status}
                            </Badge>
                        </div>

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-[80px] justify-end">
                            <button
                                onClick={() => handleOpenCreate(item)}
                                className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-muted rounded transition-colors"
                                title="Add subtask"
                            >
                                <Plus size={14} />
                            </button>
                            <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                title="Edit"
                            >
                                <Edit2 size={14} />
                            </button>
                            <button
                                onClick={() => handleDeleteClick(item.id, item.name)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                </div>

                {item.isExpanded && hasSubtasks && (
                    <div className="animate-enter">
                        {item.subtasks?.map(subtask => renderProjectRow(subtask, level + 1))}
                    </div>
                )}
            </React.Fragment>
        );
    };

    const renderTableView = () => {
        const allItems: (ProjectItem & { depth: number })[] = [];
        
        const flattenItems = (items: ProjectItem[], depth: number = 0) => {
            items.forEach(item => {
                allItems.push({ ...item, depth });
                if (item.isExpanded && item.subtasks) {
                    flattenItems(item.subtasks, depth + 1);
                }
            });
        };
        
        flattenItems(filteredItems);

        return (
            <Card padding="none">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left py-3 px-4 font-medium text-gray-600 w-8"></th>
                                <th className="text-left py-3 px-4 font-medium text-gray-600">Name</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-600">Priority</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-600">Assignee</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-600">Due Date</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-600">Progress</th>
                                <th className="text-right py-3 px-4 font-medium text-gray-600 w-20">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {allItems.map((item) => {
                                const isCompleted = item.status === 'Completed';
                                const hasSubtasks = item.subtasks && item.subtasks.length > 0;
                                
                                return (
                                    <tr key={item.id} className={`hover:bg-gray-50 ${isCompleted ? 'opacity-60' : ''}`}>
                                        <td className="py-2 px-4">
                                            <button
                                                onClick={(e) => handleToggleStatus(item, e)}
                                                className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                                                    isCompleted 
                                                        ? 'bg-green-500 text-white' 
                                                        : 'border-2 border-gray-300 text-transparent hover:border-green-400'
                                                }`}
                                            >
                                                <CheckSquare size={12} />
                                            </button>
                                        </td>
                                        <td className="py-2 px-4">
                                            <div className="flex items-center gap-2" style={{ paddingLeft: `${item.depth * 20}px` }}>
                                                {hasSubtasks && (
                                                    <button onClick={() => toggleExpand(item.id)} className="p-0.5 hover:bg-gray-100 rounded">
                                                        {item.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                    </button>
                                                )}
                                                <span className={`font-medium ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                                    {item.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-2 px-4">
                                            <Badge variant={getStatusColor(item.status) as any} size="xs">{item.status}</Badge>
                                        </td>
                                        <td className="py-2 px-4">
                                            <Badge variant={getPriorityColor(item.priority) as any} size="xs">{item.priority}</Badge>
                                        </td>
                                        <td className="py-2 px-4 text-gray-600">{item.assignee || '-'}</td>
                                        <td className="py-2 px-4 text-gray-600">
                                            {item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                                        </td>
                                        <td className="py-2 px-4">
                                            {item.type === 'project' ? (
                                                <div className="w-20">
                                                    <Progress value={item.progress || 0} size="xs" variant="gradient" />
                                                </div>
                                            ) : '-'}
                                        </td>
                                        <td className="py-2 px-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => handleOpenEdit(item)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleDeleteClick(item.id, item.name)} className="p-1 text-gray-400 hover:text-red-500 rounded">
                                                    <Trash2 size={14} />
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
        );
    };

    return (
        <div className="space-y-6 animate-enter">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                        <FolderKanban size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Projects</h2>
                        <p className="text-white/80 text-sm">Manage your projects and tasks</p>
                    </div>
                </div>
                <Button 
                    onClick={() => handleOpenCreate()} 
                    variant="secondary"
                    icon={Plus}
                    size="sm"
                >
                    New Project
                </Button>
            </div>

            {/* Quick Notes Section - Always at Top */}
            <Card className="border-2 border-amber-200 bg-amber-50/30">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                            <StickyNote size={16} className="text-amber-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Quick Notes</h3>
                            <p className="text-xs text-gray-500">Capture ideas - convert to projects later</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => handleOpenCreate(undefined, true)} 
                        variant="ghost"
                        icon={Plus}
                        size="xs"
                    >
                        Add Note
                    </Button>
                </div>
                
                {quickNotes.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No quick notes yet. Capture your ideas here!</p>
                ) : (
                    <div className="space-y-1">
                        {quickNotes.map(note => renderQuickNoteRow(note))}
                    </div>
                )}
            </Card>

            {/* Assigned To Me Section */}
            {assignedToMe.length > 0 && (
                <Card className="border-2 border-blue-200 bg-blue-50/30">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Inbox size={16} className="text-blue-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-900">Assigned To Me</h3>
                            <p className="text-xs text-gray-500">Tasks assigned by other users</p>
                        </div>
                        <Badge variant="info" size="sm" className="ml-auto">{assignedToMe.length}</Badge>
                    </div>
                    
                    <div className="space-y-1">
                        {assignedToMe.map(item => renderAssignedRow(item))}
                    </div>
                </Card>
            )}

            <Card padding="sm">
                <div className="flex flex-col gap-3">
                    {/* First row: Search and filters */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1">
                            <Input
                                icon={Search}
                                placeholder="Search projects and tasks..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        
                        {isAdmin && (
                            <Select
                                options={[
                                    { value: 'all', label: 'All Users' },
                                    ...MOCK_USERS.map(u => ({ value: u.uid, label: u.displayName || u.uid }))
                                ]}
                                value={viewingUser}
                                onChange={(v) => setViewingUser(v)}
                                fullWidth={false}
                                className="w-full md:w-40"
                            />
                        )}
                        
                        <Select
                            options={[
                                { value: 'Default', label: 'All Projects' },
                                { value: 'Not Completed', label: 'Active Only' },
                                { value: 'View Completed', label: 'Completed Only' }
                            ]}
                            value={filterBy}
                            onChange={(v) => setFilterBy(v as ViewFilterType)}
                            fullWidth={false}
                            className="w-full md:w-40"
                        />
                        
                        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                title="List View"
                            >
                                <LayoutList size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-2 ${viewMode === 'table' ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                title="Table View"
                            >
                                <Table2 size={18} />
                            </button>
                        </div>
                    </div>
                    
                    {/* Second row: Visibility */}
                    <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                        <span className="text-sm font-medium text-gray-600">Visibility:</span>
                        <SharingFilter
                            mode={sharingMode}
                            onChange={setSharingMode}
                            stats={sharingStats}
                            compact
                        />
                    </div>
                </div>
            </Card>

            {filteredItems.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={FolderKanban}
                        title="No projects found"
                        description={searchQuery ? "Try a different search term" : "Create your first project to get started"}
                        actionLabel={searchQuery ? undefined : "Create Project"}
                        onAction={searchQuery ? undefined : () => handleOpenCreate()}
                    />
                </Card>
            ) : viewMode === 'table' ? (
                renderTableView()
            ) : (
                <div className="space-y-2">
                    {filteredItems.map(item => renderProjectRow(item))}
                </div>
            )}

            <Modal 
                isOpen={modalMode !== 'none'} 
                onClose={() => {
                    setModalMode('none');
                    setSelectedItem(null);
                    setNewComment('');
                    setShowConvertPicker(false);
                }} 
                title={
                    modalMode === 'create-project' ? 'New Project' :
                    modalMode === 'create-quicknote' ? 'Quick Note' :
                    modalMode === 'create-subtask' ? `Add Task to "${selectedItem?.name}"` :
                    formData.isQuickNotes ? 'Edit Note' : 'Edit Item'
                }
                size="full"
            >
                {/* Quick Note Compact Layout */}
                {(modalMode === 'create-quicknote' || (modalMode === 'edit' && formData.isQuickNotes)) ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        {/* Left Column - Note Content */}
                        <div className="lg:col-span-7 space-y-3">
                            {/* Note Header */}
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <StickyNote size={16} className="text-amber-600" />
                                    <span className="text-sm font-semibold text-gray-800">Note Details</span>
                                </div>
                                <Input
                                    placeholder="What's on your mind?"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                                <div className="mt-3">
                                    <Textarea
                                        placeholder="Add more details..."
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        rows={2}
                                    />
                                </div>
                            </div>

                            {/* Comments Section */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare size={14} className="text-gray-500" />
                                        <span className="text-sm font-semibold text-gray-700">Comments</span>
                                        {(formData.notes?.length || 0) > 0 && (
                                            <Badge variant="default">{formData.notes?.length}</Badge>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Comment List */}
                                <div className="space-y-2 max-h-32 overflow-y-auto mb-3">
                                    {(formData.notes || []).map((note, idx) => (
                                        <div key={note.id || idx} className="bg-gray-50 rounded-lg p-2.5 text-sm">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-medium text-gray-700 text-xs">{note.author}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(note.createdAt).toLocaleDateString()}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            const updatedNotes = (formData.notes || []).filter((_, i) => i !== idx);
                                                            setFormData({...formData, notes: updatedNotes});
                                                        }}
                                                        className="text-gray-400 hover:text-red-500"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-gray-600 text-xs">{note.content}</p>
                                            {note.attachments && note.attachments.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {note.attachments.map(att => (
                                                        <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded hover:bg-blue-100">
                                                            <Paperclip size={10} /> {att.name}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {(!formData.notes || formData.notes.length === 0) && (
                                        <p className="text-xs text-gray-400 text-center py-2">No comments yet</p>
                                    )}
                                </div>

                                {/* Add Comment */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Add a comment..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newComment.trim()) {
                                                const newNote: Note = {
                                                    id: `note-${Date.now()}`,
                                                    content: newComment,
                                                    createdAt: new Date().toISOString(),
                                                    author: user?.displayName || 'Me'
                                                };
                                                setFormData({...formData, notes: [...(formData.notes || []), newNote]});
                                                setNewComment('');
                                            }
                                        }}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    />
                                    <button
                                        onClick={() => {
                                            if (newComment.trim()) {
                                                const newNote: Note = {
                                                    id: `note-${Date.now()}`,
                                                    content: newComment,
                                                    createdAt: new Date().toISOString(),
                                                    author: user?.displayName || 'Me'
                                                };
                                                setFormData({...formData, notes: [...(formData.notes || []), newNote]});
                                                setNewComment('');
                                            }
                                        }}
                                        className="px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
                                    >
                                        <Send size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2">
                                <Button variant="secondary" fullWidth onClick={() => setModalMode('none')}>Cancel</Button>
                                <Button variant="primary" fullWidth onClick={handleSave} disabled={!formData.name}>
                                    {modalMode === 'edit' ? 'Save' : 'Add Note'}
                                </Button>
                            </div>
                        </div>

                        {/* Right Column - Scheduling & Actions */}
                        <div className="lg:col-span-5 space-y-3">
                            {/* Assignee */}
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center gap-2 mb-2">
                                    <UserCheck size={14} className="text-gray-500" />
                                    <span className="text-sm font-semibold text-gray-700">Assign To</span>
                                </div>
                                <Select
                                    options={MOCK_USERS.map(u => ({ value: u.displayName || '', label: u.displayName || '' }))}
                                    value={formData.assignee || user?.displayName || 'Me'}
                                    onChange={(v) => setFormData({...formData, assignee: v})}
                                />
                            </div>

                            {/* Scheduling */}
                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Bell size={14} className="text-purple-600" />
                                    <span className="text-sm font-semibold text-gray-700">Schedule</span>
                                </div>
                                
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
                                        <input
                                            type="date"
                                            value={formData.dueDate || ''}
                                            onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                                        />
                                    </div>
                                    
                                    {/* Quick Date Buttons */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            { label: 'Today', days: 0 },
                                            { label: 'Tomorrow', days: 1 },
                                            { label: '+7 Days', days: 7 }
                                        ].map(({ label, days }) => (
                                            <button
                                                key={label}
                                                type="button"
                                                onClick={() => {
                                                    const date = new Date();
                                                    date.setDate(date.getDate() + days);
                                                    setFormData({...formData, dueDate: date.toISOString().split('T')[0]});
                                                }}
                                                className="px-2.5 py-1 bg-white/70 hover:bg-white rounded text-xs font-medium text-gray-600 border border-purple-200"
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Reminder Type */}
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Reminder</label>
                                        <div className="grid grid-cols-4 gap-1">
                                            {[
                                                { type: 'none', label: 'None' },
                                                { type: 'once', label: 'Once' },
                                                { type: 'daily', label: 'Daily' },
                                                { type: 'weekly', label: 'Weekly' }
                                            ].map(({ type, label }) => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => {
                                                        if (type === 'none') {
                                                            setFormData({...formData, reminder: undefined});
                                                        } else {
                                                            setFormData({
                                                                ...formData, 
                                                                reminder: {
                                                                    id: `reminder-${Date.now()}`,
                                                                    type: type as 'once' | 'daily' | 'weekly',
                                                                    datetime: formData.reminder?.datetime || new Date().toISOString().slice(0, 16),
                                                                    notified: false
                                                                }
                                                            });
                                                        }
                                                    }}
                                                    className={`px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                                                        (type === 'none' && !formData.reminder) || formData.reminder?.type === type
                                                            ? 'bg-purple-500 text-white'
                                                            : 'bg-white text-gray-600 hover:bg-purple-100 border border-purple-200'
                                                    }`}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {formData.reminder && (
                                        <input
                                            type="datetime-local"
                                            value={formData.reminder.datetime?.slice(0, 16) || ''}
                                            onChange={(e) => setFormData({
                                                ...formData, 
                                                reminder: {...formData.reminder!, datetime: e.target.value}
                                            })}
                                            className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Convert Actions */}
                            {modalMode === 'edit' && formData.isQuickNotes && (
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                                    <div className="flex items-center gap-2 mb-3">
                                        <ArrowRight size={14} className="text-blue-600" />
                                        <span className="text-sm font-semibold text-gray-700">Convert To</span>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => {
                                                if (selectedItem) {
                                                    handleConvertToProject(selectedItem);
                                                    setModalMode('none');
                                                }
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2.5 bg-white rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors text-left"
                                        >
                                            <FolderKanban size={16} className="text-blue-600" />
                                            <div>
                                                <div className="text-sm font-medium text-gray-800">New Project</div>
                                                <div className="text-xs text-gray-500">Create a standalone project</div>
                                            </div>
                                        </button>
                                        
                                        <button
                                            onClick={() => setShowConvertPicker(!showConvertPicker)}
                                            className="w-full flex items-center gap-2 px-3 py-2.5 bg-white rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors text-left"
                                        >
                                            <Inbox size={16} className="text-indigo-600" />
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-gray-800">Task in Project</div>
                                                <div className="text-xs text-gray-500">Add as task to existing project</div>
                                            </div>
                                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${showConvertPicker ? 'rotate-180' : ''}`} />
                                        </button>

                                        {showConvertPicker && (
                                            <div className="bg-white rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
                                                {regularProjects.filter(p => !p.isQuickNotes && p.type === 'project').length === 0 ? (
                                                    <p className="text-xs text-gray-400 text-center py-3">No projects available</p>
                                                ) : (
                                                    regularProjects.filter(p => !p.isQuickNotes && p.type === 'project').map(project => (
                                                        <button
                                                            key={project.id}
                                                            onClick={async () => {
                                                                if (selectedItem) {
                                                                    const newTask: ProjectItem = {
                                                                        id: `task-${Date.now()}`,
                                                                        type: 'task',
                                                                        name: selectedItem.name,
                                                                        description: selectedItem.description || '',
                                                                        status: selectedItem.status || 'Not Started',
                                                                        priority: selectedItem.priority || 'Medium',
                                                                        assignee: selectedItem.assignee || user?.displayName || 'Me',
                                                                        dueDate: selectedItem.dueDate || '',
                                                                        createdDate: new Date().toISOString(),
                                                                        progress: 0,
                                                                        subtasks: [],
                                                                        notes: selectedItem.notes || [],
                                                                        parentPath: [project.name]
                                                                    };
                                                                    const updatedSubtasks = [...(project.subtasks || []), newTask];
                                                                    await updateItem(project.id, { subtasks: updatedSubtasks });
                                                                    await removeItem(selectedItem.id);
                                                                    setModalMode('none');
                                                                    setShowConvertPicker(false);
                                                                }
                                                            }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left border-b border-gray-100 last:border-b-0"
                                                        >
                                                            <FolderKanban size={14} className="text-gray-400" />
                                                            <span className="text-sm text-gray-700 truncate">{project.name}</span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Regular Project/Task Layout */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        {/* Left Column - Project Info */}
                        <div className="lg:col-span-5 space-y-4">
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <FolderKanban size={16} className="text-blue-600" />
                                    <span className="text-sm font-semibold text-gray-800">Project Details</span>
                                </div>
                                <div className="space-y-3">
                                    <Input
                                        label="Name"
                                        placeholder="Enter project name..."
                                        value={formData.name || ''}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    />
                                    <Textarea
                                        label="Description"
                                        placeholder="Add details..."
                                        value={formData.description || ''}
                                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <Button variant="secondary" fullWidth onClick={() => setModalMode('none')}>Cancel</Button>
                                <Button variant="primary" fullWidth onClick={handleSave} disabled={!formData.name}>
                                    {modalMode === 'edit' ? 'Save' : 'Create'}
                                </Button>
                            </div>
                        </div>

                        {/* Right Column - Status & Assignment */}
                        <div className="lg:col-span-7 space-y-4">
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <Target size={16} className="text-emerald-600" />
                                    <span className="text-sm font-semibold text-gray-700">Status & Priority</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <Select
                                        label="Status"
                                        options={[
                                            { value: 'Not Started', label: 'Not Started' },
                                            { value: 'In Progress', label: 'In Progress' },
                                            { value: 'On Hold', label: 'On Hold' },
                                            { value: 'Completed', label: 'Completed' }
                                        ]}
                                        value={formData.status || 'Not Started'}
                                        onChange={(v) => setFormData({...formData, status: v as StatusLevel})}
                                    />
                                    <Select
                                        label="Priority"
                                        options={[
                                            { value: 'Low', label: 'Low' },
                                            { value: 'Medium', label: 'Medium' },
                                            { value: 'High', label: 'High' }
                                        ]}
                                        value={formData.priority || 'Medium'}
                                        onChange={(v) => setFormData({...formData, priority: v as PriorityLevel})}
                                    />
                                </div>

                                {/* Quick Status Buttons */}
                                <div className="flex flex-wrap gap-2">
                                    <span className="text-xs text-gray-400 mr-2 self-center">Quick Status:</span>
                                    {[
                                        { value: 'Not Started', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
                                        { value: 'In Progress', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                                        { value: 'On Hold', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
                                        { value: 'Completed', color: 'bg-green-100 text-green-700 hover:bg-green-200' }
                                    ].map(({ value, color }) => (
                                        <button
                                            key={value}
                                            onClick={() => setFormData({...formData, status: value as StatusLevel})}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${color} ${formData.status === value ? 'ring-2 ring-offset-1 ring-blue-400' : ''}`}
                                        >
                                            {value}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white shadow-md">
                                        <Users size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Assignment & Deadline</h3>
                                        <p className="text-xs text-gray-500">Who and when</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Select
                                        label="Assignee"
                                        options={MOCK_USERS.map(u => ({ value: u.displayName || '', label: u.displayName || '' }))}
                                        value={formData.assignee || user?.displayName || 'Me'}
                                        onChange={(v) => setFormData({...formData, assignee: v})}
                                    />
                                    <Input
                                        label="Due Date"
                                        type="date"
                                        value={formData.dueDate || ''}
                                        onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                                    />
                                </div>

                                {formData.dueDate && (
                                    <div className="mt-3 bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                                        <div className="flex items-center gap-2 text-sm text-blue-700">
                                            <Clock size={14} />
                                            <span className="text-xs">
                                                Due {new Date(formData.dueDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, itemId: '', itemName: '' })}
                onConfirm={handleConfirmDelete}
                title="Delete Item"
                message={`Are you sure you want to delete "${deleteConfirm.itemName}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
};

export default ProjectsView;
