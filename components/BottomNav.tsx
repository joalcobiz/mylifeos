
import React from 'react';
import { LayoutDashboard, FolderKanban, Wallet, BookOpen, Plus } from 'lucide-react';

interface BottomNavProps {
    currentView: string;
    onNavigate: (view: any) => void;
    onFabClick: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate, onFabClick }) => {
    const NavButton = ({ view, icon: Icon, label }: { view: string, icon: any, label: string }) => (
        <button 
            onClick={() => onNavigate(view)} 
            className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[60px] rounded-xl transition-all active:scale-95 ${
                currentView === view 
                    ? 'text-primary bg-primary/10' 
                    : 'text-gray-400 hover:text-gray-600'
            }`}
        >
            <Icon size={22} strokeWidth={currentView === view ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{label}</span>
        </button>
    );

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 lg:hidden z-50 safe-area-bottom">
            <div className="flex items-center justify-around h-16 px-2 pb-safe">
                <NavButton view="dashboard" icon={LayoutDashboard} label="Home" />
                <NavButton view="projects" icon={FolderKanban} label="Tasks" />
                
                {/* FAB in Center */}
                <div className="relative flex items-center justify-center w-16">
                    <button 
                        onClick={onFabClick}
                        className="absolute -top-6 w-14 h-14 bg-gradient-to-br from-primary to-primary-hover text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
                        aria-label="Quick Add"
                    >
                        <Plus size={26} strokeWidth={2.5} />
                    </button>
                </div>

                <NavButton view="financial" icon={Wallet} label="Money" />
                <NavButton view="journal" icon={BookOpen} label="Journal" />
            </div>
        </div>
    );
};

export default BottomNav;
