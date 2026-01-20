import { useState, useEffect } from 'react';
import { useSupervisorStore } from '@/stores/supervisorStore';
import type { DiscoveredWorker, DiscoveredSubcontractor } from '@/types/supervisor';

type DiscoveryMode = 'workers' | 'subcontractors';

// Editable version of discovered worker
interface EditableWorker extends DiscoveredWorker {
  id: string; // unique key for editing
  phone: string;
}

// Editable version of discovered subcontractor
interface EditableSubcontractor extends DiscoveredSubcontractor {
  id: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
}

interface DiscoverFromFormsModalProps {
  projectId: string;
  mode: DiscoveryMode;
  onClose: () => void;
}

export function DiscoverFromFormsModal({
  projectId,
  mode,
  onClose,
}: DiscoverFromFormsModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [addingResults, setAddingResults] = useState<{ success: string[]; failed: string[] } | null>(null);
  
  // Editable state
  const [editableWorkers, setEditableWorkers] = useState<EditableWorker[]>([]);
  const [editableSubcontractors, setEditableSubcontractors] = useState<EditableSubcontractor[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Store actions
  const discoverWorkersFromDocuments = useSupervisorStore((s) => s.discoverWorkersFromDocuments);
  const discoverSubcontractorsFromDocuments = useSupervisorStore((s) => s.discoverSubcontractorsFromDocuments);
  const createSubcontractor = useSupervisorStore((s) => s.createSubcontractor);
  const addContact = useSupervisorStore((s) => s.addContact);

  // Load discovered items on mount
  useEffect(() => {
    const loadDiscoveries = async () => {
      setIsLoading(true);
      try {
        if (mode === 'workers') {
          const workers = await discoverWorkersFromDocuments(projectId);
          // Convert to editable format
          const editable: EditableWorker[] = workers.map((w, idx) => ({
            ...w,
            id: `worker-${idx}-${w.name.toLowerCase().replace(/\s+/g, '-')}`,
            phone: '',
          }));
          setEditableWorkers(editable);
          setSelectedIds(new Set(editable.map((w) => w.id)));
        } else {
          const subcontractors = await discoverSubcontractorsFromDocuments(projectId);
          // Convert to editable format
          const editable: EditableSubcontractor[] = subcontractors.map((s, idx) => ({
            ...s,
            id: `sub-${idx}-${s.companyName.toLowerCase().replace(/\s+/g, '-')}`,
            contactName: '',
            contactEmail: '',
            contactPhone: '',
            notes: `Discovered from ${s.documentCount} form(s). Workers: ${s.workerNames.join(', ') || 'N/A'}`,
          }));
          setEditableSubcontractors(editable);
          setSelectedIds(new Set(editable.map((s) => s.id)));
        }
      } catch (error) {
        console.error('Failed to discover from documents:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDiscoveries();
  }, [projectId, mode, discoverWorkersFromDocuments, discoverSubcontractorsFromDocuments]);

  // Toggle selection
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle expand for editing
  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedId(expandedId === id ? null : id);
  };

  // Select all / deselect all
  const toggleSelectAll = () => {
    const allIds = mode === 'workers' 
      ? editableWorkers.map((w) => w.id) 
      : editableSubcontractors.map((s) => s.id);
    
    if (selectedIds.size === allIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  // Update worker field
  const updateWorker = (id: string, field: keyof EditableWorker, value: string) => {
    setEditableWorkers((prev) =>
      prev.map((w) => (w.id === id ? { ...w, [field]: value } : w))
    );
  };

  // Update subcontractor field
  const updateSubcontractor = (id: string, field: keyof EditableSubcontractor, value: string) => {
    setEditableSubcontractors((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  // Handle adding selected items
  const handleAdd = async () => {
    setIsAdding(true);
    setAddingResults(null);
    const success: string[] = [];
    const failed: string[] = [];

    try {
      if (mode === 'workers') {
        const toAdd = editableWorkers.filter((w) => selectedIds.has(w.id));
        
        for (const worker of toAdd) {
          try {
            await addContact({
              name: worker.name,
              email: worker.email || undefined,
              phone: worker.phone || undefined,
              company_name: worker.companyName || undefined,
              source: 'discovered',
              recent_project_id: projectId, // Track which project they were discovered from
            });
            success.push(worker.name);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            failed.push(`${worker.name} - ${message}`);
          }
        }
      } else {
        const toAdd = editableSubcontractors.filter((s) => selectedIds.has(s.id));
        
        for (const sub of toAdd) {
          try {
            await createSubcontractor({
              project_id: projectId,
              company_name: sub.companyName,
              contact_name: sub.contactName || undefined,
              contact_email: sub.contactEmail || undefined,
              contact_phone: sub.contactPhone || undefined,
              notes: sub.notes || undefined,
            });
            success.push(sub.companyName);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            failed.push(`${sub.companyName} - ${message}`);
          }
        }
      }

      setAddingResults({ success, failed });
      
      // If all succeeded, close after a brief delay
      if (failed.length === 0 && success.length > 0) {
        setTimeout(() => onClose(), 1500);
      }
    } catch (error) {
      console.error('Failed to add items:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // Format date for display
  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const isWorkerMode = mode === 'workers';
  const items = isWorkerMode ? editableWorkers : editableSubcontractors;
  const selectedCount = selectedIds.size;
  const hasItems = items.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isWorkerMode ? 'Discover Workers from Forms' : 'Discover Subcontractors from Forms'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {isWorkerMode
              ? 'Found worker names in submitted forms. Click to expand and edit details before adding.'
              : 'Found company names in submitted forms. Click to expand and edit details before adding.'}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="ml-3 text-gray-600">Analyzing documents...</span>
            </div>
          ) : addingResults ? (
            // Results view
            <div className="space-y-4">
              {addingResults.success.length > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">
                    ✓ Successfully Added ({addingResults.success.length})
                  </h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    {addingResults.success.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {addingResults.failed.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">
                    ✗ Failed to Add ({addingResults.failed.length})
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {addingResults.failed.map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : !hasItems ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">✓</div>
              <h3 className="text-lg font-medium text-gray-900">All caught up!</h3>
              <p className="mt-2 text-gray-500">
                {isWorkerMode
                  ? 'All workers found in forms are already in your project.'
                  : 'All companies found in forms are already in your project.'}
              </p>
            </div>
          ) : (
            <>
              {/* Select all toggle */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">
                  Found {items.length} {isWorkerMode ? 'worker' : 'compan'}
                  {items.length === 1 ? (isWorkerMode ? '' : 'y') : isWorkerMode ? 's' : 'ies'} not in your project
                </span>
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {selectedCount === items.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Hint */}
              <p className="text-xs text-gray-400 mb-3">
                Click the edit icon to expand and modify details before adding.
              </p>

              {/* Items list */}
              <div className="space-y-2">
                {isWorkerMode
                  ? editableWorkers.map((worker) => (
                      <div
                        key={worker.id}
                        className={`rounded-lg border transition-colors ${
                          selectedIds.has(worker.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Main row */}
                        <div
                          className="flex items-center p-3 cursor-pointer"
                          onClick={() => toggleSelection(worker.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(worker.id)}
                            onChange={() => toggleSelection(worker.id)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-3"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {worker.name}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {worker.email || <span className="text-orange-500">No email</span>}
                              {worker.companyName && ` · ${worker.companyName}`}
                              {` · ${worker.documentCount} form${worker.documentCount !== 1 ? 's' : ''}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <span className="text-xs text-gray-400">
                              Last: {formatDate(worker.lastSeen)}
                            </span>
                            <button
                              onClick={(e) => toggleExpand(worker.id, e)}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded"
                              title="Edit details"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Expanded edit form */}
                        {expandedId === worker.id && (
                          <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Name
                                </label>
                                <input
                                  type="text"
                                  value={worker.name}
                                  onChange={(e) => updateWorker(worker.id, 'name', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Company
                                </label>
                                <input
                                  type="text"
                                  value={worker.companyName || ''}
                                  onChange={(e) => updateWorker(worker.id, 'companyName', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Company name"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Email <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="email"
                                  value={worker.email || ''}
                                  onChange={(e) => updateWorker(worker.id, 'email', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="worker@email.com"
                                />
                                <p className="text-xs text-gray-400 mt-1">Required - must match user's HrdHat account email</p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Phone
                                </label>
                                <input
                                  type="tel"
                                  value={worker.phone}
                                  onChange={(e) => updateWorker(worker.id, 'phone', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="(555) 123-4567"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  : editableSubcontractors.map((sub) => (
                      <div
                        key={sub.id}
                        className={`rounded-lg border transition-colors ${
                          selectedIds.has(sub.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Main row */}
                        <div
                          className="flex items-center p-3 cursor-pointer"
                          onClick={() => toggleSelection(sub.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedIds.has(sub.id)}
                            onChange={() => toggleSelection(sub.id)}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 mr-3"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">
                              {sub.companyName}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {sub.documentCount} form{sub.documentCount !== 1 ? 's' : ''} ·{' '}
                              {sub.workerNames.length > 0
                                ? `Workers: ${sub.workerNames.slice(0, 3).join(', ')}${sub.workerNames.length > 3 ? '...' : ''}`
                                : 'No worker names'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <span className="text-xs text-gray-400">
                              Last: {formatDate(sub.lastSeen)}
                            </span>
                            <button
                              onClick={(e) => toggleExpand(sub.id, e)}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded"
                              title="Edit details"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Expanded edit form */}
                        {expandedId === sub.id && (
                          <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Company Name
                              </label>
                              <input
                                type="text"
                                value={sub.companyName}
                                onChange={(e) => updateSubcontractor(sub.id, 'companyName', e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Contact Name
                                </label>
                                <input
                                  type="text"
                                  value={sub.contactName}
                                  onChange={(e) => updateSubcontractor(sub.id, 'contactName', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Contact person"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Contact Email
                                </label>
                                <input
                                  type="email"
                                  value={sub.contactEmail}
                                  onChange={(e) => updateSubcontractor(sub.id, 'contactEmail', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="contact@company.com"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Contact Phone
                                </label>
                                <input
                                  type="tel"
                                  value={sub.contactPhone}
                                  onChange={(e) => updateSubcontractor(sub.id, 'contactPhone', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="(555) 123-4567"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Notes
                                </label>
                                <input
                                  type="text"
                                  value={sub.notes}
                                  onChange={(e) => updateSubcontractor(sub.id, 'notes', e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Additional notes"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
            disabled={isAdding}
          >
            {addingResults ? 'Close' : 'Cancel'}
          </button>

          {hasItems && !isLoading && !addingResults && (
            <button
              onClick={handleAdd}
              disabled={selectedCount === 0 || isAdding}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAdding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Adding...
                </>
              ) : (
                `Add ${selectedCount} ${isWorkerMode ? 'Worker' : 'Subcontractor'}${selectedCount !== 1 ? 's' : ''}`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
