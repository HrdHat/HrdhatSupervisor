import { useMemo } from 'react';

import type { DocumentFilters, ReceivedDocument, ProjectSubcontractor } from '@/types/supervisor';
import { getEffectiveMetadata } from '@/types/supervisor';

interface DocumentFilterBarProps {
  documents: ReceivedDocument[];
  filters: DocumentFilters;
  onFiltersChange: (filters: DocumentFilters) => void;
  subcontractors?: ProjectSubcontractor[];
}

/**
 * Filter bar for documents with search, worker, company, date range, and type filters.
 * Extracts unique values from documents for dropdown options.
 */
export function DocumentFilterBar({
  documents,
  filters,
  onFiltersChange,
  subcontractors = [],
}: DocumentFilterBarProps) {
  // Extract unique values from documents for filter dropdowns
  const filterOptions = useMemo(() => {
    const workers = new Set<string>();
    const companies = new Set<string>();
    const types = new Set<string>();

    // Add subcontractor company names first
    subcontractors.forEach((sub) => {
      if (sub.status === 'active') {
        companies.add(sub.company_name);
      }
    });

    documents.forEach((doc) => {
      // Get effective metadata (manual overrides take precedence)
      const metadata = getEffectiveMetadata(doc.ai_extracted_data);
      
      if (metadata.workerName) workers.add(metadata.workerName);
      if (metadata.companyName) companies.add(metadata.companyName);
      if (doc.ai_classification && doc.ai_classification !== 'Unknown') {
        types.add(doc.ai_classification);
      }
    });

    return {
      workers: Array.from(workers).sort(),
      companies: Array.from(companies).sort(),
      types: Array.from(types).sort(),
    };
  }, [documents, subcontractors]);

  // Count active filters
  const activeFilterCount = [
    filters.search,
    filters.workerName,
    filters.companyName,
    filters.dateFrom,
    filters.dateTo,
    filters.documentType,
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    onFiltersChange({
      search: '',
      workerName: null,
      companyName: null,
      dateFrom: null,
      dateTo: null,
      documentType: null,
    });
  };

  return (
    <div className="bg-secondary-50 rounded-xl p-4 mb-4 border border-secondary-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="font-medium text-secondary-700">Filters</span>
          {activeFilterCount > 0 && (
            <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={handleClearFilters}
            className="text-sm text-secondary-500 hover:text-secondary-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear all
          </button>
        )}
      </div>

      {/* Filter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Search */}
        <div className="xl:col-span-2">
          <label className="block text-xs font-medium text-secondary-500 mb-1">
            Search
          </label>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              placeholder="Filename, subject, email..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all bg-white"
            />
          </div>
        </div>

        {/* Worker Name */}
        <div>
          <label className="block text-xs font-medium text-secondary-500 mb-1">
            Worker
          </label>
          <select
            value={filters.workerName ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, workerName: e.target.value || null })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all bg-white"
          >
            <option value="">All workers</option>
            {filterOptions.workers.map((worker) => (
              <option key={worker} value={worker}>
                {worker}
              </option>
            ))}
          </select>
        </div>

        {/* Company/Subcontractor */}
        <div>
          <label className="block text-xs font-medium text-secondary-500 mb-1">
            Subcontractor
          </label>
          <select
            value={filters.companyName ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, companyName: e.target.value || null })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all bg-white"
          >
            <option value="">All subcontractors</option>
            {filterOptions.companies.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-xs font-medium text-secondary-500 mb-1">
            From Date
          </label>
          <input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value || null })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all bg-white"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-xs font-medium text-secondary-500 mb-1">
            To Date
          </label>
          <input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value || null })}
            className="w-full px-3 py-2 text-sm rounded-lg border border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all bg-white"
          />
        </div>

        {/* Document Type */}
        {filterOptions.types.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-secondary-500 mb-1">
              Type
            </label>
            <select
              value={filters.documentType ?? ''}
              onChange={(e) => onFiltersChange({ ...filters, documentType: e.target.value || null })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all bg-white"
            >
              <option value="">All types</option>
              {filterOptions.types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Apply filters to a list of documents.
 * Returns filtered documents based on current filter state.
 */
export function filterDocuments(
  documents: ReceivedDocument[],
  filters: DocumentFilters
): ReceivedDocument[] {
  return documents.filter((doc) => {
    // Get effective metadata (manual overrides take precedence)
    const metadata = getEffectiveMetadata(doc.ai_extracted_data);

    // Search filter (filename, subject, source email)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        doc.original_filename?.toLowerCase().includes(searchLower) ||
        doc.email_subject?.toLowerCase().includes(searchLower) ||
        doc.source_email?.toLowerCase().includes(searchLower) ||
        metadata.workerName?.toLowerCase().includes(searchLower) ||
        metadata.companyName?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Worker filter
    if (filters.workerName && metadata.workerName !== filters.workerName) {
      return false;
    }

    // Company filter
    if (filters.companyName && metadata.companyName !== filters.companyName) {
      return false;
    }

    // Document type filter
    if (filters.documentType && doc.ai_classification !== filters.documentType) {
      return false;
    }

    // Date range filter (using document date from metadata, falling back to received_at)
    const docDate = metadata.documentDate ?? doc.received_at.split('T')[0];
    
    if (filters.dateFrom && docDate < filters.dateFrom) {
      return false;
    }
    
    if (filters.dateTo && docDate > filters.dateTo) {
      return false;
    }

    return true;
  });
}
