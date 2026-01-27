import { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';

import { useSupervisorStore } from '@/stores/supervisorStore';
import type { ProjectDailyLog, DailyLogType, SiteIssueStatus } from '@/types/supervisor';
import { DAILY_LOG_TYPE_CONFIG, SITE_ISSUE_STATUS_CONFIG } from '@/types/supervisor';

// ============================================================================
// Helper Functions
// ============================================================================

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
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

// ============================================================================
// Log Card Component
// ============================================================================

interface LogCardProps {
  log: ProjectDailyLog;
  onDelete: (logId: string) => void;
  onToggleStatus?: (logId: string, newStatus: SiteIssueStatus) => void;
}

function LogCard({ log, onDelete, onToggleStatus }: LogCardProps) {
  const config = DAILY_LOG_TYPE_CONFIG[log.log_type];
  const isSiteIssue = log.log_type === 'site_issue';
  const statusConfig = isSiteIssue ? SITE_ISSUE_STATUS_CONFIG[log.status] : null;

  return (
    <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm group hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
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
          
          <p className="text-sm text-gray-800">{log.content}</p>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
          
          <button
            onClick={() => {
              if (confirm('Delete this log entry?')) {
                onDelete(log.id);
              }
            }}
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
// Main Component
// ============================================================================

export default function LogArchive() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  
  // Date range state - default to 30 days back from 7 days ago (archive starts at 7 days)
  const sevenDaysAgo = getDateDaysAgo(7);
  const thirtyDaysBack = getDateDaysAgo(37); // 30 days of archive starting from 7 days ago
  
  const [dateFrom, setDateFrom] = useState(thirtyDaysBack);
  const [dateTo, setDateTo] = useState(sevenDaysAgo);
  const [filterType, setFilterType] = useState<DailyLogType | 'all'>('all');
  
  // Store
  const currentProject = useSupervisorStore((s) => s.currentProject);
  const dailyLogs = useSupervisorStore((s) => s.dailyLogs);
  const loading = useSupervisorStore((s) => s.loading);
  const fetchDailyLogsForDateRange = useSupervisorStore((s) => s.fetchDailyLogsForDateRange);
  const fetchProjects = useSupervisorStore((s) => s.fetchProjects);
  const setCurrentProject = useSupervisorStore((s) => s.setCurrentProject);
  const projects = useSupervisorStore((s) => s.projects);
  const deleteDailyLog = useSupervisorStore((s) => s.deleteDailyLog);
  const toggleSiteIssueStatus = useSupervisorStore((s) => s.toggleSiteIssueStatus);

  // Fetch project if not set
  useEffect(() => {
    if (!currentProject && projectId) {
      fetchProjects().then(() => {
        const project = useSupervisorStore.getState().projects.find(p => p.id === projectId);
        if (project) {
          setCurrentProject(project);
        }
      });
    }
  }, [projectId, currentProject, fetchProjects, setCurrentProject]);

  // Fetch logs when date range changes
  useEffect(() => {
    if (projectId && dateFrom && dateTo) {
      fetchDailyLogsForDateRange(projectId, dateFrom, dateTo);
    }
  }, [projectId, dateFrom, dateTo, fetchDailyLogsForDateRange]);

  // Filter and group logs by date
  const { filteredLogs, logsByDate } = useMemo(() => {
    let filtered = dailyLogs;
    
    // Filter by type if not 'all'
    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.log_type === filterType);
    }
    
    // Group by date
    const grouped: Record<string, ProjectDailyLog[]> = {};
    filtered.forEach(log => {
      if (!grouped[log.log_date]) {
        grouped[log.log_date] = [];
      }
      grouped[log.log_date].push(log);
    });
    
    // Sort dates descending
    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    const sortedGrouped: Record<string, ProjectDailyLog[]> = {};
    sortedDates.forEach(date => {
      sortedGrouped[date] = grouped[date].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
    
    return { filteredLogs: filtered, logsByDate: sortedGrouped };
  }, [dailyLogs, filterType]);

  const handleDelete = async (logId: string) => {
    await deleteDailyLog(logId);
  };

  const handleToggleStatus = async (logId: string, newStatus: SiteIssueStatus) => {
    await toggleSiteIssueStatus(logId, newStatus);
  };

  const projectName = currentProject?.name || projects.find(p => p.id === projectId)?.name || 'Project';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/projects/${projectId}`)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Project"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Log Archive</h1>
                <p className="text-xs text-gray-500">{projectName}</p>
              </div>
            </div>
            
            <Link
              to="/projects"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              All Projects
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-end gap-4">
            {/* Date Range */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                max={dateTo}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom}
                max={getTodayDate()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Log Type Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-gray-700 mb-1">Log Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as DailyLogType | 'all')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                {Object.entries(DAILY_LOG_TYPE_CONFIG).map(([type, config]) => (
                  <option key={type} value={type}>
                    {config.icon} {config.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Result Count */}
            <div className="text-sm text-gray-500">
              {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''} found
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredLogs.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <span className="text-4xl mb-4 block">📋</span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No archived logs found</h3>
            <p className="text-sm text-gray-500">
              Try adjusting the date range or log type filter.
            </p>
          </div>
        )}

        {/* Logs Grouped by Date */}
        {!loading && filteredLogs.length > 0 && (
          <div className="space-y-6">
            {Object.entries(logsByDate).map(([date, logs]) => (
              <div key={date} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Date Header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-800">
                      {formatDateHeader(date)}
                    </h2>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                      {logs.length} log{logs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                
                {/* Logs for this date */}
                <div className="p-4 space-y-2">
                  {logs.map(log => (
                    <LogCard
                      key={log.id}
                      log={log}
                      onDelete={handleDelete}
                      onToggleStatus={log.log_type === 'site_issue' ? handleToggleStatus : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
