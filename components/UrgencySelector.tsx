import React from 'react';
import { Clock, Calendar, AlertCircle } from 'lucide-react';
import { UrgencyType, URGENCY_OPTIONS, normalizeUrgencyToDate, getUrgencyFromDate } from '../types';

interface UrgencySelectorProps {
    urgency: UrgencyType;
    dueDate?: string;
    onChange: (urgency: UrgencyType, dueDate: string | null) => void;
    compact?: boolean;
    showLabel?: boolean;
}

const UrgencySelector: React.FC<UrgencySelectorProps> = ({ 
    urgency, 
    dueDate, 
    onChange, 
    compact = false,
    showLabel = true 
}) => {
    const [showDatePicker, setShowDatePicker] = React.useState(urgency === 'date');

    const handleUrgencyChange = (newUrgency: UrgencyType) => {
        if (newUrgency === 'date') {
            setShowDatePicker(true);
            onChange(newUrgency, dueDate || null);
        } else {
            setShowDatePicker(false);
            const newDueDate = normalizeUrgencyToDate(newUrgency);
            onChange(newUrgency, newDueDate);
        }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        onChange('date', newDate ? new Date(newDate).toISOString() : null);
    };

    const currentOption = URGENCY_OPTIONS.find(o => o.value === urgency) || URGENCY_OPTIONS[5];

    const formatDisplayDate = (dateStr: string | undefined) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: new Date(dateStr).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
            });
        } catch {
            return '';
        }
    };

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <select
                    value={urgency}
                    onChange={(e) => handleUrgencyChange(e.target.value as UrgencyType)}
                    className={`px-2 py-1 text-xs rounded-lg border transition-colors ${currentOption.bgColor} ${currentOption.color} border-transparent focus:outline-none focus:ring-2 focus:ring-primary/30`}
                >
                    {URGENCY_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {(urgency === 'date' || showDatePicker) && (
                    <input
                        type="date"
                        value={dueDate ? new Date(dueDate).toISOString().split('T')[0] : ''}
                        onChange={handleDateChange}
                        className="px-2 py-1 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                )}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {showLabel && (
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Clock size={14} className="text-gray-400" />
                    When do you need this?
                </label>
            )}
            
            <div className="flex flex-wrap gap-2">
                {URGENCY_OPTIONS.map(option => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => handleUrgencyChange(option.value)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                            urgency === option.value 
                                ? `${option.bgColor} ${option.color} border-current font-medium shadow-sm` 
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {(urgency === 'date' || showDatePicker) && (
                <div className="flex items-center gap-2 mt-2">
                    <Calendar size={14} className="text-gray-400" />
                    <input
                        type="date"
                        value={dueDate ? new Date(dueDate).toISOString().split('T')[0] : ''}
                        onChange={handleDateChange}
                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>
            )}

            {dueDate && urgency !== 'none' && (
                <div className={`flex items-center gap-2 text-xs ${currentOption.color} mt-1`}>
                    <AlertCircle size={12} />
                    <span>Due: {formatDisplayDate(dueDate)}</span>
                </div>
            )}
        </div>
    );
};

export const UrgencyBadge: React.FC<{ urgency?: UrgencyType; dueDate?: string; className?: string }> = ({ 
    urgency, 
    dueDate,
    className = '' 
}) => {
    if (!urgency || urgency === 'none') return null;

    const option = URGENCY_OPTIONS.find(o => o.value === urgency);
    if (!option) return null;

    const isOverdue = dueDate && new Date(dueDate) < new Date();

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium ${
            isOverdue ? 'bg-red-100 text-red-700' : `${option.bgColor} ${option.color}`
        } ${className}`}>
            <Clock size={10} />
            {isOverdue ? 'Overdue' : option.label}
        </span>
    );
};

export default UrgencySelector;
