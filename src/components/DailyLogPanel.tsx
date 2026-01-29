import { useState, useEffect, useMemo } from 'react';
import { useSupervisorStore } from '@/stores/supervisorStore';
import type {
  DailyLogType,
  ProjectDailyLog,
  VisitorMetadata,
  DeliveryMetadata,
  ManpowerMetadata,
  ManpowerPersonnelEntry,
  SiteIssueMetadata,
  ScheduleDelayMetadata,
  ObservationMetadata,
  NoteMetadata,
  MeetingMinutesMetadata,
  NoteCategory,
  MeetingType,
  SiteIssueStatus,
} from '@/types/supervisor';
import {
  DAILY_LOG_TYPE_CONFIG,
  SITE_ISSUE_STATUS_CONFIG,
  NOTE_CATEGORY_CONFIG,
  MEETING_TYPE_CONFIG,
} from '@/types/supervisor';

interface DailyLogPanelProps {
  projectId: string;
  selectedDate?: string; // ISO date, defaults to today
  onOpenSiteIssues?: () => void;
  onViewArchive?: () => void;
  compact?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTime(timeStr: string | undefined): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getCurrentTime(): string {
  const now = new Date();
  return now.toTimeString().slice(0, 5); // HH:MM
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getSevenDaysAgoDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return date.toISOString().split('T')[0];
}

function getYesterdayDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

type DatePeriod = 'today' | 'yesterday' | 'earlierThisWeek';

function getDatePeriod(logDate: string): DatePeriod {
  const today = getTodayDate();
  const yesterday = getYesterdayDate();
  
  if (logDate === today) return 'today';
  if (logDate === yesterday) return 'yesterday';
  return 'earlierThisWeek';
}

const PERIOD_CONFIG: Record<DatePeriod, { label: string; icon: string }> = {
  today: { label: 'Today', icon: '📅' },
  yesterday: { label: 'Yesterday', icon: '📆' },
  earlierThisWeek: { label: 'Earlier This Week', icon: '🗓️' },
};

// ============================================================================
// Log Entry Card Component
// ============================================================================

interface LogEntryCardProps {
  log: ProjectDailyLog;
  onDelete: (logId: string) => void;
  onToggleStatus?: (logId: string, newStatus: SiteIssueStatus) => void;
}

function LogEntryCard({ log, onDelete, onToggleStatus }: LogEntryCardProps) {
  const config = DAILY_LOG_TYPE_CONFIG[log.log_type];
  const isSiteIssue = log.log_type === 'site_issue';
  const statusConfig = isSiteIssue ? SITE_ISSUE_STATUS_CONFIG[log.status] : null;

  // Render metadata based on log type
  const renderMetadata = () => {
    switch (log.log_type) {
      case 'visitor': {
        const meta = log.metadata as VisitorMetadata;
        return (
          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
            {meta.name && <p><span className="font-medium">Name:</span> {meta.name}</p>}
            {meta.company && <p><span className="font-medium">Company:</span> {meta.company}</p>}
            {(meta.time_in || meta.time_out) && (
              <p>
                {meta.time_in && <span>{formatTime(meta.time_in)} in</span>}
                {meta.time_in && meta.time_out && ' - '}
                {meta.time_out && <span>{formatTime(meta.time_out)} out</span>}
              </p>
            )}
          </div>
        );
      }
      case 'delivery': {
        const meta = log.metadata as DeliveryMetadata;
        return (
          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
            {meta.supplier && <p><span className="font-medium">Supplier:</span> {meta.supplier}</p>}
            {meta.received_by && <p><span className="font-medium">Received by:</span> {meta.received_by}</p>}
            {meta.delivery_time && <p><span className="font-medium">Time:</span> {formatTime(meta.delivery_time)}</p>}
          </div>
        );
      }
      case 'manpower': {
        const meta = log.metadata as ManpowerMetadata;
        return (
          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
            {meta.company && <p><span className="font-medium">Company:</span> {meta.company}</p>}
            {meta.trade && <p><span className="font-medium">Trade:</span> {meta.trade}</p>}
            {meta.count !== undefined && <p><span className="font-medium">Workers:</span> {meta.count}</p>}
            {meta.hours !== undefined && <p><span className="font-medium">Hours:</span> {meta.hours}</p>}
            {meta.personnel && meta.personnel.length > 0 && (
              <div className="mt-1.5">
                <span className="font-medium">Personnel:</span>
                <div className="mt-1 space-y-1">
                  {meta.personnel.map((person, idx) => (
                    <div
                      key={`${person.type}-${person.name}-${idx}`}
                      className={`inline-flex items-center gap-2 px-2 py-1 text-[10px] rounded ${
                        person.type === 'worker' 
                          ? 'bg-blue-50 text-blue-600' 
                          : 'bg-green-50 text-green-600'
                      }`}
                    >
                      <span className="font-medium">{person.name}</span>
                      <span className="opacity-60">({person.type === 'worker' ? 'W' : 'Sub'})</span>
                      {person.hours !== undefined && (
                        <span className="font-medium">{person.hours}h</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'site_issue': {
        const meta = log.metadata as SiteIssueMetadata;
        return (
          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
            {meta.priority && (
              <p>
                <span className="font-medium">Priority:</span>{' '}
                <span className={meta.priority === 'high' ? 'text-red-600' : meta.priority === 'medium' ? 'text-yellow-600' : 'text-gray-600'}>
                  {meta.priority.charAt(0).toUpperCase() + meta.priority.slice(1)}
                </span>
              </p>
            )}
            {meta.assigned_to && <p><span className="font-medium">Assigned to:</span> {meta.assigned_to}</p>}
            {meta.resolution_notes && <p><span className="font-medium">Resolution:</span> {meta.resolution_notes}</p>}
          </div>
        );
      }
      case 'schedule_delay': {
        const meta = log.metadata as ScheduleDelayMetadata;
        return (
          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
            {meta.delay_type && <p><span className="font-medium">Type:</span> {meta.delay_type.replace('_', ' ')}</p>}
            {meta.impact_hours !== undefined && <p><span className="font-medium">Impact:</span> {meta.impact_hours} hours</p>}
            {meta.affected_areas && <p><span className="font-medium">Affected:</span> {meta.affected_areas}</p>}
          </div>
        );
      }
      case 'observation': {
        const meta = log.metadata as ObservationMetadata;
        return (
          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
            {meta.location && <p><span className="font-medium">Location:</span> {meta.location}</p>}
            {meta.area && <p><span className="font-medium">Area:</span> {meta.area}</p>}
            {meta.photo_url && (
              <div className="mt-2">
                <img 
                  src={meta.photo_url} 
                  alt="Observation" 
                  className="w-full max-w-xs h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                  onClick={() => window.open(meta.photo_url, '_blank')}
                />
              </div>
            )}
          </div>
        );
      }
      case 'note': {
        const meta = log.metadata as NoteMetadata;
        const categoryConfig = NOTE_CATEGORY_CONFIG[meta.category];
        return (
          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
            {meta.category && (
              <p>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${categoryConfig?.bgColor} ${categoryConfig?.color}`}>
                  {categoryConfig?.icon} {categoryConfig?.label}
                </span>
              </p>
            )}
            {meta.related_to && <p><span className="font-medium">Related to:</span> {meta.related_to}</p>}
            {meta.priority && (
              <p>
                <span className="font-medium">Priority:</span>{' '}
                <span className={meta.priority === 'high' ? 'text-red-600' : meta.priority === 'medium' ? 'text-yellow-600' : 'text-gray-600'}>
                  {meta.priority.charAt(0).toUpperCase() + meta.priority.slice(1)}
                </span>
              </p>
            )}
          </div>
        );
      }
      case 'meeting_minutes': {
        const meta = log.metadata as MeetingMinutesMetadata;
        const meetingTypeLabel = meta.meeting_type === 'other' && meta.custom_type 
          ? meta.custom_type 
          : MEETING_TYPE_CONFIG[meta.meeting_type]?.label;
        return (
          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
            {meta.meeting_title && <p className="font-medium text-gray-700">{meta.meeting_title}</p>}
            {meetingTypeLabel && <p><span className="font-medium">Type:</span> {meetingTypeLabel}</p>}
            {meta.attendees && meta.attendees.length > 0 && (
              <div>
                <span className="font-medium">Attendees:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {meta.attendees.map((attendee, idx) => (
                    <span
                      key={`${attendee}-${idx}`}
                      className="inline-flex items-center px-1.5 py-0.5 bg-cyan-50 text-cyan-700 rounded text-[10px]"
                    >
                      {attendee}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {meta.meeting_time && <p><span className="font-medium">Time:</span> {formatTime(meta.meeting_time)}</p>}
            {meta.location && <p><span className="font-medium">Location:</span> {meta.location}</p>}
            {meta.duration_minutes && <p><span className="font-medium">Duration:</span> {meta.duration_minutes} min</p>}
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Type badge and status (for site issues) */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.bgColor} ${config.color}`}>
              {config.icon} {config.label}
            </span>
            {statusConfig && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusConfig.bgColor} ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            )}
            <span className="text-xs text-gray-400">{formatRelativeTime(log.created_at)}</span>
          </div>
          
          {/* Content */}
          <p className="text-sm text-gray-800">{log.content}</p>
          
          {/* Metadata */}
          {renderMetadata()}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Status toggle for site issues */}
          {isSiteIssue && onToggleStatus && (
            <select
              value={log.status}
              onChange={(e) => onToggleStatus(log.id, e.target.value as SiteIssueStatus)}
              className="text-xs border border-gray-300 rounded px-1 py-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="active">Open</option>
              <option value="resolved">Resolved</option>
              <option value="continued">Continued</option>
            </select>
          )}
          
          {/* Delete button */}
          <button
            onClick={() => onDelete(log.id)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Quick Add Forms
// ============================================================================

interface QuickAddFormProps {
  logType: DailyLogType;
  projectId: string;
  selectedDate: string;
  onAdded: () => void;
}

function QuickAddForm({ logType, projectId, selectedDate, onAdded }: QuickAddFormProps) {
  const addDailyLog = useSupervisorStore((s) => s.addDailyLog);
  const contacts = useSupervisorStore((s) => s.contacts);
  const subcontractors = useSupervisorStore((s) => s.subcontractors);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Type-specific metadata
  const [visitorMeta, setVisitorMeta] = useState<VisitorMetadata>({ name: '', company: '', time_in: getCurrentTime() });
  const [deliveryMeta, setDeliveryMeta] = useState<DeliveryMetadata>({ supplier: '', items: '', delivery_time: getCurrentTime() });
  const [manpowerMeta, setManpowerMeta] = useState<ManpowerMetadata>({ company: '', trade: '', count: 0, hours: 8, personnel: [] });
  const [issueMeta, setIssueMeta] = useState<SiteIssueMetadata>({ priority: 'medium' });
  const [scheduleMeta, setScheduleMeta] = useState<ScheduleDelayMetadata>({ delay_type: 'other' });
  const [observationMeta, setObservationMeta] = useState<ObservationMetadata>({ location: '', area: '' });
  const [noteMeta, setNoteMeta] = useState<NoteMetadata>({ category: 'phone' });
  const [meetingMeta, setMeetingMeta] = useState<MeetingMinutesMetadata>({ 
    meeting_type: 'general', 
    meeting_title: '', 
    attendees: [],
    meeting_time: getCurrentTime(),
  });
  
  // Meeting attendee input state
  const [attendeeInput, setAttendeeInput] = useState('');
  
  // Personnel selection state (for manpower logs)
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<'worker' | 'subcontractor'>('worker');

  // Add personnel to manpower metadata
  const addPersonnel = (entry: ManpowerPersonnelEntry) => {
    const current = manpowerMeta.personnel ?? [];
    // Avoid duplicates (by name + type)
    if (!current.some(p => p.name === entry.name && p.type === entry.type)) {
      setManpowerMeta({ ...manpowerMeta, personnel: [...current, entry] });
    }
  };

  // Remove personnel from manpower metadata
  const removePersonnel = (index: number) => {
    const current = manpowerMeta.personnel ?? [];
    setManpowerMeta({ ...manpowerMeta, personnel: current.filter((_, i) => i !== index) });
  };

  // Handle custom personnel addition
  const handleAddCustom = () => {
    if (customName.trim()) {
      addPersonnel({ type: customType, name: customName.trim() });
      setCustomName('');
      setShowCustomInput(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);

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
        metadata = { ...observationMeta };
        break;
      case 'note':
        metadata = { ...noteMeta };
        break;
      case 'meeting_minutes':
        metadata = { ...meetingMeta };
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

    // Reset form
    setContent('');
    setVisitorMeta({ name: '', company: '', time_in: getCurrentTime() });
    setDeliveryMeta({ supplier: '', items: '', delivery_time: getCurrentTime() });
    setManpowerMeta({ company: '', trade: '', count: 0, hours: 8, personnel: [] });
    setIssueMeta({ priority: 'medium' });
    setScheduleMeta({ delay_type: 'other' });
    setObservationMeta({ location: '', area: '' });
    setNoteMeta({ category: 'phone' });
    setMeetingMeta({ meeting_type: 'general', meeting_title: '', attendees: [], meeting_time: getCurrentTime() });
    setAttendeeInput('');
    setShowCustomInput(false);
    setCustomName('');
    setCustomType('worker');
    setIsSubmitting(false);
    onAdded();
  };

  const config = DAILY_LOG_TYPE_CONFIG[logType];

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Content field (always shown) */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          {logType === 'visitor' ? 'Purpose/Notes' :
           logType === 'delivery' ? 'Items/Description' :
           logType === 'site_issue' ? 'Issue Description' :
           logType === 'manpower' ? 'Work Description' :
           logType === 'note' ? 'Note Content' :
           logType === 'meeting_minutes' ? 'Meeting Notes/Minutes' :
           'Delay/Schedule Notes'}
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Enter ${config.label.toLowerCase()} details...`}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={2}
          required
        />
      </div>

      {/* Type-specific fields */}
      {logType === 'visitor' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Visitor Name</label>
            <input
              type="text"
              value={visitorMeta.name}
              onChange={(e) => setVisitorMeta({ ...visitorMeta, name: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              placeholder="Name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
            <input
              type="text"
              value={visitorMeta.company}
              onChange={(e) => setVisitorMeta({ ...visitorMeta, company: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              placeholder="Company"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Time In</label>
            <input
              type="time"
              value={visitorMeta.time_in}
              onChange={(e) => setVisitorMeta({ ...visitorMeta, time_in: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Time Out</label>
            <input
              type="time"
              value={visitorMeta.time_out ?? ''}
              onChange={(e) => setVisitorMeta({ ...visitorMeta, time_out: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
      )}

      {logType === 'delivery' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Supplier</label>
            <input
              type="text"
              value={deliveryMeta.supplier}
              onChange={(e) => setDeliveryMeta({ ...deliveryMeta, supplier: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              placeholder="Supplier name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Received By</label>
            <input
              type="text"
              value={deliveryMeta.received_by}
              onChange={(e) => setDeliveryMeta({ ...deliveryMeta, received_by: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              placeholder="Who received"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Time</label>
            <input
              type="time"
              value={deliveryMeta.delivery_time}
              onChange={(e) => setDeliveryMeta({ ...deliveryMeta, delivery_time: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">PO Number</label>
            <input
              type="text"
              value={deliveryMeta.po_number ?? ''}
              onChange={(e) => setDeliveryMeta({ ...deliveryMeta, po_number: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              placeholder="Optional"
            />
          </div>
        </div>
      )}

      {logType === 'manpower' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Company/Sub</label>
              <input
                type="text"
                value={manpowerMeta.company}
                onChange={(e) => setManpowerMeta({ ...manpowerMeta, company: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Trade</label>
              <input
                type="text"
                value={manpowerMeta.trade}
                onChange={(e) => setManpowerMeta({ ...manpowerMeta, trade: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                placeholder="e.g., Electrician"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1"># of Workers</label>
              <input
                type="number"
                min="0"
                value={manpowerMeta.count ?? 0}
                onChange={(e) => setManpowerMeta({ ...manpowerMeta, count: parseInt(e.target.value) || 0 })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={manpowerMeta.hours ?? 8}
                onChange={(e) => setManpowerMeta({ ...manpowerMeta, hours: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>

          {/* Personnel on Site */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Personnel on Site</label>
            <div className="flex gap-2">
              <select
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
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
                className="px-2 py-1.5 text-xs font-medium text-purple-600 border border-purple-300 rounded hover:bg-purple-50 transition-colors"
              >
                + Custom
              </button>
            </div>

            {/* Custom name input */}
            {showCustomInput && (
              <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
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
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="worker">Worker</option>
                      <option value="subcontractor">Subcontractor</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustom}
                    disabled={!customName.trim()}
                    className="px-3 py-1 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Personnel chips */}
            {(manpowerMeta.personnel?.length ?? 0) > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {manpowerMeta.personnel?.map((person, idx) => (
                  <span
                    key={`${person.type}-${person.name}-${idx}`}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                      person.type === 'worker' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    <span className="font-medium">{person.name}</span>
                    <span className="opacity-60">({person.type === 'worker' ? 'W' : 'Sub'})</span>
                    <button
                      type="button"
                      onClick={() => removePersonnel(idx)}
                      className="ml-0.5 hover:opacity-70"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {logType === 'site_issue' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={issueMeta.priority}
              onChange={(e) => setIssueMeta({ ...issueMeta, priority: e.target.value as 'low' | 'medium' | 'high' })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Assigned To</label>
            <input
              type="text"
              value={issueMeta.assigned_to ?? ''}
              onChange={(e) => setIssueMeta({ ...issueMeta, assigned_to: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              placeholder="Optional"
            />
          </div>
        </div>
      )}

      {logType === 'schedule_delay' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Delay Type</label>
            <select
              value={scheduleMeta.delay_type}
              onChange={(e) => setScheduleMeta({ ...scheduleMeta, delay_type: e.target.value as ScheduleDelayMetadata['delay_type'] })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="weather">Weather</option>
              <option value="material">Material</option>
              <option value="labor">Labor</option>
              <option value="inspection">Inspection</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Impact (hours)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={scheduleMeta.impact_hours ?? ''}
              onChange={(e) => setScheduleMeta({ ...scheduleMeta, impact_hours: parseFloat(e.target.value) || undefined })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              placeholder="Optional"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Affected Areas</label>
            <input
              type="text"
              value={scheduleMeta.affected_areas ?? ''}
              onChange={(e) => setScheduleMeta({ ...scheduleMeta, affected_areas: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              placeholder="Optional"
            />
          </div>
        </div>
      )}

      {logType === 'observation' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={observationMeta.location ?? ''}
              onChange={(e) => setObservationMeta({ ...observationMeta, location: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              placeholder="Building A, Floor 2"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Area/Zone</label>
            <input
              type="text"
              value={observationMeta.area ?? ''}
              onChange={(e) => setObservationMeta({ ...observationMeta, area: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              placeholder="North Wing, Kitchen"
            />
          </div>
          <div className="col-span-2 text-xs text-gray-500">
            For photo attachments, use the Quick Add bar above to open the full form.
          </div>
        </div>
      )}

      {logType === 'note' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
            <select
              value={noteMeta.category}
              onChange={(e) => setNoteMeta({ ...noteMeta, category: e.target.value as NoteCategory })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              {(Object.keys(NOTE_CATEGORY_CONFIG) as NoteCategory[]).map((cat) => (
                <option key={cat} value={cat}>
                  {NOTE_CATEGORY_CONFIG[cat].icon} {NOTE_CATEGORY_CONFIG[cat].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={noteMeta.priority ?? ''}
              onChange={(e) => setNoteMeta({ ...noteMeta, priority: e.target.value as 'low' | 'medium' | 'high' | undefined || undefined })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Related To</label>
            <input
              type="text"
              value={noteMeta.related_to ?? ''}
              onChange={(e) => setNoteMeta({ ...noteMeta, related_to: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              placeholder="Person, company, or document (optional)"
            />
          </div>
        </div>
      )}

      {logType === 'meeting_minutes' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Meeting Title</label>
              <input
                type="text"
                value={meetingMeta.meeting_title}
                onChange={(e) => setMeetingMeta({ ...meetingMeta, meeting_title: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                placeholder="e.g., Weekly Progress Meeting"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Meeting Type</label>
              <select
                value={meetingMeta.meeting_type}
                onChange={(e) => setMeetingMeta({ ...meetingMeta, meeting_type: e.target.value as MeetingType })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              >
                {(Object.keys(MEETING_TYPE_CONFIG) as MeetingType[]).map((type) => (
                  <option key={type} value={type}>
                    {MEETING_TYPE_CONFIG[type].label}
                  </option>
                ))}
              </select>
            </div>
            {meetingMeta.meeting_type === 'other' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Custom Type</label>
                <input
                  type="text"
                  value={meetingMeta.custom_type ?? ''}
                  onChange={(e) => setMeetingMeta({ ...meetingMeta, custom_type: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  placeholder="Enter custom meeting type"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
              <input
                type="time"
                value={meetingMeta.meeting_time ?? ''}
                onChange={(e) => setMeetingMeta({ ...meetingMeta, meeting_time: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={meetingMeta.location ?? ''}
                onChange={(e) => setMeetingMeta({ ...meetingMeta, location: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Duration (min)</label>
              <input
                type="number"
                min="0"
                step="5"
                value={meetingMeta.duration_minutes ?? ''}
                onChange={(e) => setMeetingMeta({ ...meetingMeta, duration_minutes: parseInt(e.target.value) || undefined })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Attendees</label>
            <div className="flex gap-2">
              <select
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                value=""
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) return;
                  
                  if (value.startsWith('contact:')) {
                    const contactId = value.replace('contact:', '');
                    const contact = contacts.find(c => c.id === contactId);
                    if (contact && !meetingMeta.attendees.includes(contact.name)) {
                      setMeetingMeta({ ...meetingMeta, attendees: [...meetingMeta.attendees, contact.name] });
                    }
                  }
                }}
              >
                <option value="">Select from contacts...</option>
                {contacts.length > 0 && (
                  <optgroup label="Contacts">
                    {contacts.map(c => (
                      <option key={c.id} value={`contact:${c.id}`}>
                        {c.name}{c.company_name ? ` (${c.company_name})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={attendeeInput}
                  onChange={(e) => setAttendeeInput(e.target.value)}
                  className="w-32 px-2 py-1.5 border border-gray-300 rounded text-sm"
                  placeholder="Add name..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (attendeeInput.trim() && !meetingMeta.attendees.includes(attendeeInput.trim())) {
                        setMeetingMeta({ ...meetingMeta, attendees: [...meetingMeta.attendees, attendeeInput.trim()] });
                        setAttendeeInput('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (attendeeInput.trim() && !meetingMeta.attendees.includes(attendeeInput.trim())) {
                      setMeetingMeta({ ...meetingMeta, attendees: [...meetingMeta.attendees, attendeeInput.trim()] });
                      setAttendeeInput('');
                    }
                  }}
                  className="px-2 py-1.5 text-xs font-medium text-cyan-600 border border-cyan-300 rounded hover:bg-cyan-50 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Attendee chips */}
            {meetingMeta.attendees.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {meetingMeta.attendees.map((attendee, idx) => (
                  <span
                    key={`${attendee}-${idx}`}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-cyan-100 text-cyan-700 rounded-full"
                  >
                    <span>{attendee}</span>
                    <button
                      type="button"
                      onClick={() => setMeetingMeta({ 
                        ...meetingMeta, 
                        attendees: meetingMeta.attendees.filter((_, i) => i !== idx) 
                      })}
                      className="hover:opacity-70"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={!content.trim() || isSubmitting}
        className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
          config.bgColor} ${config.color} hover:opacity-90 disabled:opacity-50`}
      >
        {isSubmitting ? 'Adding...' : `Add ${config.label}`}
      </button>
    </form>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DailyLogPanel({ projectId, selectedDate, onOpenSiteIssues, onViewArchive, compact = false }: DailyLogPanelProps) {
  const [activeTab, setActiveTab] = useState<DailyLogType>('visitor');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const dailyLogs = useSupervisorStore((s) => s.dailyLogs);
  const fetchDailyLogsForDateRange = useSupervisorStore((s) => s.fetchDailyLogsForDateRange);
  const deleteDailyLog = useSupervisorStore((s) => s.deleteDailyLog);
  const toggleSiteIssueStatus = useSupervisorStore((s) => s.toggleSiteIssueStatus);
  const getOpenSiteIssues = useSupervisorStore((s) => s.getOpenSiteIssues);

  const today = selectedDate ?? getTodayDate();
  const sevenDaysAgo = getSevenDaysAgoDate();

  // Fetch logs for the past 7 days on mount and when project changes
  useEffect(() => {
    fetchDailyLogsForDateRange(projectId, sevenDaysAgo, today);
  }, [projectId, sevenDaysAgo, today, fetchDailyLogsForDateRange]);

  // Filter logs by current tab (within 7-day range)
  const filteredByType = dailyLogs.filter((log) => log.log_type === activeTab);

  // Group filtered logs by period
  const logsByPeriod = useMemo(() => {
    const grouped: Record<DatePeriod, ProjectDailyLog[]> = {
      today: [],
      yesterday: [],
      earlierThisWeek: [],
    };
    
    filteredByType.forEach((log) => {
      const period = getDatePeriod(log.log_date);
      grouped[period].push(log);
    });
    
    return grouped;
  }, [filteredByType]);

  // Get counts for each tab (all periods combined)
  const getLogCount = (type: DailyLogType) => 
    dailyLogs.filter((log) => log.log_type === type).length;

  const openIssuesCount = getOpenSiteIssues().length;

  const tabs: { type: DailyLogType; label: string }[] = [
    { type: 'visitor', label: 'Visitors' },
    { type: 'delivery', label: 'Deliveries' },
    { type: 'site_issue', label: 'Site Issues' },
    { type: 'manpower', label: 'Manpower' },
    { type: 'schedule_delay', label: 'Schedule' },
    { type: 'observation', label: 'Observations' },
    { type: 'note', label: 'Notes' },
    { type: 'meeting_minutes', label: 'Meetings' },
  ];

  const handleDelete = async (logId: string) => {
    if (confirm('Delete this log entry?')) {
      await deleteDailyLog(logId);
    }
  };

  const handleToggleStatus = async (logId: string, newStatus: SiteIssueStatus) => {
    await toggleSiteIssueStatus(logId, newStatus);
  };

  return (
    <div className={`bg-white ${compact ? '' : 'border border-gray-200 rounded-lg shadow-sm'}`}>
      {/* Header */}
      <div className={`${compact ? 'pb-3' : 'p-4'} border-b border-gray-200`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Daily Log</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Last 7 days
            </p>
          </div>
          <div className="flex items-center gap-2">
            {openIssuesCount > 0 && onOpenSiteIssues && (
              <button
                onClick={onOpenSiteIssues}
                className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
              >
                {openIssuesCount} Open Issue{openIssuesCount !== 1 ? 's' : ''}
              </button>
            )}
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title={showAddForm ? 'Close form' : 'Add entry'}
            >
              <svg className={`w-5 h-5 transition-transform ${showAddForm ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`${compact ? 'py-2' : 'px-4 py-2'} border-b border-gray-100 overflow-x-auto`}>
        <div className="flex gap-1 min-w-max">
          {tabs.map(({ type, label }) => {
            const count = getLogCount(type);
            const config = DAILY_LOG_TYPE_CONFIG[type];
            const isActive = activeTab === type;
            
            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? `${config.bgColor} ${config.color}`
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{config.icon}</span>
                <span>{label}</span>
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive ? 'bg-white/50' : 'bg-gray-200'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Form (collapsible) */}
      {showAddForm && (
        <div className={`${compact ? 'py-3' : 'p-4'} border-b border-gray-200 bg-gray-50`}>
          <QuickAddForm
            logType={activeTab}
            projectId={projectId}
            selectedDate={today}
            onAdded={() => setShowAddForm(false)}
          />
        </div>
      )}

      {/* Log Entries List - Grouped by Period */}
      <div className={`${compact ? 'py-3' : 'p-4'} space-y-4 max-h-96 overflow-y-auto`}>
        {filteredByType.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-400">No {DAILY_LOG_TYPE_CONFIG[activeTab].label.toLowerCase()} logged yet</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add first entry
            </button>
          </div>
        ) : (
          <>
            {/* Render each period section */}
            {(['today', 'yesterday', 'earlierThisWeek'] as DatePeriod[]).map((period) => {
              const periodLogs = logsByPeriod[period];
              if (periodLogs.length === 0) return null;
              
              const periodConfig = PERIOD_CONFIG[period];
              
              return (
                <div key={period}>
                  {/* Period Header */}
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-sm">{periodConfig.icon}</span>
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {periodConfig.label}
                    </span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {periodLogs.length}
                    </span>
                  </div>
                  
                  {/* Period Logs */}
                  <div className="space-y-2">
                    {periodLogs.map((log) => (
                      <LogEntryCard
                        key={log.id}
                        log={log}
                        onDelete={handleDelete}
                        onToggleStatus={log.log_type === 'site_issue' ? handleToggleStatus : undefined}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            
            {/* View Archive Link */}
            {onViewArchive && (
              <div className="pt-3 border-t border-gray-200">
                <button
                  onClick={onViewArchive}
                  className="w-full py-2 px-4 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                  View Log Archive
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
