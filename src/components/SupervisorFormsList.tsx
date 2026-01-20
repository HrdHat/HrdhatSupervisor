import { useState } from 'react';
import { useSupervisorStore } from '@/stores/supervisorStore';
import type { SupervisorFormInstance } from '@/types/supervisorForms';
import { getFormTypeConfig } from '@/types/supervisorForms';

interface SupervisorFormsListProps {
  projectId: string;
  onCreateForm: () => void;
  onEditForm: (formId: string) => void;
}

export function SupervisorFormsList({
  projectId,
  onCreateForm,
  onEditForm,
}: SupervisorFormsListProps) {
  const [showArchived, setShowArchived] = useState(false);

  const supervisorForms = useSupervisorStore((s) => s.supervisorForms);
  const deleteSupervisorForm = useSupervisorStore((s) => s.deleteSupervisorForm);
  const archiveSupervisorForm = useSupervisorStore((s) => s.archiveSupervisorForm);
  const loading = useSupervisorStore((s) => s.loading);

  // Filter forms for this project
  const projectForms = supervisorForms.filter((f) => f.project_id === projectId);
  const activeForms = projectForms.filter((f) => f.status === 'active');
  const archivedForms = projectForms.filter((f) => f.status === 'archived');
  const displayedForms = showArchived ? archivedForms : activeForms;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleDelete = async (form: SupervisorFormInstance) => {
    if (confirm(`Delete "${form.title}"? This cannot be undone.`)) {
      await deleteSupervisorForm(form.id);
    }
  };

  const handleArchive = async (form: SupervisorFormInstance) => {
    await archiveSupervisorForm(form.id);
  };

  const renderFormCard = (form: SupervisorFormInstance) => {
    const config = getFormTypeConfig(form.template_id);
    
    return (
      <div
        key={form.id}
        className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
        onClick={() => onEditForm(form.id)}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Icon and main content */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`
              flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg
              ${config?.bgColor ?? 'bg-gray-100'}
            `}>
              {config?.icon ?? '📋'}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                  {form.title}
                </h4>
                <span className={`
                  px-2 py-0.5 text-xs font-medium rounded-full
                  ${form.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
                `}>
                  {form.status === 'active' ? 'Active' : 'Archived'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                <span className={`px-1.5 py-0.5 rounded ${config?.bgColor ?? 'bg-gray-100'} ${config?.color ?? 'text-gray-700'}`}>
                  {config?.shortName ?? form.template_id}
                </span>
                <span>•</span>
                <span>#{form.form_number}</span>
                <span>•</span>
                <span>{formatDate(form.created_at)}</span>
              </div>
              
              {/* Click to open hint */}
              <div className="mt-2 text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                Click to {form.status === 'active' ? 'view/edit' : 'view'} form →
              </div>
            </div>
          </div>
          
          {/* Actions - stop propagation to prevent card click */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {form.status === 'active' && (
              <>
                <button
                  onClick={() => onEditForm(form.id)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="View/Edit Form"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                
                <button
                  onClick={() => handleArchive(form)}
                  className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                  title="Archive Form"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </button>
              </>
            )}
            
            {form.status === 'archived' && (
              <button
                onClick={() => onEditForm(form.id)}
                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="View Form"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            )}
            
            <button
              onClick={() => handleDelete(form)}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Form"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-800">My Forms</h3>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setShowArchived(false)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                !showArchived ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active ({activeForms.length})
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                showArchived ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Archived ({archivedForms.length})
            </button>
          </div>
        </div>
        <button
          onClick={onCreateForm}
          className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Form
        </button>
      </div>

      {/* Forms List */}
      <div className="space-y-3">
        {loading && displayedForms.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-primary-600 rounded-full mx-auto mb-2" />
            <p className="text-sm">Loading forms...</p>
          </div>
        ) : displayedForms.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm text-gray-600 mb-4">
              {showArchived 
                ? 'No archived forms yet' 
                : 'No forms created yet'}
            </p>
            {!showArchived && (
              <button
                onClick={onCreateForm}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                + Create your first form
              </button>
            )}
          </div>
        ) : (
          displayedForms.map(renderFormCard)
        )}
      </div>
    </div>
  );
}
