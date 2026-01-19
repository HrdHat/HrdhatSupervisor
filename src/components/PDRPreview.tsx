import { useMemo } from 'react';
import type {
  ProjectDailyReport,
  ProjectDailyLog,
  WeatherData,
  VisitorMetadata,
  DeliveryMetadata,
  ManpowerMetadata,
  SiteIssueMetadata,
  ScheduleDelayMetadata,
} from '@/types/supervisor';
import {
  WEATHER_CONDITIONS,
  SITE_ISSUE_STATUS_CONFIG,
} from '@/types/supervisor';

interface PDRPreviewProps {
  report: ProjectDailyReport;
  projectName: string;
  logs: ProjectDailyLog[];
  shifts: Array<{
    id: string;
    name: string;
    scheduled_date: string;
    start_time: string | null;
    end_time: string | null;
    worker_count: number;
    forms_submitted: number;
    status: string;
    shift_tasks: Array<{ id: string; content: string; checked: boolean; category: string }>;
    shift_notes: Array<{ id: string; content: string; category: string }>;
  }>;
  onClose: () => void;
  onPrint?: () => void;
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
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ============================================================================
// Print Styles
// ============================================================================

const printStyles = `
  @media print {
    .no-print {
      display: none !important;
    }
    .pdr-preview {
      padding: 0 !important;
      max-width: none !important;
    }
    .pdr-content {
      border: none !important;
      box-shadow: none !important;
    }
    body {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
  }
`;

// ============================================================================
// Section Components
// ============================================================================

function WeatherDisplay({ weather }: { weather: WeatherData }) {
  const condition = WEATHER_CONDITIONS.find(w => w.value === weather.conditions);
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 print:bg-blue-50">
      <h3 className="text-sm font-semibold text-blue-800 mb-2 uppercase tracking-wider">Weather</h3>
      <div className="flex flex-wrap gap-4 text-sm">
        <div>
          <span className="text-gray-500">Conditions:</span>{' '}
          <span className="font-medium">{condition?.icon} {condition?.label ?? 'N/A'}</span>
        </div>
        {weather.temperature !== undefined && (
          <div>
            <span className="text-gray-500">Temp:</span>{' '}
            <span className="font-medium">{weather.temperature}°{weather.temperature_unit ?? 'F'}</span>
          </div>
        )}
        {weather.wind_speed !== undefined && (
          <div>
            <span className="text-gray-500">Wind:</span>{' '}
            <span className="font-medium">{weather.wind_speed} mph</span>
          </div>
        )}
        {weather.precipitation && (
          <div>
            <span className="text-gray-500">Precip:</span>{' '}
            <span className="font-medium">{weather.precipitation}</span>
          </div>
        )}
      </div>
      {weather.notes && (
        <p className="mt-2 text-sm text-gray-600">{weather.notes}</p>
      )}
    </div>
  );
}

