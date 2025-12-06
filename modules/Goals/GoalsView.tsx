import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Target, Calendar, BarChart2, Link as LinkIcon, CheckCircle, Trash2, Edit2, TrendingUp, Award, Flag, FolderKanban } from 'lucide-react';
import { Goal, ProjectItem } from '../../types';
import { useFirestore } from '../../services/firestore';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Card, Button, Badge, Progress, Input, Textarea, EmptyState } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useSharing, filterDataBySharing, SharingMode } from '../../contexts/SharingContext';
import SharingFilter, { OwnerBadge } from '../../components/SharingFilter';

const GoalsView: React.FC = () => {
    const { user } = useAuth();
    const { settings: sharingSettings, getModuleSharingMode, getOwnerName, isOwner } = useSharing();
    const { data: goals, add: addGoal, update: updateGoal, remove: removeGoal } = useFirestore<Goal>('goals');
    const { data: projects } = useFirestore<ProjectItem>('projects');
    
    const [sharingMode, setSharingMode] = useState<SharingMode>(() => getModuleSharingMode('goals'));
    const isAdmin = user?.isAdmin === true;

    const sharingStats = useMemo(() => {
        const userId = user?.uid || '';
        return {
            total: goals.length,
            mine: goals.filter(g => g.owner === userId).length,
            shared: goals.filter(g => 
                g.owner !== userId && (g.isShared || g.sharedWith?.includes(userId))
            ).length,
            assigned: goals.filter(g => 
                (g as any).assignedTo === userId && g.owner !== userId
            ).length
        };
    }, [goals, user]);

    const filteredBySharingGoals = useMemo(() => {
        return filterDataBySharing(
            goals as any[], 
            user?.uid || '', 
            sharingMode, 
            isAdmin
        ) as Goal[];
    }, [goals, user, sharingMode, isAdmin]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; goalId: string; goalName: string }>({ isOpen: false, goalId: '', goalName: '' });
    const [newGoal, setNewGoal] = useState<Partial<Goal>>({ 
        name: '', 
        description: '',
        status: 'Not Started', 
        progress: 0, 
        deadline: '',
        linkedProjectIds: [] 
    });
    const [autoUpdateProgress, setAutoUpdateProgress] = useState(true);

    const handleConfirmDelete = async () => {
        if (deleteConfirm.goalId) {
            await removeGoal(deleteConfirm.goalId);
            setDeleteConfirm({ isOpen: false, goalId: '', goalName: '' });
        }
    };

    useEffect(() => {
        if (!autoUpdateProgress || goals.length === 0) return;
        
        goals.forEach(goal => {
            if (goal.linkedProjectIds && goal.linkedProjectIds.length > 0) {
                const linked = projects.filter(p => goal.linkedProjectIds?.includes(p.id));
                if (linked.length > 0) {
                    const avgProgress = Math.round(linked.reduce((sum, p) => sum + (p.progress || 0), 0) / linked.length);
                    const newStatus = avgProgress === 100 ? 'Achieved' : avgProgress > 0 ? 'In Progress' : 'Not Started';
                    if (avgProgress !== goal.progress || newStatus !== goal.status) {
                        updateGoal(goal.id, { progress: avgProgress, status: newStatus });
                    }
                }
            }
        });
    }, [projects, goals, autoUpdateProgress]);

    const handleSave = async () => {
        if (!newGoal.name) return;
        
        if (editingGoal) {
            await updateGoal(editingGoal.id, {
                name: newGoal.name,
                description: newGoal.description,
                deadline: newGoal.deadline,
                linkedProjectIds: newGoal.linkedProjectIds
            });
        } else {
            await addGoal({ 
                ...newGoal, 
                progress: 0, 
                status: 'Not Started' 
            } as any);
        }
        
        setIsModalOpen(false);
        setEditingGoal(null);
        setNewGoal({ name: '', description: '', status: 'Not Started', progress: 0, deadline: '', linkedProjectIds: [] });
    };

    const handleEdit = (goal: Goal) => {
        setEditingGoal(goal);
        setNewGoal({
            name: goal.name,
            description: goal.description,
            deadline: goal.deadline,
            linkedProjectIds: goal.linkedProjectIds || []
        });
        setIsModalOpen(true);
    };

    const toggleProjectLink = (projId: string) => {
        const currentLinks = newGoal.linkedProjectIds || [];
        if (currentLinks.includes(projId)) {
            setNewGoal({ ...newGoal, linkedProjectIds: currentLinks.filter(id => id !== projId) });
        } else {
            setNewGoal({ ...newGoal, linkedProjectIds: [...currentLinks, projId] });
        }
    };

    const stats = useMemo(() => {
        const achieved = goals.filter(g => g.status === 'Achieved').length;
        const inProgress = goals.filter(g => g.status === 'In Progress').length;
        const avgProgress = goals.length > 0 
            ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / goals.length)
            : 0;
        return { achieved, inProgress, avgProgress, total: goals.length };
    }, [goals]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Achieved': return 'success';
            case 'In Progress': return 'warning';
            default: return 'default';
        }
    };

    const getDaysRemaining = (deadline: string) => {
        if (!deadline) return null;
        const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days;
    };

    return (
        <div className="space-y-6 animate-enter">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-xl p-4 text-white shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                        <Target size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Goals</h2>
                        <p className="text-white/80 text-sm">Long-term objectives linked to projects</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 text-xs bg-white/10 backdrop-blur px-2.5 py-1.5 rounded-lg cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={autoUpdateProgress} 
                            onChange={e => setAutoUpdateProgress(e.target.checked)} 
                            className="rounded text-white focus:ring-white/50 w-3.5 h-3.5"
                        />
                        <span>Auto-sync</span>
                    </label>
                    <Button 
                        onClick={() => {
                            setEditingGoal(null);
                            setNewGoal({ name: '', description: '', status: 'Not Started', progress: 0, deadline: '', linkedProjectIds: [] });
                            setIsModalOpen(true);
                        }} 
                        variant="secondary"
                        icon={Plus}
                        size="sm"
                    >
                        New Goal
                    </Button>
                </div>
            </div>

            <SharingFilter
                mode={sharingMode}
                onChange={setSharingMode}
                stats={sharingStats}
                isAdmin={isAdmin}
            />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
                        <Target className="text-purple-600" size={24} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    <p className="text-sm text-gray-500">Total Goals</p>
                </Card>
                <Card className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
                        <TrendingUp className="text-amber-600" size={24} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                    <p className="text-sm text-gray-500">In Progress</p>
                </Card>
                <Card className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle className="text-green-600" size={24} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.achieved}</p>
                    <p className="text-sm text-gray-500">Achieved</p>
                </Card>
                <Card className="text-center">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                        <BarChart2 className="text-blue-600" size={24} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{stats.avgProgress}%</p>
                    <p className="text-sm text-gray-500">Avg Progress</p>
                </Card>
            </div>

            {filteredBySharingGoals.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={Target}
                        title="No goals set"
                        description="Set meaningful goals and track your progress towards achieving them"
                        actionLabel="Set Your First Goal"
                        onAction={() => setIsModalOpen(true)}
                    />
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBySharingGoals.map(goal => {
                        const linkedProjects = projects.filter(p => goal.linkedProjectIds?.includes(p.id));
                        const daysRemaining = getDaysRemaining(goal.deadline);
                        
                        return (
                            <Card key={goal.id} hover className="flex flex-col h-full">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-gray-900 text-lg truncate" title={goal.name}>
                                            {goal.name}
                                        </h3>
                                        {goal.description && (
                                            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{goal.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 ml-2">
                                        <button 
                                            onClick={() => handleEdit(goal)}
                                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button 
                                            onClick={() => setDeleteConfirm({ isOpen: true, goalId: goal.id, goalName: goal.name })} 
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="flex-1">
                                    {linkedProjects.length > 0 && (
                                        <div className="mb-4">
                                            <span className="text-xs font-bold text-gray-400 uppercase mb-2 block">Linked Projects</span>
                                            <div className="flex flex-wrap gap-2">
                                                {linkedProjects.slice(0, 3).map(p => (
                                                    <span key={p.id} className="text-[11px] bg-blue-50 text-blue-700 px-2 py-1 rounded-lg border border-blue-100 flex items-center gap-1">
                                                        <LinkIcon size={10} /> {p.name.slice(0, 15)}{p.name.length > 15 ? '...' : ''}
                                                    </span>
                                                ))}
                                                {linkedProjects.length > 3 && (
                                                    <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                                                        +{linkedProjects.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3 mt-auto">
                                    <div>
                                        <div className="flex justify-between text-xs font-medium text-gray-500 mb-1.5">
                                            <span>Progress</span>
                                            <span className="font-bold">{goal.progress}%</span>
                                        </div>
                                        <Progress 
                                            value={goal.progress} 
                                            size="md" 
                                            variant={goal.progress === 100 ? 'success' : 'gradient'} 
                                        />
                                    </div>
                                    
                                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {goal.deadline && (
                                                <Badge 
                                                    variant={daysRemaining && daysRemaining < 7 ? 'danger' : 'default'}
                                                    size="xs"
                                                >
                                                    <Calendar size={10} className="mr-1" />
                                                    {daysRemaining !== null && daysRemaining > 0 
                                                        ? `${daysRemaining}d left` 
                                                        : daysRemaining === 0 
                                                            ? 'Today' 
                                                            : 'Overdue'}
                                                </Badge>
                                            )}
                                        </div>
                                        <Badge 
                                            variant={getStatusColor(goal.status) as any}
                                            size="xs"
                                        >
                                            {goal.status}
                                        </Badge>
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
                    setEditingGoal(null);
                }} 
                title={editingGoal ? "Edit Goal" : "Set New Goal"}
                size="full"
            >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[50vh]">
                    {/* Left Column - Goal Info */}
                    <div className="lg:col-span-5 space-y-5">
                        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-5 border border-violet-100">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <Target size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Goal Details</h3>
                                    <p className="text-xs text-gray-500">Define your objective</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    label="Goal Name"
                                    placeholder="e.g., Launch product by Q2, Run a marathon..."
                                    value={newGoal.name || ''}
                                    onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
                                />
                                
                                <Textarea
                                    label="Description"
                                    placeholder="What does achieving this goal mean to you?"
                                    value={newGoal.description || ''}
                                    onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                                    rows={4}
                                />

                                <Input
                                    label="Target Date"
                                    type="date"
                                    value={newGoal.deadline || ''}
                                    onChange={(e) => setNewGoal({...newGoal, deadline: e.target.value})}
                                />
                            </div>
                        </div>

                        {newGoal.deadline && (
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                                <div className="flex items-center gap-2 text-blue-700">
                                    <Calendar size={16} />
                                    <span className="text-sm font-medium">
                                        Target: {new Date(newGoal.deadline).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <Button 
                                variant="secondary" 
                                fullWidth 
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setEditingGoal(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button 
                                variant="primary" 
                                fullWidth 
                                onClick={handleSave}
                                disabled={!newGoal.name}
                            >
                                {editingGoal ? 'Save Changes' : 'Create Goal'}
                            </Button>
                        </div>
                    </div>

                    {/* Right Column - Link Projects */}
                    <div className="lg:col-span-7 space-y-5">
                        {projects.length > 0 && (
                            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white shadow-md">
                                        <FolderKanban size={18} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Link to Projects</h3>
                                        <p className="text-xs text-gray-500">Progress will auto-sync from linked projects</p>
                                    </div>
                                </div>

                                <div className="max-h-[350px] overflow-y-auto space-y-2 border border-gray-100 rounded-xl p-3 bg-gray-50">
                                    {projects.filter(p => p.type === 'project').map(project => (
                                        <label 
                                            key={project.id} 
                                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                                newGoal.linkedProjectIds?.includes(project.id) 
                                                    ? 'bg-primary-muted border-2 border-primary/30 shadow-sm' 
                                                    : 'bg-white hover:bg-gray-50 border-2 border-transparent'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={newGoal.linkedProjectIds?.includes(project.id) || false}
                                                onChange={() => toggleProjectLink(project.id)}
                                                className="rounded text-primary focus:ring-primary w-5 h-5"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium text-gray-900 block truncate">{project.name}</span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-primary rounded-full transition-all"
                                                            style={{ width: `${project.progress || 0}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-500">{project.progress || 0}%</span>
                                                </div>
                                            </div>
                                            <Badge variant="default" size="xs">{project.status}</Badge>
                                        </label>
                                    ))}
                                </div>

                                {newGoal.linkedProjectIds && newGoal.linkedProjectIds.length > 0 && (
                                    <div className="mt-3 bg-green-50 rounded-lg p-3 border border-green-100">
                                        <p className="text-sm text-green-700">
                                            <span className="font-medium">{newGoal.linkedProjectIds.length}</span> project{newGoal.linkedProjectIds.length > 1 ? 's' : ''} linked
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {projects.length === 0 && (
                            <div className="bg-gray-50 rounded-xl p-8 border border-gray-200 text-center">
                                <div className="text-4xl mb-3">📁</div>
                                <h4 className="font-semibold text-gray-900 mb-1">No projects yet</h4>
                                <p className="text-sm text-gray-500">Create projects first to link them to your goals</p>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, goalId: '', goalName: '' })}
                onConfirm={handleConfirmDelete}
                title="Delete Goal"
                message={`Are you sure you want to delete "${deleteConfirm.goalName}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
};

export default GoalsView;
