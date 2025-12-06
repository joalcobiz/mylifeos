import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = true,
  className = '',
  ...props
}) => {
  const baseInputStyles = 'rounded-xl border bg-white text-gray-900 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0';
  const normalStyles = 'border-gray-200 focus:border-primary focus:ring-primary/20';
  const errorStyles = 'border-red-300 focus:border-red-500 focus:ring-red-200';
  
  const paddingStyles = Icon 
    ? iconPosition === 'left' ? 'pl-10 pr-4' : 'pl-4 pr-10'
    : 'px-4';
  
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${iconPosition === 'left' ? 'left-3' : 'right-3'}`}>
            <Icon size={18} />
          </div>
        )}
        <input
          className={`${baseInputStyles} ${error ? errorStyles : normalStyles} ${paddingStyles} py-2.5 text-sm ${fullWidth ? 'w-full' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
};

export default Input;
