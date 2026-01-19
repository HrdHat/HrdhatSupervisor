import { useState, useMemo } from 'react';
import { useSupervisorStore } from '@/stores/supervisorStore';
import type { ProjectWorker, AddShiftWorkerInput, SupervisorContact, ShiftTask, ShiftNote, CustomCategory } from '@/types/supervisor';
import { ShiftTasksNotesPanel } from './ShiftTasksNotesPanel';
import { ShiftDailyReport } from './ShiftDailyReport';

interface CreateShiftModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onShiftCreated: (shiftId: string) => void;
}

interface AdHocWorker {
  id: string; // temp ID for UI
  name: string;
  phone: string;
  email: string;
  subcontractorId: string;
  notificationMethod: 'sms' | 'email' | 'both';
}

// Generate a suggested shift name based on date
function generateShiftName(date: string): string {
  const d = new Date(date + 'T00:00:00');
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const day = d.getDate();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
  return `${weekday} ${month} ${day}`;
}

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

export function CreateShiftModal({ projectId, isOpen, onClose, onShiftCreated }: CreateShiftModalProps) {
  // Store selectors
  const workers = useSupervisorStore((s) => s.workers);
  const subcontractors = useSupervisorStore((s) => s.subcontractors);
  const contacts = useSupervisorStore((s) => s.contacts);
  const createShift = useSupervisorStore((s) => s.createShift);
  const addExistingWorkersToShift = useSupervisorStore((s) => s.addExistingWorkersToShift);
  const addShiftWorker = useSupervisorStore((s) => s.addShiftWorker);
  const loading = useSupervisorStore((s) => s.loading);

  // Form state
  const [step, setStep] = useState<'details' | 'tasks' | 'workers' | 'review'>('details');
  const [shiftName, setShiftName] = useState(generateShiftName(getTodayDate()));
  const [scheduledDate, setScheduledDate] = useState(getTodayDate());
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');

  // Tasks & Notes state (supervisor-only planning)
  const [shiftTasks, setShiftTasks] = useState<ShiftTask[]>([]);
  const [shiftNotes, setShiftNotes] = useState<ShiftNote[]>([]);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);

  // Worker selection state
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set());
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [adHocWorkers, setAdHocWorkers] = useState<AdHocWorker[]>([]);
  const [showAddAdHoc, setShowAddAdHoc] = useState(false);

  // Ad-hoc worker form state
  const [adHocName, setAdHocName] = useState('');
  const [adHocPhone, setAdHocPhone] = useState('');
  const [adHocEmail, setAdHocEmail] = useState('');
  const [adHocSubcontractor, setAdHocSubcontractor] = useState('');
  const [adHocNotificationMethod, setAdHocNotificationMethod] = useState<'sms' | 'email' | 'both'>('sms');

  // Filter active workers only
  const activeWorkers = useMemo(() => 
    workers.filter(w => w.status === 'active'),
    [workers]
  );

  // Group workers by subcontractor
  const workersBySubcontractor = useMemo(() => {
    const groups: Record<string, ProjectWorker[]> = { 'Direct Hire': [] };
    
    subcontractors.forEach(sub => {
      groups[sub.company_name] = [];
    });

    activeWorkers.forEach(worker => {
      const groupName = worker.subcontractor_name ?? 'Direct Hire';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(worker);
    });

    return groups;
  }, [activeWorkers, subcontractors]);

  // Group contacts by company name
  const contactsByCompany = useMemo(() => {
    const groups: Record<string, SupervisorContact[]> = { 'No Company': [] };
    
    contacts.forEach(contact => {
      const groupName = contact.company_name ?? 'No Company';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(contact);
    });

    return groups;
  }, [contacts]);

  // Handle date change and auto-update name if user hasn't customized it
  const handleDateChange = (newDate: string) => {
    const currentSuggestedName = generateShiftName(scheduledDate);
    if (shiftName === currentSuggestedName) {
      setShiftName(generateShiftName(newDate));
    }
    setScheduledDate(newDate);
  };

  // Toggle worker selection
  const toggleWorker = (workerId: string) => {
    setSelectedWorkerIds(prev => {
      const next = new Set(prev);
      if (next.has(workerId)) {
        next.delete(workerId);
      } else {
        next.add(workerId);
      }
      return next;
    });
  };

  // Select all workers in a subcontractor group
  const selectAllInGroup = (groupName: string) => {
    const groupWorkers = workersBySubcontractor[groupName] ?? [];
    setSelectedWorkerIds(prev => {
      const next = new Set(prev);
      groupWorkers.forEach(w => next.add(w.id));
      return next;
    });
  };

  // Toggle contact selection
  const toggleContact = (contactId: string) => {
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      if (next.has(contactId)) next.delete(contactId);
      else next.add(contactId);
      return next;
    });
  };

  // Select all contacts in a company group
  const selectAllContactsInGroup = (groupName: string) => {
    const groupContacts = contactsByCompany[groupName] ?? [];
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      groupContacts.forEach(c => next.add(c.id));
      return next;
    });
  };

  // Add ad-hoc worker
  const handleAddAdHoc = () => {
    if (!adHocName.trim()) return;
    if (!adHocPhone.trim() && !adHocEmail.trim()) return;

    const newWorker: AdHocWorker = {
      id: crypto.randomUUID(),
      name: adHocName.trim(),
      phone: adHocPhone.trim(),
      email: adHocEmail.trim(),
      subcontractorId: adHocSubcontractor,
      notificationMethod: adHocNotificationMethod,
    };

    setAdHocWorkers(prev => [...prev, newWorker]);
    
    // Reset form
    setAdHocName('');
    setAdHocPhone('');
    setAdHocEmail('');
    setAdHocSubcontractor('');
    setAdHocNotificationMethod('sms');
    setShowAddAdHoc(false);
  };

  // Remove ad-hoc worker
  const removeAdHocWorker = (id: string) => {
    setAdHocWorkers(prev => prev.filter(w => w.id !== id));
  };

  // Get total worker count
  const totalWorkerCount = selectedWorkerIds.size + selectedContactIds.size + adHocWorkers.length;

  // Task handlers
  const handleAddTask = (task: Omit<ShiftTask, 'id' | 'created_at'>) => {
    const newTask: ShiftTask = {
      id: crypto.randomUUID(),
      category: task.category,
      content: task.content,
      checked: task.checked,
      created_at: new Date().toISOString(),
    };
    setShiftTasks(prev => [...prev, newTask]);
  };

  const handleToggleTask = (taskId: string) => {
    setShiftTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, checked: !t.checked } : t
    ));
  };

  const handleRemoveTask = (taskId: string) => {
    setShiftTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // Note handlers
  const handleAddNote = (note: Omit<ShiftNote, 'id' | 'created_at'>) => {
    const newNote: ShiftNote = {
      id: crypto.randomUUID(),
      category: note.category,
      content: note.content,
      created_at: new Date().toISOString(),
    };
    setShiftNotes(prev => [...prev, newNote]);
  };

  const handleUpdateNote = (noteId: string, content: string) => {
    setShiftNotes(prev => prev.map(n =>
      n.id === noteId ? { ...n, content } : n
    ));
  };

  const handleRemoveNote = (noteId: string) => {
    setShiftNotes(prev => prev.filter(n => n.id !== noteId));
  };

  // Category handlers
  const handleAddCustomCategory = (category: Omit<CustomCategory, 'id'>) => {
    const newCategory: CustomCategory = {
      id: crypto.randomUUID(),
      name: category.name,
      color: category.color,
    };
    setCustomCategories(prev => [...prev, newCategory]);
  };

  const handleRemoveCustomCategory = (categoryId: string) => {
    setCustomCategories(prev => prev.filter(c => c.id !== categoryId));
    // Also remove tasks and notes in this category
    setShiftTasks(prev => prev.filter(t => t.category !== categoryId));
    setShiftNotes(prev => prev.filter(n => n.category !== categoryId));
  };

  // Handle form submission
  const handleSubmit = async () => {
    // Create the shift with tasks and notes
    const shift = await createShift({
      project_id: projectId,
      name: shiftName,
      scheduled_date: scheduledDate,
      start_time: startTime || undefined,
      end_time: endTime || undefined,
      notes: notes || undefined,
      shift_tasks: shiftTasks,
      shift_notes: shiftNotes,
      custom_categories: customCategories,
    });

    if (!shift) return;

    // Add existing workers
    if (selectedWorkerIds.size > 0) {
      await addExistingWorkersToShift(shift.id, Array.from(selectedWorkerIds));
    }

    // Add ad-hoc workers
    for (const adHoc of adHocWorkers) {
      const workerInput: AddShiftWorkerInput = {
        shift_id: shift.id,
        worker_type: 'adhoc',
        name: adHoc.name,
        phone: adHoc.phone || undefined,
        email: adHoc.email || undefined,
        subcontractor_id: adHoc.subcontractorId || undefined,
        notification_method: adHoc.notificationMethod,
      };
      await addShiftWorker(workerInput);
    }

    // Add selected contacts as ad-hoc workers
    for (const contactId of selectedContactIds) {
      const contact = contacts.find(c => c.id === contactId);
      if (contact) {
        // Find subcontractor ID if contact has a company that matches a project subcontractor
        let subcontractorId: string | undefined;
        if (contact.company_name) {
          const matchingSub = subcontractors.find(
            s => s.company_name.toLowerCase() === contact.company_name?.toLowerCase()
          );
          subcontractorId = matchingSub?.id;
        }
        
        const workerInput: AddShiftWorkerInput = {
          shift_id: shift.id,
          worker_type: 'adhoc',
          name: contact.name,
          phone: contact.phone || undefined,
          email: contact.email || undefined,
          subcontractor_id: subcontractorId,
          notification_method: contact.phone ? 'sms' : 'email',
        };
        await addShiftWorker(workerInput);
      }
    }

    onShiftCreated(shift.id);
    handleClose();
  };

  // Reset and close
  const handleClose = () => {
    setStep('details');
    setShiftName(generateShiftName(getTodayDate()));
    setScheduledDate(getTodayDate());
    setStartTime('');
    setEndTime('');
    setNotes('');
    setShiftTasks([]);
    setShiftNotes([]);
    setCustomCategories([]);
    setSelectedWorkerIds(new Set());
    setSelectedContactIds(new Set());
    setAdHocWorkers([]);
    setShowAddAdHoc(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create New Shift</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {step === 'details' && 'Step 1: Shift details'}
                {step === 'tasks' && 'Step 2: Tasks & Notes'}
                {step === 'workers' && 'Step 3: Add workers'}
                {step === 'review' && 'Step 4: Review & create'}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
            {/* Step 1: Shift Details */}
            {step === 'details' && (
              <div className="space-y-4">
                {/* Shift Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shift Name
                  </label>
                  <input
                    type="text"
                    value={shiftName}
                    onChange={(e) => setShiftName(e.target.value)}
                    placeholder="e.g., Morning Shift, Night Crew"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Time Range (Optional) */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Pre-shift Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pre-Shift Safety Notes <span className="text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter any safety briefing notes, hazards, or reminders to include in notifications..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Tasks & Notes */}
            {step === 'tasks' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    Add tasks and notes for your personal reference during this shift. 
                    These are <strong>not sent to workers</strong> - use the Safety Notes in Step 1 for worker notifications.
                  </p>
                </div>
                
                <ShiftTasksNotesPanel
                  tasks={shiftTasks}
                  notes={shiftNotes}
                  customCategories={customCategories}
                  onAddTask={handleAddTask}
                  onToggleTask={handleToggleTask}
                  onRemoveTask={handleRemoveTask}
                  onAddNote={handleAddNote}
                  onUpdateNote={handleUpdateNote}
                  onRemoveNote={handleRemoveNote}
                  onAddCustomCategory={handleAddCustomCategory}
                  onRemoveCustomCategory={handleRemoveCustomCategory}
                />
              </div>
            )}

            {/* Step 3: Add Workers */}
            {step === 'workers' && (
              <div className="space-y-4">
                {/* Quick Stats */}
                <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-blue-700 font-medium">
                    {totalWorkerCount} worker{totalWorkerCount !== 1 ? 's' : ''} selected
                  </span>
                  {selectedWorkerIds.size > 0 && (
                    <button
                      onClick={() => setSelectedWorkerIds(new Set())}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {/* Existing Workers Section */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Project Workers</h3>
                  
                  {activeWorkers.length === 0 ? (
                    <p className="text-sm text-gray-500 italic py-2">
                      No workers added to this project yet. You can add ad-hoc workers below.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(workersBySubcontractor).map(([groupName, groupWorkers]) => {
                        if (groupWorkers.length === 0) return null;
                        
                        const allSelected = groupWorkers.every(w => selectedWorkerIds.has(w.id));
                        
                        return (
                          <div key={groupName} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                              <span className="font-medium text-gray-700">{groupName}</span>
                              <button
                                onClick={() => allSelected 
                                  ? groupWorkers.forEach(w => toggleWorker(w.id))
                                  : selectAllInGroup(groupName)
                                }
                                className="text-xs text-blue-600 hover:text-blue-700"
                              >
                                {allSelected ? 'Deselect all' : 'Select all'}
                              </button>
                            </div>
                            <div className="divide-y divide-gray-100">
                              {groupWorkers.map(worker => (
                                <label
                                  key={worker.id}
                                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedWorkerIds.has(worker.id)}
                                    onChange={() => toggleWorker(worker.id)}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {worker.user_full_name ?? worker.user_email ?? 'Unknown'}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                      {worker.user_email}
                                    </p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* My Contacts Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">My Contacts</h3>
                    {selectedContactIds.size > 0 && (
                      <button
                        onClick={() => setSelectedContactIds(new Set())}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Clear contacts
                      </button>
                    )}
                  </div>
                  
                  {contacts.length === 0 ? (
                    <p className="text-sm text-gray-500 italic py-2">
                      No saved contacts yet. Add contacts from the Workers tab or discover them from submitted forms.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {Object.entries(contactsByCompany).map(([groupName, groupContacts]) => {
                        if (groupContacts.length === 0) return null;
                        
                        const allSelected = groupContacts.every(c => selectedContactIds.has(c.id));
                        
                        return (
                          <div key={groupName} className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
                              <span className="font-medium text-gray-700">{groupName}</span>
                              <button
                                onClick={() => allSelected 
                                  ? groupContacts.forEach(c => toggleContact(c.id))
                                  : selectAllContactsInGroup(groupName)
                                }
                                className="text-xs text-blue-600 hover:text-blue-700"
                              >
                                {allSelected ? 'Deselect all' : 'Select all'}
                              </button>
                            </div>
                            <div className="divide-y divide-gray-100">
                              {groupContacts.map(contact => (
                                <label
                                  key={contact.id}
                                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedContactIds.has(contact.id)}
                                    onChange={() => toggleContact(contact.id)}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {contact.name}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                      {contact.phone && contact.phone}
                                      {contact.phone && contact.email && ' • '}
                                      {contact.email && contact.email}
                                    </p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Ad-hoc Workers Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-700">Ad-hoc Workers</h3>
                    <button
                      onClick={() => setShowAddAdHoc(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Add new contact
                    </button>
                  </div>

                  {/* Ad-hoc Worker Form */}
                  {showAddAdHoc && (
                    <div className="border border-blue-200 rounded-lg p-3 mb-3 bg-blue-50">
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={adHocName}
                          onChange={(e) => setAdHocName(e.target.value)}
                          placeholder="Worker name *"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="tel"
                            value={adHocPhone}
                            onChange={(e) => setAdHocPhone(e.target.value)}
                            placeholder="Phone number"
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <input
                            type="email"
                            value={adHocEmail}
                            onChange={(e) => setAdHocEmail(e.target.value)}
                            placeholder="Email address"
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={adHocSubcontractor}
                            onChange={(e) => setAdHocSubcontractor(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">Subcontractor (optional)</option>
                            {subcontractors.map(sub => (
                              <option key={sub.id} value={sub.id}>{sub.company_name}</option>
                            ))}
                          </select>
                          <select
                            value={adHocNotificationMethod}
                            onChange={(e) => setAdHocNotificationMethod(e.target.value as 'sms' | 'email' | 'both')}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="sms">SMS (preferred)</option>
                            <option value="email">Email</option>
                            <option value="both">Both</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddAdHoc}
                            disabled={!adHocName.trim() || (!adHocPhone.trim() && !adHocEmail.trim())}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add Worker
                          </button>
                          <button
                            onClick={() => setShowAddAdHoc(false)}
                            className="px-3 py-1.5 text-gray-600 hover:text-gray-800 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ad-hoc Workers List */}
                  {adHocWorkers.length > 0 && (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="divide-y divide-gray-100">
                        {adHocWorkers.map(worker => (
                          <div key={worker.id} className="flex items-center gap-3 px-3 py-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{worker.name}</p>
                              <p className="text-xs text-gray-500">
                                {worker.phone && `📱 ${worker.phone}`}
                                {worker.phone && worker.email && ' • '}
                                {worker.email && `📧 ${worker.email}`}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400 uppercase">
                              {worker.notificationMethod}
                            </span>
                            <button
                              onClick={() => removeAdHocWorker(worker.id)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 'review' && (
              <div className="space-y-4">
                {/* Daily Report Preview */}
                <ShiftDailyReport
                  shiftData={{
                    name: shiftName,
                    scheduled_date: scheduledDate,
                    start_time: startTime || null,
                    end_time: endTime || null,
                    status: 'draft',
                    notes: notes || null,
                    shift_tasks: shiftTasks,
                    shift_notes: shiftNotes,
                    custom_categories: customCategories,
                  }}
                  workers={[
                    // Existing project workers
                    ...Array.from(selectedWorkerIds).map(workerId => {
                      const worker = workers.find(w => w.id === workerId);
                      return worker ? {
                        id: worker.id,
                        name: worker.user_full_name ?? worker.user_email ?? 'Unknown',
                        company: worker.subcontractor_name,
                      } : null;
                    }).filter((w): w is NonNullable<typeof w> => w !== null),
                    // Selected contacts
                    ...Array.from(selectedContactIds).map(contactId => {
                      const contact = contacts.find(c => c.id === contactId);
                      return contact ? {
                        id: contact.id,
                        name: contact.name,
                        company: contact.company_name,
                      } : null;
                    }).filter((c): c is NonNullable<typeof c> => c !== null),
                    // Ad-hoc workers
                    ...adHocWorkers.map(w => ({
                      id: w.id,
                      name: w.name,
                      company: subcontractors.find(s => s.id === w.subcontractorId)?.company_name ?? null,
                    })),
                  ]}
                  readOnly
                  compact
                />

                {/* Warning if no workers */}
                {totalWorkerCount === 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      No workers selected. You can still create the shift and add workers later.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => {
                if (step === 'details') handleClose();
                else if (step === 'tasks') setStep('details');
                else if (step === 'workers') setStep('tasks');
                else if (step === 'review') setStep('workers');
              }}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              {step === 'details' ? 'Cancel' : 'Back'}
            </button>
            
            <div className="flex items-center gap-2">
              {/* Step indicators */}
              <div className="flex items-center gap-1 mr-4">
                {['details', 'tasks', 'workers', 'review'].map((s, i) => (
                  <div
                    key={s}
                    className={`w-2 h-2 rounded-full ${
                      s === step ? 'bg-blue-600' : 
                      ['details', 'tasks', 'workers', 'review'].indexOf(step) > i ? 'bg-blue-300' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              {step !== 'review' ? (
                <button
                  onClick={() => {
                    if (step === 'details') setStep('tasks');
                    else if (step === 'tasks') setStep('workers');
                    else if (step === 'workers') setStep('review');
                  }}
                  disabled={step === 'details' && !shiftName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {step === 'tasks' && shiftTasks.length === 0 && shiftNotes.length === 0 ? 'Skip' : 'Next'}
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Shift'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
