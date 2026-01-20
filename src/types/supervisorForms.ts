// ============================================================================
// Supervisor Forms Type Definitions
// Includes both worker form types (from frontend) and supervisor-specific forms
// ============================================================================

/**
 * Form category - worker forms can be assigned to workers, supervisor forms are for supervisor use only
 */
export type FormCategory = 'worker' | 'supervisor';

/**
 * Form type IDs - these match the template_id in form_definitions table
 */
export type FormTypeId = 
  // Worker form types (from hrdhat-frontend)
  | 'flra'
  | 'hot_work_permit'
  | 'equipment_inspection'
  | 'platform_equipment'
  // Supervisor-specific form types
  | 'toolbox_talk'
  | 'weekly_inspection'
  | 'worker_orientation';

/**
 * Configuration for each form type
 */
export interface FormTypeConfig {
  id: FormTypeId;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  category: FormCategory;
  color: string;
  bgColor: string;
}

/**
 * All available form types for supervisors
 */
export const SUPERVISOR_FORM_TYPES: FormTypeConfig[] = [
  // Worker form types (reused from hrdhat-frontend)
  {
    id: 'flra',
    name: 'Field Level Risk Assessment',
    shortName: 'FLRA',
    icon: '📋',
    description: 'Daily safety assessment form for identifying and controlling workplace hazards',
    category: 'worker',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'hot_work_permit',
    name: 'Hot Work Permit',
    shortName: 'Hot Work',
    icon: '🔥',
    description: 'Permission form for welding, cutting, brazing, or other hot work activities',
    category: 'worker',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  {
    id: 'equipment_inspection',
    name: 'Aerial Work Platform Inspection',
    shortName: 'AWP Inspection',
    icon: '🏗️',
    description: 'Pre-use inspection report for Scissor Lift, Boom Lift, & AWP',
    category: 'worker',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
  },
  {
    id: 'platform_equipment',
    name: 'Platform Equipment Inspection',
    shortName: 'Platform Inspection',
    icon: '🪜',
    description: 'Inspection checklist for ladders, sawhorses, stilts, scaffolds and other platform equipment',
    category: 'worker',
    color: 'text-amber-700',
    bgColor: 'bg-amber-100',
  },
  // Supervisor-specific form types
  {
    id: 'toolbox_talk',
    name: 'Toolbox Talk',
    shortName: 'Toolbox Talk',
    icon: '🗣️',
    description: 'Document daily safety meetings and toolbox talks with your crew',
    category: 'supervisor',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  {
    id: 'weekly_inspection',
    name: 'Weekly Supervisor Inspection',
    shortName: 'Weekly Inspection',
    icon: '📝',
    description: 'Weekly site inspection checklist for supervisors',
    category: 'supervisor',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  {
    id: 'worker_orientation',
    name: 'Worker Orientation',
    shortName: 'Orientation',
    icon: '👷',
    description: 'Subcontractor site orientation form with safety acknowledgment and worker signature',
    category: 'supervisor',
    color: 'text-teal-700',
    bgColor: 'bg-teal-100',
  },
];

/**
 * Get form type config by ID
 */
export function getFormTypeConfig(formTypeId: FormTypeId | string): FormTypeConfig | undefined {
  return SUPERVISOR_FORM_TYPES.find(t => t.id === formTypeId);
}

/**
 * Get all worker form types
 */
export function getWorkerFormTypes(): FormTypeConfig[] {
  return SUPERVISOR_FORM_TYPES.filter(t => t.category === 'worker');
}

/**
 * Get all supervisor form types
 */
export function getSupervisorFormTypes(): FormTypeConfig[] {
  return SUPERVISOR_FORM_TYPES.filter(t => t.category === 'supervisor');
}

/**
 * Supervisor form instance - extends the base FormInstance from frontend
 * Stored in form_instances table
 */
export interface SupervisorFormInstance {
  id: string;
  form_definition_id: string | null;
  form_definition_version: number | null;
  template_id: string; // This is the FormTypeId
  form_number: string;
  title: string | null;
  created_by: string;
  updated_by: string | null;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  form_data: Record<string, unknown>; // Dynamic JSONB structure
  organization_id: string | null;
  project_id: string | null;
}

/**
 * Input for creating a supervisor form
 */
export interface CreateSupervisorFormInput {
  project_id: string;
  template_id: FormTypeId;
  title?: string;
}

/**
 * Combined form item for display (worker submissions + supervisor forms)
 */
export interface CombinedFormItem {
  id: string;
  type: 'received_document' | 'supervisor_form';
  title: string;
  formType: string;
  formTypeConfig?: FormTypeConfig;
  status: string;
  createdAt: string;
  updatedAt: string;
  // For received documents
  sourceEmail?: string;
  aiClassification?: string;
  confidenceScore?: number;
  folderId?: string | null;
  // For supervisor forms
  formData?: Record<string, unknown>;
  templateId?: string;
}
