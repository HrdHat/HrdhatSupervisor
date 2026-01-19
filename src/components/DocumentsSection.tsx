import type { ReceivedDocument, ProjectFolder, DocumentFilters, ProjectSubcontractor } from '@/types/supervisor';
import { DocumentFilterBar } from './DocumentFilterBar';

interface DocumentsSectionProps {
  // Data
  documents: ReceivedDocument[];
  folders: ProjectFolder[];
  subcontractors: ProjectSubcontractor[];
  currentDocuments: ReceivedDocument[];
  folderDocuments: ReceivedDocument[];
  unsortedCount: number;
  
  // State
  selectedFolderId: string | null;
  selectedDocIds: Set<string>;
  filters: DocumentFilters;
  showFilters: boolean;
  sortBy: string;
  activeFilterCount: number;
  isReprocessing: boolean;
  loading: boolean;
  reprocessResult: { show: boolean; success: boolean; message: string } | null;
  
  // Handlers
  onFolderSelect: (folderId: string | null) => void;
  onFiltersChange: (filters: DocumentFilters) => void;
  onShowFiltersChange: (show: boolean) => void;
  onSortChange: (sort: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onToggleDocSelection?: (docId: string) => void;
  onReprocessAll: () => void;
  onClearReprocessResult: () => void;
  onOpenQuickReview: (startIndex: number) => void;
  onOpenBulkMove: () => void;
  onOpenBulkDelete: () => void;
  onMoveDocument: (doc: ReceivedDocument) => void;
  onDeleteDocument: (doc: ReceivedDocument) => void;
  onPreviewDocument: (doc: ReceivedDocument) => void;
  onDownloadDocument: (doc: ReceivedDocument) => void;
  getDocumentCountByFolder: (folderId: string | null) => number;
  
  // Optional
  isLoadingPreview?: boolean;
  
  // Render document card function (passed from parent to maintain existing logic)
  renderDocumentCard: (doc: ReceivedDocument, index: number) => React.ReactNode;
}

export function DocumentsSection({
  documents,
  folders,
  subcontractors,
  currentDocuments,
  folderDocuments,
  unsortedCount,
  selectedFolderId,
  selectedDocIds,
  filters,
  showFilters,
  sortBy,
  activeFilterCount,
  isReprocessing,
  loading,
  reprocessResult,
  onFolderSelect,
  onFiltersChange,
  onShowFiltersChange,
  onSortChange,
  onSelectAll,
  onDeselectAll,
  onToggleDocSelection: _onToggleDocSelection,
  onReprocessAll,
  onClearReprocessResult,
  onOpenQuickReview,
  onOpenBulkMove,
  onOpenBulkDelete,
  getDocumentCountByFolder,
  renderDocumentCard,
}: DocumentsSectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-secondary-900">Documents</h3>
          <p className="text-sm text-secondary-500">
            {unsortedCount > 0 
              ? `${unsortedCount} document${unsortedCount !== 1 ? 's' : ''} need review`
              : 'All documents have been sorted'}
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-secondary-500 hidden sm:inline">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-secondary-300 bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="company">Company</option>
              <option value="worker">Worker</option>
            </select>
          </div>
          
          {/* Filter Toggle Button */}
          <button
            onClick={() => onShowFiltersChange(!showFilters)}
            className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${
              showFilters || activeFilterCount > 0
                ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {activeFilterCount > 0 && (
              <span className="bg-primary-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
          
          {/* Quick Review Button */}
          {currentDocuments.length > 0 && (
            <button
              onClick={() => onOpenQuickReview(0)}
              className="px-3 py-2 bg-success-600 hover:bg-success-700 text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Quick Review
            </button>
          )}
          
          {/* Reprocess Button */}
          {unsortedCount > 0 && (
            <button
              onClick={onReprocessAll}
              disabled={isReprocessing || loading}
              className="px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
            >
              {isReprocessing ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  AI Reprocess
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar (collapsible) */}
      {showFilters && (
        <DocumentFilterBar
          documents={documents}
          filters={filters}
          onFiltersChange={onFiltersChange}
          subcontractors={subcontractors}
        />
      )}

      {/* Results Count */}
      {(activeFilterCount > 0 || sortBy !== 'date_desc') && (
        <div className="mb-4 flex items-center justify-between text-sm text-secondary-600">
          <span>
            Showing {currentDocuments.length} of {folderDocuments.length} documents
            {activeFilterCount > 0 && ` (${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''} applied)`}
          </span>
          {activeFilterCount > 0 && (
            <button
              onClick={() => onFiltersChange({
                search: '',
                workerName: null,
                companyName: null,
                dateFrom: null,
                dateTo: null,
                documentType: null,
              })}
              className="text-primary-600 hover:text-primary-700 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Reprocess Result Message */}
      {reprocessResult?.show && (
        <div className={`mb-4 p-3 rounded-lg border ${
          reprocessResult.success 
            ? 'bg-success-50 border-success-200 text-success-800' 
            : 'bg-danger-50 border-danger-200 text-danger-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm">{reprocessResult.message}</span>
            <button 
              onClick={onClearReprocessResult}
              className="text-current opacity-60 hover:opacity-100"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Folder Tabs */}
      <div className="flex flex-wrap gap-2 mb-4 border-b border-secondary-200 pb-4">
        {/* Unsorted Tab */}
        <button
          onClick={() => onFolderSelect(null)}
          className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 border-2"
          style={{
            backgroundColor: selectedFolderId === null ? '#f59e0b' : '#fef3c7',
            color: selectedFolderId === null ? '#ffffff' : '#92400e',
            borderColor: selectedFolderId === null ? '#d97706' : '#fcd34d',
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Unsorted
          {unsortedCount > 0 && (
            <span 
              className="text-xs px-1.5 py-0.5 rounded-full font-bold"
              style={{
                backgroundColor: selectedFolderId === null ? '#ffffff' : '#d97706',
                color: selectedFolderId === null ? '#92400e' : '#ffffff',
              }}
            >
              {unsortedCount}
            </span>
          )}
        </button>
        
        {/* Folder Tabs */}
        {folders.map((folder) => {
          const count = getDocumentCountByFolder(folder.id);
          return (
            <button
              key={folder.id}
              onClick={() => onFolderSelect(folder.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                selectedFolderId === folder.id
                  ? 'bg-primary-100 text-primary-800 border-2 border-primary-300'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
              }`}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: folder.color }}
              />
              {folder.folder_name}
              {count > 0 && (
                <span className="bg-secondary-300 text-secondary-700 text-xs px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selection Header & Bulk Actions */}
      {currentDocuments.length > 0 && (
        <div className="flex items-center justify-between mb-4 p-2 bg-secondary-50 rounded-lg border border-secondary-200">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDocIds.size === currentDocuments.length && currentDocuments.length > 0}
                onChange={(e) => e.target.checked ? onSelectAll() : onDeselectAll()}
                className="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-secondary-700">
                {selectedDocIds.size > 0 ? `${selectedDocIds.size} selected` : 'Select all'}
              </span>
            </label>
            
            {selectedDocIds.size > 0 && (
              <button onClick={onDeselectAll} className="text-sm text-secondary-500 hover:text-secondary-700">
                Clear
              </button>
            )}
          </div>
          
          {/* Bulk Actions */}
          {selectedDocIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenBulkMove}
                className="px-2.5 py-1 text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Move
              </button>
              <button
                onClick={onOpenBulkDelete}
                className="px-2.5 py-1 text-xs font-medium bg-danger-600 hover:bg-danger-700 text-white rounded-lg transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* Document List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {currentDocuments.length === 0 ? (
          <div className="text-center py-12 text-secondary-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-secondary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="font-medium">No documents in this folder</p>
            <p className="text-sm mt-1">Documents will appear here when received</p>
          </div>
        ) : (
          currentDocuments.map((doc, index) => renderDocumentCard(doc, index))
        )}
      </div>
    </div>
  );
}
