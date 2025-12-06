import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'pills' | 'underline' | 'buttons';
  size?: 'sm' | 'md';
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
  size = 'md',
  className = ''
}) => {
  const sizeStyles = {
    sm: 'text-xs',
    md: 'text-sm'
  };
  
  const getTabStyles = (isActive: boolean) => {
    const base = 'flex items-center gap-2 font-medium transition-all duration-200 whitespace-nowrap';
    
    switch (variant) {
      case 'pills':
        return `${base} px-4 py-2 rounded-lg ${
          isActive 
            ? 'bg-primary text-white shadow-sm' 
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        }`;
      case 'underline':
        return `${base} px-4 py-2.5 border-b-2 -mb-px ${
          isActive 
            ? 'border-primary text-primary' 
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`;
      case 'buttons':
        return `${base} px-4 py-2 rounded-lg border ${
          isActive 
            ? 'bg-primary-muted text-primary border-primary/20' 
            : 'text-gray-500 border-gray-200 hover:bg-gray-50'
        }`;
      default:
        return base;
    }
  };
  
  const containerStyles = variant === 'underline' 
    ? 'flex border-b border-gray-200' 
    : 'flex gap-1 p-1 bg-gray-100 rounded-xl';
  
  return (
    <div className={`${containerStyles} ${sizeStyles[size]} ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={getTabStyles(activeTab === tab.id)}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {tab.count !== undefined && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === tab.id 
                ? 'bg-white/20 text-white' 
                : 'bg-gray-200 text-gray-600'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
