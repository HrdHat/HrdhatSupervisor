import { useState, useMemo } from 'react';
import { useSupervisorStore } from '@/stores/supervisorStore';
import type { ProjectShiftWithStats, ShiftWorker, CloseoutChecklistItem } from '@/types/supervisor';

interface ShiftCloseoutProps {
  shift: ProjectShiftWithStats;
  workers: ShiftWorker[];
  onClose: () => void;
  onComplete: () => void;
}

// Default checklist items
const DEFAULT_CHECKLIST: CloseoutChecklistItem[] = [
  { id: 'forms', label: 'All required safety forms collected', checked: false },
  { id: 'equipment', label: 'Equipment returned/secured', checked: false },
  { id: 'site', label: 'Site conditions acceptable for next shift', checked: false },
];

export function ShiftCloseout({ shift, workers, onClose, onComplete }: ShiftCloseoutProps) {
  // Initialize checklist from shift or defaults
  const [checklist, setChecklist] = useState<CloseoutChecklistItem[]>(() => {
    if (shift.closeout_checklist && shift.closeout_checklist.length > 0) {
      return shift.closeout_checklist;
    }
    return DEFAULT_CHECKLIST;
  });
  
  const [closeoutNotes, setCloseoutNotes] = useState(shift.closeout_notes ?? '');
  const [incompleteReason, setIncompleteReason] = useState('');
  const [showConfirmIncomplete, setShowConfirmIncomplete] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Store actions
  const closeoutShift = useSupervisorStore((s) => s.closeoutShift);
  const sendShiftNotifications = useSupervisorStore((s) => s.sendShiftNotifications);

  // Calculate submission stats
  const workersWithForms = workers.filter(w => w.form_submitted);
  const workersWithoutForms = workers.filter(w => !w.form_submitted);
  const totalWorkers = workers.length;
  const submittedCount = workersWithForms.length;
  const missingCount = workersWithoutForms.length;
  const progressPercent = totalWorkers > 0 ? Math.round((submittedCount / totalWorkers) * 100) : 100;

  // Check if all checklist items are checked
  const allChecklistComplete = useMemo(() => 
    checklist.every(item => item.checked),
    [checklist]
  );

  // Toggle checklist item
  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(item =>
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  // Send reminders to workers without forms
  const [isSendingReminders, setIsSendingReminders] = useState(false);
  const handleSendReminders = async () => {
    setIsSendingReminders(true);
    try {
      // Reset notification status for workers without forms so they get re-notified
      // This is handled by the edge function which only sends to 'pending' status workers
      // For now we'll just call the notification function
      await sendShiftNotifications(shift.id);
    } catch (error) {
      console.error('Failed to send reminders:', error);
    } finally {
      setIsSendingReminders(false);
    }
  };

  // Complete shift (with all forms)
  const handleComplete = async () => {
    setIsSaving(true);
    try {
      await closeoutShift({
        shift_id: shift.id,
        closeout_checklist: checklist,
        closeout_notes: closeoutNotes || undefined,
      });
      onComplete();
    } catch (error) {
      console.error('Failed to close out shift:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Complete shift (incomplete - with missing forms)
  const handleCompleteIncomplete = async () => {
    if (!incompleteReason.trim()) {
      return;
    }
    
    setIsSaving(true);
    try {
      await closeoutShift({
        shift_id: shift.id,
        closeout_checklist: checklist,
        closeout_notes: closeoutNotes || undefined,
        incomplete_reason: incompleteReason,
      });
      onComplete();
    } catch (error) {
      console.error('Failed to close out shift:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Shift Closeout</h2>
                <p className="text-sm text-gray-600">{shift.name}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
            {/* Form Status Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Form Status</span>
                <span className={`text-sm font-semibold ${
                  progressPercent === 100 ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {submittedCount} of {totalWorkers} submitted
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    progressPercent === 100 ? 'bg-green-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {progressPercent === 100 ? (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  All workers have submitted their forms!
                </p>
              ) : (
                <p className="text-sm text-yellow-600 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {missingCount} worker{missingCount !== 1 ? 's' : ''} missing forms
                </p>
              )}
            </div>

            {/* Missing Forms Section */}
            {missingCount > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">Missing Forms</h3>
                  <button
                    onClick={handleSendReminders}
                    disabled={isSendingReminders}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    {isSendingReminders ? 'Sending...' : '📤 Send All Reminders'}
                  </button>
                </div>
                <div className="border border-yellow-200 rounded-lg bg-yellow-50 overflow-hidden">
                  <div className="divide-y divide-yellow-200">
                    {workersWithoutForms.map(worker => (
                      <div key={worker.id} className="px-3 py-2 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{worker.name}</p>
                          {worker.subcontractor_name && (
                            <p className="text-xs text-gray-500">{worker.subcontractor_name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {worker.phone && (
                            <span className="text-xs text-gray-400">📱</span>
                          )}
                          {worker.email && (
                            <span className="text-xs text-gray-400">📧</span>
                          )}
                          {!worker.phone && !worker.email && (
                            <span className="text-xs text-red-500">⚠️ No contact</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Closeout Checklist */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Closeout Checklist</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {checklist.map(item => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleChecklistItem(item.id)}
                        className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500"
                      />
                      <span className={`text-sm ${item.checked ? 'text-gray-900' : 'text-gray-600'}`}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Closeout Notes */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Closeout Notes <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                value={closeoutNotes}
                onChange={(e) => setCloseoutNotes(e.target.value)}
                placeholder="Any notes or observations from this shift..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              />
            </div>

            {/* Incomplete Reason Modal */}
            {showConfirmIncomplete && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-red-800 mb-2">
                  Complete Without All Forms?
                </h4>
                <p className="text-sm text-red-700 mb-3">
                  {missingCount} worker{missingCount !== 1 ? 's are' : ' is'} missing forms. 
                  Please provide a reason for completing the shift without all forms.
                </p>
                <textarea
                  value={incompleteReason}
                  onChange={(e) => setIncompleteReason(e.target.value)}
                  placeholder="Reason for incomplete forms (required)..."
                  rows={2}
                  className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleCompleteIncomplete}
                    disabled={!incompleteReason.trim() || isSaving}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Complete Anyway'}
                  </button>
                  <button
                    onClick={() => setShowConfirmIncomplete(false)}
                    className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              Cancel
            </button>
            
            <div className="flex gap-2">
              {missingCount > 0 && !showConfirmIncomplete && (
                <button
                  onClick={() => setShowConfirmIncomplete(true)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                >
                  Complete Anyway
                </button>
              )}
              
              <button
                onClick={handleComplete}
                disabled={missingCount > 0 || !allChecklistComplete || isSaving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Completing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Complete Shift
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
