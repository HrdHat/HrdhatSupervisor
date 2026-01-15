// ============================================================================
// HrdHat Supervisor Types
// Matches database schema from migrations 005-007
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
  subcontractor_name?: string;
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
