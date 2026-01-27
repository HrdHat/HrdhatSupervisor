import { useState, useRef } from 'react';
import { useSupervisorStore } from '@/stores/supervisorStore';
import type {
  DailyLogType,
  VisitorMetadata,
  DeliveryMetadata,
  ManpowerMetadata,
  ManpowerPersonnelEntry,
  SiteIssueMetadata,
  ScheduleDelayMetadata,
  ObservationMetadata,
} from '@/types/supervisor';
import { DAILY_LOG_TYPE_CONFIG } from '@/types/supervisor';
import { supabase } from '@/config/supabaseClient';

interface DailyLogModalProps {
  projectId: string;
  logType: DailyLogType;
  isOpen: boolean;
  onClose: () => void;
  onLogAdded?: () => void;
}

// Helper to get current time in HH:MM format
function getCurrentTime(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

// Helper to get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function DailyLogModal({ projectId, logType, isOpen, onClose, onLogAdded }: DailyLogModalProps) {
  const addDailyLog = useSupervisorStore((s) => s.addDailyLog);
  const contacts = useSupervisorStore((s) => s.contacts);
  const subcontractors = useSupervisorStore((s) => s.subcontractors);
  const config = DAILY_LOG_TYPE_CONFIG[logType];

  // Common fields
  const [content, setContent] = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Photo upload state (for observation)
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Personnel selection state (for manpower logs)
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<'worker' | 'subcontractor'>('worker');

  // Type-specific metadata
  const [visitorMeta, setVisitorMeta] = useState<VisitorMetadata>({
    name: '',
    company: '',
    time_in: getCurrentTime(),
  });
  const [deliveryMeta, setDeliveryMeta] = useState<DeliveryMetadata>({
    supplier: '',
    items: '',
    delivery_time: getCurrentTime(),
  });
  const [manpowerMeta, setManpowerMeta] = useState<ManpowerMetadata>({
    company: '',
    trade: '',
    count: 0,
    hours: 8,
    personnel: [],
  });
  const [issueMeta, setIssueMeta] = useState<SiteIssueMetadata>({
    priority: 'medium',
  });
  const [scheduleMeta, setScheduleMeta] = useState<ScheduleDelayMetadata>({
    delay_type: 'other',
  });
  const [observationMeta, setObservationMeta] = useState<ObservationMetadata>({
    location: '',
    area: '',
  });

  // Add personnel to manpower metadata
  const addPersonnel = (entry: ManpowerPersonnelEntry) => {
    const current = manpowerMeta.personnel ?? [];
    // Avoid duplicates (by name + type)
    if (!current.some(p => p.name === entry.name && p.type === entry.type)) {
      setManpowerMeta({ ...manpowerMeta, personnel: [...current, { ...entry, hours: 8 }] }); // Default 8 hours
    }
  };

  // Remove personnel from manpower metadata
  const removePersonnel = (index: number) => {
    const current = manpowerMeta.personnel ?? [];
    setManpowerMeta({ ...manpowerMeta, personnel: current.filter((_, i) => i !== index) });
  };

  // Update personnel hours
  const updatePersonnelHours = (index: number, hours: number) => {
    const current = manpowerMeta.personnel ?? [];
    const updated = current.map((p, i) => i === index ? { ...p, hours } : p);
    setManpowerMeta({ ...manpowerMeta, personnel: updated });
  };

  // Handle custom personnel addition
  const handleAddCustom = () => {
    if (customName.trim()) {
      addPersonnel({ type: customType, name: customName.trim(), hours: 8 });
      setCustomName('');
      setShowCustomInput(false);
    }
  };

  // Handle photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected photo
  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Upload photo to Supabase storage
  const uploadPhoto = async (): Promise<{ url: string; path: string } | null> => {
    if (!photoFile) return null;

    setIsUploadingPhoto(true);
    try {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `daily-logs/${projectId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, photoFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      return { url: publicUrl, path: filePath };
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);

    try {
      let metadata: Record<string, unknown> = {};

      switch (logType) {
        case 'visitor':
          metadata = { ...visitorMeta };
          break;
        case 'delivery':
          metadata = { ...deliveryMeta };
          break;
        case 'manpower':
          metadata = { ...manpowerMeta };
          break;
        case 'site_issue':
          metadata = { ...issueMeta };
          break;
        case 'schedule_delay':
          metadata = { ...scheduleMeta };
          break;
        case 'observation':
          // Handle photo upload for observation
          if (photoFile) {
            const photoResult = await uploadPhoto();
            if (photoResult) {
              metadata = {
                ...observationMeta,
                photo_url: photoResult.url,
                photo_storage_path: photoResult.path,
              };
            } else {
              metadata = { ...observationMeta };
            }
          } else {
            metadata = { ...observationMeta };
          }
          break;
      }

      await addDailyLog({
        project_id: projectId,
        log_date: selectedDate,
        log_type: logType,
        content: content.trim(),
        metadata,
        status: logType === 'site_issue' ? 'active' : 'active',
      });

      // Reset form and close
      resetForm();
      onLogAdded?.();
      onClose();
    } catch (error) {
      console.error('Error adding daily log:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to initial state
  const resetForm = () => {
    setContent('');
    setSelectedDate(getTodayDate());
    setPhotoFile(null);
    setPhotoPreview(null);
    setVisitorMeta({ name: '', company: '', time_in: getCurrentTime() });
    setDeliveryMeta({ supplier: '', items: '', delivery_time: getCurrentTime() });
    setManpowerMeta({ company: '', trade: '', count: 0, hours: 8, personnel: [] });
    setIssueMeta({ priority: 'medium' });
    setScheduleMeta({ delay_type: 'other' });
    setObservationMeta({ location: '', area: '' });
    setShowCustomInput(false);
    setCustomName('');
    setCustomType('worker');
  };

  // Handle close
  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-200 ${config.bgColor}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{config.icon}</span>
              <div>
                <h2 className={`text-lg font-semibold ${config.color}`}>Add {config.label}</h2>
                <p className="text-sm text-gray-600">Log a new {config.label.toLowerCase()} entry</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-white/50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="px-6 py-4 overflow-y-auto max-h-[60vh]">
            <div className="space-y-4">
              {/* Log Date Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Log Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={getTodayDate()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  {selectedDate === getTodayDate() ? 'Today' : `Backdated to ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`}
                </p>
              </div>

              {/* Type-specific fields */}
              {logType === 'visitor' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Visitor Name *</label>
                      <input
                        type="text"
                        value={visitorMeta.name}
                        onChange={(e) => setVisitorMeta({ ...visitorMeta, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="John Smith"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                      <input
                        type="text"
                        value={visitorMeta.company ?? ''}
                        onChange={(e) => setVisitorMeta({ ...visitorMeta, company: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="ABC Corp"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time In</label>
                      <input
                        type="time"
                        value={visitorMeta.time_in ?? ''}
                        onChange={(e) => setVisitorMeta({ ...visitorMeta, time_in: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time Out</label>
                      <input
                        type="time"
                        value={visitorMeta.time_out ?? ''}
                        onChange={(e) => setVisitorMeta({ ...visitorMeta, time_out: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              {logType === 'delivery' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                      <input
                        type="text"
                        value={deliveryMeta.supplier ?? ''}
                        onChange={(e) => setDeliveryMeta({ ...deliveryMeta, supplier: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Supplier name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Time</label>
                      <input
                        type="time"
                        value={deliveryMeta.delivery_time ?? ''}
                        onChange={(e) => setDeliveryMeta({ ...deliveryMeta, delivery_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Received By</label>
                      <input
                        type="text"
                        value={deliveryMeta.received_by ?? ''}
                        onChange={(e) => setDeliveryMeta({ ...deliveryMeta, received_by: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Person name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
                      <input
                        type="text"
                        value={deliveryMeta.po_number ?? ''}
                        onChange={(e) => setDeliveryMeta({ ...deliveryMeta, po_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="PO-12345"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Items Delivered</label>
                    <input
                      type="text"
                      value={deliveryMeta.items ?? ''}
                      onChange={(e) => setDeliveryMeta({ ...deliveryMeta, items: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Lumber, concrete, etc."
                    />
                  </div>
                </>
              )}

              {logType === 'manpower' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                      <input
                        type="text"
                        value={manpowerMeta.company ?? ''}
                        onChange={(e) => setManpowerMeta({ ...manpowerMeta, company: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Subcontractor name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Trade</label>
                      <input
                        type="text"
                        value={manpowerMeta.trade ?? ''}
                        onChange={(e) => setManpowerMeta({ ...manpowerMeta, trade: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Electrician, Plumber, etc."
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Worker Count</label>
                      <input
                        type="number"
                        min="0"
                        value={manpowerMeta.count ?? 0}
                        onChange={(e) => setManpowerMeta({ ...manpowerMeta, count: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hours Worked</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={manpowerMeta.hours ?? 8}
                        onChange={(e) => setManpowerMeta({ ...manpowerMeta, hours: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Personnel on Site */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Personnel on Site</label>
                    <div className="flex gap-2">
                      <select
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        value=""
                        onChange={(e) => {
                          const value = e.target.value;
                          if (!value) return;
                          
                          if (value.startsWith('contact:')) {
                            const contactId = value.replace('contact:', '');
                            const contact = contacts.find(c => c.id === contactId);
                            if (contact) {
                              addPersonnel({ type: 'worker', name: contact.name, id: contact.id });
                            }
                          } else if (value.startsWith('sub:')) {
                            const subId = value.replace('sub:', '');
                            const sub = subcontractors.find(s => s.id === subId);
                            if (sub) {
                              addPersonnel({ type: 'subcontractor', name: sub.company_name, id: sub.id });
                            }
                          }
                        }}
                      >
                        <option value="">Select worker or subcontractor...</option>
                        {contacts.length > 0 && (
                          <optgroup label="Workers (Contacts)">
                            {contacts.map(c => (
                              <option key={c.id} value={`contact:${c.id}`}>
                                {c.name}{c.company_name ? ` (${c.company_name})` : ''}
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {subcontractors.length > 0 && (
                          <optgroup label="Subcontractors">
                            {subcontractors.filter(s => s.status === 'active').map(s => (
                              <option key={s.id} value={`sub:${s.id}`}>
                                {s.company_name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowCustomInput(!showCustomInput)}
                        className="px-3 py-2 text-sm font-medium text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors whitespace-nowrap"
                      >
                        + Custom
                      </button>
                    </div>

                    {/* Custom name input */}
                    {showCustomInput && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <label className="block text-xs text-gray-600 mb-1">Name</label>
                            <input
                              type="text"
                              value={customName}
                              onChange={(e) => setCustomName(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              placeholder="Enter name..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddCustom();
                                }
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Type</label>
                            <select
                              value={customType}
                              onChange={(e) => setCustomType(e.target.value as 'worker' | 'subcontractor')}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            >
                              <option value="worker">Worker</option>
                              <option value="subcontractor">Subcontractor</option>
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddCustom}
                            disabled={!customName.trim()}
                            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Personnel list with hours */}
                    {(manpowerMeta.personnel?.length ?? 0) > 0 && (
                      <div className="mt-3 space-y-2">
                        {manpowerMeta.personnel?.map((person, idx) => (
                          <div
                            key={`${person.type}-${person.name}-${idx}`}
                            className={`flex items-center gap-3 p-2 rounded-lg border ${
                              person.type === 'worker' 
                                ? 'bg-blue-50 border-blue-200' 
                                : 'bg-green-50 border-green-200'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium text-sm truncate ${
                                  person.type === 'worker' ? 'text-blue-700' : 'text-green-700'
                                }`}>
                                  {person.name}
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  person.type === 'worker' 
                                    ? 'bg-blue-100 text-blue-600' 
                                    : 'bg-green-100 text-green-600'
                                }`}>
                                  {person.type === 'worker' ? 'Worker' : 'Sub'}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-xs text-gray-500">Hrs:</label>
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={person.hours ?? 8}
                                onChange={(e) => updatePersonnelHours(idx, parseFloat(e.target.value) || 0)}
                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removePersonnel(idx)}
                              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {logType === 'site_issue' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={issueMeta.priority ?? 'medium'}
                    onChange={(e) => setIssueMeta({ ...issueMeta, priority: e.target.value as SiteIssueMetadata['priority'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              )}

              {logType === 'schedule_delay' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delay Type</label>
                      <select
                        value={scheduleMeta.delay_type ?? 'other'}
                        onChange={(e) => setScheduleMeta({ ...scheduleMeta, delay_type: e.target.value as ScheduleDelayMetadata['delay_type'] })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="weather">Weather</option>
                        <option value="material">Material</option>
                        <option value="labor">Labor</option>
                        <option value="inspection">Inspection</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Impact (hours)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={scheduleMeta.impact_hours ?? ''}
                        onChange={(e) => setScheduleMeta({ ...scheduleMeta, impact_hours: parseFloat(e.target.value) || undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Affected Areas</label>
                    <input
                      type="text"
                      value={scheduleMeta.affected_areas ?? ''}
                      onChange={(e) => setScheduleMeta({ ...scheduleMeta, affected_areas: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Building A, Floor 2, etc."
                    />
                  </div>
                </>
              )}

              {logType === 'observation' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <input
                        type="text"
                        value={observationMeta.location ?? ''}
                        onChange={(e) => setObservationMeta({ ...observationMeta, location: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Building A, Floor 2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Area/Zone</label>
                      <input
                        type="text"
                        value={observationMeta.area ?? ''}
                        onChange={(e) => setObservationMeta({ ...observationMeta, area: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="North Wing, Kitchen"
                      />
                    </div>
                  </div>

                  {/* Photo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Photo (optional)</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    
                    {!photoPreview ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-colors flex flex-col items-center gap-2"
                      >
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm text-gray-500">Click to add a photo</span>
                      </button>
                    ) : (
                      <div className="relative">
                        <img
                          src={photoPreview}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Description/Notes (common for all types) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {logType === 'observation' ? 'Observation Notes *' : 'Description *'}
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                  placeholder={
                    logType === 'visitor' ? 'Purpose of visit, notes...' :
                    logType === 'delivery' ? 'Delivery details, condition of materials...' :
                    logType === 'manpower' ? 'Work performed, areas covered...' :
                    logType === 'site_issue' ? 'Describe the issue in detail...' :
                    logType === 'schedule_delay' ? 'Reason for delay, impact on schedule...' :
                    'Describe what you observed...'
                  }
                  required
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!content.trim() || isSubmitting || isUploadingPhoto}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${config.bgColor} ${config.color} hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
              >
                {(isSubmitting || isUploadingPhoto) && (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {isUploadingPhoto ? 'Uploading...' : isSubmitting ? 'Adding...' : `Add ${config.label}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
