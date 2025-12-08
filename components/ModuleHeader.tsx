import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info, LucideIcon } from 'lucide-react';
import { ModuleKey, getModuleConfig, getIcon, ModuleGuideSection as ConfigGuideSection } from '../config/moduleGuides';

export interface ModuleGuideSection {
    icon: LucideIcon;
    title: string;
    content: React.ReactNode;
}

export interface ModuleHeaderProps {
    title: string;
    subtitle: string;
    icon: LucideIcon;
    color: ModuleColor;
    guideSections?: ModuleGuideSection[];
    actions?: React.ReactNode;
    defaultGuideExpanded?: boolean;
}

export type ModuleColor = 
    | 'purple'    // Genealogy
    | 'blue'      // Projects
    | 'emerald'   // Financial
    | 'amber'     // Journal
    | 'rose'      // Places
    | 'teal'      // Habits
    | 'indigo'    // Goals
    | 'orange'    // Itineraries/Trips
    | 'cyan'      // Calendar
    | 'lime'      // Groceries
    | 'pink'      // Purchases
    | 'slate'     // Documents
    | 'violet'    // Loans
    | 'sky'       // Templates
    | 'stone';    // Dashboard

export const MODULE_COLORS: Record<ModuleColor, {
    gradient: string;
    gradientFrom: string;
    gradientTo: string;
    light: string;
    border: string;
    text: string;
    textDark: string;
    hover: string;
    bullet: string;
}> = {
    purple: {
        gradient: 'from-purple-400 to-fuchsia-400',
        gradientFrom: 'from-purple-50',
        gradientTo: 'to-fuchsia-50',
        light: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-600',
        textDark: 'text-purple-700',
        hover: 'hover:bg-purple-100',
        bullet: 'text-purple-500',
    },
    blue: {
        gradient: 'from-blue-400 to-indigo-400',
        gradientFrom: 'from-blue-50',
        gradientTo: 'to-indigo-50',
        light: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-600',
        textDark: 'text-blue-700',
        hover: 'hover:bg-blue-100',
        bullet: 'text-blue-500',
    },
    emerald: {
        gradient: 'from-emerald-400 to-teal-400',
        gradientFrom: 'from-emerald-50',
        gradientTo: 'to-teal-50',
        light: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-600',
        textDark: 'text-emerald-700',
        hover: 'hover:bg-emerald-100',
        bullet: 'text-emerald-500',
    },
    amber: {
        gradient: 'from-amber-400 to-orange-400',
        gradientFrom: 'from-amber-50',
        gradientTo: 'to-orange-50',
        light: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-600',
        textDark: 'text-amber-700',
        hover: 'hover:bg-amber-100',
        bullet: 'text-amber-500',
    },
    rose: {
        gradient: 'from-rose-400 to-pink-400',
        gradientFrom: 'from-rose-50',
        gradientTo: 'to-pink-50',
        light: 'bg-rose-50',
        border: 'border-rose-200',
        text: 'text-rose-600',
        textDark: 'text-rose-700',
        hover: 'hover:bg-rose-100',
        bullet: 'text-rose-500',
    },
    teal: {
        gradient: 'from-teal-400 to-cyan-400',
        gradientFrom: 'from-teal-50',
        gradientTo: 'to-cyan-50',
        light: 'bg-teal-50',
        border: 'border-teal-200',
        text: 'text-teal-600',
        textDark: 'text-teal-700',
        hover: 'hover:bg-teal-100',
        bullet: 'text-teal-500',
    },
    indigo: {
        gradient: 'from-indigo-400 to-violet-400',
        gradientFrom: 'from-indigo-50',
        gradientTo: 'to-violet-50',
        light: 'bg-indigo-50',
        border: 'border-indigo-200',
        text: 'text-indigo-600',
        textDark: 'text-indigo-700',
        hover: 'hover:bg-indigo-100',
        bullet: 'text-indigo-500',
    },
    orange: {
        gradient: 'from-orange-400 to-amber-400',
        gradientFrom: 'from-orange-50',
        gradientTo: 'to-amber-50',
        light: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-600',
        textDark: 'text-orange-700',
        hover: 'hover:bg-orange-100',
        bullet: 'text-orange-500',
    },
    cyan: {
        gradient: 'from-cyan-400 to-sky-400',
        gradientFrom: 'from-cyan-50',
        gradientTo: 'to-sky-50',
        light: 'bg-cyan-50',
        border: 'border-cyan-200',
        text: 'text-cyan-600',
        textDark: 'text-cyan-700',
        hover: 'hover:bg-cyan-100',
        bullet: 'text-cyan-500',
    },
    lime: {
        gradient: 'from-lime-400 to-green-400',
        gradientFrom: 'from-lime-50',
        gradientTo: 'to-green-50',
        light: 'bg-lime-50',
        border: 'border-lime-200',
        text: 'text-lime-600',
        textDark: 'text-lime-700',
        hover: 'hover:bg-lime-100',
        bullet: 'text-lime-500',
    },
    pink: {
        gradient: 'from-pink-400 to-rose-400',
        gradientFrom: 'from-pink-50',
        gradientTo: 'to-rose-50',
        light: 'bg-pink-50',
        border: 'border-pink-200',
        text: 'text-pink-600',
        textDark: 'text-pink-700',
        hover: 'hover:bg-pink-100',
        bullet: 'text-pink-500',
    },
    slate: {
        gradient: 'from-slate-400 to-gray-400',
        gradientFrom: 'from-slate-50',
        gradientTo: 'to-gray-50',
        light: 'bg-slate-50',
        border: 'border-slate-200',
        text: 'text-slate-600',
        textDark: 'text-slate-700',
        hover: 'hover:bg-slate-100',
        bullet: 'text-slate-500',
    },
    violet: {
        gradient: 'from-violet-400 to-purple-400',
        gradientFrom: 'from-violet-50',
        gradientTo: 'to-purple-50',
        light: 'bg-violet-50',
        border: 'border-violet-200',
        text: 'text-violet-600',
        textDark: 'text-violet-700',
        hover: 'hover:bg-violet-100',
        bullet: 'text-violet-500',
    },
    sky: {
        gradient: 'from-sky-400 to-blue-400',
        gradientFrom: 'from-sky-50',
        gradientTo: 'to-blue-50',
        light: 'bg-sky-50',
        border: 'border-sky-200',
        text: 'text-sky-600',
        textDark: 'text-sky-700',
        hover: 'hover:bg-sky-100',
        bullet: 'text-sky-500',
    },
    stone: {
        gradient: 'from-stone-400 to-neutral-400',
        gradientFrom: 'from-stone-50',
        gradientTo: 'to-neutral-50',
        light: 'bg-stone-50',
        border: 'border-stone-200',
        text: 'text-stone-600',
        textDark: 'text-stone-700',
        hover: 'hover:bg-stone-100',
        bullet: 'text-stone-500',
    },
};

