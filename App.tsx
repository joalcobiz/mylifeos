import React, { useState, useEffect, Suspense, lazy } from 'react';
import { 
  LayoutDashboard, FolderKanban, Wallet, CreditCard, BookOpen, MapPin, 
  Settings, FileText, Menu, Moon, X, PieChart, Calendar as CalendarIcon, Utensils, LogOut, Lock,
  Cpu, Check, ChevronLeft, ChevronRight, Route, Grid, ShoppingBag, Target, Flame, Search, Plus, Sun,
  Eye, EyeOff
} from 'lucide-react';
import { View, MenuItem, Settings as SettingsType } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SharingProvider } from './contexts/SharingContext';
import { AccountProvider } from './contexts/AccountContext';
import { AccountSwitcher } from './components/AccountSwitcher';
import { useFirestore } from './services/firestore';
import ErrorBoundary from './components/ErrorBoundary';
import ModuleLoader from './components/ModuleLoader';
import BottomNav from './components/BottomNav';
import CommandPalette from './components/CommandPalette';
import FloatingAction from './components/FloatingAction';
import GlobalAddModal from './components/GlobalAddModal';

const PlacesView = lazy(() => import('./modules/Places/PlacesView'));
const ProjectsView = lazy(() => import('./modules/Projects/ProjectsView'));
const TemplatesView = lazy(() => import('./modules/Templates/TemplatesView'));
const DocumentsView = lazy(() => import('./modules/Documents/DocumentsView'));
const JournalView = lazy(() => import('./modules/Journal/JournalView'));
const LoansView = lazy(() => import('./modules/Loans/LoansView'));
const PurchasesView = lazy(() => import('./modules/Purchases/PurchasesView'));
const FinancialView = lazy(() => import('./modules/Financial/FinancialView'));
const ReportsView = lazy(() => import('./modules/Reports/ReportsView'));
const GroceriesView = lazy(() => import('./modules/Groceries/GroceriesView'));
const CalendarView = lazy(() => import('./modules/Calendar/CalendarView'));
const DashboardView = lazy(() => import('./modules/Dashboard/DashboardView'));
const SettingsView = lazy(() => import('./modules/Settings/SettingsView'));
const ItinerariesView = lazy(() => import('./modules/Itineraries/ItinerariesView'));
const HabitsView = lazy(() => import('./modules/Habits/HabitsView'));
const GoalsView = lazy(() => import('./modules/Goals/GoalsView'));
const PublicItineraryView = lazy(() => import('./modules/Itineraries/PublicItineraryView'));

const THEMES = {
    blue: { main: '#3b82f6', hover: '#2563eb', light: '#dbeafe', muted: '#eff6ff' },
    purple: { main: '#8b5cf6', hover: '#7c3aed', light: '#ede9fe', muted: '#f5f3ff' },
    emerald: { main: '#10b981', hover: '#059669', light: '#d1fae5', muted: '#ecfdf5' },
    orange: { main: '#f97316', hover: '#ea580c', light: '#ffedd5', muted: '#fff7ed' },
    rose: { main: '#f43f5e', hover: '#e11d48', light: '#ffe4e6', muted: '#fff1f2' },
    cyan: { main: '#06b6d4', hover: '#0891b2', light: '#cffafe', muted: '#ecfeff' },
    slate: { main: '#475569', hover: '#334155', light: '#e2e8f0', muted: '#f8fafc' },
};

const MODULE_METADATA: Record<string, { icon: any, label: string, color: string }> = {
    'dashboard': { icon: LayoutDashboard, label: 'Dashboard', color: 'blue' },
    'calendar': { icon: CalendarIcon, label: 'Calendar', color: 'purple' },
    'reports': { icon: PieChart, label: 'Reports', color: 'cyan' },
    'projects': { icon: FolderKanban, label: 'Projects', color: 'orange' },
    'financial': { icon: Wallet, label: 'Financial', color: 'emerald' },
    'loans': { icon: CreditCard, label: 'Money Flows', color: 'rose' },
    'journal': { icon: BookOpen, label: 'Journal', color: 'pink' },
    'itineraries': { icon: Route, label: 'Itineraries', color: 'indigo' },
    'places': { icon: MapPin, label: 'Places & Events', color: 'red' },
    'purchases': { icon: ShoppingBag, label: 'Shopping', color: 'amber' },
    'groceries': { icon: Utensils, label: 'Groceries', color: 'lime' },
    'templates': { icon: Grid, label: 'Collections', color: 'violet' },
    'documents': { icon: FileText, label: 'Documents', color: 'sky' },
    'habits': { icon: Flame, label: 'Habits', color: 'orange' },
    'goals': { icon: Target, label: 'Goals', color: 'red' },
    'settings': { icon: Settings, label: 'Settings', color: 'slate' }
};

