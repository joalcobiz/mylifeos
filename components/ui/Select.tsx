import React, { useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  fullWidth?: boolean;
  className?: string;
  allowAddNew?: boolean;
  onAddNew?: (value: string) => void;
  addNewPlaceholder?: string;
}

const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  error,
  fullWidth = true,
  className = '',
  allowAddNew = false,
  onAddNew,
  addNewPlaceholder = 'Enter new value...'
}) => {
  const [showAddNew, setShowAddNew] = useState(false);
  const [newValue, setNewValue] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__add_new__' && allowAddNew) {
      setShowAddNew(true);
    } else {
      onChange(val);
    }
  };

  const handleAddNewSubmit = () => {
    if (newValue.trim() && onAddNew) {
      onAddNew(newValue.trim());
      onChange(newValue.trim());
      setNewValue('');
      setShowAddNew(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddNewSubmit();
    } else if (e.key === 'Escape') {
      setShowAddNew(false);
      setNewValue('');
    }
  };

  if (showAddNew) {
    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
          </label>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={addNewPlaceholder}
            autoFocus
            className={`flex-1 rounded-xl border bg-white text-gray-900 px-4 py-2.5 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 border-primary focus:ring-primary/20 ${className}`}
          />
          <button
            type="button"
            onClick={handleAddNewSubmit}
            className="px-3 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={() => { setShowAddNew(false); setNewValue(''); }}
            className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={handleChange}
          className={`appearance-none rounded-xl border bg-white text-gray-900 px-4 py-2.5 pr-10 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
            error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
              : 'border-gray-200 focus:border-primary focus:ring-primary/20'
          } ${fullWidth ? 'w-full' : ''} ${className}`}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {allowAddNew && (
            <option value="__add_new__" className="text-primary font-medium">
              + Add New...
            </option>
          )}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <ChevronDown size={18} />
        </div>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default Select;
