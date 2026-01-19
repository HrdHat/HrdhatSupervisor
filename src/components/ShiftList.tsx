import { useMemo } from 'react';
import type { ProjectShiftWithStats, ShiftStatus } from '@/types/supervisor';

interface ShiftListProps {
  shifts: ProjectShiftWithStats[];
  onSelectShift: (shift: ProjectShiftWithStats) => void;
  onCreateShift: () => void;
  onDeleteShift?: (shiftId: string) => void;
  selectedShiftId?: string;
}

// Status badge colors
const STATUS_COLORS: Record<ShiftStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
  active: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Active' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
};

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

// Format time for display
function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function ShiftList({ shifts, onSelectShift, onCreateShift, onDeleteShift, selectedShiftId }: ShiftListProps) {
  // Group shifts by status for better organization
  const { activeShifts, draftShifts, completedShifts, cancelledShifts } = useMemo(() => {
    return {
      activeShifts: shifts.filter(s => s.status === 'active'),
      draftShifts: shifts.filter(s => s.status === 'draft'),
      completedShifts: shifts.filter(s => s.status === 'completed'),
      cancelledShifts: shifts.filter(s => s.status === 'cancelled'),
    };
  }, [shifts]);

  const handleDeleteClick = (e: React.MouseEvent, shiftId: string) => {
    e.stopPropagation(); // Prevent selecting the shift
    if (onDeleteShift && window.confirm('Are you sure you want to delete this draft shift? This action cannot be undone.')) {
      onDeleteShift(shiftId);
    }
  };

  const renderShiftCard = (shift: ProjectShiftWithStats) => {
    const statusConfig = STATUS_COLORS[shift.status];
    const progress = shift.worker_count > 0
      ? Math.round((shift.forms_submitted / shift.worker_count) * 100)
      : 0;
    const isSelected = shift.id === selectedShiftId;
    const canDelete = shift.status === 'draft' && onDeleteShift;

    return (
      <div
        key={shift.id}
        className={`relative group w-full text-left p-4 rounded-lg border-2 transition-all hover:shadow-md cursor-pointer ${
          isSelected
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
        onClick={() => onSelectShift(shift)}
      >
        {/* Delete button - only for draft shifts */}
        {canDelete && (
          <button
            onClick={(e) => handleDeleteClick(e, shift.id)}
            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
            title="Delete draft shift"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-gray-900">{shift.name}</h3>
            <p className="text-sm text-gray-500">
              {formatDate(shift.scheduled_date)}
              {shift.start_time && ` • ${formatTime(shift.start_time)}`}
              {shift.end_time && ` - ${formatTime(shift.end_time)}`}
            </p>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusConfig.bg} ${statusConfig.text} ${canDelete ? 'mr-6' : ''}`}>
            {statusConfig.label}
          </span>
        </div>

        {/* Worker/Form Progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-600">
              {shift.worker_count} worker{shift.worker_count !== 1 ? 's' : ''}
            </span>
            <span className={`font-medium ${
              progress === 100 ? 'text-green-600' : progress > 0 ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {shift.forms_submitted}/{shift.worker_count} forms
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                progress === 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Notes preview if exists */}
        {shift.notes && (
          <p className="mt-2 text-xs text-gray-500 truncate">
            📝 {shift.notes}
          </p>
        )}
      </div>
    );
  };

  const renderSection = (title: string, sectionShifts: ProjectShiftWithStats[], emptyMessage?: string) => {
    if (sectionShifts.length === 0 && !emptyMessage) return null;

    return (
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {title} ({sectionShifts.length})
        </h4>
        {sectionShifts.length === 0 ? (
          <p className="text-sm text-gray-400 italic">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {sectionShifts.map(renderShiftCard)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with New Shift button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Shifts</h3>
        <button
          onClick={onCreateShift}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Shift
        </button>
      </div>

      {/* Shift Lists */}
      <div className="flex-1 overflow-y-auto">
        {shifts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No shifts yet</h3>
            <p className="text-gray-500 mb-4">Create your first shift to start tracking worker forms.</p>
            <button
              onClick={onCreateShift}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create First Shift
            </button>
          </div>
        ) : (
          <>
            {renderSection('Active Shifts', activeShifts, 'No active shifts')}
            {renderSection('Draft Shifts', draftShifts)}
            {renderSection('Completed Shifts', completedShifts.slice(0, 5))}
            {completedShifts.length > 5 && (
              <p className="text-sm text-gray-500 text-center mb-4">
                + {completedShifts.length - 5} more completed shifts
              </p>
            )}
            {renderSection('Cancelled Shifts', cancelledShifts.slice(0, 3))}
          </>
        )}
      </div>
    </div>
  );
}