const DEFAULT_MENU_LAYOUT: MenuItem[] = [
    { id: 'm1', type: 'view', view: 'dashboard', isVisible: true },
    { id: 'd1', type: 'divider', isVisible: true },
    { id: 'm3', type: 'view', view: 'projects', isVisible: true },
    { id: 'm4', type: 'view', view: 'financial', isVisible: true },
    { id: 'm5', type: 'view', view: 'loans', isVisible: true },
    { id: 'd2', type: 'divider', isVisible: true },
    { id: 'm6', type: 'view', view: 'journal', isVisible: true },
    { id: 'm7', type: 'view', view: 'itineraries', isVisible: true },
    { id: 'm8', type: 'view', view: 'places', isVisible: true },
    { id: 'm9', type: 'view', view: 'purchases', isVisible: true },
    { id: 'm10', type: 'view', view: 'groceries', isVisible: true },
    { id: 'm11', type: 'view', view: 'documents', isVisible: true },
    { id: 'd3', type: 'divider', isVisible: true },
    { id: 'm12', type: 'view', view: 'habits', isVisible: true },
    { id: 'm13', type: 'view', view: 'goals', isVisible: true },
    { id: 'm14', type: 'view', view: 'templates', isVisible: true },
    { id: 'm15', type: 'view', view: 'calendar', isVisible: true },
];

