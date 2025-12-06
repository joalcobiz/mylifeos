
import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, Command } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');

  const commands = [
    { id: 'nav-dash', label: 'Go to Dashboard', view: 'dashboard' },
    { id: 'nav-proj', label: 'Go to Projects', view: 'projects' },
    { id: 'nav-fin', label: 'Go to Financial', view: 'financial' },
    { id: 'nav-loans', label: 'Go to Loans', view: 'loans' },
    { id: 'nav-journal', label: 'Go to Journal', view: 'journal' },
    { id: 'act-new-task', label: 'Create New Task', action: true },
    { id: 'act-new-expense', label: 'Add Expense', action: true },
  ];

  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div 
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-gray-100">
            <Search className="w-5 h-5 text-gray-400 mr-3" />
            <input 
                autoFocus
                className="flex-1 text-lg outline-none placeholder-gray-400"
                placeholder="Type a command or search..."
                value={query}
                onChange={e => setQuery(e.target.value)}
            />
            <div className="flex gap-1 text-xs text-gray-400 font-mono">
                <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">ESC</span>
            </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-2">
            {filtered.length > 0 ? filtered.map((cmd, idx) => (
                <button
                    key={cmd.id}
                    onClick={() => {
                        if (cmd.view) onNavigate(cmd.view);
                        onClose();
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 focus:bg-blue-50 focus:outline-none ${idx === 0 ? 'bg-gray-50' : ''}`}
                >
                    <span className="text-gray-700">{cmd.label}</span>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                </button>
            )) : (
                <div className="px-4 py-8 text-center text-gray-400">No results found.</div>
            )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
