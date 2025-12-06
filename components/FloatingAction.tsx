
import React from 'react';
import { Plus } from 'lucide-react';

interface FloatingActionProps {
    onClick: () => void;
}

const FloatingAction: React.FC<FloatingActionProps> = ({ onClick }) => {
    return (
        <button 
            onClick={onClick}
            className="absolute bottom-8 right-8 w-14 h-14 bg-primary text-white rounded-full shadow-xl hover:shadow-2xl hover:bg-primary-hover transition-all z-40 hidden lg:flex items-center justify-center animate-in zoom-in"
            title="Quick Add"
        >
            <Plus size={28} />
        </button>
    );
};

export default FloatingAction;