function LoginScreen() {
    const { signInWithCredentials, signUp, resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        if (mode === 'reset') {
            if (!email) {
                setError('Please enter your email address');
                return;
            }
            setIsLoading(true);
            const result = await resetPassword(email);
            setIsLoading(false);
            if (result.success) {
                setSuccess('Password reset email sent! Check your inbox.');
                setTimeout(() => setMode('login'), 3000);
            } else {
                setError(result.error || 'Failed to send reset email');
            }
            return;
        }
        
        if (!email || !password) {
            setError('Please enter email and password');
            return;
        }
        
        if (mode === 'register' && !displayName) {
            setError('Please enter your name');
            return;
        }
        
        if (mode === 'register' && password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        
        setIsLoading(true);
        
        if (mode === 'login') {
            const result = await signInWithCredentials(email, password);
            if (!result.success) {
                setError(result.error || 'Login failed');
            }
        } else {
            const result = await signUp(email, password, displayName);
            if (!result.success) {
                setError(result.error || 'Registration failed');
            }
        }
        setIsLoading(false);
    };
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>
            
            <div className="relative z-10 w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-purple-500/30 transform hover:scale-105 transition-transform">
                            <span className="text-white font-bold text-4xl">L</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white mb-2">
                            {mode === 'login' ? 'Welcome to LIFEOS' : mode === 'register' ? 'Create Account' : 'Reset Password'}
                        </h1>
                        <p className="text-gray-300">
                            {mode === 'login' ? 'Your personal operating system for life' : 
                             mode === 'register' ? 'Join LIFEOS to organize your life' : 
                             'Enter your email to reset password'}
                        </p>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Your Name</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-400 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                    autoComplete="name"
                                />
                            </div>
                        )}
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-400 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                autoComplete="email"
                            />
                        </div>
                        
                        {mode !== 'reset' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder={mode === 'register' ? 'Create a password (min 6 chars)' : 'Enter your password'}
                                        className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-400 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm flex items-center gap-2">
                                <Lock size={16} />
                                {error}
                            </div>
                        )}
                        
                        {success && (
                            <div className="bg-green-500/20 border border-green-500/30 rounded-xl px-4 py-3 text-green-300 text-sm flex items-center gap-2">
                                <Check size={16} />
                                {success}
                            </div>
                        )}
                        
                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium py-3.5 px-4 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50 mt-6"
                        >
                            {isLoading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <Lock className="w-4 h-4" />
                            )}
                            {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Email'}
                        </button>
                    </form>
                    
                    <div className="mt-6 space-y-3">
                        {mode === 'login' && (
                            <>
                                <button
                                    onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
                                    className="w-full text-center text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    Don't have an account? <span className="text-purple-400">Sign up</span>
                                </button>
                                <button
                                    onClick={() => { setMode('reset'); setError(''); setSuccess(''); }}
                                    className="w-full text-center text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    Forgot password?
                                </button>
                            </>
                        )}
                        
                        {(mode === 'register' || mode === 'reset') && (
                            <button
                                onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
                                className="w-full text-center text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                Back to <span className="text-purple-400">Sign In</span>
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="mt-6 flex justify-center gap-6 text-gray-500 text-sm">
                    <span className="flex items-center gap-1.5"><FolderKanban size={14} /> Projects</span>
                    <span className="flex items-center gap-1.5"><Target size={14} /> Goals</span>
                    <span className="flex items-center gap-1.5"><Flame size={14} /> Habits</span>
                </div>
            </div>
        </div>
    );
}

function MainApp() {
  const { user, signOut, isDemo } = useAuth();
  const { data: settingsList } = useFirestore<SettingsType>('settings');
  
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [viewParams, setViewParams] = useState<any>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMiniSidebar, setIsMiniSidebar] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isGlobalAddOpen, setIsGlobalAddOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
      const settings = settingsList[0];
      const userProfiles = settings?.users || [];
      const currentProfile = userProfiles.find((u: any) => u.id === user?.uid || u.email === user?.email);
      const userTheme = currentProfile?.theme || (user as any)?.theme || 'blue';
      const colors = THEMES[userTheme as keyof typeof THEMES] || THEMES.blue;
      
      const root = document.documentElement;
      root.style.setProperty('--color-primary-main', colors.main);
      root.style.setProperty('--color-primary-hover', colors.hover);
      root.style.setProperty('--color-primary-light', colors.light);
      root.style.setProperty('--color-primary-muted', colors.muted);
  }, [user, settingsList]);

  const handleNavigate = (view: View, params?: any) => {
      setCurrentView(view);
      setViewParams(params || {});
      setSidebarOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setCmdOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  interface NavItemProps {
    view: View;
    icon: React.ComponentType<{ className?: string; size?: number }>;
    label: string;
  }
  
  const NavItem: React.FC<NavItemProps> = ({ view, icon: Icon, label }) => {
    const isActive = currentView === view;
    
    return (
      <button
        onClick={() => handleNavigate(view)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
          isActive
            ? 'bg-primary text-white shadow-md shadow-primary/20'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        } ${isMiniSidebar ? 'justify-center w-12 mx-auto px-0' : 'w-full'}`}
        title={isMiniSidebar ? label : ''}
      >
        <Icon size={20} className={`transition-transform group-hover:scale-110 ${isActive ? '' : ''}`} />
        {!isMiniSidebar && <span>{label}</span>}
      </button>
    );
  };

  const NavDivider = () => (
      <div className={`border-t border-gray-100 my-3 ${isMiniSidebar ? 'mx-2' : 'mx-3'}`}></div>
  );

  const settings = settingsList[0];
  const menuItems = settings?.menuLayout || DEFAULT_MENU_LAYOUT;

  const getViewTitle = () => {
    const titles: Record<string, string> = {
      'dashboard': 'Dashboard',
      'search': 'Search',
      'projects': 'Projects',
      'financial': 'Financial',
      'loans': 'Money Flows',
      'journal': 'Journal',
      'itineraries': 'Itineraries',
      'places': 'Places & Events',
      'purchases': 'Shopping',
      'groceries': 'Groceries',
      'documents': 'Documents',
      'habits': 'Habits',
      'goals': 'Goals',
      'templates': 'Collections',
      'calendar': 'Calendar',
      'reports': 'Reports',
      'settings': 'Settings',
      'admin': 'Admin Panel'
    };
    return titles[currentView] || currentView;
  };

  if (!user) return <LoginScreen />;

  return (
    <div className="h-screen w-full bg-gray-50 flex overflow-hidden">
      
      <CommandPalette 
        isOpen={cmdOpen} 
        onClose={() => setCmdOpen(false)} 
        onNavigate={(v) => handleNavigate(v as View)} 
      />

      <GlobalAddModal 
        isOpen={isGlobalAddOpen} 
        onClose={() => setIsGlobalAddOpen(false)} 
        onNavigate={(v) => handleNavigate(v as View)} 
      />

      {sidebarOpen && (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
            onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside 
        className={`
            fixed lg:relative top-0 left-0 bottom-0 bg-white border-r border-gray-200 z-50 transition-all duration-300 ease-out 
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} 
            ${isMiniSidebar ? 'w-[72px]' : 'w-[260px]'}
            flex flex-col shadow-xl lg:shadow-none
        `}
      >
        <div className={`h-16 flex items-center ${isMiniSidebar ? 'justify-center' : 'px-5'} border-b border-gray-100 bg-white relative flex-shrink-0`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/20 flex-shrink-0">
            L
          </div>
          {!isMiniSidebar && <span className="font-bold text-gray-900 text-xl tracking-tight ml-3">LIFEOS</span>}
          
          <button 
            className={`hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center text-gray-400 hover:text-primary hover:border-primary shadow-sm z-50 transition-all`}
            onClick={() => setIsMiniSidebar(!isMiniSidebar)}
          >
            {isMiniSidebar ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          <button 
            className="ml-auto lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-3 space-y-1 overflow-y-auto flex-1 custom-scrollbar">
          {menuItems.map((item) => {
              if (!item.isVisible) return null;
              if (item.type === 'divider') return <NavDivider key={item.id} />;
              
              const viewKey = item.view;
              if (viewKey) {
                  const meta = MODULE_METADATA[viewKey];
                  if (!meta) return null;
                  return (
                      <NavItem 
                        key={item.id} 
                        view={viewKey} 
                        icon={meta.icon} 
                        label={item.label || meta.label} 
                      />
                  );
              }
              return null;
          })}
        </div>
        
        <div className={`p-3 border-t border-gray-100 ${isMiniSidebar ? 'flex flex-col items-center' : ''}`}>
            {/* Settings Button - Above User */}
            <button
              onClick={() => handleNavigate('settings')}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-colors mb-3 ${
                  currentView === 'settings' 
                      ? 'bg-primary text-white' 
                      : 'text-gray-600 hover:bg-gray-100'
              } ${isMiniSidebar ? 'justify-center' : ''}`}
            >
                <Settings size={16} />
                {!isMiniSidebar && 'Settings'}
            </button>

            {/* User Profile */}
            <div className={`flex items-center ${isMiniSidebar ? 'justify-center p-2' : 'justify-between px-3 py-2.5'} bg-gray-50 rounded-xl`}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-hover text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {user.displayName?.[0] || 'U'}
                    </div>
                    {!isMiniSidebar && (
                        <div className="text-left">
                            <span className="text-sm font-medium text-gray-900 block truncate max-w-[120px]">{user.displayName}</span>
                            <span className="text-[11px] text-gray-500">{isDemo ? 'Demo Mode' : 'Online'}</span>
                        </div>
                    )}
                </div>
            </div>
            
            <button
              onClick={signOut}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors mt-2"
            >
                <LogOut size={14} />
                {!isMiniSidebar && 'Sign Out'}
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-100 flex-shrink-0 px-4 md:px-6">
          <div className="h-full flex items-center justify-between max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => setSidebarOpen(true)}
                    className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                >
                    <Menu size={20} />
                </button>
                <div>
                    <h1 className="text-lg font-semibold text-gray-900">{getViewTitle()}</h1>
                    <p className="text-xs text-gray-400 hidden md:block">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                <div className="hidden md:block">
                    <AccountSwitcher 
                        showCreateButton={true}
                        onSettingsClick={() => handleNavigate('settings')}
                    />
                </div>
                
                <button 
                    onClick={() => setCmdOpen(true)}
                    className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm text-gray-500 transition-colors"
                >
                    <Search size={16} />
                    <span>Search...</span>
                    <kbd className="px-1.5 py-0.5 bg-white rounded text-[10px] font-mono border border-gray-200">⌘K</kbd>
                </button>
                
                {isDemo && (
                    <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1.5 rounded-lg font-medium border border-amber-200 hidden md:block">
                        Demo Mode
                    </span>
                )}
                
                <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="p-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
                    title="Toggle Theme"
                >
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                
                <button 
                    onClick={signOut}
                    className="p-2.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors" 
                    title="Sign Out"
                >
                    <LogOut size={18} />
                </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50/50">
            <div className="max-w-7xl mx-auto p-4 md:p-6 pb-24 lg:pb-6">
                <ErrorBoundary moduleName={getViewTitle()}>
                    <Suspense fallback={<ModuleLoader moduleName={getViewTitle()} />}>
                        {currentView === 'dashboard' && <DashboardView />}
                        {currentView === 'search' && <DashboardView autoFocusSearch={true} />}
                        {currentView === 'places' && <PlacesView />}
                        {currentView === 'itineraries' && <ItinerariesView />}
                        {currentView === 'projects' && <ProjectsView focusId={viewParams.focusId} />}
                        {currentView === 'templates' && <TemplatesView />}
                        {currentView === 'documents' && <DocumentsView />}
                        {currentView === 'journal' && <JournalView focusId={viewParams.focusId} />}
                        {currentView === 'loans' && <LoansView />}
                        {currentView === 'purchases' && <PurchasesView />}
                        {currentView === 'financial' && <FinancialView />}
                        {currentView === 'reports' && <ReportsView />}
                        {currentView === 'groceries' && <GroceriesView />}
                        {currentView === 'calendar' && <CalendarView onNavigate={handleNavigate} />}
                        {currentView === 'settings' && <SettingsView />}
                        {currentView === 'habits' && <HabitsView />}
                        {currentView === 'goals' && <GoalsView />}
                    </Suspense>
                </ErrorBoundary>
            </div>
        </div>

        <FloatingAction onClick={() => setIsGlobalAddOpen(true)} />
        <BottomNav currentView={currentView} onNavigate={handleNavigate} onFabClick={() => setIsGlobalAddOpen(true)} />
      </main>
    </div>
  );
}

