import React, { useState, useRef, useEffect } from 'react';
import { Share2, Lock, Users, Check, ChevronDown } from 'lucide-react';

interface UserOption {
  id: string;
  name: string;
  initials?: string;
  color?: string;
}

interface ShareToggleProps {
  isShared: boolean;
  onToggle: (shared: boolean) => void;
  disabled?: boolean;
  sharedWith?: string[];
  onShareWithChange?: (userIds: string[]) => void;
  availableUsers?: UserOption[];
  showUserPicker?: boolean;
  compact?: boolean;
}

export const ShareToggle: React.FC<ShareToggleProps> = ({ 
  isShared, 
  onToggle, 
  disabled = false,
  sharedWith = [],
  onShareWithChange,
  availableUsers = [],
  showUserPicker = false,
  compact = false
}) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUserToggle = (userId: string) => {
    if (!onShareWithChange) return;
    const newSharedWith = sharedWith.includes(userId)
      ? sharedWith.filter(id => id !== userId)
      : [...sharedWith, userId];
    onShareWithChange(newSharedWith);
  };

  if (compact) {
    return (
      <button
        onClick={() => onToggle(!isShared)}
        disabled={disabled}
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
          isShared
            ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isShared ? 'Shared' : 'Private'}
      >
        {isShared ? <Share2 size={12} /> : <Lock size={12} />}
      </button>
    );
  }

  return (
    <div className="relative" ref={pickerRef}>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggle(!isShared)}
          disabled={disabled}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
            isShared
              ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isShared ? 'Shared with others' : 'Private to you'}
        >
          {isShared ? <Share2 size={14} /> : <Lock size={14} />}
          <span>{isShared ? 'Shared' : 'Private'}</span>
        </button>

        {isShared && showUserPicker && availableUsers.length > 0 && (
          <button
            onClick={() => setIsPickerOpen(!isPickerOpen)}
            className="flex items-center gap-1 px-2 py-2 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors"
          >
            <Users size={14} className="text-gray-500" />
            <span className="text-gray-600">{sharedWith.length || 'All'}</span>
            <ChevronDown size={12} className={`text-gray-400 transition-transform ${isPickerOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {isPickerOpen && isShared && showUserPicker && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-medium text-gray-600">Share with users</p>
            <p className="text-xs text-gray-400 mt-0.5">Select who can see this item</p>
          </div>
          <div className="max-h-48 overflow-y-auto p-2">
            <button
              onClick={() => onShareWithChange?.([])}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                sharedWith.length === 0 ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium">
                <Users size={14} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">Everyone</div>
                <div className="text-xs text-gray-500">All users can see this</div>
              </div>
              {sharedWith.length === 0 && <Check size={16} className="text-blue-600" />}
            </button>
            
            {availableUsers.map(user => (
              <button
                key={user.id}
                onClick={() => handleUserToggle(user.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  sharedWith.includes(user.id) ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: user.color || '#6366f1' }}
                >
                  {user.initials || user.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{user.name}</div>
                </div>
                {sharedWith.includes(user.id) && <Check size={16} className="text-blue-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
