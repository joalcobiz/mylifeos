import React from 'react';
import { LucideIcon } from 'lucide-react';

interface FormSectionProps {
    title: string;
    icon?: LucideIcon;
    children: React.ReactNode;
    className?: string;
    gradient?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({ 
    title, 
    icon: Icon, 
    children, 
    className = '',
    gradient = 'from-gray-50 to-white'
}) => (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl p-4 border border-gray-100 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
            {Icon && <Icon size={16} className="text-gray-500" />}
            <span className="text-sm font-semibold text-gray-700">{title}</span>
        </div>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

interface FormRowProps {
    children: React.ReactNode;
    cols?: 1 | 2 | 3 | 4;
    className?: string;
}

export const FormRow: React.FC<FormRowProps> = ({ children, cols = 2, className = '' }) => {
    const colClasses = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 md:grid-cols-2',
        3: 'grid-cols-1 md:grid-cols-3',
        4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    };
    
    return (
        <div className={`grid ${colClasses[cols]} gap-3 ${className}`}>
            {children}
        </div>
    );
};

interface CompactFormLayoutProps {
    children: React.ReactNode;
    columns?: 1 | 2;
    className?: string;
}

export const CompactFormLayout: React.FC<CompactFormLayoutProps> = ({ 
    children, 
    columns = 2,
    className = ''
}) => {
    if (columns === 1) {
        return <div className={`space-y-4 ${className}`}>{children}</div>;
    }
    
    return (
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${className}`}>
            {children}
        </div>
    );
};

interface CompactFieldProps {
    label: string;
    children: React.ReactNode;
    required?: boolean;
    hint?: string;
    error?: string;
}

export const CompactField: React.FC<CompactFieldProps> = ({ 
    label, 
    children, 
    required = false,
    hint,
    error
}) => (
    <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
);

export const compactInputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all";
export const compactSelectClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-white transition-all";
export const compactTextareaClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none transition-all";

export default CompactFormLayout;