const PublicShareRoute = () => {
    const [shareToken, setShareToken] = useState<string | null>(null);
    const [isValidPath, setIsValidPath] = useState(false);
    
    useEffect(() => {
        const path = window.location.pathname;
        
        if (path.startsWith('/share/')) {
            const token = path.replace('/share/', '').trim();
            if (token && token.length > 0) {
                setShareToken(token);
                setIsValidPath(true);
            } else {
                setIsValidPath(false);
            }
        }
    }, []);
    
    const handleBack = () => {
        window.history.pushState({}, '', '/');
        window.location.reload();
    };
    
    if (!isValidPath && shareToken === null) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-white rounded-full"></div>
            </div>
        );
    }
    
    if (!shareToken) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-md text-center border border-white/20">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">!</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Invalid Link</h2>
                    <p className="text-gray-300 mb-6">This share link is not valid. Please check the URL and try again.</p>
                    <button
                        onClick={handleBack}
                        className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
                    >
                        Go to Homepage
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-white rounded-full"></div>
            </div>
        }>
            <PublicItineraryView shareToken={shareToken} onBack={handleBack} />
        </Suspense>
    );
};

const App = () => {
    const [isPublicShare, setIsPublicShare] = useState(false);
    
    useEffect(() => {
        const path = window.location.pathname;
        if (path.startsWith('/share/')) {
            setIsPublicShare(true);
        }
    }, []);
    
    if (isPublicShare) {
        return <PublicShareRoute />;
    }
    
    return (
        <AuthProvider>
            <SharingProvider>
                <AccountProvider>
                    <MainApp />
                </AccountProvider>
            </SharingProvider>
        </AuthProvider>
    );
};

export default App;
