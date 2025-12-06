
import React, { useState, useEffect, useMemo } from 'react';
import { Search, ArrowRight, FolderKanban, Wallet, BookOpen, FileText, MapPin } from 'lucide-react';
import { useFirestore } from '../../services/firestore';
import { ProjectItem, FinancialItem, JournalEntry, Document, Place, SearchResult } from '../../types';

const SearchView: React.FC = () => {
    const [query, setQuery] = useState('');
    
    // Fetch all data
    const { data: projects } = useFirestore<ProjectItem>('projects');
    const { data: financial } = useFirestore<FinancialItem>('financial');
    const { data: journal } = useFirestore<JournalEntry>('journal');
    const { data: places } = useFirestore<Place>('places');
    const { data: documents } = useFirestore<Document>('documents'); // Assuming docs implemented

    const results = useMemo<SearchResult[]>(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        const hits: SearchResult[] = [];

        // Search Projects
        const searchProjects = (items: ProjectItem[]) => {
            items.forEach(p => {
                if (p.name.toLowerCase().includes(q)) {
                    hits.push({ id: p.id, type: 'projects', title: p.name, subtitle: p.status, matchField: 'Name' });
                }
                if (p.description?.toLowerCase().includes(q)) {
                    hits.push({ id: p.id, type: 'projects', title: p.name, subtitle: 'Description match', matchField: 'Description' });
                }
                if (p.subtasks) searchProjects(p.subtasks);
            });
        };
        searchProjects(projects);

        // Search Financial
        financial.forEach(f => {
            if (f.description.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)) {
                hits.push({ id: f.id, type: 'financial', title: f.description, subtitle: `${f.type} - ${f.amount}`, date: f.dueDay ? `Due: ${f.dueDay}` : '', matchField: 'Description' });
            }
        });

        // Search Journal
        journal.forEach(j => {
            if (j.title.toLowerCase().includes(q) || j.body.toLowerCase().includes(q)) {
                hits.push({ id: j.id, type: 'journal', title: j.title, subtitle: j.mood, date: j.date, matchField: 'Content' });
            }
        });

        // Search Places
        places.forEach(p => {
            if (p.name.toLowerCase().includes(q) || p.city.toLowerCase().includes(q)) {
                hits.push({ id: p.id, type: 'places', title: p.name, subtitle: `${p.city}, ${p.state}`, matchField: 'Location' });
            }
        });

        return hits;
    }, [query, projects, financial, journal, places]);

    // Group results by module
    const grouped = results.reduce((acc, item) => {
        if (!acc[item.type]) acc[item.type] = [];
        acc[item.type].push(item);
        return acc;
    }, {} as Record<string, SearchResult[]>);

    const getIcon = (type: string) => {
        switch(type) {
            case 'projects': return <FolderKanban className="w-5 h-5 text-orange-500" />;
            case 'financial': return <Wallet className="w-5 h-5 text-green-500" />;
            case 'journal': return <BookOpen className="w-5 h-5 text-pink-500" />;
            case 'places': return <MapPin className="w-5 h-5 text-indigo-500" />;
            default: return <Search className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm sticky top-0 z-10">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                    <input 
                        type="text" 
                        autoFocus
                        placeholder="Search everything (Projects, Expenses, Notes, Places)..." 
                        className="w-full pl-12 pr-4 py-4 text-lg border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-8">
                {Object.entries(grouped).map(([type, items]) => (
                    <div key={type} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center gap-2 font-semibold text-gray-700 capitalize">
                            {getIcon(type)}
                            {type}
                            <span className="text-gray-400 font-normal text-sm ml-auto">{items.length} results</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {items.map(item => (
                                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-blue-50 transition-colors group cursor-pointer">
                                    <div>
                                        <div className="font-medium text-gray-900">{item.title}</div>
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                            {item.subtitle}
                                            {item.date && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{item.date}</span>}
                                        </div>
                                    </div>
                                    <button className="p-2 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all">
                                        <ArrowRight size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                
                {query && results.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="text-lg">No results found for "{query}"</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchView;
