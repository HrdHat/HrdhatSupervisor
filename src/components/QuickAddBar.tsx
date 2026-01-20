import { useState } from 'react';
import type { DailyLogType } from '@/types/supervisor';

interface QuickAddBarProps {
  onAddShift: () => void;
  onAddLog: (type: DailyLogType) => void;
}

// Log types configuration with consistent styling
const LOG_TYPE_BUTTONS: { type: DailyLogType | 'shift'; label: string; icon: string; color: string; bgColor: string; hoverBg: string }[] = [
  { type: 'shift', label: 'Shift', icon: '⏱️', color: 'text-blue-700', bgColor: 'bg-blue-100', hoverBg: 'hover:bg-blue-200' },
  { type: 'visitor', label: 'Visitor', icon: '👤', color: 'text-purple-700', bgColor: 'bg-purple-100', hoverBg: 'hover:bg-purple-200' },
  { type: 'delivery', label: 'Delivery', icon: '📦', color: 'text-orange-700', bgColor: 'bg-orange-100', hoverBg: 'hover:bg-orange-200' },
  { type: 'manpower', label: 'Manpower', icon: '👷', color: 'text-cyan-700', bgColor: 'bg-cyan-100', hoverBg: 'hover:bg-cyan-200' },
  { type: 'site_issue', label: 'Site Issue', icon: '⚠️', color: 'text-red-700', bgColor: 'bg-red-100', hoverBg: 'hover:bg-red-200' },
  { type: 'schedule_delay', label: 'Schedule', icon: '📅', color: 'text-yellow-700', bgColor: 'bg-yellow-100', hoverBg: 'hover:bg-yellow-200' },
  { type: 'observation', label: 'Observation', icon: '👁️', color: 'text-teal-700', bgColor: 'bg-teal-100', hoverBg: 'hover:bg-teal-200' },
];

export function QuickAddBar({ onAddShift, onAddLog }: QuickAddBarProps) {
  const [activeType, setActiveType] = useState<DailyLogType | 'shift' | null>(null);

  const handleClick = (type: DailyLogType | 'shift') => {
    if (type === 'shift') {
      onAddShift();
    } else {
      onAddLog(type);
    }
    setActiveType(type);
    // Reset active state after animation
    setTimeout(() => setActiveType(null), 200);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Add</span>
      </div>
      
      {/* Button Grid - All equal weight */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {LOG_TYPE_BUTTONS.map(({ type, label, icon, color, bgColor, hoverBg }) => (
          <button
            key={type}
            onClick={() => handleClick(type)}
            className={`
              flex flex-col items-center justify-center gap-1 p-3 rounded-lg
              transition-all duration-150 ease-in-out
              ${bgColor} ${hoverBg} ${color}
              ${activeType === type ? 'scale-95 ring-2 ring-offset-1' : ''}
              border border-transparent hover:border-current/20
            `}
          >
            <span className="text-lg">{icon}</span>
            <span className="text-xs font-medium whitespace-nowrap">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Compact version for mobile or inline use
export function QuickAddBarCompact({ onAddShift, onAddLog }: QuickAddBarProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2 -mb-2">
      {LOG_TYPE_BUTTONS.map(({ type, label, icon, color, bgColor, hoverBg }) => (
        <button
          key={type}
          onClick={() => type === 'shift' ? onAddShift() : onAddLog(type)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full
            text-xs font-medium whitespace-nowrap
            ${bgColor} ${hoverBg} ${color}
            transition-colors
          `}
        >
          <span>{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
