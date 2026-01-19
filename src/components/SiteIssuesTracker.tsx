import { useState, useEffect, useMemo } from 'react';
import { useSupervisorStore } from '@/stores/supervisorStore';
import type {
  ProjectDailyLog,
  SiteIssueStatus,
  SiteIssueMetadata,
  CreateDailyLogInput,
} from '@/types/supervisor';
import { SITE_ISSUE_STATUS_CONFIG } from '@/types/supervisor';

interface SiteIssuesTrackerProps {
  projectId: string;
  onClose: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// ============================================================================
// Issue Card Component
// ============================================================================

interface IssueCardProps {
  issue: ProjectDailyLog;
  onStatusChange: (issueId: string, newStatus: SiteIssueStatus) => void;
  onDelete: (issueId: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

function IssueCard({ issue, onStatusChange, onDelete, isExpanded, onToggleExpand }: IssueCardProps) {
  const metadata = issue.metadata as SiteIssueMetadata;
  const statusConfig = SITE_ISSUE_STATUS_CONFIG[issue.status];

  const priorityColors = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
  };

  return (
    <div className={`border rounded-lg transition-all ${
      issue.status === 'resolved' ? 'border-green-200 bg-green-50/50' :
      issue.status === 'continued' ? 'border-yellow-200 bg-yellow-50/50' :
      'border-gray-200 bg-white'
    }`}>
      {/* Header */}
      <div
        className="p-3 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-start gap-3">
          {/* Status indicator */}
          <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
            issue.status === 'resolved' ? 'bg-green-500' :
            issue.status === 'continued' ? 'bg-yellow-500' :
            'bg-red-500'
          }`} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {/* Priority badge */}
              {metadata.priority && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded ${priorityColors[metadata.priority]}`}>
                  {metadata.priority.charAt(0).toUpperCase() + metadata.priority.slice(1)}
                </span>
              )}
              
              {/* Status badge */}
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusConfig.bgColor} ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
              
              {/* Date */}
              <span className="text-xs text-gray-400">
                {formatDate(issue.log_date)}
              </span>
            </div>
            
            {/* Content */}
            <p className={`text-sm ${issue.status === 'resolved' ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
              {issue.content}
            </p>
            
            {/* Assigned to */}
            {metadata.assigned_to && (
              <p className="text-xs text-gray-500 mt-1">
                Assigned to: {metadata.assigned_to}
              </p>
            )}
          </div>
          
          {/* Expand indicator */}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-3">
          <div className="space-y-3">
            {/* Metadata */}
            <div className="text-xs text-gray-500 space-y-1">
              <p><span className="font-medium">Created:</span> {formatDateTime(issue.created_at)}</p>
              {metadata.resolution_notes && (
                <p><span className="font-medium">Resolution:</span> {metadata.resolution_notes}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <select
                value={issue.status}
                onChange={(e) => onStatusChange(issue.id, e.target.value as SiteIssueStatus)}
                className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
              >
                <option value="active">Open</option>
                <option value="resolved">Resolved</option>
                <option value="continued">Continued to Next Day</option>
              </select>
              
              <button
                onClick={() => onDelete(issue.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Add Issue Form
// ============================================================================

interface AddIssueFormProps {
  projectId: string;
  onSubmit: () => void;
  onCancel: () => void;
}

function AddIssueForm({ projectId, onSubmit, onCancel }: AddIssueFormProps) {
  const addDailyLog = useSupervisorStore((s) => s.addDailyLog);
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [assignedTo, setAssignedTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);

    const input: CreateDailyLogInput = {
      project_id: projectId,
      log_date: getTodayDate(),
      log_type: 'site_issue',
      content: content.trim(),
      metadata: {
        priority,
        assigned_to: assignedTo.trim() || undefined,
      } as SiteIssueMetadata,
      status: 'active',
    };

    await addDailyLog(input);
    setIsSubmitting(false);
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-gray-50 border-b border-gray-200">
      <h4 className="text-sm font-semibold text-gray-800 mb-3">Add Site Issue</h4>
      
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Issue Description *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Describe the site issue..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
            required
            autoFocus
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
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
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Add Issue'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SiteIssuesTracker({ projectId, onClose }: SiteIssuesTrackerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<SiteIssueStatus | 'all'>('all');
  
  const dailyLogs = useSupervisorStore((s) => s.dailyLogs);
  const fetchDailyLogs = useSupervisorStore((s) => s.fetchDailyLogs);
  const deleteDailyLog = useSupervisorStore((s) => s.deleteDailyLog);
  const toggleSiteIssueStatus = useSupervisorStore((s) => s.toggleSiteIssueStatus);

  // Fetch all logs (no date filter) to see all issues
  useEffect(() => {
    fetchDailyLogs(projectId);
  }, [projectId, fetchDailyLogs]);

  // Filter to only site issues
  const siteIssues = useMemo(() => {
    return dailyLogs
      .filter((log) => log.log_type === 'site_issue')
      .filter((log) => filterStatus === 'all' || log.status === filterStatus);
  }, [dailyLogs, filterStatus]);

  // Group by status
  const groupedIssues = useMemo(() => {
    const groups: Record<SiteIssueStatus, ProjectDailyLog[]> = {
      active: [],
      continued: [],
      resolved: [],
    };
    
    siteIssues.forEach((issue) => {
      groups[issue.status].push(issue);
    });
    
    // Sort each group by date (newest first)
    Object.keys(groups).forEach((status) => {
      groups[status as SiteIssueStatus].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
    
    return groups;
  }, [siteIssues]);

  const handleStatusChange = async (issueId: string, newStatus: SiteIssueStatus) => {
    await toggleSiteIssueStatus(issueId, newStatus);
  };

  const handleDelete = async (issueId: string) => {
    if (confirm('Delete this site issue?')) {
      await deleteDailyLog(issueId);
    }
  };

  const totalOpen = groupedIssues.active.length + groupedIssues.continued.length;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1 -ml-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-900">Site Issues</h2>
            {totalOpen > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                {totalOpen} Open
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Issue
          </button>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(['all', 'active', 'continued', 'resolved'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                filterStatus === status
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'All' : SITE_ISSUE_STATUS_CONFIG[status].label}
              {status !== 'all' && (
                <span className="ml-1">({groupedIssues[status].length})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <AddIssueForm
          projectId={projectId}
          onSubmit={() => setShowAddForm(false)}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Issues List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {siteIssues.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Site Issues</h3>
            <p className="text-gray-500 mb-4">
              {filterStatus === 'all'
                ? 'No site issues have been logged yet.'
                : `No ${SITE_ISSUE_STATUS_CONFIG[filterStatus as SiteIssueStatus].label.toLowerCase()} issues.`}
            </p>
            {filterStatus === 'all' && (
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Log First Issue
              </button>
            )}
          </div>
        ) : filterStatus === 'all' ? (
          // Show grouped by status
          <>
            {/* Open Issues */}
            {groupedIssues.active.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Open ({groupedIssues.active.length})
                </h3>
                <div className="space-y-2">
                  {groupedIssues.active.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      isExpanded={expandedIssueId === issue.id}
                      onToggleExpand={() => setExpandedIssueId(expandedIssueId === issue.id ? null : issue.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Continued Issues */}
            {groupedIssues.continued.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-yellow-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-500" />
                  Continued ({groupedIssues.continued.length})
                </h3>
                <div className="space-y-2">
                  {groupedIssues.continued.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      isExpanded={expandedIssueId === issue.id}
                      onToggleExpand={() => setExpandedIssueId(expandedIssueId === issue.id ? null : issue.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Resolved Issues */}
            {groupedIssues.resolved.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Resolved ({groupedIssues.resolved.length})
                </h3>
                <div className="space-y-2">
                  {groupedIssues.resolved.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      isExpanded={expandedIssueId === issue.id}
                      onToggleExpand={() => setExpandedIssueId(expandedIssueId === issue.id ? null : issue.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          // Show filtered list
          <div className="space-y-2">
            {siteIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
                isExpanded={expandedIssueId === issue.id}
                onToggleExpand={() => setExpandedIssueId(expandedIssueId === issue.id ? null : issue.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
