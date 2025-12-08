import { LucideIcon, FolderKanban, Wallet, BookOpen, MapPin, Target, CheckCircle, 
    ShoppingCart, Package, FileText, CreditCard, Calendar, LayoutDashboard, 
    Route, Users, Search, FileCode, Lightbulb, GitBranch, Heart, Clock,
    TrendingUp, Sparkles, Star, Settings } from 'lucide-react';
import { ModuleColor } from '../components/ModuleHeader';

export type ModuleKey = 
    | 'dashboard' | 'projects' | 'financial' | 'journal' | 'places' 
    | 'habits' | 'goals' | 'groceries' | 'purchases' | 'documents' 
    | 'loans' | 'calendar' | 'itineraries' | 'genealogy' | 'templates' | 'settings';

export interface ModuleGuideSection {
    iconName: string;
    title: string;
    content: string | string[];
}

export interface ModuleConfig {
    key: ModuleKey;
    title: string;
    subtitle: string;
    iconName: string;
    color: ModuleColor;
    guideSections: ModuleGuideSection[];
}

export const MODULE_CONFIGS: Record<ModuleKey, ModuleConfig> = {
    dashboard: {
        key: 'dashboard',
        title: 'Dashboard',
        subtitle: 'Your personal command center',
        iconName: 'LayoutDashboard',
        color: 'stone',
        guideSections: [
            {
                iconName: 'Lightbulb',
                title: 'What is Dashboard?',
                content: 'Your central hub for viewing all actionable items across modules. See upcoming tasks, due dates, and quick actions in one unified view.'
            },
            {
                iconName: 'BookOpen',
                title: 'How to Use',
                content: [
                    'Review your Task Stream for urgent items',
                    'Click items to navigate directly to their module',
                    'Use urgency colors to prioritize your day',
                    'Access quick actions for common tasks'
                ]
            },
            {
                iconName: 'GitBranch',
                title: 'Connected Modules',
                content: 'Dashboard aggregates data from Projects, Habits, Goals, Calendar, and Financial modules to give you a complete picture.'
            }
        ]
    },
    projects: {
        key: 'projects',
        title: 'Projects',
        subtitle: 'Manage your projects and tasks',
        iconName: 'FolderKanban',
        color: 'blue',
        guideSections: [
            {
                iconName: 'Lightbulb',
                title: 'What is Projects?',
                content: 'Organize your work with hierarchical projects and tasks. Create subtasks, track progress, and collaborate with team members.'
            },
            {
                iconName: 'BookOpen',
                title: 'How to Use',
                content: [
                    'Create projects with subtasks and deadlines',
                    'Use Quick Notes to capture ideas quickly',
                    'Assign tasks to team members',
                    'Track progress with status and priority levels'
                ]
            },
            {
                iconName: 'GitBranch',
                title: 'Connected Modules',
                content: 'Projects link to Goals for strategic alignment, Calendar for scheduling, and Dashboard for urgent task visibility.'
            }
        ]
    },
    financial: {
        key: 'financial',
        title: 'Financial',
        subtitle: 'Track your income and expenses',
        iconName: 'Wallet',
        color: 'emerald',
        guideSections: [
            {
                iconName: 'Lightbulb',
                title: 'What is Financial?',
                content: 'Manage your personal finances by tracking recurring income and expenses. Monitor cash flow, budgets, and spending patterns.'
            },
            {
                iconName: 'BookOpen',
                title: 'How to Use',
                content: [
                    'Add income sources and recurring expenses',
                    'Set billing dates and payment accounts',
                    'Track expense ratios and net profit',
                    'Disable items temporarily without deleting'
                ]
            },
            {
                iconName: 'TrendingUp',
                title: 'Key Features',
                content: 'View monthly summaries, category breakdowns, and expense ratios. Enable/disable items to model different scenarios.'
            }
        ]
    },
    journal: {
        key: 'journal',
        title: 'Journal',
        subtitle: 'Capture your thoughts and feelings',
        iconName: 'BookOpen',
        color: 'amber',
        guideSections: [
            {
                iconName: 'Lightbulb',
                title: 'What is Journal?',
                content: 'A personal diary to record your daily experiences, thoughts, and emotions. Track moods over time and reflect on your journey.'
            },
            {
                iconName: 'BookOpen',
                title: 'How to Use',
                content: [
                    'Write entries with mood and location',
                    'Add tags to organize by theme',
                    'Attach photos and documents',
                    'Use AI sentiment analysis for insights'
                ]
            },
            {
                iconName: 'Heart',
                title: 'Mood Tracking',
                content: 'Track your emotional patterns with 8 mood types. View your most common mood and entries by feeling.'
            }
        ]
    },
    places: {
        key: 'places',
        title: 'Places & Events',
        subtitle: 'Discover and organize locations',
        iconName: 'MapPin',
        color: 'rose',
        guideSections: [
            {
                iconName: 'Lightbulb',
                title: 'What is Places?',
                content: 'Save and organize your favorite locations, restaurants, and points of interest. Plan visits and track seasonal events.'
            },
            {
                iconName: 'BookOpen',
                title: 'How to Use',
                content: [
                    'Search or manually add places',
                    'Organize with types and collections',
                    'Add events and best times to visit',
                    'Select multiple places to plan trips'
                ]
            },
            {
                iconName: 'Route',
                title: 'Trip Planning',
                content: 'Select places and create itineraries directly. Add to existing trips or plan new visits with one click.'
            }
        ]
    },
    habits: {
        key: 'habits',
        title: 'Habits',
        subtitle: 'Build better daily routines',
        iconName: 'CheckCircle',
        color: 'teal',
        guideSections: [
            {
                iconName: 'Lightbulb',
                title: 'What is Habits?',
                content: 'Track daily habits and build positive routines. Visualize streaks and consistency to stay motivated.'
            },
            {
                iconName: 'BookOpen',
                title: 'How to Use',
                content: [
                    'Create habits with frequency targets',
                    'Check off completions daily',
                    'Track streaks and consistency',
                    'Group habits by category'
                ]
            },
            {
                iconName: 'Star',
                title: 'Motivation',
                content: 'Build streaks to stay consistent. Habits appear in Dashboard to keep you accountable.'
            }
        ]
    },
    goals: {
        key: 'goals',
        title: 'Goals',
        subtitle: 'Set and achieve your objectives',
        iconName: 'Target',
        color: 'indigo',
        guideSections: [
            {
                iconName: 'Lightbulb',
                title: 'What is Goals?',
                content: 'Define long-term objectives and break them into actionable milestones. Track progress toward your aspirations.'
            },
            {
                iconName: 'BookOpen',
                title: 'How to Use',
                content: [
                    'Set goals with target dates',
                    'Add milestones and progress markers',
                    'Link projects to goals for alignment',
                    'Review and update regularly'
                ]
            },
            {
                iconName: 'GitBranch',
                title: 'Connected Modules',
                content: 'Goals connect to Projects for execution and Dashboard for visibility on key objectives.'
            }
        ]
    },
    groceries: {
        key: 'groceries',
        title: 'Groceries',
        subtitle: 'Manage your shopping lists',
        iconName: 'ShoppingCart',
        color: 'lime',
        guideSections: [
            {
                iconName: 'Lightbulb',
                title: 'What is Groceries?',
                content: 'Create and manage multiple shopping lists. Organize items by category and check off as you shop.'
            },
            {
                iconName: 'BookOpen',
                title: 'How to Use',
                content: [
                    'Create color-coded shopping lists',
                    'Add items with quantities',
                    'Check items off while shopping',
                    'Clear completed items with one tap'
                ]
            },
            {
                iconName: 'Star',
                title: 'Multiple Lists',
                content: 'Keep separate lists for different stores, occasions, or household members.'
            }
        ]
    },
    purchases: {
        key: 'purchases',
        title: 'Purchases',
        subtitle: 'Track items you want to buy',
        iconName: 'Package',
        color: 'pink',
        guideSections: [
            {
                iconName: 'Lightbulb',
                title: 'What is Purchases?',
                content: 'Keep a wishlist of items you want to purchase. Track prices, links, and organize by priority.'
            },
            {
                iconName: 'BookOpen',
                title: 'How to Use',
                content: [
                    'Add items with prices and links',
                    'Set priority levels',
                    'Mark items as purchased',
                    'Organize by category'
                ]
            },
            {
                iconName: 'TrendingUp',
                title: 'Price Tracking',
                content: 'Keep track of price changes and plan purchases around sales and deals.'
            }
        ]
    },
    documents: {
        key: 'documents',
        title: 'Documents',
        subtitle: 'Organize important files',
        iconName: 'FileText',
        color: 'slate',
        guideSections: [
            {
                iconName: 'Lightbulb',
                title: 'What is Documents?',
                content: 'Store and organize important documents like insurance, medical records, and legal files in one secure place.'
            },
            {
                iconName: 'BookOpen',
                title: 'How to Use',
                content: [
                    'Upload and categorize documents',
                    'Add expiration dates for renewals',
                    'Search by name or category',
                    'Link to journal entries or places'
                ]
            },
            {
                iconName: 'Clock',
                title: 'Expiration Tracking',
                content: 'Get reminders when documents need renewal. Never miss important deadlines.'
            }
        ]
    },
    loans: {
        key: 'loans',
        title: 'Loans',
        subtitle: 'Track debts and payments',
        iconName: 'CreditCard',
        color: 'violet',
        guideSections: [
            {
                iconName: 'Lightbulb',
                title: 'What is Loans?',
                content: 'Track all your loans, mortgages, and debts. Monitor balances, payments, and interest rates.'
            },
            {
                iconName: 'BookOpen',
                title: 'How to Use',
                content: [
                    'Add loans with balances and rates',
                    'Track monthly payments',
                    'Monitor payoff progress',
                    'Calculate remaining time to payoff'
                ]
            },
            {
                iconName: 'TrendingUp',
                title: 'Payoff Planning',
                content: 'Visualize debt reduction progress and plan extra payments strategically.'
            }
        ]
    },
    calendar: {
        key: 'calendar',
        title: 'Calendar',
        subtitle: 'View your schedule at a glance',
        iconName: 'Calendar',
        color: 'cyan',
        guideSections: [
            {
                iconName: 'Lightbulb',
                title: 'What is Calendar?',
                content: 'A unified calendar view showing events, deadlines, and scheduled items from all modules.'
            },
            {
                iconName: 'BookOpen',
                title: 'How to Use',
                content: [
                    'View month, week, or day layouts',
                    'See project deadlines and habit due dates',
                    'Click events to navigate to source',
                    'Toggle between calendar views'
                ]
            },
            {
                iconName: 'GitBranch',
                title: 'Connected Modules',
                content: 'Calendar aggregates from Projects, Habits, Goals, Itineraries, and Financial for a complete schedule view.'
            }
        ]
    },
    itineraries: {
        key: 'itineraries',
        title: 'Trip Planner',
        subtitle: 'Plan and organize your travels',
        iconName: 'Route',
        color: 'orange',
        guideSections: [
            {
                iconName: 'Lightbulb',
                title: 'What is Trip Planner?',
                content: 'Create detailed travel itineraries with daily schedules, stops, and activities. Share trips publicly or export to PDF.'
            },
            {
                iconName: 'BookOpen',
                title: 'How to Use',
                content: [
                    'Create trips with dates and themes',
                    'Add days and schedule stops',
                    'Organize by time buckets (morning/afternoon/evening)',
                    'Share publicly or export PDF'
                ]
            },
            {
                iconName: 'MapPin',
                title: 'Places Integration',
                content: 'Add stops from your saved Places or search for new locations with Google Places.'
            }
        ]
    },
    genealogy: {
        key: 'genealogy',
        title: 'Family Tree',
        subtitle: 'Discover and preserve your family story',
        iconName: 'Users',
        color: 'purple',
        guideSections: [
            {
                iconName: 'Heart',
                title: 'What is Family Tree?',
                content: 'Document and visualize your family history. Build a comprehensive genealogical record spanning generations.'
            },
            {
                iconName: 'BookOpen',
                title: 'How to Use',
                content: [
                    'Add family members with birth dates and places',
                    'Connect relationships (parents, spouses, children)',
                    'Upload photos and document life events',
                    'View your tree visually or as a searchable list'
                ]
            },
            {
                iconName: 'GitBranch',
                title: 'Connected Modules',
                content: 'Link birth certificates from Documents, tag locations from Places, and see anniversaries in Calendar.'
            }
        ]
    },
    templates: {
        key: 'templates',
        title: 'Templates',
        subtitle: 'Reusable project and task blueprints',
        iconName: 'FileCode',
        color: 'sky',
        guideSections: [
            {
                iconName: 'Lightbulb',
                title: 'What is Templates?',
                content: 'Create reusable blueprints for common project types. Save time by not recreating structure from scratch.'
            },
            {
                iconName: 'BookOpen',
                title: 'How to Use',
                content: [
                    'Create templates from existing projects',
                    'Define default tasks and subtasks',
                    'Apply templates to new projects',
                    'Share templates across the organization'
                ]
            },
            {
                iconName: 'Sparkles',
                title: 'Efficiency',
                content: 'Templates ensure consistency and save setup time for recurring project types.'
            }
        ]
    },
    settings: {
        key: 'settings',
        title: 'Settings',
        subtitle: 'Configure your workspace',
        iconName: 'Settings',
        color: 'slate',
        guideSections: []
    }
};

export function getModuleConfig(key: ModuleKey): ModuleConfig {
    return MODULE_CONFIGS[key];
}

export const ICON_MAP: Record<string, LucideIcon> = {
    FolderKanban,
    Wallet,
    BookOpen,
    MapPin,
    Target,
    CheckCircle,
    ShoppingCart,
    Package,
    FileText,
    CreditCard,
    Calendar,
    LayoutDashboard,
    Route,
    Users,
    Search,
    FileCode,
    Lightbulb,
    GitBranch,
    Heart,
    Clock,
    TrendingUp,
    Sparkles,
    Star,
    Settings
};

export function getIcon(name: string): LucideIcon {
    return ICON_MAP[name] || FolderKanban;
}
