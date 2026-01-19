import { useState, useEffect, useMemo } from 'react';
import { useSupervisorStore } from '@/stores/supervisorStore';
import type {
  WeatherData,
  ProjectDailyLog,
  ProjectDailyReport,
  DailyLogType,
  VisitorMetadata,
  DeliveryMetadata,
  ManpowerMetadata,
  SiteIssueMetadata,
  ScheduleDelayMetadata,
} from '@/types/supervisor';
import {
  WEATHER_CONDITIONS,
  DAILY_LOG_TYPE_CONFIG,
  SITE_ISSUE_STATUS_CONFIG,
} from '@/types/supervisor';

interface ProjectDailyReportModalProps {
  projectId: string;
  projectName: string;
  reportDate: string; // ISO date (YYYY-MM-DD)
  existingReport?: ProjectDailyReport;
  onClose: () => void;
  onGenerated?: (report: ProjectDailyReport) => void;
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

function formatTime(timeStr: string | undefined): string {
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
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ============================================================================
// Weather Section Component
// ============================================================================

interface WeatherSectionProps {
  weather: WeatherData;
  onChange: (weather: WeatherData) => void;
  readOnly?: boolean;
}

function WeatherSection({ weather, onChange, readOnly }: WeatherSectionProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
        <span>🌤️</span> Weather Conditions
      </h3>
      
      {readOnly ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Conditions:</span>
            <p className="font-medium">
              {WEATHER_CONDITIONS.find(w => w.value === weather.conditions)?.icon}{' '}
              {WEATHER_CONDITIONS.find(w => w.value === weather.conditions)?.label ?? 'Not set'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Temperature:</span>
            <p className="font-medium">
              {weather.temperature !== undefined ? `${weather.temperature}°${weather.temperature_unit ?? 'F'}` : 'Not set'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Wind:</span>
            <p className="font-medium">
              {weather.wind_speed !== undefined ? `${weather.wind_speed} mph ${weather.wind_direction ?? ''}` : 'Not set'}
            </p>
          </div>
          <div>
            <span className="text-gray-500">Precipitation:</span>
            <p className="font-medium">{weather.precipitation ?? 'None'}</p>
          </div>
          {weather.notes && (
            <div className="col-span-2 md:col-span-4">
              <span className="text-gray-500">Notes:</span>
              <p className="font-medium">{weather.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Conditions</label>
            <select
              value={weather.conditions ?? ''}
              onChange={(e) => onChange({ ...weather, conditions: e.target.value as WeatherData['conditions'] })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
            >
              <option value="">Select...</option>
              {WEATHER_CONDITIONS.map((w) => (
                <option key={w.value} value={w.value}>{w.icon} {w.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Temperature</label>
            <div className="flex gap-1">
              <input
                type="number"
                value={weather.temperature ?? ''}
                onChange={(e) => onChange({ ...weather, temperature: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                placeholder="°F"
              />
              <select
                value={weather.temperature_unit ?? 'F'}
                onChange={(e) => onChange({ ...weather, temperature_unit: e.target.value as 'F' | 'C' })}
                className="px-2 py-1.5 border border-gray-300 rounded text-sm"
              >
                <option value="F">°F</option>
                <option value="C">°C</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Wind Speed</label>
            <input
              type="number"
              value={weather.wind_speed ?? ''}
              onChange={(e) => onChange({ ...weather, wind_speed: e.target.value ? parseInt(e.target.value) : undefined })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              placeholder="mph"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Precipitation</label>
            <input
              type="text"
              value={weather.precipitation ?? ''}
              onChange={(e) => onChange({ ...weather, precipitation: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              placeholder="None"
            />
          </div>
          <div className="col-span-2 md:col-span-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">Weather Notes</label>
            <input
              type="text"
              value={weather.notes ?? ''}
              onChange={(e) => onChange({ ...weather, notes: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              placeholder="Optional weather notes..."
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Log Section Component
// ============================================================================

interface LogSectionProps {
  title: string;
  icon: string;
  logs: ProjectDailyLog[];
  logType: DailyLogType;
  bgColor: string;
  borderColor: string;
}

function LogSection({ title, icon, logs, logType, bgColor, borderColor }: LogSectionProps) {
  if (logs.length === 0) return null;

  const renderLogContent = (log: ProjectDailyLog) => {
    switch (logType) {
      case 'visitor': {
        const meta = log.metadata as VisitorMetadata;
        return (
          <div className="py-2 border-b border-gray-100 last:border-0">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">{meta.name || 'Visitor'}</p>
                {meta.company && <p className="text-xs text-gray-500">{meta.company}</p>}
              </div>
              <div className="text-xs text-gray-500 text-right">
                {meta.time_in && <span>{formatTime(meta.time_in)}</span>}
                {meta.time_in && meta.time_out && <span> - </span>}
                {meta.time_out && <span>{formatTime(meta.time_out)}</span>}
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-1">{log.content}</p>
          </div>
        );
      }
      case 'delivery': {
        const meta = log.metadata as DeliveryMetadata;
        return (
          <div className="py-2 border-b border-gray-100 last:border-0">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">{meta.supplier || 'Delivery'}</p>
                {meta.received_by && <p className="text-xs text-gray-500">Received by: {meta.received_by}</p>}
              </div>
              {meta.delivery_time && (
                <span className="text-xs text-gray-500">{formatTime(meta.delivery_time)}</span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">{log.content}</p>
          </div>
        );
      }
      case 'manpower': {
        const meta = log.metadata as ManpowerMetadata;
        return (
          <div className="py-2 border-b border-gray-100 last:border-0">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {meta.company || 'Crew'} {meta.trade && `- ${meta.trade}`}
                </p>
              </div>
              <div className="text-xs text-gray-500 text-right">
                {meta.count !== undefined && <span>{meta.count} workers</span>}
                {meta.count !== undefined && meta.hours !== undefined && <span> • </span>}
                {meta.hours !== undefined && <span>{meta.hours} hrs</span>}
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-1">{log.content}</p>
          </div>
        );
      }
      case 'site_issue': {
        const meta = log.metadata as SiteIssueMetadata;
        const statusConfig = SITE_ISSUE_STATUS_CONFIG[log.status];
        return (
          <div className="py-2 border-b border-gray-100 last:border-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {meta.priority && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                    meta.priority === 'high' ? 'bg-red-100 text-red-700' :
                    meta.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {meta.priority.toUpperCase()}
                  </span>
                )}
                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${statusConfig.bgColor} ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </div>
              {meta.assigned_to && (
                <span className="text-xs text-gray-500">{meta.assigned_to}</span>
              )}
            </div>
            <p className="text-sm text-gray-800 mt-1">{log.content}</p>
            {meta.resolution_notes && (
              <p className="text-xs text-green-600 mt-1">Resolution: {meta.resolution_notes}</p>
            )}
          </div>
        );
      }
      case 'schedule_delay': {
        const meta = log.metadata as ScheduleDelayMetadata;
        return (
          <div className="py-2 border-b border-gray-100 last:border-0">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {meta.delay_type && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-orange-100 text-orange-700">
                    {meta.delay_type.replace('_', ' ').toUpperCase()}
                  </span>
                )}
              </div>
              {meta.impact_hours !== undefined && (
                <span className="text-xs text-red-600 font-medium">{meta.impact_hours} hr impact</span>
              )}
            </div>
            <p className="text-sm text-gray-800 mt-1">{log.content}</p>
            {meta.affected_areas && (
              <p className="text-xs text-gray-500 mt-1">Affected: {meta.affected_areas}</p>
            )}
          </div>
        );
      }
      default:
        return (
          <div className="py-2 border-b border-gray-100 last:border-0">
            <p className="text-sm text-gray-800">{log.content}</p>
          </div>
        );
    }
  };

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-4`}>
      <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <span>{icon}</span> {title} ({logs.length})
      </h3>
      <div className="bg-white rounded-lg px-3 divide-y divide-gray-100">
        {logs.map((log) => (
          <div key={log.id}>
            {renderLogContent(log)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Shift Summary Component
// ============================================================================

interface ShiftSummaryProps {
  shifts: Array<{
    id: string;
    name: string;
    scheduled_date: string;
    start_time: string | null;
    end_time: string | null;
    worker_count: number;
    forms_submitted: number;
    status: string;
    shift_tasks: Array<{ id: string; content: string; checked: boolean }>;
    shift_notes: Array<{ id: string; content: string }>;
  }>;
}

function ShiftSummary({ shifts }: ShiftSummaryProps) {
  if (shifts.length === 0) return null;

  const totalWorkers = shifts.reduce((sum, s) => sum + s.worker_count, 0);
  const totalForms = shifts.reduce((sum, s) => sum + s.forms_submitted, 0);
  const totalTasks = shifts.reduce((sum, s) => sum + (s.shift_tasks?.length ?? 0), 0);
  const completedTasks = shifts.reduce((sum, s) => sum + (s.shift_tasks?.filter(t => t.checked).length ?? 0), 0);

  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-2">
        <span>📋</span> Shift Summary
      </h3>
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-purple-600">{shifts.length}</p>
          <p className="text-xs text-gray-500">Shifts</p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{totalWorkers}</p>
          <p className="text-xs text-gray-500">Workers</p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{totalForms}/{totalWorkers}</p>
          <p className="text-xs text-gray-500">Forms</p>
        </div>
        <div className="bg-white rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-orange-600">{completedTasks}/{totalTasks}</p>
          <p className="text-xs text-gray-500">Tasks</p>
        </div>
      </div>

      {/* Individual Shifts */}
      <div className="space-y-3">
        {shifts.map((shift) => (
          <div key={shift.id} className="bg-white rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-800">{shift.name}</h4>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                shift.status === 'completed' ? 'bg-green-100 text-green-700' :
                shift.status === 'active' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {shift.status}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              {shift.start_time && formatTime(shift.start_time)}
              {shift.start_time && shift.end_time && ' - '}
              {shift.end_time && formatTime(shift.end_time)}
              {' • '}{shift.worker_count} workers • {shift.forms_submitted} forms
            </div>
            
            {/* Shift notes preview */}
            {shift.shift_notes && shift.shift_notes.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Notes:</p>
                {shift.shift_notes.slice(0, 2).map((note) => (
                  <p key={note.id} className="text-xs text-gray-600">• {note.content}</p>
                ))}
                {shift.shift_notes.length > 2 && (
                  <p className="text-xs text-gray-400">+ {shift.shift_notes.length - 2} more</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ProjectDailyReportModal({
  projectId,
  projectName,
  reportDate,
  existingReport,
  onClose,
  onGenerated,
}: ProjectDailyReportModalProps) {
  const [weather, setWeather] = useState<WeatherData>(existingReport?.weather ?? {});
  const [summaryNotes, setSummaryNotes] = useState(existingReport?.summary_notes ?? '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaved, setIsSaved] = useState(!!existingReport);

  const dailyLogs = useSupervisorStore((s) => s.dailyLogs);
  const shifts = useSupervisorStore((s) => s.shifts);
  const fetchDailyLogs = useSupervisorStore((s) => s.fetchDailyLogs);
  const generateDailyReport = useSupervisorStore((s) => s.generateDailyReport);
  const updateDailyReport = useSupervisorStore((s) => s.updateDailyReport);

  // Fetch logs for this date
  useEffect(() => {
    fetchDailyLogs(projectId, reportDate);
  }, [projectId, reportDate, fetchDailyLogs]);

  // Filter logs by date and group by type
  const logsByType = useMemo(() => {
    const filtered = dailyLogs.filter((log) => log.log_date === reportDate);
    return {
      visitors: filtered.filter((log) => log.log_type === 'visitor'),
      deliveries: filtered.filter((log) => log.log_type === 'delivery'),
      manpower: filtered.filter((log) => log.log_type === 'manpower'),
      siteIssues: filtered.filter((log) => log.log_type === 'site_issue'),
      scheduleDelays: filtered.filter((log) => log.log_type === 'schedule_delay'),
    };
  }, [dailyLogs, reportDate]);

  // Filter shifts by date
  const shiftsForDate = useMemo(() => {
    return shifts.filter((shift) => shift.scheduled_date === reportDate);
  }, [shifts, reportDate]);

  // Calculate manpower totals from logs
  const manpowerSummary = useMemo(() => {
    let totalWorkers = 0;
    let totalHours = 0;
    
    logsByType.manpower.forEach((log) => {
      const meta = log.metadata as ManpowerMetadata;
      totalWorkers += meta.count ?? 0;
      totalHours += (meta.count ?? 0) * (meta.hours ?? 8);
    });
    
    // Add shift workers
    shiftsForDate.forEach((shift) => {
      totalWorkers += shift.worker_count;
    });
    
    return { totalWorkers, totalHours };
  }, [logsByType.manpower, shiftsForDate]);

  const handleGenerate = async () => {
    setIsGenerating(true);

    if (existingReport) {
      // Update existing report
      await updateDailyReport(existingReport.id, weather, summaryNotes);
    } else {
      // Generate new report
      const report = await generateDailyReport({
        project_id: projectId,
        report_date: reportDate,
        weather,
        summary_notes: summaryNotes,
      });
      
      if (report && onGenerated) {
        onGenerated(report);
      }
    }

    setIsGenerating(false);
    setIsSaved(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Project Daily Report</h2>
            <p className="text-sm text-gray-500">{projectName} • {formatDate(reportDate)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Report Header */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-blue-600">{manpowerSummary.totalWorkers}</p>
                <p className="text-xs text-gray-500">Total Workers</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-green-600">{shiftsForDate.length}</p>
                <p className="text-xs text-gray-500">Shifts</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-600">{logsByType.visitors.length}</p>
                <p className="text-xs text-gray-500">Visitors</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-red-600">
                  {logsByType.siteIssues.filter(i => i.status !== 'resolved').length}
                </p>
                <p className="text-xs text-gray-500">Open Issues</p>
              </div>
            </div>
          </div>

          {/* Weather Section */}
          <WeatherSection
            weather={weather}
            onChange={setWeather}
            readOnly={false}
          />

          {/* Shift Summary */}
          <ShiftSummary shifts={shiftsForDate} />

          {/* Manpower Logs */}
          <LogSection
            title="Manpower"
            icon={DAILY_LOG_TYPE_CONFIG.manpower.icon}
            logs={logsByType.manpower}
            logType="manpower"
            bgColor="bg-purple-50"
            borderColor="border-purple-200"
          />

          {/* Visitors */}
          <LogSection
            title="Visitors"
            icon={DAILY_LOG_TYPE_CONFIG.visitor.icon}
            logs={logsByType.visitors}
            logType="visitor"
            bgColor="bg-blue-50"
            borderColor="border-blue-200"
          />

          {/* Deliveries */}
          <LogSection
            title="Deliveries"
            icon={DAILY_LOG_TYPE_CONFIG.delivery.icon}
            logs={logsByType.deliveries}
            logType="delivery"
            bgColor="bg-green-50"
            borderColor="border-green-200"
          />

          {/* Site Issues */}
          <LogSection
            title="Site Issues"
            icon={DAILY_LOG_TYPE_CONFIG.site_issue.icon}
            logs={logsByType.siteIssues}
            logType="site_issue"
            bgColor="bg-red-50"
            borderColor="border-red-200"
          />

          {/* Schedule & Delays */}
          <LogSection
            title="Schedule & Delays"
            icon={DAILY_LOG_TYPE_CONFIG.schedule_delay.icon}
            logs={logsByType.scheduleDelays}
            logType="schedule_delay"
            bgColor="bg-orange-50"
            borderColor="border-orange-200"
          />

          {/* Summary Notes */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <span>📝</span> Summary Notes
            </h3>
            <textarea
              value={summaryNotes}
              onChange={(e) => setSummaryNotes(e.target.value)}
              placeholder="Add any additional notes or summary for the day..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-500">
            {existingReport && (
              <span>Generated: {formatDateTime(existingReport.generated_at)}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : existingReport ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Update Report
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
