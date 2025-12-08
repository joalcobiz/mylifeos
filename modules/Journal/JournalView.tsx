import React, { useState, useMemo, useRef } from 'react';
import { 
    Plus, BookOpen, Search, Calendar, MapPin, Tag, Heart, Smile, Frown, 
    Meh, Sun, Cloud, Zap, Coffee, Trash2, Edit2, ChevronRight, Sparkles,
    Image, Paperclip, X, Upload, File, LayoutGrid, List
} from 'lucide-react';
import { ConfiguredModuleHeader } from '../../components/ModuleHeader';
import { JournalEntry, Place } from '../../types';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useFirestore } from '../../services/firestore';
import { Card, Button, Badge, Input, Textarea, Select, EmptyState } from '../../components/ui';
import { uploadFile, deleteFile } from '../../services/storage';
import { useAuth } from '../../contexts/AuthContext';
import { useSharing, filterDataBySharing, SharingMode } from '../../contexts/SharingContext';
import SharingFilter, { OwnerBadge } from '../../components/SharingFilter';

const MOODS = [
    { value: 'Happy', icon: Smile, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { value: 'Neutral', icon: Meh, color: 'text-gray-500', bg: 'bg-gray-50' },
    { value: 'Sad', icon: Frown, color: 'text-blue-500', bg: 'bg-blue-50' },
    { value: 'Excited', icon: Zap, color: 'text-orange-500', bg: 'bg-orange-50' },
    { value: 'Calm', icon: Sun, color: 'text-green-500', bg: 'bg-green-50' },
    { value: 'Anxious', icon: Cloud, color: 'text-purple-500', bg: 'bg-purple-50' },
    { value: 'Grateful', icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50' },
    { value: 'Tired', icon: Coffee, color: 'text-amber-500', bg: 'bg-amber-50' }
];

interface JournalViewProps {
    focusId?: string;
}

const JournalView: React.FC<JournalViewProps> = ({ focusId }) => {
    const { user } = useAuth();
    const { settings: sharingSettings, getModuleSharingMode, getOwnerName, isOwner } = useSharing();
    const { data: entries, add: addEntry, update: updateEntry, remove: removeEntry } = useFirestore<JournalEntry>('journal');
    const { data: places } = useFirestore<Place>('places');
    
    const [sharingMode, setSharingMode] = useState<SharingMode>(() => getModuleSharingMode('journal'));
    const isAdmin = user?.isAdmin === true;

    const sharingStats = useMemo(() => {
        const userId = user?.uid || '';
        return {
            total: entries.length,
            mine: entries.filter(e => e.owner === userId).length,
            shared: entries.filter(e => 
                e.owner !== userId && (e.isShared || e.sharedWith?.includes(userId))
            ).length,
            assigned: entries.filter(e => 
                e.assignedTo === userId && e.owner !== userId
            ).length
        };
    }, [entries, user]);

    const filteredBySharingEntries = useMemo(() => {
        return filterDataBySharing<JournalEntry>(
            entries, 
            user?.uid || '', 
            sharingMode, 
            isAdmin
        );
    }, [entries, user, sharingMode, isAdmin]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMood, setFilterMood] = useState<string>('All');
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; entryId: string; entryTitle: string }>({ isOpen: false, entryId: '', entryTitle: '' });

    const handleConfirmDelete = async () => {
        if (deleteConfirm.entryId) {
            await removeEntry(deleteConfirm.entryId);
            setDeleteConfirm({ isOpen: false, entryId: '', entryTitle: '' });
        }
    };
    
    const [formData, setFormData] = useState<Partial<JournalEntry>>({
        title: '',
        body: '',
        mood: 'Neutral',
        tags: [],
        location: '',
        date: new Date().toISOString().split('T')[0],
        attachments: []
    });
    const [tagInput, setTagInput] = useState('');
    const [uploading, setUploading] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleGetCurrentLocation = async () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setGettingLocation(true);
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
                    );
                    const data = await response.json();
                    
                    if (data.display_name) {
                        const address = data.address || {};
                        const parts = [];
                        
                        if (address.road) parts.push(address.road);
                        if (address.suburb || address.neighbourhood) parts.push(address.suburb || address.neighbourhood);
                        if (address.city || address.town || address.village) parts.push(address.city || address.town || address.village);
                        if (address.state) parts.push(address.state);
                        if (address.country) parts.push(address.country);
                        
                        const detailedLocation = parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 3).join(',');
                        setFormData({ ...formData, location: detailedLocation });
                    }
                } catch (error) {
                    console.error('Geocoding error:', error);
                    setFormData({ ...formData, location: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}` });
                }
                setGettingLocation(false);
            },
            (error) => {
                console.error('Location error:', error);
                alert('Unable to get your location. Please check your location permissions.');
                setGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
    };

    const sortedEntries = useMemo(() => {
        let result = [...filteredBySharingEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(e => 
                e.title.toLowerCase().includes(q) || 
                e.body.toLowerCase().includes(q) ||
                e.tags?.some(t => t.toLowerCase().includes(q))
            );
        }
        
        if (filterMood !== 'All') {
            result = result.filter(e => e.mood === filterMood);
        }
        
        return result;
    }, [entries, searchQuery, filterMood]);

    const handleOpenCreate = () => {
        setEditingEntry(null);
        setFormData({
            title: '',
            body: '',
            mood: 'Neutral',
            tags: [],
            location: '',
            date: new Date().toISOString().split('T')[0],
            attachments: []
        });
        setIsModalOpen(true);
    };

    const handleEdit = (entry: JournalEntry) => {
        setEditingEntry(entry);
        setFormData({
            title: entry.title,
            body: entry.body,
            mood: entry.mood,
            tags: entry.tags || [],
            location: entry.location,
            date: entry.date,
            attachments: entry.attachments || []
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.title || !formData.body) return;

        if (editingEntry) {
            await updateEntry(editingEntry.id, formData);
        } else {
            await addEntry(formData as any);
        }
        
        setIsModalOpen(false);
        setEditingEntry(null);
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
            setFormData({
                ...formData,
                tags: [...(formData.tags || []), tagInput.trim()]
            });
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setFormData({
            ...formData,
            tags: formData.tags?.filter(t => t !== tag) || []
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        const newAttachments = [...(formData.attachments || [])];
        const fileArray: File[] = Array.from(files);

        for (const file of fileArray) {
            try {
                const url = await uploadFile(file, 'journal');
                newAttachments.push({
                    id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: file.name,
                    url,
                    type: file.type,
                    size: file.size,
                    uploadedAt: new Date().toISOString()
                });
            } catch (err) {
                console.error('Upload failed:', err);
            }
        }

        setFormData({ ...formData, attachments: newAttachments });
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleRemoveAttachment = async (attachmentId: string) => {
        const attachment = formData.attachments?.find(a => a.id === attachmentId);
        if (attachment?.url) {
            try {
                await deleteFile(attachment.url);
            } catch (err) {
                console.error('Delete failed:', err);
            }
        }
        setFormData({
            ...formData,
            attachments: formData.attachments?.filter(a => a.id !== attachmentId) || []
        });
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const isImageFile = (type: string) => type.startsWith('image/');

    const getMoodData = (mood: string) => {
        return MOODS.find(m => m.value === mood) || MOODS[1];
    };

    const stats = useMemo(() => {
        const moodCounts: Record<string, number> = {};
        entries.forEach(e => {
            moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
        });
        const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
        return {
            total: entries.length,
            thisMonth: entries.filter(e => new Date(e.date).getMonth() === new Date().getMonth()).length,
            topMood: topMood ? topMood[0] : 'None'
        };
    }, [entries]);

    return (
        <div className="space-y-6 animate-enter">
            <ConfiguredModuleHeader 
                moduleKey="journal" 
                actions={
                    <Button 
                        onClick={handleOpenCreate} 
                        variant="secondary"
                        icon={Plus}
                        size="sm"
                    >
                        New Entry
                    </Button>
                }
            />

            <SharingFilter
                mode={sharingMode}
                onChange={setSharingMode}
                stats={sharingStats}
                isAdmin={isAdmin}
            />

            <div className="grid grid-cols-3 gap-4">
                <Card className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    <p className="text-sm text-gray-500">Total Entries</p>
                </Card>
                <Card className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{stats.thisMonth}</p>
                    <p className="text-sm text-gray-500">This Month</p>
                </Card>
                <Card className="text-center">
                    <div className="flex items-center justify-center gap-2">
                        {stats.topMood !== 'None' && (() => {
                            const mood = getMoodData(stats.topMood);
                            const Icon = mood.icon;
                            return <Icon className={mood.color} size={24} />;
                        })()}
                        <p className="text-lg font-bold text-gray-900">{stats.topMood}</p>
                    </div>
                    <p className="text-sm text-gray-500">Top Mood</p>
                </Card>
            </div>

            <Card padding="sm">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                        <Input
                            icon={Search}
                            placeholder="Search entries..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select
                        options={[
                            { value: 'All', label: 'All Moods' },
                            ...MOODS.map(m => ({ value: m.value, label: m.value }))
                        ]}
                        value={filterMood}
                        onChange={setFilterMood}
                        fullWidth={false}
                        className="w-full md:w-40"
                    />
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 ${viewMode === 'table' ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                            title="Table View"
                        >
                            <List size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('card')}
                            className={`p-2 ${viewMode === 'card' ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                            title="Card View"
                        >
                            <LayoutGrid size={18} />
                        </button>
                    </div>
                </div>
            </Card>

            {sortedEntries.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={BookOpen}
                        title="No journal entries"
                        description="Start documenting your journey by writing your first entry"
                        actionLabel="Write First Entry"
                        onAction={handleOpenCreate}
                    />
                </Card>
            ) : viewMode === 'table' ? (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Title</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Mood</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Location</th>
                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Tags</th>
                                    <th className="text-right px-4 py-3 font-semibold text-gray-600 w-20">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedEntries.map(entry => {
                                    const moodData = getMoodData(entry.mood);
                                    const MoodIcon = moodData.icon;
                                    return (
                                        <tr 
                                            key={entry.id} 
                                            className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                                            onClick={() => setSelectedEntry(entry)}
                                        >
                                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                                                {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900 line-clamp-1">{entry.title}</div>
                                                <div className="text-xs text-gray-400 line-clamp-1 max-w-xs md:hidden">{entry.body.substring(0, 50)}...</div>
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${moodData.bg}`}>
                                                    <MoodIcon className={moodData.color} size={14} />
                                                    <span className="text-xs text-gray-600">{entry.mood}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                                                {entry.location ? (
                                                    <span className="flex items-center gap-1 text-xs">
                                                        <MapPin size={12} className="text-gray-400" />
                                                        {entry.location}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <div className="flex flex-wrap gap-1">
                                                    {entry.tags?.slice(0, 2).map(tag => (
                                                        <Badge key={tag} variant="default" size="xs">{tag}</Badge>
                                                    ))}
                                                    {entry.tags && entry.tags.length > 2 && (
                                                        <Badge variant="default" size="xs">+{entry.tags.length - 2}</Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(entry); }}
                                                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-muted rounded transition-colors"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ isOpen: true, entryId: entry.id, entryTitle: entry.title || 'Untitled Entry' }); }}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    >
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
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedEntries.map(entry => {
                        const moodData = getMoodData(entry.mood);
                        const MoodIcon = moodData.icon;
                        
                        return (
                            <Card 
                                key={entry.id} 
                                hover 
                                className="cursor-pointer group"
                                onClick={() => setSelectedEntry(entry)}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`w-10 h-10 rounded-xl ${moodData.bg} flex items-center justify-center`}>
                                        <MoodIcon className={moodData.color} size={20} />
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleEdit(entry); }}
                                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ isOpen: true, entryId: entry.id, entryTitle: entry.title || 'Untitled Entry' }); }}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                
                                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{entry.title}</h3>
                                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{entry.body}</p>
                                
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {entry.tags && entry.tags.slice(0, 3).map(tag => (
                                        <Badge key={tag} variant="default" size="xs">
                                            <Tag size={10} className="mr-1" />
                                            {tag}
                                        </Badge>
                                    ))}
                                    {entry.tags && entry.tags.length > 3 && (
                                        <Badge variant="default" size="xs">+{entry.tags.length - 3}</Badge>
                                    )}
                                    {entry.attachments && entry.attachments.length > 0 && (
                                        <Badge variant="info" size="xs">
                                            <Paperclip size={10} className="mr-1" />
                                            {entry.attachments.length}
                                        </Badge>
                                    )}
                                </div>
                                
                                <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                    {entry.location && (
                                        <span className="flex items-center gap-1">
                                            <MapPin size={12} />
                                            {entry.location}
                                        </span>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {selectedEntry && (
                <Modal
                    isOpen={true}
                    onClose={() => setSelectedEntry(null)}
                    title={selectedEntry.title}
                    size="full"
                >
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            {(() => {
                                const moodData = getMoodData(selectedEntry.mood);
                                const MoodIcon = moodData.icon;
                                return (
                                    <div className={`w-10 h-10 rounded-xl ${moodData.bg} flex items-center justify-center`}>
                                        <MoodIcon className={moodData.color} size={20} />
                                    </div>
                                );
                            })()}
                            <div>
                                <Badge variant="primary" size="sm">{selectedEntry.mood}</Badge>
                                <p className="text-xs text-gray-500 mt-1">
                                    {new Date(selectedEntry.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                        </div>
                        
                        <div className="prose prose-sm max-w-none">
                            <p className="text-gray-700 whitespace-pre-wrap">{selectedEntry.body}</p>
                        </div>
                        
                        {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                                {selectedEntry.tags.map(tag => (
                                    <Badge key={tag} variant="default" size="sm">
                                        <Tag size={12} className="mr-1" />
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        )}
                        
                        {selectedEntry.location && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <MapPin size={14} />
                                {selectedEntry.location}
                            </div>
                        )}

                        {selectedEntry.attachments && selectedEntry.attachments.length > 0 && (
                            <div className="pt-4 border-t border-gray-100">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Attachments</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {selectedEntry.attachments.filter(a => isImageFile(a.type)).map(att => (
                                        <a 
                                            key={att.id} 
                                            href={att.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="relative rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-primary transition-all"
                                        >
                                            <img 
                                                src={att.url} 
                                                alt={att.name}
                                                className="w-full h-24 object-cover"
                                            />
                                        </a>
                                    ))}
                                </div>
                                {selectedEntry.attachments.filter(a => !isImageFile(a.type)).length > 0 && (
                                    <div className="mt-2 space-y-1">
                                        {selectedEntry.attachments.filter(a => !isImageFile(a.type)).map(att => (
                                            <a 
                                                key={att.id}
                                                href={att.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                            >
                                                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                                    <File className="text-blue-500" size={16} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-700 truncate">{att.name}</p>
                                                    <p className="text-xs text-gray-400">{formatFileSize(att.size)}</p>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            <Modal 
                isOpen={isModalOpen} 
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingEntry(null);
                }} 
                title={editingEntry ? 'Edit Entry' : 'New Journal Entry'}
                size="full"
            >
                <div className="space-y-6">
                    {/* Header Section with Mood */}
                    <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 border border-pink-100">
                        <div className="flex items-center gap-2 mb-3">
                            <Heart className="w-4 h-4 text-pink-500" />
                            <label className="text-xs font-bold uppercase tracking-wide text-pink-600">How are you feeling?</label>
                        </div>
                        <div className="grid grid-cols-4 md:grid-cols-8 gap-2" role="group" aria-label="Select your mood">
                            {MOODS.map(mood => {
                                const Icon = mood.icon;
                                const isSelected = formData.mood === mood.value;
                                return (
                                    <button
                                        key={mood.value}
                                        type="button"
                                        onClick={() => setFormData({...formData, mood: mood.value})}
                                        aria-pressed={isSelected}
                                        aria-label={`Mood: ${mood.value}`}
                                        className={`p-2 md:p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                                            isSelected
                                                ? 'border-primary bg-white shadow-sm'
                                                : 'border-transparent bg-white/50 hover:bg-white hover:border-gray-200'
                                        }`}
                                    >
                                        <Icon className={mood.color} size={18} />
                                        <span className="text-[10px] md:text-xs text-gray-600">{mood.value}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Two Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column - Main Content */}
                        <div className="space-y-4 bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                                <BookOpen className="w-4 h-4 text-primary" />
                                <h3 className="font-semibold text-gray-900">Entry Details</h3>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    placeholder="What's on your mind?"
                                    value={formData.title || ''}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">What happened today?</label>
                                <textarea
                                    placeholder="Write your thoughts, reflections, and experiences..."
                                    value={formData.body || ''}
                                    onChange={(e) => setFormData({...formData, body: e.target.value})}
                                    rows={8}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                                />
                            </div>
                        </div>

                        {/* Right Column - Metadata */}
                        <div className="space-y-4 bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                <h3 className="font-semibold text-gray-900">When & Where</h3>
                            </div>

                            {/* Date - Compact */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={formData.date || ''}
                                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                                    className="w-32 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                />
                            </div>

                            {/* Location - Enhanced */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-700">Location</label>
                                    <button
                                        type="button"
                                        onClick={handleGetCurrentLocation}
                                        disabled={gettingLocation}
                                        className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded-lg flex items-center gap-1 disabled:opacity-50 transition-colors"
                                    >
                                        {gettingLocation ? (
                                            <>
                                                <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                Getting...
                                            </>
                                        ) : (
                                            <>
                                                <MapPin size={12} />
                                                Use GPS
                                            </>
                                        )}
                                    </button>
                                </div>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Street, neighborhood, city, state, country..."
                                        value={formData.location || ''}
                                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        list="location-suggestions"
                                    />
                                    <datalist id="location-suggestions">
                                        {places.map(p => (
                                            <option key={p.id} value={`${p.name}${p.city ? `, ${p.city}` : ''}${p.state ? `, ${p.state}` : ''}${p.country ? `, ${p.country}` : ''}`} />
                                        ))}
                                    </datalist>
                                </div>
                                {formData.location && (
                                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                        <MapPin size={10} /> {formData.location}
                                    </p>
                                )}
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                    <Tag size={12} /> Tags
                                </label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        placeholder="Add a tag..."
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddTag}
                                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                                    >
                                        Add
                                    </button>
                                </div>
                                {formData.tags && formData.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {formData.tags.map(tag => (
                                            <span 
                                                key={tag} 
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-primary-muted text-primary rounded-full text-xs font-medium cursor-pointer hover:bg-primary hover:text-white transition-colors" 
                                                onClick={() => handleRemoveTag(tag)}
                                            >
                                                {tag} <X size={10} />
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Attachments */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                    <Paperclip size={12} /> Attachments
                                </label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileUpload}
                                    multiple
                                    accept="image/*,.pdf,.doc,.docx,.txt"
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="w-full border-2 border-dashed border-gray-200 rounded-lg p-3 text-center hover:border-primary hover:bg-primary-muted transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    {uploading ? (
                                        <div className="flex items-center justify-center gap-2 text-gray-500">
                                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            <span className="text-sm">Uploading...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2 text-gray-500">
                                            <Upload size={18} />
                                            <span className="text-sm">Upload images or files</span>
                                        </div>
                                    )}
                                </button>

                                {formData.attachments && formData.attachments.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                        <div className="grid grid-cols-3 gap-2">
                                            {formData.attachments.filter(a => isImageFile(a.type)).map(att => (
                                                <div key={att.id} className="relative group rounded-lg overflow-hidden border border-gray-200">
                                                    <img 
                                                        src={att.url} 
                                                        alt={att.name}
                                                        className="w-full h-16 object-cover"
                                                    />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveAttachment(att.id)}
                                                            className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        {formData.attachments.filter(a => !isImageFile(a.type)).map(att => (
                                            <div key={att.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg group text-xs">
                                                <File className="text-blue-500" size={14} />
                                                <span className="flex-1 truncate text-gray-700">{att.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveAttachment(att.id)}
                                                    className="p-1 text-gray-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                        <Button variant="secondary" fullWidth onClick={() => setIsModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="primary" 
                            fullWidth 
                            onClick={handleSave}
                            disabled={!formData.title || !formData.body}
                        >
                            {editingEntry ? 'Save Changes' : 'Create Entry'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                onClose={() => setDeleteConfirm({ isOpen: false, entryId: '', entryTitle: '' })}
                onConfirm={handleConfirmDelete}
                title="Delete Journal Entry"
                message={`Are you sure you want to delete "${deleteConfirm.entryTitle}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
};

export default JournalView;
