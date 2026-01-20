import { useState, useEffect } from 'react';
import { useSupervisorStore } from '@/stores/supervisorStore';
import type {
  DailyLogType,
  ProjectDailyLog,
  VisitorMetadata,
  DeliveryMetadata,
  ManpowerMetadata,
  SiteIssueMetadata,
  ScheduleDelayMetadata,
  ObservationMetadata,
  SiteIssueStatus,
} from '@/types/supervisor';
import {
  DAILY_LOG_TYPE_CONFIG,
  SITE_ISSUE_STATUS_CONFIG,
} from '@/types/supervisor';

interface DailyLogPanelProps {
  projectId: string;
  selectedDate?: string; // ISO date, defaults to today
  onOpenSiteIssues?: () => void;
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
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Type-specific metadata
  const [visitorMeta, setVisitorMeta] = useState<VisitorMetadata>({ name: '', company: '', time_in: getCurrentTime() });
  const [deliveryMeta, setDeliveryMeta] = useState<DeliveryMetadata>({ supplier: '', items: '', delivery_time: getCurrentTime() });
  const [manpowerMeta, setManpowerMeta] = useState<ManpowerMetadata>({ company: '', trade: '', count: 0, hours: 8 });
  const [issueMeta, setIssueMeta] = useState<SiteIssueMetadata>({ priority: 'medium' });
  const [scheduleMeta, setScheduleMeta] = useState<ScheduleDelayMetadata>({ delay_type: 'other' });
  const [observationMeta, setObservationMeta] = useState<ObservationMetadata>({ location: '', area: '' });

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
    setManpowerMeta({ company: '', trade: '', count: 0, hours: 8 });
    setIssueMeta({ priority: 'medium' });
    setScheduleMeta({ delay_type: 'other' });
    setObservationMeta({ location: '', area: '' });
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

export function DailyLogPanel({ projectId, selectedDate, onOpenSiteIssues, compact = false }: DailyLogPanelProps) {
  const [activeTab, setActiveTab] = useState<DailyLogType>('visitor');
  const [showAddForm, setShowAddForm] = useState(false);
  
  const dailyLogs = useSupervisorStore((s) => s.dailyLogs);
  const fetchDailyLogs = useSupervisorStore((s) => s.fetchDailyLogs);
  const deleteDailyLog = useSupervisorStore((s) => s.deleteDailyLog);
  const toggleSiteIssueStatus = useSupervisorStore((s) => s.toggleSiteIssueStatus);
  const getOpenSiteIssues = useSupervisorStore((s) => s.getOpenSiteIssues);

  const today = selectedDate ?? getTodayDate();

  // Fetch logs on mount and when date changes
  useEffect(() => {
    fetchDailyLogs(projectId, today);
  }, [projectId, today, fetchDailyLogs]);

  // Filter logs by current tab and date
  const filteredLogs = dailyLogs.filter(
    (log) => log.log_type === activeTab && log.log_date === today
  );

  // Get counts for each tab
  const getLogCount = (type: DailyLogType) => 
    dailyLogs.filter((log) => log.log_type === type && log.log_date === today).length;

  const openIssuesCount = getOpenSiteIssues().length;

  const tabs: { type: DailyLogType; label: string }[] = [
    { type: 'visitor', label: 'Visitors' },
    { type: 'delivery', label: 'Deliveries' },
    { type: 'site_issue', label: 'Site Issues' },
    { type: 'manpower', label: 'Manpower' },
    { type: 'schedule_delay', label: 'Schedule' },
    { type: 'observation', label: 'Observations' },
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
              {new Date(today + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
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

      {/* Log Entries List */}
      <div className={`${compact ? 'py-3' : 'p-4'} space-y-2 max-h-80 overflow-y-auto`}>
        {filteredLogs.length === 0 ? (
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
          filteredLogs.map((log) => (
            <LogEntryCard
              key={log.id}
              log={log}
              onDelete={handleDelete}
              onToggleStatus={log.log_type === 'site_issue' ? handleToggleStatus : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