function ManpowerSection({ logs, shifts }: { logs: ProjectDailyLog[]; shifts: PDRPreviewProps['shifts'] }) {
  // Calculate totals from logs
  let totalWorkersFromLogs = 0;
  let totalHoursFromLogs = 0;
  const companySummary: Record<string, { workers: number; hours: number; trade?: string }> = {};

  logs.forEach((log) => {
    const meta = log.metadata as ManpowerMetadata;
    const workers = meta.count ?? 0;
    const hours = (meta.count ?? 0) * (meta.hours ?? 8);
    totalWorkersFromLogs += workers;
    totalHoursFromLogs += hours;

    if (meta.company) {
      if (!companySummary[meta.company]) {
        companySummary[meta.company] = { workers: 0, hours: 0, trade: meta.trade };
      }
      companySummary[meta.company].workers += workers;
      companySummary[meta.company].hours += hours;
    }
  });

  // Add shift workers
  const totalShiftWorkers = shifts.reduce((sum, s) => sum + s.worker_count, 0);

  if (logs.length === 0 && shifts.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wider">Manpower Summary</h3>
      
      {/* Totals */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-center">
        <div className="bg-gray-50 rounded p-2">
          <p className="text-2xl font-bold text-gray-800">{totalWorkersFromLogs + totalShiftWorkers}</p>
          <p className="text-xs text-gray-500">Total Workers</p>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <p className="text-2xl font-bold text-gray-800">{totalHoursFromLogs}</p>
          <p className="text-xs text-gray-500">Man-Hours (Logged)</p>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <p className="text-2xl font-bold text-gray-800">{shifts.length}</p>
          <p className="text-xs text-gray-500">Shifts</p>
        </div>
      </div>

      {/* Company breakdown */}
      {Object.keys(companySummary).length > 0 && (
        <div className="mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1 text-gray-600">Company</th>
                <th className="text-left py-1 text-gray-600">Trade</th>
                <th className="text-right py-1 text-gray-600">Workers</th>
                <th className="text-right py-1 text-gray-600">Hours</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(companySummary).map(([company, data]) => (
                <tr key={company} className="border-b border-gray-100">
                  <td className="py-1">{company}</td>
                  <td className="py-1 text-gray-500">{data.trade ?? '-'}</td>
                  <td className="py-1 text-right">{data.workers}</td>
                  <td className="py-1 text-right">{data.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Log entries */}
      {logs.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Details:</p>
          {logs.map((log) => {
            const meta = log.metadata as ManpowerMetadata;
            return (
              <p key={log.id} className="text-sm text-gray-700">
                • {log.content}
                {meta.company && <span className="text-gray-500"> ({meta.company})</span>}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}

function VisitorsSection({ logs }: { logs: ProjectDailyLog[] }) {
  if (logs.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wider">
        Visitors ({logs.length})
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-1 text-gray-600">Name</th>
            <th className="text-left py-1 text-gray-600">Company</th>
            <th className="text-left py-1 text-gray-600">Time In/Out</th>
            <th className="text-left py-1 text-gray-600">Purpose</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const meta = log.metadata as VisitorMetadata;
            return (
              <tr key={log.id} className="border-b border-gray-100">
                <td className="py-1">{meta.name || '-'}</td>
                <td className="py-1">{meta.company || '-'}</td>
                <td className="py-1 text-gray-500">
                  {meta.time_in && formatTime(meta.time_in)}
                  {meta.time_in && meta.time_out && ' - '}
                  {meta.time_out && formatTime(meta.time_out)}
                </td>
                <td className="py-1 text-gray-600">{log.content}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DeliveriesSection({ logs }: { logs: ProjectDailyLog[] }) {
  if (logs.length === 0) return null;

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wider">
        Deliveries ({logs.length})
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-1 text-gray-600">Time</th>
            <th className="text-left py-1 text-gray-600">Supplier</th>
            <th className="text-left py-1 text-gray-600">Items</th>
            <th className="text-left py-1 text-gray-600">Received By</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const meta = log.metadata as DeliveryMetadata;
            return (
              <tr key={log.id} className="border-b border-gray-100">
                <td className="py-1 text-gray-500">{meta.delivery_time ? formatTime(meta.delivery_time) : '-'}</td>
                <td className="py-1">{meta.supplier || '-'}</td>
                <td className="py-1">{log.content}</td>
                <td className="py-1">{meta.received_by || '-'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SiteIssuesSection({ logs }: { logs: ProjectDailyLog[] }) {
  if (logs.length === 0) return null;

  const openCount = logs.filter(l => l.status !== 'resolved').length;

  return (
    <div className="border border-red-200 rounded-lg p-4 bg-red-50/30 print:bg-red-50">
      <h3 className="text-sm font-semibold text-red-800 mb-3 uppercase tracking-wider flex items-center gap-2">
        Site Issues ({logs.length})
        {openCount > 0 && (
          <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
            {openCount} Open
          </span>
        )}
      </h3>
      <div className="space-y-2">
        {logs.map((log) => {
          const meta = log.metadata as SiteIssueMetadata;
          const statusConfig = SITE_ISSUE_STATUS_CONFIG[log.status];
          return (
            <div key={log.id} className="bg-white rounded p-2 border border-gray-100">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
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
                  <p className="text-sm text-gray-800">{log.content}</p>
                  {meta.assigned_to && (
                    <p className="text-xs text-gray-500 mt-1">Assigned to: {meta.assigned_to}</p>
                  )}
                  {meta.resolution_notes && (
                    <p className="text-xs text-green-600 mt-1">Resolution: {meta.resolution_notes}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleDelaysSection({ logs }: { logs: ProjectDailyLog[] }) {
  if (logs.length === 0) return null;

  const totalImpact = logs.reduce((sum, log) => {
    const meta = log.metadata as ScheduleDelayMetadata;
    return sum + (meta.impact_hours ?? 0);
  }, 0);

  return (
    <div className="border border-orange-200 rounded-lg p-4 bg-orange-50/30 print:bg-orange-50">
      <h3 className="text-sm font-semibold text-orange-800 mb-3 uppercase tracking-wider flex items-center gap-2">
        Schedule & Delays ({logs.length})
        {totalImpact > 0 && (
          <span className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
            {totalImpact} hr total impact
          </span>
        )}
      </h3>
      <div className="space-y-2">
        {logs.map((log) => {
          const meta = log.metadata as ScheduleDelayMetadata;
          return (
            <div key={log.id} className="bg-white rounded p-2 border border-gray-100">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {meta.delay_type && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-orange-100 text-orange-700">
                        {meta.delay_type.replace('_', ' ').toUpperCase()}
                      </span>
                    )}
                    {meta.impact_hours !== undefined && (
                      <span className="text-xs text-red-600 font-medium">{meta.impact_hours} hr impact</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800">{log.content}</p>
                  {meta.affected_areas && (
                    <p className="text-xs text-gray-500 mt-1">Affected: {meta.affected_areas}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ShiftsSummarySection({ shifts }: { shifts: PDRPreviewProps['shifts'] }) {
  if (shifts.length === 0) return null;

  return (
    <div className="border border-purple-200 rounded-lg p-4 bg-purple-50/30 print:bg-purple-50">
      <h3 className="text-sm font-semibold text-purple-800 mb-3 uppercase tracking-wider">
        Shift Details ({shifts.length})
      </h3>
      <div className="space-y-3">
        {shifts.map((shift) => (
          <div key={shift.id} className="bg-white rounded p-3 border border-gray-100">
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
            <div className="text-xs text-gray-500 mb-2">
              {shift.start_time && formatTime(shift.start_time)}
              {shift.start_time && shift.end_time && ' - '}
              {shift.end_time && formatTime(shift.end_time)}
              {' • '}{shift.worker_count} workers • {shift.forms_submitted} forms submitted
            </div>
            
            {/* Tasks */}
            {shift.shift_tasks && shift.shift_tasks.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Tasks:</p>
                {shift.shift_tasks.map((task) => (
                  <p key={task.id} className={`text-xs ${task.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {task.checked ? '☑' : '☐'} {task.content}
                  </p>
                ))}
              </div>
            )}

            {/* Notes */}
            {shift.shift_notes && shift.shift_notes.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Notes:</p>
                {shift.shift_notes.map((note) => (
                  <p key={note.id} className="text-xs text-gray-700">• {note.content}</p>
                ))}
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

export function PDRPreview({
  report,
  projectName,
  logs,
  shifts,
  onClose,
  onPrint,
}: PDRPreviewProps) {
  // Filter logs by date
  const logsForDate = useMemo(() => {
    return logs.filter((log) => log.log_date === report.report_date);
  }, [logs, report.report_date]);

  // Group logs by type
  const logsByType = useMemo(() => {
    return {
      visitors: logsForDate.filter((log) => log.log_type === 'visitor'),
      deliveries: logsForDate.filter((log) => log.log_type === 'delivery'),
      manpower: logsForDate.filter((log) => log.log_type === 'manpower'),
      siteIssues: logsForDate.filter((log) => log.log_type === 'site_issue'),
      scheduleDelays: logsForDate.filter((log) => log.log_type === 'schedule_delay'),
    };
  }, [logsForDate]);

  // Filter shifts by date
  const shiftsForDate = useMemo(() => {
    return shifts.filter((shift) => shift.scheduled_date === report.report_date);
  }, [shifts, report.report_date]);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 pdr-preview">
      <style>{printStyles}</style>
      
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col pdr-content">
        {/* Header - No print */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0 no-print">
          <h2 className="text-lg font-semibold text-gray-900">Project Daily Report Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Report Header */}
          <div className="text-center mb-6 pb-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">PROJECT DAILY REPORT</h1>
            <h2 className="text-xl text-gray-700 mb-2">{projectName}</h2>
            <p className="text-gray-500">{formatDate(report.report_date)}</p>
            <p className="text-xs text-gray-400 mt-2">Generated: {formatDateTime(report.generated_at)}</p>
          </div>

          {/* Weather */}
          <div className="mb-4">
            <WeatherDisplay weather={report.weather} />
          </div>

          {/* Manpower Summary */}
          <div className="mb-4">
            <ManpowerSection logs={logsByType.manpower} shifts={shiftsForDate} />
          </div>

          {/* Shifts */}
          <div className="mb-4">
            <ShiftsSummarySection shifts={shiftsForDate} />
          </div>

          {/* Visitors */}
          <div className="mb-4">
            <VisitorsSection logs={logsByType.visitors} />
          </div>

          {/* Deliveries */}
          <div className="mb-4">
            <DeliveriesSection logs={logsByType.deliveries} />
          </div>

          {/* Site Issues */}
          <div className="mb-4">
            <SiteIssuesSection logs={logsByType.siteIssues} />
          </div>

          {/* Schedule & Delays */}
          <div className="mb-4">
            <ScheduleDelaysSection logs={logsByType.scheduleDelays} />
          </div>

          {/* Summary Notes */}
          {report.summary_notes && (
            <div className="border border-gray-200 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2 uppercase tracking-wider">Summary Notes</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{report.summary_notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-200 mt-6">
            <p>HrdHat Supervisor - Project Daily Report</p>
            <p>Report ID: {report.id.substring(0, 8)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
