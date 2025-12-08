
import React, { useState, useRef } from 'react';
import { 
    Folder as FolderIcon, FileText, Image as ImageIcon, Paperclip, MoreVertical, 
    Search, Plus, ChevronRight, Home, ArrowUp, AlertTriangle, Loader2, Trash2, Download,
    Upload, Tag, Calendar, FolderOpen
} from 'lucide-react';
import { Document, Folder, DocumentType, DocumentCategory } from '../../types';
import Modal from '../../components/Modal';
import { useFirestore } from '../../services/firestore';
import { uploadFile } from '../../services/storage';
import { useAuth } from '../../contexts/AuthContext';
import { ConfiguredModuleHeader } from '../../components/ModuleHeader';
import { Button } from '../../components/ui';

const DocumentsView: React.FC = () => {
    const { user } = useAuth();
    const { data: folders, add: addFolder, remove: removeFolder } = useFirestore<Folder>('folders');
    const { data: docs, add: addDoc, remove: removeDoc } = useFirestore<Document>('documents');
    
    const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Upload State
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [newDocData, setNewDocData] = useState<{title: string, category: DocumentCategory, tags: string, expiry: string}>({
        title: '', category: 'Personal', tags: '', expiry: ''
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Folder State
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // --- NAVIGATION LOGIC ---
    const getBreadcrumbs = () => {
        if (!currentFolderId) return [{ id: 'root', name: 'Home' }];
        const path = [];
        let curr = folders.find(f => f.id === currentFolderId);
        // Safety break to prevent infinite loops if circular parentId exists
        let depth = 0;
        while (curr && depth < 10) {
            path.unshift(curr);
            curr = folders.find(f => f.id === curr?.parentId);
            depth++;
        }
        return [{ id: 'root', name: 'Home' }, ...path];
    };

    const handleNavigate = (folderId?: string) => {
        setCurrentFolderId(folderId);
        setSearchQuery('');
    };

    const handleUp = () => {
        if (!currentFolderId) return;
        const curr = folders.find(f => f.id === currentFolderId);
        handleNavigate(curr?.parentId);
    };

    // --- ACTIONS ---
    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        await addFolder({
            name: newFolderName,
            parentId: currentFolderId
        } as any);
        setNewFolderName('');
        setIsFolderModalOpen(false);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            // Auto-fill title if empty
            if (!newDocData.title) {
                setNewDocData(prev => ({ ...prev, title: e.target.files![0].name }));
            }
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !user) return;
        setUploading(true);
        try {
            const path = `users/${user.uid}/documents/${Date.now()}_${selectedFile.name}`;
            const url = await uploadFile(selectedFile, path);
            
            // Determine type
            let type: DocumentType = 'file';
            if (selectedFile.type.startsWith('image/')) type = 'image';
            
            await addDoc({
                title: newDocData.title,
                type,
                category: newDocData.category,
                tags: newDocData.tags.split(',').map(t => t.trim()).filter(t => t),
                dateAdded: new Date().toISOString().split('T')[0],
                dateModified: new Date().toISOString().split('T')[0],
                size: `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`,
                url,
                folderId: currentFolderId,
                expiryDate: newDocData.expiry || undefined
            } as any);

            setIsUploadOpen(false);
            setNewDocData({ title: '', category: 'Personal', tags: '', expiry: '' });
            setSelectedFile(null);
        } catch (error) {
            alert("Upload failed. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDoc = async (id: string) => {
        if (window.confirm("Delete this document?")) {
            await removeDoc(id);
        }
    };

    const handleDeleteFolder = async (id: string) => {
        if (window.confirm("Delete this folder? Contents may be orphaned.")) {
            await removeFolder(id);
        }
    };

    // --- FILTERING ---
    const currentFolders = folders.filter(f => f.parentId === currentFolderId);
    const currentDocs = docs.filter(d => d.folderId === currentFolderId);

    const displayedFolders = searchQuery ? [] : currentFolders;
    const displayedDocs = searchQuery 
        ? docs.filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()) || d.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())))
        : currentDocs;

    const getFileIcon = (type: DocumentType) => {
        switch(type) {
            case 'note': return <FileText className="w-8 h-8 text-yellow-500" />;
            case 'image': return <ImageIcon className="w-8 h-8 text-purple-500" />;
            case 'link': return <Paperclip className="w-8 h-8 text-blue-500" />;
            default: return <FileText className="w-8 h-8 text-gray-400" />;
        }
    };

    const isExpiringSoon = (dateStr?: string) => {
        if (!dateStr) return false;
        const days = (new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
        return days > 0 && days < 30;
    };

    return (
        <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col">
            <ConfiguredModuleHeader 
                moduleKey="documents" 
                actions={
                    <Button 
                        onClick={() => setIsUploadOpen(true)} 
                        variant="primary"
                        icon={Plus}
                        size="sm"
                    >
                        Upload
                    </Button>
                } 
            />

            {/* Navigation Bar */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex-shrink-0">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 text-sm overflow-hidden">
                    {currentFolderId && (
                        <button onClick={handleUp} className="hover:bg-gray-200 p-1 rounded text-gray-500">
                            <ArrowUp size={14} />
                        </button>
                    )}
                    {getBreadcrumbs().map((crumb, idx, arr) => (
                        <React.Fragment key={crumb.id}>
                            <button 
                                onClick={() => handleNavigate(crumb.id === 'root' ? undefined : crumb.id)}
                                className={`hover:text-primary transition-colors whitespace-nowrap ${idx === arr.length - 1 ? 'font-semibold text-gray-900' : 'text-gray-500'}`}
                            >
                                {crumb.id === 'root' ? <Home size={14} /> : crumb.name}
                            </button>
                            {idx < arr.length - 1 && <ChevronRight size={12} className="text-gray-300" />}
                        </React.Fragment>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search docs..." 
                            className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-md text-sm w-32 focus:w-48 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button onClick={() => setIsFolderModalOpen(true)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors" title="New Folder">
                        <FolderIcon size={20} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                
                {/* Folders Grid */}
                {!searchQuery && displayedFolders.length > 0 && (
                    <div className="mb-8 animate-enter">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Folders</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {displayedFolders.map(folder => (
                                <div key={folder.id} className="relative group">
                                    <button 
                                        onClick={() => handleNavigate(folder.id)}
                                        className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition-all w-full"
                                    >
                                        <FolderIcon className="w-10 h-10 text-blue-300 group-hover:text-blue-500 fill-blue-100 group-hover:fill-blue-200" />
                                        <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700 text-center truncate w-full">{folder.name}</span>
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }}
                                        className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Files Grid */}
                <div className="animate-enter" style={{ animationDelay: '100ms' }}>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
                        {searchQuery ? 'Search Results' : 'Files'}
                    </h3>
                    {displayedDocs.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {displayedDocs.map(doc => (
                                <div key={doc.id} className="relative group p-4 rounded-xl border border-gray-100 bg-white hover:shadow-md hover:border-gray-200 transition-all cursor-pointer hover:-translate-y-1">
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white/80 rounded p-1">
                                        {doc.url && (
                                            <a href={doc.url} target="_blank" rel="noreferrer" className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-primary" onClick={e => e.stopPropagation()}>
                                                <Download size={14} />
                                            </a>
                                        )}
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    
                                    <div className="flex flex-col items-center text-center gap-3 mb-2" onClick={() => doc.url && window.open(doc.url, '_blank')}>
                                        <div className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-lg group-hover:scale-110 transition-transform">
                                            {getFileIcon(doc.type)}
                                        </div>
                                        <div className="w-full">
                                            <h4 className="font-medium text-gray-900 text-sm truncate w-full" title={doc.title}>{doc.title}</h4>
                                            <p className="text-xs text-gray-400 mt-0.5">{doc.dateModified} • {doc.size || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-1 justify-center mt-2 flex-wrap">
                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{doc.category}</span>
                                        {isExpiringSoon(doc.expiryDate) && (
                                            <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full flex items-center gap-1 border border-red-100" title={`Expires: ${doc.expiryDate}`}>
                                                <AlertTriangle size={10} /> Expiring
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                            {searchQuery ? 'No documents match your search.' : 'This folder is empty.'}
                        </div>
                    )}
                </div>
            </div>

            {/* MODALS */}
            <Modal isOpen={isFolderModalOpen} onClose={() => setIsFolderModalOpen(false)} title="New Folder" size="lg">
                <div className="space-y-4">
                    <input 
                        type="text" 
                        placeholder="Folder Name" 
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary"
                        value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsFolderModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded text-sm">Cancel</button>
                        <button onClick={handleCreateFolder} className="px-4 py-2 bg-primary text-white rounded text-sm">Create</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} title="Upload Document" size="full">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - File Selection */}
                    <div className="space-y-4">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <Upload size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Select File</h3>
                                    <p className="text-xs text-gray-500">Choose a document to upload</p>
                                </div>
                            </div>
                            
                            <div 
                                className="border-2 border-dashed border-blue-200 rounded-xl p-8 text-center hover:bg-blue-50/50 cursor-pointer transition-all hover:border-blue-400"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    ref={fileInputRef} 
                                    onChange={handleFileSelect} 
                                />
                                {selectedFile ? (
                                    <div className="text-blue-600 font-medium flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                                            <FileText size={32} className="text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{selectedFile.name}</p>
                                            <p className="text-xs text-gray-500 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                        <span className="text-xs text-blue-500">Click to change file</span>
                                    </div>
                                ) : (
                                    <div className="text-gray-500 flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                                            <Plus size={32} className="text-gray-300" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-700">Click to select a file</p>
                                            <p className="text-xs text-gray-400 mt-1">PDF, DOC, XLS, Images, etc.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Document Details */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-100">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Document Details</h3>
                                    <p className="text-xs text-gray-500">Name and categorization</p>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                                        placeholder="Enter document title"
                                        value={newDocData.title} 
                                        onChange={e => setNewDocData({...newDocData, title: e.target.value})} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select 
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white" 
                                        value={newDocData.category} 
                                        onChange={e => setNewDocData({...newDocData, category: e.target.value as any})}
                                    >
                                        <option value="Personal">Personal</option>
                                        <option value="Work">Work</option>
                                        <option value="Financial">Financial</option>
                                        <option value="Medical">Medical</option>
                                        <option value="Insurance">Insurance</option>
                                        <option value="Legal">Legal</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Metadata */}
                    <div className="space-y-4">
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-100">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <Tag size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Tags & Organization</h3>
                                    <p className="text-xs text-gray-500">Add tags for easy searching</p>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                                    placeholder="e.g. 2024, Tax, Important (comma separated)"
                                    value={newDocData.tags} 
                                    onChange={e => setNewDocData({...newDocData, tags: e.target.value})} 
                                />
                                <p className="text-xs text-gray-400 mt-1">Separate multiple tags with commas</p>
                            </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 border border-gray-100">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-500 rounded-lg flex items-center justify-center text-white shadow-md">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Expiration</h3>
                                    <p className="text-xs text-gray-500">Set an expiry date if needed</p>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
                                <input 
                                    type="date" 
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                                    value={newDocData.expiry} 
                                    onChange={e => setNewDocData({...newDocData, expiry: e.target.value})} 
                                />
                                <p className="text-xs text-gray-400 mt-1">Documents will be flagged when approaching expiry</p>
                            </div>
                        </div>

                        {currentFolderId && (
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <FolderOpen size={16} className="text-amber-500" />
                                    <span>Saving to:</span>
                                    <span className="font-medium text-gray-900">
                                        {folders.find(f => f.id === currentFolderId)?.name || 'Current Folder'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button 
                                onClick={() => setIsUploadOpen(false)} 
                                className="flex-1 px-4 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleUpload} 
                                disabled={uploading || !selectedFile}
                                className="flex-1 px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                {uploading && <Loader2 className="animate-spin w-4 h-4" />}
                                {uploading ? 'Uploading...' : 'Upload Document'}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DocumentsView;
