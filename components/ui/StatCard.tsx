import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label?: string;
  };
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'rose' | 'cyan' | 'amber';
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  className = ''
}) => {
  const colorStyles = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'text-blue-600',
      gradient: 'from-blue-500 to-indigo-600'
    },
    green: {
      bg: 'bg-emerald-50',
      icon: 'text-emerald-600',
      gradient: 'from-emerald-500 to-teal-600'
    },
    purple: {
      bg: 'bg-purple-50',
      icon: 'text-purple-600',
      gradient: 'from-purple-500 to-pink-600'
    },
    orange: {
      bg: 'bg-orange-50',
      icon: 'text-orange-600',
      gradient: 'from-orange-500 to-amber-600'
    },
    rose: {
      bg: 'bg-rose-50',
      icon: 'text-rose-600',
      gradient: 'from-rose-500 to-red-600'
    },
    cyan: {
      bg: 'bg-cyan-50',
      icon: 'text-cyan-600',
      gradient: 'from-cyan-500 to-blue-600'
    },
    amber: {
      bg: 'bg-amber-50',
      icon: 'text-amber-600',
      gradient: 'from-amber-500 to-orange-600'
    }
  };
  
  const colors = colorStyles[color];
  
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend.value >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{trend.value >= 0 ? '+' : ''}{trend.value}%</span>
              {trend.label && <span className="text-gray-400 font-normal">{trend.label}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
            <Icon className={`w-6 h-6 ${colors.icon}`} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
