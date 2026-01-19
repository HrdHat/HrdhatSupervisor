import { useState, useMemo } from 'react';
import type { ShiftTask, ShiftNote, CustomCategory } from '@/types/supervisor';
import { SHIFT_CATEGORY_PRESETS, getCategoryInfo, getAllCategories } from '@/types/supervisor';

interface ShiftTasksNotesPanelProps {
  // Current state (can be from a shift or local state during creation)
  tasks: ShiftTask[];
  notes: ShiftNote[];
  customCategories: CustomCategory[];
  // Handlers for updates
  onAddTask: (task: Omit<ShiftTask, 'id' | 'created_at'>) => void;
  onToggleTask: (taskId: string) => void;
  onRemoveTask: (taskId: string) => void;
  onAddNote: (note: Omit<ShiftNote, 'id' | 'created_at'>) => void;
  onUpdateNote: (noteId: string, content: string) => void;
  onRemoveNote: (noteId: string) => void;
  onAddCustomCategory: (category: Omit<CustomCategory, 'id'>) => void;
  onRemoveCustomCategory: (categoryId: string) => void;
  // Optional: read-only mode for completed shifts
  readOnly?: boolean;
  // Optional: compact mode for inline use
  compact?: boolean;
}

export function ShiftTasksNotesPanel({
  tasks,
  notes,
  customCategories,
  onAddTask,
  onToggleTask,
  onRemoveTask,
  onAddNote,
  onUpdateNote,
  onRemoveNote,
  onAddCustomCategory,
  onRemoveCustomCategory,
  readOnly = false,
  compact = false,
}: ShiftTasksNotesPanelProps) {
  const [activeCategory, setActiveCategory] = useState<string>('safety');
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#EDE9FE');

  // Get all available categories
  const allCategories = useMemo(
    () => getAllCategories(customCategories),
    [customCategories]
  );

  // Filter tasks and notes by active category
  const categoryTasks = useMemo(
    () => tasks.filter((t) => t.category === activeCategory),
    [tasks, activeCategory]
  );

  const categoryNotes = useMemo(
    () => notes.filter((n) => n.category === activeCategory),
    [notes, activeCategory]
  );

  // Get task completion stats per category
  const completionStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number }> = {};
    for (const task of tasks) {
      if (!stats[task.category]) {
        stats[task.category] = { total: 0, completed: 0 };
      }
      stats[task.category].total++;
      if (task.checked) {
        stats[task.category].completed++;
      }
    }
    return stats;
  }, [tasks]);

  // Handle add task
  const handleAddTask = () => {
    if (!newTaskContent.trim()) return;
    onAddTask({
      category: activeCategory,
      content: newTaskContent.trim(),
      checked: false,
    });
    setNewTaskContent('');
    setShowAddTask(false);
  };

  // Handle add note
  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;
    onAddNote({
      category: activeCategory,
      content: newNoteContent.trim(),
    });
    setNewNoteContent('');
    setShowAddNote(false);
  };

  // Handle add category
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    onAddCustomCategory({
      name: newCategoryName.trim(),
      color: newCategoryColor,
    });
    setNewCategoryName('');
    setNewCategoryColor('#EDE9FE');
    setShowAddCategory(false);
  };

  // Check if category is custom
  const isCustomCategory = (categoryId: string) => {
    return !SHIFT_CATEGORY_PRESETS.some((p) => p.id === categoryId);
  };

  const activeCategoryInfo = getCategoryInfo(activeCategory, customCategories);

  return (
    <div className={`${compact ? 'space-y-3' : 'space-y-4'}`}>
      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {allCategories.map((category) => {
          const stats = completionStats[category.id];
          const hasItems = stats?.total > 0 || notes.some((n) => n.category === category.id);
          
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeCategory === category.id
                  ? 'ring-2 ring-offset-1 ring-blue-500'
                  : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: category.color,
                color: category.textColor,
              }}
            >
              <span>{category.name}</span>
              {stats && stats.total > 0 && (
                <span className="text-xs opacity-75">
                  {stats.completed}/{stats.total}
                </span>
              )}
              {!stats?.total && hasItems && (
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
              )}
            </button>
          );
        })}
        
        {/* Add Category Button */}
        {!readOnly && (
          <button
            onClick={() => setShowAddCategory(true)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
          >
            + Category
          </button>
        )}
      </div>

      {/* Add Category Form */}
      {showAddCategory && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              autoFocus
            />
            <input
              type="color"
              value={newCategoryColor}
              onChange={(e) => setNewCategoryColor(e.target.value)}
              className="w-10 h-8 rounded cursor-pointer"
              title="Choose color"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddCategory}
              disabled={!newCategoryName.trim()}
              className="px-3 py-1 bg-purple-600 text-white rounded text-sm font-medium disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddCategory(false);
                setNewCategoryName('');
              }}
              className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active Category Content */}
      <div
        className="rounded-lg p-4 min-h-[120px]"
        style={{
          backgroundColor: activeCategoryInfo.color + '40', // 40 = 25% opacity
          borderColor: activeCategoryInfo.color,
          borderWidth: '1px',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3
            className="font-semibold text-sm"
            style={{ color: activeCategoryInfo.textColor }}
          >
            {activeCategoryInfo.name}
          </h3>
          {isCustomCategory(activeCategory) && !readOnly && (
            <button
              onClick={() => onRemoveCustomCategory(activeCategory)}
              className="text-xs text-red-500 hover:text-red-600"
            >
              Delete Category
            </button>
          )}
        </div>

        {/* Tasks Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              Tasks
            </span>
            {!readOnly && !showAddTask && (
              <button
                onClick={() => setShowAddTask(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Task
              </button>
            )}
          </div>

          {/* Task List */}
          {categoryTasks.length === 0 && !showAddTask ? (
            <p className="text-sm text-gray-500 italic">No tasks yet</p>
          ) : (
            <div className="space-y-1">
              {categoryTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-2 group"
                >
                  <input
                    type="checkbox"
                    checked={task.checked}
                    onChange={() => !readOnly && onToggleTask(task.id)}
                    disabled={readOnly}
                    className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span
                    className={`flex-1 text-sm ${
                      task.checked ? 'line-through text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    {task.content}
                  </span>
                  {!readOnly && (
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
              ))}
            </div>
          )}

          {/* Add Task Form */}
          {showAddTask && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newTaskContent}
                onChange={(e) => setNewTaskContent(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Enter task..."
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                autoFocus
              />
              <button
                onClick={handleAddTask}
                disabled={!newTaskContent.trim()}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddTask(false);
                  setNewTaskContent('');
                }}
                className="px-3 py-1.5 text-gray-600 hover:text-gray-800 text-sm"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
              Notes
            </span>
            {!readOnly && !showAddNote && (
              <button
                onClick={() => setShowAddNote(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add Note
              </button>
            )}
          </div>

          {/* Note List */}
          {categoryNotes.length === 0 && !showAddNote ? (
            <p className="text-sm text-gray-500 italic">No notes yet</p>
          ) : (
            <div className="space-y-2">
              {categoryNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white rounded p-2 border border-gray-200 group"
                >
                  {readOnly ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
                  ) : (
                    <div className="flex items-start gap-2">
                      <textarea
                        value={note.content}
                        onChange={(e) => onUpdateNote(note.id, e.target.value)}
                        className="flex-1 text-sm text-gray-700 bg-transparent border-0 p-0 resize-none focus:ring-0"
                        rows={2}
                      />
                      <button
                        onClick={() => onRemoveNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Note Form */}
          {showAddNote && (
            <div className="mt-2">
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Enter note..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleAddNote}
                  disabled={!newNoteContent.trim()}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Add Note
                </button>
                <button
                  onClick={() => {
                    setShowAddNote(false);
                    setNewNoteContent('');
                  }}
                  className="px-3 py-1.5 text-gray-600 hover:text-gray-800 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      {!compact && tasks.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>
            Total: {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </span>
          <span>
            Completed: {tasks.filter((t) => t.checked).length}
          </span>
          {notes.length > 0 && (
            <span>
              Notes: {notes.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
