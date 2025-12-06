import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  hint,
  fullWidth = true,
  className = '',
  rows = 4,
  ...props
}) => {
  const baseStyles = 'rounded-xl border bg-white text-gray-900 placeholder-gray-400 px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 resize-none';
  const normalStyles = 'border-gray-200 focus:border-primary focus:ring-primary/20';
  const errorStyles = 'border-red-300 focus:border-red-500 focus:ring-red-200';
  
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        rows={rows}
        className={`${baseStyles} ${error ? errorStyles : normalStyles} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
    </div>
  );
};

export default Textarea;
