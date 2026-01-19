import type { ProjectShiftWithStats, DailyLogType } from '@/types/supervisor';
import { QuickAddBar } from './QuickAddBar';
import { ShiftList } from './ShiftList';
import { ShiftDetail } from './ShiftDetail';
import { DailyLogPanel } from './DailyLogPanel';

interface LoggingSectionProps {
  projectId: string;
  shifts: ProjectShiftWithStats[];
  selectedShift: ProjectShiftWithStats | null;
  onSelectShift: (shift: ProjectShiftWithStats) => void;
  onDeselectShift: () => void;
  onCreateShift: () => void;
  onDeleteShift?: (shiftId: string) => void;
  onOpenShiftCloseout: () => void;
  onOpenSiteIssues: () => void;
  onOpenPDR: () => void;
  openSiteIssuesCount: number;
}

export function LoggingSection({
  projectId,
  shifts,
  selectedShift,
  onSelectShift,
  onDeselectShift,
  onCreateShift,
  onDeleteShift,
  onOpenShiftCloseout,
  onOpenSiteIssues,
  onOpenPDR,
  openSiteIssuesCount,
}: LoggingSectionProps) {
  const handleAddLog = (_type: DailyLogType) => {
    // TODO: Implement log form modal
  };

  return (
    <div className="space-y-4">
      {/* Quick Add Bar - All entry types with equal weight */}
      <QuickAddBar 
        onAddShift={onCreateShift} 
        onAddLog={handleAddLog}
      />

      {/* Header with action buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">Today's Activity</h2>
          {openSiteIssuesCount > 0 && (
            <button
              onClick={onOpenSiteIssues}
              className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors flex items-center gap-1"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {openSiteIssuesCount} Open Issue{openSiteIssuesCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSiteIssues}
            className="px-3 py-1.5 text-xs border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            All Issues
          </button>
          <button
            onClick={onOpenPDR}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Daily Report
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
          {/* Left Column: Shifts */}
          <div className="p-4 min-h-[400px]">
            {selectedShift ? (
              <ShiftDetail
                shift={selectedShift}
                onClose={onDeselectShift}
                onOpenCloseout={onOpenShiftCloseout}
                onDeleteShift={onDeleteShift}
              />
            ) : (
              <ShiftList
                shifts={shifts}
                selectedShiftId={undefined}
                onSelectShift={onSelectShift}
                onCreateShift={onCreateShift}
                onDeleteShift={onDeleteShift}
              />
            )}
          </div>

          {/* Right Column: Daily Log */}
          <div className="p-4 min-h-[400px]">
            <DailyLogPanel
              projectId={projectId}
              onOpenSiteIssues={onOpenSiteIssues}
              compact
            />
          </div>
        </div>
      </div>
    </div>
  );
}
