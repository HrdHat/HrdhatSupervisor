// ============================================================================
// HrdHat Supervisor Types
// Matches database schema from migrations 005-012
// ============================================================================

export interface SupervisorProject {
  id: string;
  supervisor_id: string;
  name: string;
  site_address: string | null;
  processing_email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectWorker {
  id: string;
  project_id: string;
  user_id: string;
  subcontractor_id: string | null;
  added_at: string;
  added_by: string;
  status: 'active' | 'removed' | 'pending';
  // Joined fields (from user_profiles)
  user_email?: string;
  user_full_name?: string;
  // Joined fields (from project_subcontractors)
  subcontractor_name?: string | null;
}

export interface ProjectFolder {
  id: string;
  project_id: string;
  folder_name: string;
  description: string | null;
  ai_classification_hint: string | null;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface ProjectSubcontractor {
  id: string;
  project_id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Shift Types (Start of Shift feature - migration 009)
// ============================================================================

export type ShiftStatus = 'draft' | 'active' | 'completed' | 'cancelled';
export type WorkerType = 'registered' | 'adhoc';
export type NotificationMethod = 'sms' | 'email' | 'both';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';

/**
 * Predefined task/note category types
 */
export type ShiftCategoryType = 'safety' | 'quality' | 'production' | 'general' | 'custom';

/**
 * Category configuration for tasks and notes
 */
export interface ShiftCategory {
  id: string;
  name: string;
  type: ShiftCategoryType;
  color: string; // Background color
  textColor: string; // Text color
}

/**
 * Predefined category presets with colors
 */
export const SHIFT_CATEGORY_PRESETS: ShiftCategory[] = [
  { id: 'safety', name: 'Safety', type: 'safety', color: '#FEF3C7', textColor: '#B45309' },
  { id: 'quality', name: 'Quality', type: 'quality', color: '#DBEAFE', textColor: '#1D4ED8' },
  { id: 'production', name: 'Production', type: 'production', color: '#D1FAE5', textColor: '#047857' },
  { id: 'general', name: 'General', type: 'general', color: '#F3F4F6', textColor: '#374151' },
];

/**
 * Custom category defined by supervisor
 */
export interface CustomCategory {
  id: string;
  name: string;
  color: string;
}

/**
 * Task item for shift to-do tracking (supervisor-only)
 */
export interface ShiftTask {
  id: string;
  category: string; // Category ID (predefined or custom)
  content: string;
  checked: boolean;
  created_at: string;
}

/**
 * Note item for shift documentation (supervisor-only)
 */
export interface ShiftNote {
  id: string;
  category: string; // Category ID (predefined or custom)
  content: string;
  created_at: string;
}

/**
 * Closeout checklist item for shift completion
 */
export interface CloseoutChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

/**
 * Project shift - a work period with assigned workers
 */
export interface ProjectShift {
  id: string;
  project_id: string;
  name: string;
  scheduled_date: string; // ISO date (YYYY-MM-DD)
  start_time: string | null; // Time string (HH:MM:SS)
  end_time: string | null; // Time string (HH:MM:SS)
  status: ShiftStatus;
  notes: string | null; // Pre-shift safety notes (sent to workers)
  
  // Tasks and Notes (supervisor-only, not sent to workers)
  shift_tasks: ShiftTask[];
  shift_notes: ShiftNote[];
  custom_categories: CustomCategory[];
  
  // Closeout fields
  closeout_checklist: CloseoutChecklistItem[];
  closeout_notes: string | null;
  closed_at: string | null;
  closed_by: string | null;
  incomplete_reason: string | null;
  
  // Audit fields
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Computed/joined fields (optional, populated by queries)
  worker_count?: number;
  forms_submitted?: number;
}

/**
 * Worker assigned to a shift with notification tracking
 */
export interface ShiftWorker {
  id: string;
  shift_id: string;
  
  // Worker identification
  worker_type: WorkerType;
  user_id: string | null; // For registered workers
  subcontractor_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  
  // Notification tracking
  notification_method: NotificationMethod;
  notification_status: NotificationStatus;
  notification_sent_at: string | null;
  notification_error: string | null;
  
  // Form submission tracking
  form_submitted: boolean;
  form_submitted_at: string | null;
  document_id: string | null; // Links to received_documents
  
  // Audit fields
  created_at: string;
  updated_at: string;
  
  // Joined fields (optional, populated by queries)
  subcontractor_name?: string | null;
}

/**
 * Shift with computed worker statistics
 */
export interface ProjectShiftWithStats extends ProjectShift {
  worker_count: number;
  forms_submitted: number;
  workers?: ShiftWorker[];
}

// ============================================================================
// Document Metadata (extracted by AI)
// ============================================================================

/**
 * Metadata extracted from documents by AI.
 * Fields ending in "Manual" are supervisor overrides.
 */
export interface DocumentMetadata {
  // AI-extracted fields
  workerName?: string | null;
  companyName?: string | null;
  documentDate?: string | null; // ISO 8601 format (YYYY-MM-DD)
  projectName?: string | null;
  hazards?: string[];
  
  // Manual overrides (filled by supervisor in Quick Review)
  workerNameManual?: string;
  companyNameManual?: string;
  documentDateManual?: string;
}

/**
 * Helper to get effective metadata value (manual override takes precedence)
 */
export function getEffectiveMetadata(metadata: DocumentMetadata | Record<string, unknown>): {
  workerName: string | null;
  companyName: string | null;
  documentDate: string | null;
} {
  const data = metadata as DocumentMetadata;
  return {
    workerName: data.workerNameManual ?? data.workerName ?? null,
    companyName: data.companyNameManual ?? data.companyName ?? null,
    documentDate: data.documentDateManual ?? data.documentDate ?? null,
  };
}

export interface ReceivedDocument {
  id: string;
  project_id: string;
  folder_id: string | null;
  shift_id: string | null; // Links document to a specific shift
  original_filename: string | null;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  source_email: string | null;
  email_subject: string | null;
  ai_classification: string | null;
  ai_extracted_data: DocumentMetadata | Record<string, unknown>;
  ai_summary: string | null;
  confidence_score: number | null;
  status: 'pending' | 'processing' | 'filed' | 'needs_review' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  received_at: string;
  processed_at: string | null;
}

// ============================================================================
// Form types (for viewing worker forms)
// ============================================================================

export interface FormInstance {
  id: string;
  form_definition_id: string;
  form_number: string;
  title: string | null;
  created_by: string;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  project_id: string | null;
  form_data: Record<string, unknown>;
}

// ============================================================================
// User types
// ============================================================================

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  role: string | null;
}

// ============================================================================
// Create/Update DTOs
// ============================================================================

export interface CreateProjectInput {
  name: string;
  site_address?: string;
}

export interface CreateFolderInput {
  project_id: string;
  folder_name: string;
  description?: string;
  ai_classification_hint?: string;
  color?: string;
}

export interface AddWorkerInput {
  project_id: string;
  user_email: string;
  subcontractor_id?: string;
}

export interface CreateSubcontractorInput {
  project_id: string;
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  notes?: string;
}

export interface UpdateSubcontractorInput {
  company_name?: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
  status?: 'active' | 'inactive';
}

// ============================================================================
// Shift DTOs (Start of Shift feature)
// ============================================================================

export interface CreateShiftInput {
  project_id: string;
  name: string;
  scheduled_date: string; // ISO date (YYYY-MM-DD)
  start_time?: string; // Time string (HH:MM)
  end_time?: string; // Time string (HH:MM)
  notes?: string;
  shift_tasks?: ShiftTask[];
  shift_notes?: ShiftNote[];
  custom_categories?: CustomCategory[];
}

export interface UpdateShiftInput {
  name?: string;
  scheduled_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  status?: ShiftStatus;
  notes?: string | null;
  shift_tasks?: ShiftTask[];
  shift_notes?: ShiftNote[];
  custom_categories?: CustomCategory[];
  closeout_checklist?: CloseoutChecklistItem[];
  closeout_notes?: string | null;
  incomplete_reason?: string | null;
}

export interface AddShiftWorkerInput {
  shift_id: string;
  worker_type: WorkerType;
  user_id?: string; // For registered workers
  subcontractor_id?: string;
  name: string;
  phone?: string;
  email?: string;
  notification_method?: NotificationMethod;
}

export interface UpdateShiftWorkerInput {
  name?: string;
  phone?: string | null;
  email?: string | null;
  notification_method?: NotificationMethod;
  subcontractor_id?: string | null;
}

/**
 * Input for adding multiple workers from existing project workers
 */
export interface AddExistingWorkersToShiftInput {
  shift_id: string;
  worker_ids: string[]; // IDs from project_workers table
}

/**
 * Input for shift closeout
 */
export interface CloseoutShiftInput {
  shift_id: string;
  closeout_checklist: CloseoutChecklistItem[];
  closeout_notes?: string;
  incomplete_reason?: string; // Required if any workers haven't submitted forms
}

// ============================================================================
// Document Management DTOs
// ============================================================================

export interface MoveDocumentInput {
  document_id: string;
  folder_id: string;
}

export interface RejectDocumentInput {
  document_id: string;
  reason?: string;
}

// ============================================================================
// Document with folder info (joined query)
// ============================================================================

export interface ReceivedDocumentWithFolder extends ReceivedDocument {
  folder_name?: string;
  folder_color?: string;
}

// ============================================================================
// Document Filtering
// ============================================================================

/**
 * Filter state for document list
 */
export interface DocumentFilters {
  search: string; // Filename, subject, or email search
  workerName: string | null; // Filter by worker name
  companyName: string | null; // Filter by company/subcontractor
  dateFrom: string | null; // ISO date string
  dateTo: string | null; // ISO date string
  documentType: string | null; // AI classification
}

/**
 * Filter state for shift list
 */
export interface ShiftFilters {
  status: ShiftStatus | 'all';
  dateFrom: string | null; // ISO date string
  dateTo: string | null; // ISO date string
}

// ============================================================================
// AI Discovery Types (Discover Workers/Subcontractors from Forms)
// ============================================================================

/**
 * Worker discovered from AI-extracted document metadata
 */
export interface DiscoveredWorker {
  name: string; // Worker name from ai_extracted_data.workerName
  email: string | null; // Source email from document (potential contact)
  companyName: string | null; // Company name if extracted
  documentCount: number; // How many documents mention this worker
  lastSeen: string; // ISO timestamp of most recent document
}

/**
 * Subcontractor discovered from AI-extracted document metadata
 */
export interface DiscoveredSubcontractor {
  companyName: string; // Company name from ai_extracted_data.companyName
  documentCount: number; // How many documents mention this company
  lastSeen: string; // ISO timestamp of most recent document
  workerNames: string[]; // Worker names associated with this company
}

// ============================================================================
// Supervisor Contacts (Global Contact List per Supervisor)
// ============================================================================

/**
 * Contact stored for a supervisor (not linked to HrdHat accounts)
 * Global list - can be used across all of the supervisor's projects
 */
export interface SupervisorContact {
  id: string;
  supervisor_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  notes: string | null;
  source: 'manual' | 'discovered';
  recent_project_id: string | null; // Most recent project they worked on
  recent_project_date: string | null; // When they last worked
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a new contact
 */
export interface CreateContactInput {
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  notes?: string;
  source?: 'manual' | 'discovered';
  recent_project_id?: string; // Link to current project when discovered
}

// ============================================================================
// Project Daily Report (PDR) Types
// ============================================================================

/**
 * Type of daily log entry
 */
export type DailyLogType = 'visitor' | 'delivery' | 'site_issue' | 'manpower' | 'schedule_delay' | 'observation';

/**
 * Status for site issue logs
 */
export type SiteIssueStatus = 'active' | 'resolved' | 'continued';

/**
 * Metadata for visitor log entries
 */
export interface VisitorMetadata {
  name: string;
  company?: string;
  purpose?: string;
  time_in?: string; // HH:MM format
  time_out?: string; // HH:MM format
  badge_number?: string;
}

/**
 * Metadata for delivery log entries
 */
export interface DeliveryMetadata {
  supplier?: string;
  items?: string;
  received_by?: string;
  delivery_time?: string; // HH:MM format
  po_number?: string;
}

/**
 * Personnel entry for manpower log (worker or subcontractor)
 */
export interface ManpowerPersonnelEntry {
  type: 'worker' | 'subcontractor';
  name: string;
  id?: string; // Optional - populated if selected from contacts/subcontractors
  hours?: number; // Hours worked by this person
}

/**
 * Metadata for manpower log entries
 */
export interface ManpowerMetadata {
  company?: string;
  trade?: string;
  count?: number;
  hours?: number;
  personnel?: ManpowerPersonnelEntry[]; // List of workers/subcontractors on site
}

/**
 * Metadata for site issue log entries
 */
export interface SiteIssueMetadata {
  priority?: 'low' | 'medium' | 'high';
  assigned_to?: string;
  resolution_notes?: string;
}

/**
 * Metadata for schedule/delay log entries
 */
export interface ScheduleDelayMetadata {
  delay_type?: 'weather' | 'material' | 'labor' | 'inspection' | 'other';
  impact_hours?: number;
  affected_areas?: string;
}

/**
 * Metadata for observation log entries
 */
export interface ObservationMetadata {
  location?: string;
  area?: string;
  photo_url?: string;
  photo_storage_path?: string;
}

/**
 * Union type for all metadata types
 */
export type DailyLogMetadata = 
  | VisitorMetadata 
  | DeliveryMetadata 
  | ManpowerMetadata 
  | SiteIssueMetadata 
  | ScheduleDelayMetadata 
  | ObservationMetadata
  | Record<string, unknown>;

/**
 * Project daily log entry
 */
export interface ProjectDailyLog {
  id: string;
  project_id: string;
  log_date: string; // ISO date (YYYY-MM-DD)
  log_type: DailyLogType;
  content: string;
  metadata: DailyLogMetadata;
  status: SiteIssueStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Weather data for PDR
 */
export interface WeatherData {
  conditions?: 'sunny' | 'cloudy' | 'partly_cloudy' | 'rain' | 'snow' | 'fog' | 'windy' | 'storm';
  temperature?: number; // In Fahrenheit
  temperature_unit?: 'F' | 'C';
  wind_speed?: number;
  wind_direction?: string;
  precipitation?: string;
  notes?: string;
}

/**
 * Weather condition display labels
 */
export const WEATHER_CONDITIONS: { value: WeatherData['conditions']; label: string; icon: string }[] = [
  { value: 'sunny', label: 'Sunny', icon: '☀️' },
  { value: 'partly_cloudy', label: 'Partly Cloudy', icon: '⛅' },
  { value: 'cloudy', label: 'Cloudy', icon: '☁️' },
  { value: 'rain', label: 'Rain', icon: '🌧️' },
  { value: 'snow', label: 'Snow', icon: '❄️' },
  { value: 'fog', label: 'Fog', icon: '🌫️' },
  { value: 'windy', label: 'Windy', icon: '💨' },
  { value: 'storm', label: 'Storm', icon: '⛈️' },
];

/**
 * Project Daily Report
 */
export interface ProjectDailyReport {
  id: string;
  project_id: string;
  report_date: string; // ISO date (YYYY-MM-DD)
  weather: WeatherData;
  summary_notes: string | null;
  generated_by: string;
  generated_at: string;
  updated_at: string;
}

/**
 * Input for creating a daily log entry
 */
export interface CreateDailyLogInput {
  project_id: string;
  log_date?: string; // Defaults to today
  log_type: DailyLogType;
  content: string;
  metadata?: DailyLogMetadata;
  status?: SiteIssueStatus;
}

/**
 * Input for updating a daily log entry
 */
export interface UpdateDailyLogInput {
  content?: string;
  metadata?: DailyLogMetadata;
  status?: SiteIssueStatus;
}

/**
 * Input for creating/generating a PDR
 */
export interface CreateDailyReportInput {
  project_id: string;
  report_date: string;
  weather?: WeatherData;
  summary_notes?: string;
}

/**
 * Daily log type configuration for UI
 */
export const DAILY_LOG_TYPE_CONFIG: Record<DailyLogType, { label: string; icon: string; color: string; bgColor: string }> = {
  visitor: { label: 'Visitor', icon: '👤', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  delivery: { label: 'Delivery', icon: '📦', color: 'text-green-700', bgColor: 'bg-green-100' },
  site_issue: { label: 'Site Issue', icon: '⚠️', color: 'text-red-700', bgColor: 'bg-red-100' },
  manpower: { label: 'Manpower', icon: '👷', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  schedule_delay: { label: 'Schedule/Delay', icon: '📅', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  observation: { label: 'Observation', icon: '👁️', color: 'text-teal-700', bgColor: 'bg-teal-100' },
};

/**
 * Site issue status configuration for UI
 */
export const SITE_ISSUE_STATUS_CONFIG: Record<SiteIssueStatus, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Open', color: 'text-red-700', bgColor: 'bg-red-100' },
  resolved: { label: 'Resolved', color: 'text-green-700', bgColor: 'bg-green-100' },
  continued: { label: 'Continued', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
};

// ============================================================================
// Shift Task/Note Helper Functions
// ============================================================================

/**
 * Get category display info (name, colors) for a given category ID
 * Falls back to custom category styling if not a preset
 */
export function getCategoryInfo(
  categoryId: string,
  customCategories: CustomCategory[] = []
): { name: string; color: string; textColor: string } {
  // Check presets first
  const preset = SHIFT_CATEGORY_PRESETS.find((c) => c.id === categoryId);
  if (preset) {
    return { name: preset.name, color: preset.color, textColor: preset.textColor };
  }

  // Check custom categories
  const custom = customCategories.find((c) => c.id === categoryId);
  if (custom) {
    return { name: custom.name, color: custom.color, textColor: '#6D28D9' }; // Purple text for custom
  }

  // Fallback
  return { name: categoryId, color: '#F3F4F6', textColor: '#374151' };
}

/**
 * Get all available categories (presets + custom)
 */
export function getAllCategories(customCategories: CustomCategory[] = []): ShiftCategory[] {
  const customAsCategories: ShiftCategory[] = customCategories.map((c) => ({
    id: c.id,
    name: c.name,
    type: 'custom' as const,
    color: c.color,
    textColor: '#6D28D9',
  }));
  return [...SHIFT_CATEGORY_PRESETS, ...customAsCategories];
}
