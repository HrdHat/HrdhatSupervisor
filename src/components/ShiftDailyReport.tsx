import { useState, useRef } from 'react';
import type { ShiftTask, ShiftNote, CustomCategory, ReceivedDocument } from '@/types/supervisor';
import { getCategoryInfo, SHIFT_CATEGORY_PRESETS } from '@/types/supervisor';

// ============================================================================
// Types
// ============================================================================

interface ShiftData {
  name: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  notes: string | null; // Safety briefing for workers
  shift_tasks: ShiftTask[];
  shift_notes: ShiftNote[];
  custom_categories: CustomCategory[];
  created_at?: string;
  project_name?: string;
}

interface WorkerPreview {
  id: string;
  name: string;
  company?: string | null;
  notification_status?: 'pending' | 'sent' | 'delivered' | 'failed';
  form_submitted?: boolean;
}

interface ShiftDailyReportProps {
  shiftData: ShiftData;
  workers?: WorkerPreview[];
  documents?: ReceivedDocument[];
  // Task actions (optional - for editing mode)
  onAddTask?: (task: Omit<ShiftTask, 'id' | 'created_at'>) => void;
  onToggleTask?: (taskId: string) => void;
  onRemoveTask?: (taskId: string) => void;
  // Note actions (optional - for editing mode)
  onAddNote?: (note: Omit<ShiftNote, 'id' | 'created_at'>) => void;
  onUpdateNote?: (noteId: string, content: string) => void;
  onRemoveNote?: (noteId: string) => void;
  // Category actions (optional)
  onAddCustomCategory?: (category: Omit<CustomCategory, 'id'>) => void;
  onRemoveCustomCategory?: (categoryId: string) => void;
  // Display options
  readOnly?: boolean;
  showQuickAdd?: boolean;
  compact?: boolean; // For modal use
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// ============================================================================
// Section Header Component
// ============================================================================

function SectionHeader({ title, count, onAdd }: { title: string; count?: number; onAdd?: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-3">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {title}
        {count !== undefined && <span className="ml-2 text-gray-400">({count})</span>}
      </h3>
      {onAdd && (
        <button
          onClick={onAdd}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ShiftDailyReport({
  shiftData,
  workers = [],
  documents = [],
  onAddTask,
  onToggleTask,
  onRemoveTask,
  onAddNote,
  onUpdateNote,
  onRemoveNote,
  onAddCustomCategory: _onAddCustomCategory,
  onRemoveCustomCategory: _onRemoveCustomCategory,
  readOnly = false,
  showQuickAdd = false,
  compact = false,
}: ShiftDailyReportProps) {
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('general');
  const [quickNoteContent, setQuickNoteContent] = useState('');
  const [quickNoteCategory, setQuickNoteCategory] = useState('general');
  const notesEndRef = useRef<HTMLDivElement>(null);

  // Get all available categories
  const allCategories = [
    ...SHIFT_CATEGORY_PRESETS,
    ...(shiftData.custom_categories || []).map(c => ({
      id: c.id,
      name: c.name,
      type: 'custom' as const,
      color: c.color,
      textColor: '#6D28D9',
    })),
  ];

  // Handle add task
  const handleAddTask = () => {
    if (!newTaskContent.trim() || !onAddTask) return;
    onAddTask({
      category: newTaskCategory,
      content: newTaskContent.trim(),
      checked: false,
    });
    setNewTaskContent('');
    setShowAddTask(false);
  };

  // Handle quick add note
  const handleQuickAddNote = () => {
    if (!quickNoteContent.trim() || !onAddNote) return;
    onAddNote({
      category: quickNoteCategory,
      content: quickNoteContent.trim(),
    });
    setQuickNoteContent('');
    // Scroll to show new note
    setTimeout(() => {
      notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Status badge config
  const statusConfig = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Draft' },
    active: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Active' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
  };

  const status = statusConfig[shiftData.status] || statusConfig.draft;

  return (
    <div className={`bg-white ${compact ? '' : 'border border-gray-200 rounded-lg shadow-sm'}`}>
      {/* ================================================================
          REPORT HEADER
          ================================================================ */}
      <div className={`${compact ? 'pb-4 border-b border-gray-200' : 'p-6 border-b border-gray-200'}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Daily Shift Report
            </p>
            <h1 className="text-2xl font-bold text-gray-900">{shiftData.name}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {formatDate(shiftData.scheduled_date)}
              {(shiftData.start_time || shiftData.end_time) && (
                <span className="ml-2">
                  {formatTime(shiftData.start_time) || '?'} - {formatTime(shiftData.end_time) || '?'}
                </span>
              )}
            </p>
          </div>
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${status.bg} ${status.text}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* ================================================================
          SHIFT DETAILS
          ================================================================ */}
      {(shiftData.project_name || shiftData.created_at) && (
        <div className={`${compact ? 'py-4 border-b border-gray-200' : 'px-6 py-4 border-b border-gray-200 bg-gray-50'}`}>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {shiftData.project_name && (
              <div>
                <span className="text-gray-500">Project:</span>
                <span className="ml-2 text-gray-900 font-medium">{shiftData.project_name}</span>
              </div>
            )}
            {shiftData.created_at && (
              <div>
                <span className="text-gray-500">Created:</span>
                <span className="ml-2 text-gray-900">{formatDateTime(shiftData.created_at)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================
          SAFETY BRIEFING
          ================================================================ */}
      {shiftData.notes && (
        <div className={`${compact ? 'py-4 border-b border-gray-200' : 'px-6 py-4 border-b border-gray-200'}`}>
          <SectionHeader title="Safety Briefing" />
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r">
            <p className="text-sm text-yellow-800 whitespace-pre-wrap">{shiftData.notes}</p>
          </div>
          <p className="text-xs text-gray-400 mt-2 italic">This briefing is sent to workers with notifications</p>
        </div>
      )}

      {/* ================================================================
          TASKS SECTION
          ================================================================ */}
      <div className={`${compact ? 'py-4 border-b border-gray-200' : 'px-6 py-4 border-b border-gray-200'}`}>
        <SectionHeader 
          title="Tasks" 
          count={shiftData.shift_tasks?.length || 0}
          onAdd={!readOnly && onAddTask ? () => setShowAddTask(true) : undefined}
        />
        
        {/* Add Task Form */}
        {showAddTask && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex gap-2 mb-2">
              <select
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm"
              >
                {allCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={newTaskContent}
                onChange={(e) => setNewTaskContent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Enter task..."
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddTask}
                disabled={!newTaskContent.trim()}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium disabled:opacity-50"
              >
                Add Task
              </button>
              <button
                onClick={() => { setShowAddTask(false); setNewTaskContent(''); }}
                className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Task List */}
        {(!shiftData.shift_tasks || shiftData.shift_tasks.length === 0) ? (
          <p className="text-sm text-gray-400 italic">No tasks added</p>
        ) : (
          <div className="space-y-2">
            {shiftData.shift_tasks.map((task) => {
              const catInfo = getCategoryInfo(task.category, shiftData.custom_categories || []);
              return (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-2 rounded-lg group ${
                    task.checked ? 'bg-gray-50' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={task.checked}
                    onChange={() => !readOnly && onToggleTask?.(task.id)}
                    disabled={readOnly}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 text-xs font-medium rounded"
                        style={{ backgroundColor: catInfo.color, color: catInfo.textColor }}
                      >
                        {catInfo.name}
                      </span>
                    </div>
                    <p className={`text-sm mt-1 ${task.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {task.content}
                    </p>
                  </div>
                  {!readOnly && onRemoveTask && (
                    <button
                      onClick={() => onRemoveTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Task Summary */}
        {shiftData.shift_tasks && shiftData.shift_tasks.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
            <span>{shiftData.shift_tasks.filter(t => t.checked).length} of {shiftData.shift_tasks.length} completed</span>
          </div>
        )}
      </div>

      {/* ================================================================
          NOTES SECTION
          ================================================================ */}
      <div className={`${compact ? 'py-4 border-b border-gray-200' : 'px-6 py-4 border-b border-gray-200'}`}>
        <SectionHeader 
          title="Notes" 
          count={shiftData.shift_notes?.length || 0}
        />
        
        {/* Notes List */}
        {(!shiftData.shift_notes || shiftData.shift_notes.length === 0) ? (
          <p className="text-sm text-gray-400 italic mb-4">No notes added</p>
        ) : (
          <div className="space-y-3 mb-4">
            {shiftData.shift_notes.map((note) => {
              const catInfo = getCategoryInfo(note.category, shiftData.custom_categories || []);
              return (
                <div
                  key={note.id}
                  className="p-3 bg-gray-50 rounded-lg group"
                  style={{ borderLeft: `4px solid ${catInfo.color}` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="px-2 py-0.5 text-xs font-medium rounded"
                          style={{ backgroundColor: catInfo.color, color: catInfo.textColor }}
                        >
                          {catInfo.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatRelativeTime(note.created_at)}
                        </span>
                      </div>
                      {readOnly ? (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                      ) : (
                        <textarea
                          value={note.content}
                          onChange={(e) => onUpdateNote?.(note.id, e.target.value)}
                          className="w-full text-sm text-gray-700 bg-transparent border-0 p-0 resize-none focus:ring-0"
                          rows={2}
                        />
                      )}
                    </div>
                    {!readOnly && onRemoveNote && (
                      <button
                        onClick={() => onRemoveNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={notesEndRef} />
          </div>
        )}
        
        {/* Quick Add Note Form */}
        {showQuickAdd && !readOnly && onAddNote && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-xs font-medium text-purple-700 mb-2">Quick Add Note</p>
            <div className="flex gap-2">
              <select
                value={quickNoteCategory}
                onChange={(e) => setQuickNoteCategory(e.target.value)}
                className="px-2 py-1.5 border border-gray-300 rounded text-sm"
              >
                {allCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <input
                type="text"
                value={quickNoteContent}
                onChange={(e) => setQuickNoteContent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickAddNote()}
                placeholder="Add a note..."
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
              />
              <button
                onClick={handleQuickAddNote}
                disabled={!quickNoteContent.trim()}
                className="px-4 py-1.5 bg-purple-600 text-white rounded text-sm font-medium disabled:opacity-50 hover:bg-purple-700"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================
          CREW / WORKERS SECTION
          ================================================================ */}
      {workers.length > 0 && (
        <div className={`${compact ? 'py-4 border-b border-gray-200' : 'px-6 py-4 border-b border-gray-200'}`}>
          <SectionHeader title="Crew" count={workers.length} />
          <div className="space-y-2">
            {workers.map((worker) => (
              <div
                key={worker.id}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  worker.form_submitted ? 'bg-green-50' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Status indicator */}
                  {worker.form_submitted !== undefined && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      worker.form_submitted ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {worker.form_submitted ? '✓' : '○'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{worker.name}</p>
                    {worker.company && (
                      <p className="text-xs text-gray-500">{worker.company}</p>
                    )}
                  </div>
                </div>
                {worker.notification_status && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    worker.notification_status === 'sent' || worker.notification_status === 'delivered'
                      ? 'bg-yellow-100 text-yellow-700'
                      : worker.notification_status === 'failed'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {worker.notification_status === 'sent' || worker.notification_status === 'delivered'
                      ? 'Notified'
                      : worker.notification_status === 'failed'
                      ? 'Failed'
                      : 'Pending'}
                  </span>
                )}
              </div>
            ))}
          </div>
          
          {/* Worker Summary */}
          {workers.some(w => w.form_submitted !== undefined) && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
              <span>{workers.filter(w => w.form_submitted).length} of {workers.length} forms submitted</span>
            </div>
          )}
        </div>
      )}

      {/* ================================================================
          RECEIVED FORMS SECTION
          ================================================================ */}
      {documents.length > 0 && (
        <div className={`${compact ? 'py-4' : 'px-6 py-4'}`}>
          <SectionHeader title="Received Forms" count={documents.length} />
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.original_filename}</p>
                  <p className="text-xs text-gray-500">
                    {doc.source_email} • {formatRelativeTime(doc.received_at)}
                  </p>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                  doc.status === 'filed' ? 'bg-green-100 text-green-700' :
                  doc.status === 'needs_review' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {doc.ai_classification ?? doc.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for workers/docs in read-only create mode */}
      {workers.length === 0 && readOnly && (
        <div className={`${compact ? 'py-4' : 'px-6 py-4'}`}>
          <SectionHeader title="Crew" count={0} />
          <p className="text-sm text-gray-400 italic">No workers assigned yet</p>
        </div>
      )}
    </div>
  );
}
