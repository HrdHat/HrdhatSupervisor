import { useState } from 'react';
import { useSupervisorStore } from '@/stores/supervisorStore';
import type { FormTypeId, FormCategory } from '@/types/supervisorForms';
import { getWorkerFormTypes, getSupervisorFormTypes } from '@/types/supervisorForms';

interface NewSupervisorFormPickerProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onFormCreated: (formId: string) => void;
}

export function NewSupervisorFormPicker({
  projectId,
  isOpen,
  onClose,
  onFormCreated,
}: NewSupervisorFormPickerProps) {
  const [creating, setCreating] = useState(false);
  const [selectedType, setSelectedType] = useState<FormTypeId | null>(null);
  const [activeCategory, setActiveCategory] = useState<FormCategory>('supervisor');
  
  const createSupervisorForm = useSupervisorStore((s) => s.createSupervisorForm);
  const error = useSupervisorStore((s) => s.error);

  const handleSelectFormType = async (formTypeId: FormTypeId) => {
    setSelectedType(formTypeId);
    setCreating(true);

    try {
      const form = await createSupervisorForm({
        project_id: projectId,
        template_id: formTypeId,
      });

      if (form) {
        onFormCreated(form.id);
        onClose();
      }
    } catch (err) {
      console.error('Failed to create form:', err);
    } finally {
      setCreating(false);
      setSelectedType(null);
    }
  };

  const handleClose = () => {
    if (!creating) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const supervisorForms = getSupervisorFormTypes();
  const workerForms = getWorkerFormTypes();
  const displayedForms = activeCategory === 'supervisor' ? supervisorForms : workerForms;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-gray-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Create New Form</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Select a form type to get started
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={creating}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="px-6 pt-4">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveCategory('supervisor')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeCategory === 'supervisor' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Supervisor Forms
              </button>
              <button
                onClick={() => setActiveCategory('worker')}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeCategory === 'worker' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Worker Forms
              </button>
            </div>
          </div>

          {/* Form Type Options */}
          <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto">
            {displayedForms.map((formType) => {
              const isSelected = selectedType === formType.id;
              const isDisabled = creating && !isSelected;
              
              return (
                <button
                  key={formType.id}
                  onClick={() => handleSelectFormType(formType.id)}
                  disabled={creating}
                  className={`
                    w-full p-4 rounded-xl border-2 text-left transition-all
                    ${isSelected 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/50'}
                    ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-start gap-4">
                    <div className={`
                      w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                      ${formType.bgColor}
                    `}>
                      {formType.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold ${formType.color}`}>
                          {formType.name}
                        </h3>
                        {isSelected && creating && (
                          <div className="animate-spin w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {formType.description}
                      </p>
                    </div>
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-colors flex-shrink-0 ${isSelected ? 'text-primary-500' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-6 pb-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            <p className="text-xs text-gray-500 text-center">
              {activeCategory === 'supervisor' 
                ? 'Supervisor forms are for documenting site activities and inspections.'
                : 'Worker forms can be pre-filled and assigned to crew members.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
