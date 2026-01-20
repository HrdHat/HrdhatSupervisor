import { useState, useEffect, useCallback } from 'react';
import { useSupervisorStore } from '@/stores/supervisorStore';
import type { SupervisorFormInstance } from '@/types/supervisorForms';
import { getFormTypeConfig } from '@/types/supervisorForms';
import { SignatureModule, type SignatureEntry } from '@/components/form/SignatureModule';
import { RobustPhotoUpload } from '@/components/form/RobustPhotoUpload';

interface SupervisorFormEditorProps {
  formId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function SupervisorFormEditor({
  formId,
  isOpen,
  onClose,
  onSaved,
}: SupervisorFormEditorProps) {
  const [form, setForm] = useState<SupervisorFormInstance | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const getSupervisorFormById = useSupervisorStore((s) => s.getSupervisorFormById);
  const saveSupervisorForm = useSupervisorStore((s) => s.saveSupervisorForm);
  const archiveSupervisorForm = useSupervisorStore((s) => s.archiveSupervisorForm);
  const error = useSupervisorStore((s) => s.error);

  // Load form data when opened
  useEffect(() => {
    if (isOpen && formId) {
      const loadedForm = getSupervisorFormById(formId);
      if (loadedForm) {
        setForm(loadedForm);
        setFormData(loadedForm.form_data || { modules: {} });
        setHasChanges(false);
      }
    }
  }, [isOpen, formId, getSupervisorFormById]);

  const updateField = useCallback((moduleName: string, fieldName: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      modules: {
        ...(prev.modules as Record<string, unknown> || {}),
        [moduleName]: {
          ...((prev.modules as Record<string, unknown>)?.[moduleName] as Record<string, unknown> || {}),
          [fieldName]: { value },
        },
      },
    }));
    setHasChanges(true);
  }, []);

  // Module-level update for signatures/photos (stores data directly, not wrapped in {value:})
  const updateModule = useCallback((moduleName: string, data: unknown | ((prev: unknown) => unknown)) => {
    setFormData((prev) => {
      const modules = prev.modules as Record<string, unknown> || {};
      const currentModuleData = modules[moduleName];
      const newData = typeof data === 'function' ? (data as (prev: unknown) => unknown)(currentModuleData) : data;
      return {
        ...prev,
        modules: {
          ...modules,
          [moduleName]: newData,
        },
      };
    });
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    if (!form) return;
    
    setSaving(true);
    try {
      await saveSupervisorForm(form.id, formData);
      setHasChanges(false);
      onSaved?.();
    } catch (err) {
      console.error('Failed to save form:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!form) return;
    
    if (confirm('Archive this form? It will be marked as completed.')) {
      await archiveSupervisorForm(form.id);
      onClose();
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Discard them?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen || !form) return null;

  const config = getFormTypeConfig(form.template_id);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="flex h-full">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Side Panel */}
        <div className="relative ml-auto w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${config?.bgColor ?? 'bg-gray-100'} flex items-center justify-center text-lg`}>
                  {config?.icon ?? '📋'}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{form.title}</h2>
                  <p className="text-xs text-gray-500">Form #{form.form_number} • {config?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
                    Unsaved
                  </span>
                )}
                <button
                  onClick={handleClose}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {form.template_id === 'toolbox_talk' && (
              <ToolboxTalkForm formData={formData} updateField={updateField} updateModule={updateModule} formId={form.id} />
            )}
            {form.template_id === 'weekly_inspection' && (
              <WeeklyInspectionForm formData={formData} updateField={updateField} updateModule={updateModule} formId={form.id} />
            )}
            {form.template_id === 'worker_orientation' && (
              <WorkerOrientationForm formData={formData} updateField={updateField} updateModule={updateModule} formId={form.id} />
            )}
            {form.template_id === 'daily_report' && (
              <DailyReportForm formData={formData} updateField={updateField} updateModule={updateModule} formId={form.id} />
            )}
            {!['toolbox_talk', 'weekly_inspection', 'worker_orientation', 'daily_report'].includes(form.template_id) && (
              <GenericFormEditor formData={formData} updateField={updateField} updateModule={updateModule} formId={form.id} templateId={form.template_id} />
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-6 py-3 bg-red-50 border-t border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <button
              onClick={handleArchive}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Archive Form
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {saving && (
                  <div className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                )}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Form Type Specific Editors
// ============================================================================

interface FormEditorProps {
  formData: Record<string, unknown>;
  updateField: (moduleName: string, fieldName: string, value: unknown) => void;
  updateModule: (moduleName: string, data: unknown | ((prev: unknown) => unknown)) => void;
  formId: string;
}

function getFieldValue(formData: Record<string, unknown>, moduleName: string, fieldName: string, defaultValue: unknown = ''): unknown {
  const modules = formData.modules as Record<string, unknown> | undefined;
  const module = modules?.[moduleName] as Record<string, unknown> | undefined;
  const field = module?.[fieldName] as { value?: unknown } | undefined;
  return field?.value ?? defaultValue;
}

// Toolbox Talk Form
function ToolboxTalkForm({ formData, updateField, updateModule, formId }: FormEditorProps) {
  // Get module data for signatures and photos
  const modules = formData.modules as Record<string, unknown> || {};
  const signaturesData = (modules.signatures || []) as SignatureEntry[];
  const photosData = (modules.photos || { photos: [] }) as { photos: Array<{ id: string; storage_url: string; caption: string; uploaded_at?: string }> };

  return (
    <div className="space-y-6">
      {/* Meeting Details */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs">1</span>
          Meeting Details
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={getFieldValue(formData, 'header', 'date', '') as string}
              onChange={(e) => updateField('header', 'date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
            <input
              type="time"
              value={getFieldValue(formData, 'header', 'time', '') as string}
              onChange={(e) => updateField('header', 'time', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
            <input
              type="text"
              value={getFieldValue(formData, 'header', 'location', '') as string}
              onChange={(e) => updateField('header', 'location', e.target.value)}
              placeholder="Meeting location"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Conducted By</label>
            <input
              type="text"
              value={getFieldValue(formData, 'header', 'conductor', '') as string}
              onChange={(e) => updateField('header', 'conductor', e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </section>

      {/* Topic */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs">2</span>
          Topic Discussed
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Topic Title</label>
            <input
              type="text"
              value={getFieldValue(formData, 'topic', 'title', '') as string}
              onChange={(e) => updateField('topic', 'title', e.target.value)}
              placeholder="Topic title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description / Key Points</label>
            <textarea
              value={getFieldValue(formData, 'topic', 'description', '') as string}
              onChange={(e) => updateField('topic', 'description', e.target.value)}
              placeholder="Describe the topic discussed and key points covered..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </section>

      {/* Attendees */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs">3</span>
          Attendees
        </h3>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">List attendees (one per line)</label>
          <textarea
            value={getFieldValue(formData, 'attendees', 'list', '') as string}
            onChange={(e) => updateField('attendees', 'list', e.target.value)}
            placeholder="John Smith - ABC Company&#10;Jane Doe - XYZ Corp&#10;..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">Format: Name - Company (optional)</p>
        </div>
      </section>

      {/* Additional Notes */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs">4</span>
          Additional Notes
        </h3>
        <textarea
          value={getFieldValue(formData, 'notes', 'content', '') as string}
          onChange={(e) => updateField('notes', 'content', e.target.value)}
          placeholder="Any additional notes, follow-up items, or observations..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </section>

      {/* Photos */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs">5</span>
          Photos
        </h3>
        <RobustPhotoUpload
          formId={formId}
          moduleData={photosData}
          onChange={(data) => updateModule('photos', data)}
        />
      </section>

      {/* Signatures */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs">6</span>
          Signatures
        </h3>
        <SignatureModule
          moduleData={signaturesData}
          onChange={(data) => updateModule('signatures', data)}
          formId={formId}
        />
      </section>
    </div>
  );
}

// Weekly Inspection Form
function WeeklyInspectionForm({ formData, updateField, updateModule, formId }: FormEditorProps) {
  const checklistItems = [
    { id: 'ppe', label: 'PPE being worn correctly' },
    { id: 'housekeeping', label: 'Work areas clean and organized' },
    { id: 'fire_safety', label: 'Fire extinguishers accessible' },
    { id: 'electrical', label: 'Electrical panels accessible (3ft clearance)' },
    { id: 'exits', label: 'Emergency exits clear and marked' },
    { id: 'first_aid', label: 'First aid kit stocked and accessible' },
    { id: 'scaffolding', label: 'Scaffolding/ladders inspected' },
    { id: 'tools', label: 'Tools in good working condition' },
  ];

  // Get module data for signatures and photos
  const modules = formData.modules as Record<string, unknown> || {};
  const signaturesData = (modules.signatures || []) as SignatureEntry[];
  const photosData = (modules.photos || { photos: [] }) as { photos: Array<{ id: string; storage_url: string; caption: string; uploaded_at?: string }> };

  return (
    <div className="space-y-6">
      {/* Inspection Details */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs">1</span>
          Inspection Details
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Inspection Date</label>
            <input
              type="date"
              value={getFieldValue(formData, 'header', 'date', '') as string}
              onChange={(e) => updateField('header', 'date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Inspector</label>
            <input
              type="text"
              value={getFieldValue(formData, 'header', 'inspector', '') as string}
              onChange={(e) => updateField('header', 'inspector', e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Area Inspected</label>
            <input
              type="text"
              value={getFieldValue(formData, 'header', 'area', '') as string}
              onChange={(e) => updateField('header', 'area', e.target.value)}
              placeholder="Building A, Floor 2, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </section>

      {/* Safety Checklist */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs">2</span>
          Safety Checklist
        </h3>
        <div className="space-y-2">
          {checklistItems.map((item) => {
            const value = getFieldValue(formData, 'checklist', item.id, 'na') as string;
            return (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">{item.label}</span>
                <div className="flex items-center gap-1">
                  {['pass', 'fail', 'na'].map((status) => (
                    <button
                      key={status}
                      onClick={() => updateField('checklist', item.id, status)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        value === status
                          ? status === 'pass' ? 'bg-green-100 text-green-700'
                            : status === 'fail' ? 'bg-red-100 text-red-700'
                            : 'bg-gray-200 text-gray-700'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'pass' ? 'Pass' : status === 'fail' ? 'Fail' : 'N/A'}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Issues Found */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs">3</span>
          Issues Found
        </h3>
        <textarea
          value={getFieldValue(formData, 'issues', 'description', '') as string}
          onChange={(e) => updateField('issues', 'description', e.target.value)}
          placeholder="Describe any issues found during the inspection..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </section>

      {/* Corrective Actions */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs">4</span>
          Corrective Actions Required
        </h3>
        <textarea
          value={getFieldValue(formData, 'actions', 'required', '') as string}
          onChange={(e) => updateField('actions', 'required', e.target.value)}
          placeholder="List corrective actions needed..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </section>

      {/* Overall Rating */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs">5</span>
          Overall Rating
        </h3>
        <select
          value={getFieldValue(formData, 'summary', 'rating', 'satisfactory') as string}
          onChange={(e) => updateField('summary', 'rating', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="satisfactory">Satisfactory</option>
          <option value="needs_improvement">Needs Improvement</option>
          <option value="unsatisfactory">Unsatisfactory</option>
        </select>
      </section>

      {/* Photos */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs">6</span>
          Inspection Photos
        </h3>
        <RobustPhotoUpload
          formId={formId}
          moduleData={photosData}
          onChange={(data) => updateModule('photos', data)}
        />
      </section>

      {/* Signatures */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs">7</span>
          Signatures
        </h3>
        <SignatureModule
          moduleData={signaturesData}
          onChange={(data) => updateModule('signatures', data)}
          formId={formId}
        />
      </section>
    </div>
  );
}

// Worker Orientation Form (Subcontractor Site Orientation)
function WorkerOrientationForm({ formData, updateField, updateModule, formId }: FormEditorProps) {
  // Get module data for signatures and photos
  const modules = formData.modules as Record<string, unknown> || {};
  const signaturesData = (modules.signatures || []) as SignatureEntry[];
  const photosData = (modules.photos || { photos: [] }) as { photos: Array<{ id: string; storage_url: string; caption: string; uploaded_at?: string }> };
  // Safe Work Practices checklist items (from screenshot)
  const safeWorkPractices = [
    { id: 'over_under_work', label: 'Over / Under Work' },
    { id: 'ladders_platforms', label: 'Ladders / Work Platforms (incl sawhorses – 32" requirement; scaffolds, stilts)' },
    { id: 'fall_protection', label: 'Fall Protection (if required)' },
    { id: 'dust_control', label: 'Dust Control (Silica Exposure Control)' },
    { id: 'access_to_site', label: 'Access to site, work areas' },
    { id: 'guardrails_handrails', label: 'Guardrails / Handrails (stairs etc)' },
    { id: 'housekeeping', label: 'Housekeeping' },
    { id: 'hand_power_tools', label: 'Hand Tools / Power Tools' },
    { id: 'manual_lifting', label: 'Manual Lifting' },
    { id: 'mobile_equipment', label: 'Mobile equipment (Boom / Scissor etc)' },
    { id: 'material_storage', label: 'Material Storage (areas, requirements)' },
    { id: 'electrical', label: 'Electrical' },
  ];

  // Personal Protective Equipment checklist
  const ppeItems = [
    { id: 'hard_hat', label: 'Hard Hat' },
    { id: 'safety_boots', label: 'Safety Boots' },
    { id: 'safety_glasses', label: 'Safety Glasses' },
    { id: 'hearing_protection', label: 'Hearing Protection' },
    { id: 'respiratory_protection', label: 'Respiratory Protection (Fit test req\'d?)' },
    { id: 'gloves', label: 'Gloves' },
    { id: 'reflective_vests', label: 'Reflective Vests' },
    { id: 'caution_danger_tape', label: 'Caution / Danger tape' },
  ];

  // General Site Safety Rules checklist
  const generalSafetyRules = [
    { id: 'toolbox_meeting', label: 'Tool Box Meeting Requirements' },
    { id: 'prime_contractor', label: 'Prime Contractor Orientated?' },
    { id: 'reporting_unsafe', label: 'Reporting Unsafe Acts/Conditions to Alpha' },
    { id: 'first_aid_location', label: 'First Aid and Location' },
    { id: 'emergency_procedures', label: 'Site Emergency Procedures (incl injury / incident reporting to Prime AND Alpha)' },
    { id: 'whmis_sds', label: 'WHMIS - SDS Location and Requirements' },
    { id: 'drugs_alcohol', label: 'Drugs & Alcohol (Zero Tolerance)' },
    { id: 'disciplinary_policy', label: 'Alpha Disciplinary Policy' },
    { id: 'worker_responsibilities', label: 'Worker Safety Responsibilities' },
    { id: 'after_hours_work', label: 'After Site Hours Work' },
    { id: 'safe_access', label: 'Safe Access to work areas' },
  ];

  // "Do You..." questions
  const doYouQuestions = [
    { id: 'first_aid_ticket', label: '1. Have a Valid First Aid Ticket?' },
    { id: 'whmis_training', label: '2. Have WHMIS 2015 Training?' },
    { id: 'fall_protection_training', label: '3. Possess valid fall protection or mobile equipment training? If yes, note:' },
    { id: 'right_to_refuse', label: '4. Understand that you have the right and responsibility to refuse unsafe work?' },
    { id: 'working_safely_condition', label: '5. Understand that working safely is a condition of working on all Alpha Projects?' },
    { id: 'understand_orientation', label: '6. Understand the contents of this orientation? If no, please explain on back.' },
  ];

  // Reusable Yes/No toggle component
  const YesNoToggle = ({ moduleName, fieldId, label }: { moduleName: string; fieldId: string; label: string }) => {
    const value = getFieldValue(formData, moduleName, fieldId, null) as string | null;
    return (
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
        <span className="text-sm text-gray-700 flex-1 pr-2">{label}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => updateField(moduleName, fieldId, 'yes')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              value === 'yes' ? 'bg-green-100 text-green-700 font-medium' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            YES
          </button>
          <button
            type="button"
            onClick={() => updateField(moduleName, fieldId, 'no')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              value === 'no' ? 'bg-red-100 text-red-700 font-medium' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            NO
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Information */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs">1</span>
          Worker Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input
              type="date"
              value={getFieldValue(formData, 'header', 'date', '') as string}
              onChange={(e) => updateField('header', 'date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
            <input
              type="text"
              value={getFieldValue(formData, 'header', 'project', '') as string}
              onChange={(e) => updateField('header', 'project', e.target.value)}
              placeholder="Project name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Worker Name</label>
            <input
              type="text"
              value={getFieldValue(formData, 'header', 'worker_name', '') as string}
              onChange={(e) => updateField('header', 'worker_name', e.target.value)}
              placeholder="Full name of worker"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Subcontractor Name (if applicable)</label>
            <input
              type="text"
              value={getFieldValue(formData, 'header', 'subcontractor', '') as string}
              onChange={(e) => updateField('header', 'subcontractor', e.target.value)}
              placeholder="Company name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        </div>
      </section>

      {/* Safe Work Practices */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs">2</span>
          Safe Work Practices
          <span className="text-xs font-normal text-gray-500 ml-2">Do you understand?</span>
        </h3>
        <div className="space-y-2">
          {safeWorkPractices.map((item) => (
            <YesNoToggle key={item.id} moduleName="safeWorkPractices" fieldId={item.id} label={item.label} />
          ))}
        </div>
      </section>

      {/* Personal Protective Equipment */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs">3</span>
          Personal Protective Equipment
          <span className="text-xs font-normal text-gray-500 ml-2">Do you understand?</span>
        </h3>
        <div className="space-y-2">
          {ppeItems.map((item) => (
            <YesNoToggle key={item.id} moduleName="ppe" fieldId={item.id} label={item.label} />
          ))}
        </div>
      </section>

      {/* General Site Safety Rules */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs">4</span>
          General Site Safety Rules
          <span className="text-xs font-normal text-gray-500 ml-2">Do you understand?</span>
        </h3>
        <div className="space-y-2">
          {generalSafetyRules.map((item) => (
            <YesNoToggle key={item.id} moduleName="generalSafetyRules" fieldId={item.id} label={item.label} />
          ))}
        </div>
      </section>

      {/* "Do You..." Questions */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs">5</span>
          Acknowledgment Questions
        </h3>
        <div className="space-y-2">
          {doYouQuestions.map((item) => (
            <YesNoToggle key={item.id} moduleName="acknowledgmentQuestions" fieldId={item.id} label={item.label} />
          ))}
        </div>
        {/* Fall protection training notes field */}
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Fall Protection / Mobile Equipment Training Notes</label>
          <input
            type="text"
            value={getFieldValue(formData, 'acknowledgmentQuestions', 'training_notes', '') as string}
            onChange={(e) => updateField('acknowledgmentQuestions', 'training_notes', e.target.value)}
            placeholder="List certifications or training details..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </section>

      {/* Acknowledgment Text */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs">6</span>
          Worker Acknowledgment
        </h3>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600 space-y-3">
          <p>
            I have received a subcontractor orientation with instruction regarding acceptable work standards that I am required to follow while on this worksite. I understand my responsibilities and agree to follow all policies and procedures of the Prime Contractor and Alpha Drywall and all pertinent requirements of Worksafe BC that pertain to the performance of my work activities.
          </p>
          <p>
            I have been given proper instruction with regards the safe performance of my duties while on this site and understand that failure to follow safety procedures, disciplinary action up to and including dismissal from this worksite in accordance with Alpha Drywall's safety policies may be exercised.
          </p>
          <p>
            I fully understand that if, at any time, I am unable to understand a certain activity or requirements to perform that activity in a safe manner I can request further instruction from my immediate supervisor or other company representative.
          </p>
        </div>
      </section>

      {/* Signatures Section */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs">7</span>
          Signatures
        </h3>
        <SignatureModule
          moduleData={signaturesData}
          onChange={(data) => updateModule('signatures', data)}
          formId={formId}
        />
      </section>

      {/* Photos */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs">8</span>
          Documentation Photos
        </h3>
        <RobustPhotoUpload
          formId={formId}
          moduleData={photosData}
          onChange={(data) => updateModule('photos', data)}
        />
      </section>

      {/* Additional Notes */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs">9</span>
          Additional Notes
        </h3>
        <textarea
          value={getFieldValue(formData, 'notes', 'content', '') as string}
          onChange={(e) => updateField('notes', 'content', e.target.value)}
          placeholder="Any additional notes, explanations, or comments..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
        />
      </section>
    </div>
  );
}

// Daily Report Form (AI-Generated)
function DailyReportForm({ formData, updateField }: FormEditorProps) {
  // Weather conditions options
  const weatherOptions = [
    { value: 'sunny', label: 'Sunny', icon: '☀️' },
    { value: 'partly_cloudy', label: 'Partly Cloudy', icon: '⛅' },
    { value: 'cloudy', label: 'Cloudy', icon: '☁️' },
    { value: 'rain', label: 'Rain', icon: '🌧️' },
    { value: 'snow', label: 'Snow', icon: '❄️' },
    { value: 'fog', label: 'Fog', icon: '🌫️' },
    { value: 'windy', label: 'Windy', icon: '💨' },
    { value: 'storm', label: 'Storm', icon: '⛈️' },
    { value: 'not_recorded', label: 'Not Recorded', icon: '❓' },
  ];

  const isAIGenerated = getFieldValue(formData, 'header', 'ai_generated', false) as boolean;
  const generatedAt = getFieldValue(formData, 'header', 'generated_at', '') as string;

  // Helper to format timestamp
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* AI Generated Badge */}
      {isAIGenerated && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <span className="text-sm font-semibold text-indigo-800">AI-Generated Report</span>
            </div>
            {generatedAt && (
              <span className="text-xs text-indigo-600">
                Generated: {formatDateTime(generatedAt)}
              </span>
            )}
          </div>
          <p className="text-xs text-indigo-700 mt-1">
            This report was generated by AI. Review and edit as needed before finalizing.
          </p>
        </div>
      )}

      {/* Header Information (Read-only if AI generated) */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">1</span>
          Report Details
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Report Date</label>
            <input
              type="date"
              value={getFieldValue(formData, 'header', 'report_date', '') as string}
              onChange={(e) => updateField('header', 'report_date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              readOnly={isAIGenerated}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
            <input
              type="text"
              value={getFieldValue(formData, 'header', 'project_name', '') as string}
              onChange={(e) => updateField('header', 'project_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              readOnly={isAIGenerated}
            />
          </div>
        </div>
      </section>

      {/* Weather Section */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">2</span>
          Weather Conditions
        </h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Conditions</label>
              <select
                value={getFieldValue(formData, 'weather', 'conditions', 'not_recorded') as string}
                onChange={(e) => updateField('weather', 'conditions', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
              >
                {weatherOptions.map((w) => (
                  <option key={w.value} value={w.value}>{w.icon} {w.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Temperature</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={getFieldValue(formData, 'weather', 'temperature', '') as string}
                  onChange={(e) => updateField('weather', 'temperature', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                  placeholder="°F"
                />
                <select
                  value={getFieldValue(formData, 'weather', 'temperature_unit', 'F') as string}
                  onChange={(e) => updateField('weather', 'temperature_unit', e.target.value)}
                  className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                >
                  <option value="F">°F</option>
                  <option value="C">°C</option>
                </select>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Weather Notes</label>
              <input
                type="text"
                value={getFieldValue(formData, 'weather', 'notes', '') as string}
                onChange={(e) => updateField('weather', 'notes', e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                placeholder="Additional weather notes..."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Work Summary */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs">3</span>
          Work Summary
        </h3>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {getFieldValue(formData, 'work_summary', 'tasks_completed', 0) as number}
              </p>
              <p className="text-xs text-gray-500">Tasks Completed</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-gray-600">
                {getFieldValue(formData, 'work_summary', 'tasks_total', 0) as number}
              </p>
              <p className="text-xs text-gray-500">Total Tasks</p>
            </div>
          </div>
          <textarea
            value={getFieldValue(formData, 'work_summary', 'content', '') as string}
            onChange={(e) => updateField('work_summary', 'content', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
            placeholder="Summary of work accomplished today..."
          />
        </div>
      </section>

      {/* Safety Summary */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs">4</span>
          Safety Summary
        </h3>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {getFieldValue(formData, 'safety_summary', 'incidents', 0) as number}
              </p>
              <p className="text-xs text-gray-500">Incidents</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {getFieldValue(formData, 'safety_summary', 'near_misses', 0) as number}
              </p>
              <p className="text-xs text-gray-500">Near Misses</p>
            </div>
          </div>
          <textarea
            value={getFieldValue(formData, 'safety_summary', 'content', '') as string}
            onChange={(e) => updateField('safety_summary', 'content', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Safety observations and any incidents..."
          />
        </div>
      </section>

      {/* Manpower Summary */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs">5</span>
          Manpower Summary
        </h3>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {getFieldValue(formData, 'manpower_summary', 'total_workers', 0) as number}
              </p>
              <p className="text-xs text-gray-500">Total Workers</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {getFieldValue(formData, 'manpower_summary', 'total_hours', 0) as number}
              </p>
              <p className="text-xs text-gray-500">Total Hours</p>
            </div>
          </div>
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Companies on Site</label>
            <p className="text-sm text-gray-700 bg-white rounded p-2 min-h-[32px]">
              {((getFieldValue(formData, 'manpower_summary', 'companies', []) as string[]) || []).join(', ') || 'No companies recorded'}
            </p>
          </div>
          <textarea
            value={getFieldValue(formData, 'manpower_summary', 'content', '') as string}
            onChange={(e) => updateField('manpower_summary', 'content', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            placeholder="Manpower details and crew information..."
          />
        </div>
      </section>

      {/* Issues Summary */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs">6</span>
          Issues & Delays
        </h3>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {getFieldValue(formData, 'issues_summary', 'open_issues', 0) as number}
              </p>
              <p className="text-xs text-gray-500">Open Issues</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {getFieldValue(formData, 'issues_summary', 'resolved_today', 0) as number}
              </p>
              <p className="text-xs text-gray-500">Resolved Today</p>
            </div>
          </div>
          <textarea
            value={getFieldValue(formData, 'issues_summary', 'content', '') as string}
            onChange={(e) => updateField('issues_summary', 'content', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            placeholder="Site issues, delays, and problems encountered..."
          />
        </div>
      </section>

      {/* Forms Summary */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">7</span>
          Forms Submitted
        </h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-blue-600">
                {getFieldValue(formData, 'forms_summary', 'flra_count', 0) as number}
              </p>
              <p className="text-xs text-gray-500">FLRA</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-red-600">
                {getFieldValue(formData, 'forms_summary', 'hot_work_count', 0) as number}
              </p>
              <p className="text-xs text-gray-500">Hot Work</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-gray-600">
                {getFieldValue(formData, 'forms_summary', 'other_count', 0) as number}
              </p>
              <p className="text-xs text-gray-500">Other</p>
            </div>
          </div>
          <textarea
            value={getFieldValue(formData, 'forms_summary', 'content', '') as string}
            onChange={(e) => updateField('forms_summary', 'content', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Summary of forms submitted today..."
          />
        </div>
      </section>

      {/* Supervisor Notes */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-xs">8</span>
          Supervisor Notes
        </h3>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <textarea
            value={getFieldValue(formData, 'supervisor_notes', 'content', '') as string}
            onChange={(e) => updateField('supervisor_notes', 'content', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            placeholder="Add any additional notes, observations, or comments..."
          />
        </div>
      </section>
    </div>
  );
}

// Generic Form Editor (for worker form types that don't have custom UI yet)
function GenericFormEditor({ formData, updateField, updateModule, formId, templateId }: FormEditorProps & { templateId: string }) {
  const config = getFormTypeConfig(templateId);

  // Get module data for signatures and photos
  const modules = formData.modules as Record<string, unknown> || {};
  const signaturesData = (modules.signatures || []) as SignatureEntry[];
  const photosData = (modules.photos || { photos: [] }) as { photos: Array<{ id: string; storage_url: string; caption: string; uploaded_at?: string }> };
  
  return (
    <div className="space-y-6">
      <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 text-center">
        <div className="text-4xl mb-3">{config?.icon ?? '📋'}</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{config?.name ?? templateId}</h3>
        <p className="text-sm text-gray-600 mb-4">
          {config?.description ?? 'This form type is available for workers to fill out.'}
        </p>
        <p className="text-xs text-gray-500">
          A detailed form editor for this form type will be added soon.
          For now, you can use the notes field below to capture information.
        </p>
      </div>
      
      {/* General Notes */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Notes</h3>
        <textarea
          value={getFieldValue(formData, 'general', 'notes', '') as string}
          onChange={(e) => updateField('general', 'notes', e.target.value)}
          placeholder="Add any notes or information for this form..."
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </section>

      {/* Photos */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Photos</h3>
        <RobustPhotoUpload
          formId={formId}
          moduleData={photosData}
          onChange={(data) => updateModule('photos', data)}
        />
      </section>

      {/* Signatures */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Signatures</h3>
        <SignatureModule
          moduleData={signaturesData}
          onChange={(data) => updateModule('signatures', data)}
          formId={formId}
        />
      </section>
    </div>
  );
}
