import { useEffect, useState } from 'react';
import { useSupervisorStore } from '@/stores/supervisorStore';
import type { ProjectShiftWithStats } from '@/types/supervisor';
import { ShiftDailyReport } from './ShiftDailyReport';

interface ShiftDetailProps {
  shift: ProjectShiftWithStats;
  onClose: () => void;
  onOpenCloseout: () => void;
  onDeleteShift?: (shiftId: string) => void;
}

export function ShiftDetail({ shift, onClose, onOpenCloseout, onDeleteShift }: ShiftDetailProps) {
  const [isSendingNotifications, setIsSendingNotifications] = useState(false);
  const [notificationResult, setNotificationResult] = useState<{ show: boolean; success: boolean; message: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Store selectors
  const shiftWorkers = useSupervisorStore((s) => s.shiftWorkers);
  const fetchShiftWorkers = useSupervisorStore((s) => s.fetchShiftWorkers);
  const sendShiftNotifications = useSupervisorStore((s) => s.sendShiftNotifications);
  const getDocumentsByShift = useSupervisorStore((s) => s.getDocumentsByShift);
  const currentProject = useSupervisorStore((s) => s.currentProject);
  
  // Task/Note actions
  const addShiftTask = useSupervisorStore((s) => s.addShiftTask);
  const toggleShiftTask = useSupervisorStore((s) => s.toggleShiftTask);
  const removeShiftTask = useSupervisorStore((s) => s.removeShiftTask);
  const addShiftNote = useSupervisorStore((s) => s.addShiftNote);
  const updateShiftNote = useSupervisorStore((s) => s.updateShiftNote);
  const removeShiftNote = useSupervisorStore((s) => s.removeShiftNote);
  const addCustomCategory = useSupervisorStore((s) => s.addCustomCategory);
  const removeCustomCategory = useSupervisorStore((s) => s.removeCustomCategory);

  // Fetch workers on mount
  useEffect(() => {
    fetchShiftWorkers(shift.id);
  }, [shift.id, fetchShiftWorkers]);

  // Get documents linked to this shift
  const shiftDocuments = getDocumentsByShift(shift.id);

  // Calculate stats
  const pendingNotifications = shiftWorkers.filter(w => w.notification_status === 'pending').length;
  const isReadOnly = shift.status === 'completed' || shift.status === 'cancelled';

  // Handle send notifications
  const handleSendNotifications = async () => {
    setIsSendingNotifications(true);
    setNotificationResult(null);

    try {
      const result = await sendShiftNotifications(shift.id);
      setNotificationResult({
        show: true,
        success: result.success,
        message: result.message,
      });
    } catch (error) {
      setNotificationResult({
        show: true,
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send notifications',
      });
    } finally {
      setIsSendingNotifications(false);
    }
  };

  // Handle delete shift (only for draft shifts)
  const handleDeleteShift = async () => {
    if (!onDeleteShift) return;
    
    if (window.confirm('Are you sure you want to delete this draft shift? This action cannot be undone.')) {
      setIsDeleting(true);
      try {
        await onDeleteShift(shift.id);
        onClose(); // Close detail view after deletion
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Prepare workers for the report
  const workersForReport = shiftWorkers.map((w) => ({
    id: w.id,
    name: w.name,
    company: w.subcontractor_name,
    notification_status: w.notification_status,
    form_submitted: w.form_submitted,
  }));

  return (
    <div className="h-full flex flex-col">
      {/* Header with back button */}
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <button
          onClick={onClose}
          className="p-1 -ml-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm text-gray-500">Back to shifts</span>
      </div>

      {/* Notification Result Banner */}
      {notificationResult?.show && (
        <div className={`p-3 mb-4 rounded-lg flex items-center justify-between flex-shrink-0 ${
          notificationResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-sm ${notificationResult.success ? 'text-green-700' : 'text-red-700'}`}>
            {notificationResult.success ? '✓' : '✗'} {notificationResult.message}
          </p>
          <button
            onClick={() => setNotificationResult(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Daily Report - Scrollable */}
      <div className="flex-1 overflow-y-auto -mx-4 px-4">
        <ShiftDailyReport
          shiftData={{
            name: shift.name,
            scheduled_date: shift.scheduled_date,
            start_time: shift.start_time,
            end_time: shift.end_time,
            status: shift.status,
            notes: shift.notes,
            shift_tasks: shift.shift_tasks ?? [],
            shift_notes: shift.shift_notes ?? [],
            custom_categories: shift.custom_categories ?? [],
            created_at: shift.created_at,
            project_name: currentProject?.name,
          }}
          workers={workersForReport}
          documents={shiftDocuments}
          onAddTask={!isReadOnly ? (task) => addShiftTask(shift.id, task) : undefined}
          onToggleTask={!isReadOnly ? (taskId) => toggleShiftTask(shift.id, taskId) : undefined}
          onRemoveTask={!isReadOnly ? (taskId) => removeShiftTask(shift.id, taskId) : undefined}
          onAddNote={!isReadOnly ? (note) => addShiftNote(shift.id, note) : undefined}
          onUpdateNote={!isReadOnly ? (noteId, content) => updateShiftNote(shift.id, noteId, content) : undefined}
          onRemoveNote={!isReadOnly ? (noteId) => removeShiftNote(shift.id, noteId) : undefined}
          onAddCustomCategory={!isReadOnly ? (category) => addCustomCategory(shift.id, category) : undefined}
          onRemoveCustomCategory={!isReadOnly ? (categoryId) => removeCustomCategory(shift.id, categoryId) : undefined}
          readOnly={isReadOnly}
          showQuickAdd={!isReadOnly}
        />
      </div>

      {/* Action Buttons - Fixed Footer */}
      {(shift.status === 'draft' || shift.status === 'active') && (
        <div className="flex gap-2 pt-4 border-t border-gray-200 mt-4 flex-shrink-0">
          {/* Delete button - only for draft shifts */}
          {shift.status === 'draft' && onDeleteShift && (
            <button
              onClick={handleDeleteShift}
              disabled={isDeleting}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 font-medium"
              title="Delete draft shift"
            >
              {isDeleting ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          )}

          {shift.status === 'draft' && pendingNotifications > 0 && (
            <button
              onClick={handleSendNotifications}
              disabled={isSendingNotifications}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
            >
              {isSendingNotifications ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Notifications ({pendingNotifications})
                </>
              )}
            </button>
          )}
          
          {shift.status === 'active' && pendingNotifications > 0 && (
            <button
              onClick={handleSendNotifications}
              disabled={isSendingNotifications}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 font-medium"
            >
              {isSendingNotifications ? 'Sending...' : `Send Reminders (${pendingNotifications})`}
            </button>
          )}

          {shift.status === 'active' && (
            <button
              onClick={onOpenCloseout}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Close Out Shift
            </button>
          )}
        </div>
      )}
    </div>
  );
}