const ModuleHeader: React.FC<ModuleHeaderProps> = ({
    title,
    subtitle,
    icon: Icon,
    color,
    guideSections = [],
    actions,
    defaultGuideExpanded = false,
}) => {
    const [isGuideExpanded, setIsGuideExpanded] = useState(defaultGuideExpanded);
    const colors = MODULE_COLORS[color];

    return (
        <div className={`bg-gradient-to-r ${colors.gradientFrom} ${colors.gradientTo} rounded-2xl p-6 border ${colors.border}`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg`}>
                        <Icon className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
                        <p className="text-gray-500 text-sm">{subtitle}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {actions}
                    {guideSections.length > 0 && (
                        <button
                            onClick={() => setIsGuideExpanded(!isGuideExpanded)}
                            className={`flex items-center gap-2 px-3 py-2 ${colors.text} ${colors.hover} rounded-lg transition-colors`}
                        >
                            <Info size={18} />
                            <span className="text-sm font-medium">Guide</span>
                            {isGuideExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    )}
                </div>
            </div>

            {isGuideExpanded && guideSections.length > 0 && (
                <div className={`mt-6 bg-white/70 backdrop-blur rounded-xl p-5 border ${colors.border}`}>
                    <div className="grid md:grid-cols-2 gap-6">
                        {guideSections.map((section, index) => {
                            const SectionIcon = section.icon;
                            return (
                                <div key={index}>
                                    <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                        <SectionIcon className={colors.bullet} size={16} />
                                        {section.title}
                                    </h3>
                                    <div className="text-gray-600 text-sm leading-relaxed">
                                        {typeof section.content === 'string' ? (
                                            <p>{section.content}</p>
                                        ) : Array.isArray(section.content) ? (
                                            <ul className="space-y-1">
                                                {(section.content as string[]).map((item, i) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <span className={colors.bullet}>•</span>
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            section.content
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModuleHeader;

interface ConfiguredModuleHeaderProps {
    moduleKey: ModuleKey;
    actions?: React.ReactNode;
    defaultGuideExpanded?: boolean;
}

export const ConfiguredModuleHeader: React.FC<ConfiguredModuleHeaderProps> = ({
    moduleKey,
    actions,
    defaultGuideExpanded = false,
}) => {
    const config = getModuleConfig(moduleKey);
    const Icon = getIcon(config.iconName);
    
    const guideSections: ModuleGuideSection[] = config.guideSections.map(section => ({
        icon: getIcon(section.iconName),
        title: section.title,
        content: section.content
    }));

    return (
        <ModuleHeader
            title={config.title}
            subtitle={config.subtitle}
            icon={Icon}
            color={config.color}
            guideSections={guideSections}
            actions={actions}
            defaultGuideExpanded={defaultGuideExpanded}
        />
    );
};
