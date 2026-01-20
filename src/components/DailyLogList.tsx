import { useState, useMemo } from 'react';
import type { ProjectDailyLog, DailyLogType, ObservationMetadata, DeliveryMetadata, VisitorMetadata, ManpowerMetadata, SiteIssueMetadata, ScheduleDelayMetadata } from '@/types/supervisor';
import { DAILY_LOG_TYPE_CONFIG } from '@/types/supervisor';

type SortMode = 'time_desc' | 'time_asc' | 'category';

interface DailyLogListProps {
  logs: ProjectDailyLog[];
  onLogClick?: (log: ProjectDailyLog) => void;
  onDeleteLog?: (logId: string) => void;
  /** Show only specific log types, or all if undefined */
  filterTypes?: DailyLogType[];
}

export function DailyLogList({ logs, onLogClick, onDeleteLog, filterTypes }: DailyLogListProps) {
  const [sortMode, setSortMode] = useState<SortMode>('time_desc');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Filter and sort logs
  const processedLogs = useMemo(() => {
    let filtered = logs;
    
    // Apply type filter if provided
    if (filterTypes && filterTypes.length > 0) {
      filtered = logs.filter(log => filterTypes.includes(log.log_type));
    }

    // Sort based on mode
    if (sortMode === 'time_desc') {
      return [...filtered].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } else if (sortMode === 'time_asc') {
      return [...filtered].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }
    
    // Category grouping - sort by type first, then by time within each type
    return [...filtered].sort((a, b) => {
      if (a.log_type !== b.log_type) {
        return a.log_type.localeCompare(b.log_type);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [logs, sortMode, filterTypes]);

  // Group logs by category when in category mode
  const groupedLogs = useMemo(() => {
    if (sortMode !== 'category') return null;
    
    const groups: Record<DailyLogType, ProjectDailyLog[]> = {
      visitor: [],
      delivery: [],
      site_issue: [],
      manpower: [],
      schedule_delay: [],
      observation: [],
    };
    
    processedLogs.forEach(log => {
      groups[log.log_type].push(log);
    });
    
    return groups;
  }, [processedLogs, sortMode]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) return 'Today';
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const renderMetadataPreview = (log: ProjectDailyLog) => {
    const metadata = log.metadata;
    
    switch (log.log_type) {
      case 'observation': {
        const obs = metadata as ObservationMetadata;
        return (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {obs.location && <span>📍 {obs.location}</span>}
            {obs.area && <span>• {obs.area}</span>}
            {obs.photo_url && <span className="text-teal-600">📷 Photo</span>}
          </div>
        );
      }
      case 'delivery': {
        const del = metadata as DeliveryMetadata;
        return (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {del.supplier && <span>🏢 {del.supplier}</span>}
            {del.items && <span>• {del.items}</span>}
          </div>
        );
      }
      case 'visitor': {
        const vis = metadata as VisitorMetadata;
        return (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {vis.name && <span>👤 {vis.name}</span>}
            {vis.company && <span>• {vis.company}</span>}
          </div>
        );
      }
      case 'manpower': {
        const man = metadata as ManpowerMetadata;
        return (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {man.company && <span>🏢 {man.company}</span>}
            {man.trade && <span>• {man.trade}</span>}
            {man.count && <span>• {man.count} workers</span>}
          </div>
        );
      }
      case 'site_issue': {
        const issue = metadata as SiteIssueMetadata;
        return (
          <div className="flex items-center gap-2 text-xs">
            {issue.priority && (
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                issue.priority === 'high' ? 'bg-red-100 text-red-700' :
                issue.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {issue.priority}
              </span>
            )}
            {log.status && log.status !== 'active' && (
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                log.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {log.status}
              </span>
            )}
          </div>
        );
      }
      case 'schedule_delay': {
        const delay = metadata as ScheduleDelayMetadata;
        return (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {delay.delay_type && <span>⏱️ {delay.delay_type}</span>}
            {delay.impact_hours && <span>• {delay.impact_hours}h impact</span>}
          </div>
        );
      }
      default:
        return null;
    }
  };

  const renderLogCard = (log: ProjectDailyLog) => {
    const config = DAILY_LOG_TYPE_CONFIG[log.log_type];
    const isExpanded = expandedLogId === log.id;
    const obsMetadata = log.log_type === 'observation' ? log.metadata as ObservationMetadata : null;
    
    return (
      <div
        key={log.id}
        className={`
          group relative bg-white border border-gray-200 rounded-lg p-3
          hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer
          ${isExpanded ? 'ring-2 ring-blue-200' : ''}
        `}
        onClick={() => {
          if (onLogClick) {
            onLogClick(log);
          } else {
            setExpandedLogId(isExpanded ? null : log.id);
          }
        }}
      >
        <div className="flex items-start gap-3">
          {/* Type Icon */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center`}>
            <span className="text-sm">{config.icon}</span>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium ${config.color}`}>
                {config.label}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">
                {formatDate(log.created_at)} {formatTime(log.created_at)}
              </span>
            </div>
            
            <p className={`text-sm text-gray-800 ${isExpanded ? '' : 'line-clamp-2'}`}>
              {log.content}
            </p>
            
            {/* Metadata Preview */}
            <div className="mt-1">
              {renderMetadataPreview(log)}
            </div>
            
            {/* Photo thumbnail for observations */}
            {obsMetadata?.photo_url && (
              <div className="mt-2">
                <img 
                  src={obsMetadata.photo_url} 
                  alt="Observation" 
                  className="w-16 h-16 object-cover rounded-md border border-gray-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(obsMetadata.photo_url, '_blank');
                  }}
                />
              </div>
            )}
          </div>
          
          {/* Delete button - shows on hover */}
          {onDeleteLog && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Delete this log entry?')) {
                  onDeleteLog(log.id);
                }
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
              title="Delete log"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderCategoryGroup = (logType: DailyLogType, logsInGroup: ProjectDailyLog[]) => {
    if (logsInGroup.length === 0) return null;
    
    const config = DAILY_LOG_TYPE_CONFIG[logType];
    
    return (
      <div key={logType} className="mb-4">
        <div className={`flex items-center gap-2 mb-2 px-1`}>
          <span className="text-lg">{config.icon}</span>
          <span className={`text-sm font-semibold ${config.color}`}>
            {config.label}
          </span>
          <span className="text-xs text-gray-400">({logsInGroup.length})</span>
        </div>
        <div className="space-y-2">
          {logsInGroup.map(renderLogCard)}
        </div>
      </div>
    );
  };

  if (logs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <span className="text-3xl mb-2 block">📋</span>
          <p className="text-sm">No log entries yet today</p>
          <p className="text-xs text-gray-400 mt-1">Use Quick Add above to create your first entry</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      {/* Header with sort controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Today's Logs
          </span>
          <span className="text-xs text-gray-400">({processedLogs.length})</span>
        </div>
        
        {/* Sort Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setSortMode('time_desc')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              sortMode === 'time_desc' 
                ? 'bg-white text-gray-800 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            title="Sort by newest first"
          >
            ↓ Newest
          </button>
          <button
            onClick={() => setSortMode('time_asc')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              sortMode === 'time_asc' 
                ? 'bg-white text-gray-800 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            title="Sort by oldest first"
          >
            ↑ Oldest
          </button>
          <button
            onClick={() => setSortMode('category')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
              sortMode === 'category' 
                ? 'bg-white text-gray-800 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            title="Group by category"
          >
            📁 Category
          </button>
        </div>
      </div>
      
      {/* Log List */}
      <div className="max-h-[400px] overflow-y-auto pr-1">
        {sortMode === 'category' && groupedLogs ? (
          // Grouped by category
          <div>
            {(Object.keys(groupedLogs) as DailyLogType[]).map(logType => 
              renderCategoryGroup(logType, groupedLogs[logType])
            )}
          </div>
        ) : (
          // Sorted by time
          <div className="space-y-2">
            {processedLogs.map(renderLogCard)}
          </div>
        )}
      </div>
    </div>
  );
}
