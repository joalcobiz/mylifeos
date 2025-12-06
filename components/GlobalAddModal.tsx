
import React from 'react';
import { 
    CheckSquare, Wallet, BookOpen, MapPin, 
    ShoppingBag, Target, Flame, FileText, X 
} from 'lucide-react';
import Modal from './Modal';

interface GlobalAddModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (view: string) => void;
}

const GlobalAddModal: React.FC<GlobalAddModalProps> = ({ isOpen, onClose, onNavigate }) => {
    const actions = [
        { label: 'New Task', icon: CheckSquare, color: 'bg-orange-50 text-orange-600', view: 'projects' },
        { label: 'Add Expense', icon: Wallet, color: 'bg-green-50 text-green-600', view: 'financial' },
        { label: 'Journal Entry', icon: BookOpen, color: 'bg-pink-50 text-pink-600', view: 'journal' },
        { label: 'Add Place', icon: MapPin, color: 'bg-indigo-50 text-indigo-600', view: 'places' },
        { label: 'Shopping Item', icon: ShoppingBag, color: 'bg-purple-50 text-purple-600', view: 'purchases' },
        { label: 'Track Habit', icon: Flame, color: 'bg-rose-50 text-rose-600', view: 'habits' },
        { label: 'Set Goal', icon: Target, color: 'bg-red-50 text-red-600', view: 'goals' },
        { label: 'Upload Doc', icon: FileText, color: 'bg-blue-50 text-blue-600', view: 'documents' },
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Quick Add">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-2">
                {actions.map((act) => (
                    <button
                        key={act.label}
                        onClick={() => {
                            onNavigate(act.view);
                            onClose();
                        }}
                        className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all group bg-white"
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${act.color} group-hover:scale-110 transition-transform`}>
                            <act.icon size={24} />
                        </div>
                        <span className="text-xs font-medium text-gray-700">{act.label}</span>
                    </button>
                ))}
            </div>
        </Modal>
    );
};

export default GlobalAddModal;
