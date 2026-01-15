import { useState, useEffect, useCallback } from 'react';

import type { ReceivedDocument, ProjectFolder, DocumentMetadata } from '@/types/supervisor';
import { getEffectiveMetadata } from '@/types/supervisor';

interface QuickReviewModalProps {
  documents: ReceivedDocument[];
  folders: ProjectFolder[];
  initialIndex?: number;
  onClose: () => void;
  onSave: (documentId: string, updates: {
    folderId: string | null;
    metadata: Partial<DocumentMetadata>;
  }) => Promise<void>;
  getDocumentUrl: (storagePath: string) => Promise<string | null>;
}

/**
 * Quick Review Modal for rapid document triage.
 * Shows document preview on the left, metadata form on the right.
 * Supports keyboard navigation (Arrow keys, Enter to save).
 */
export function QuickReviewModal({
  documents,
  folders,
  initialIndex = 0,
  onClose,
  onSave,
  getDocumentUrl,
}: QuickReviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state for current document
  const [workerName, setWorkerName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');

  const currentDoc = documents[currentIndex];
  const hasNext = currentIndex < documents.length - 1;
  const hasPrev = currentIndex > 0;

  // Load document preview
  useEffect(() => {
    if (!currentDoc) return;
    
    setIsLoadingPreview(true);
    setPreviewUrl(null);
    
    getDocumentUrl(currentDoc.storage_path).then((url) => {
      setPreviewUrl(url);
      setIsLoadingPreview(false);
    });
  }, [currentDoc, getDocumentUrl]);

  // Initialize form with current document's metadata
  useEffect(() => {
    if (!currentDoc) return;
    
    const metadata = getEffectiveMetadata(currentDoc.ai_extracted_data);
    setWorkerName(metadata.workerName ?? '');
    setCompanyName(metadata.companyName ?? '');
    setDocumentDate(metadata.documentDate ?? '');
    setSelectedFolderId(currentDoc.folder_id ?? '');
  }, [currentDoc]);

  // Navigation handlers
  const goNext = useCallback(() => {
    if (hasNext) setCurrentIndex((i) => i + 1);
  }, [hasNext]);

  const goPrev = useCallback(() => {
    if (hasPrev) setCurrentIndex((i) => i - 1);
  }, [hasPrev]);

  // Save current document and go to next
  const handleSaveAndNext = useCallback(async () => {
    if (!currentDoc || isSaving) return;
    
    setIsSaving(true);
    
    try {
      await onSave(currentDoc.id, {
        folderId: selectedFolderId || null,
        metadata: {
          workerNameManual: workerName || undefined,
          companyNameManual: companyName || undefined,
          documentDateManual: documentDate || undefined,
        },
      });
      
      // Move to next document or close if this was the last one
      if (hasNext) {
        goNext();
      } else {
        onClose();
      }
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentDoc, selectedFolderId, workerName, companyName, documentDate, isSaving, onSave, hasNext, goNext, onClose]);

  // Skip without saving
  const handleSkip = useCallback(() => {
    if (hasNext) {
      goNext();
    } else {
      onClose();
    }
  }, [hasNext, goNext, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        // Only handle Enter in inputs to submit
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          handleSaveAndNext();
        }
        return;
      }
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          goPrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            handleSkip();
          } else {
            goNext();
          }
          break;
        case 'Enter':
          e.preventDefault();
          handleSaveAndNext();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goPrev, goNext, handleSkip, handleSaveAndNext, onClose]);

  if (!currentDoc) {
    return null;
  }

  // Check if fields have AI-extracted values
  const aiMetadata = currentDoc.ai_extracted_data as DocumentMetadata;
  const hasAiWorkerName = Boolean(aiMetadata.workerName);
  const hasAiCompanyName = Boolean(aiMetadata.companyName);
  const hasAiDocumentDate = Boolean(aiMetadata.documentDate);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-secondary-200 bg-secondary-50">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-secondary-900">Quick Review</h2>
            <span className="text-sm text-secondary-500">
              {currentIndex + 1} of {documents.length}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Navigation */}
            <button
              onClick={goPrev}
              disabled={!hasPrev}
              className="p-2 rounded-lg bg-secondary-100 text-secondary-600 hover:bg-secondary-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Previous (←)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goNext}
              disabled={!hasNext}
              className="p-2 rounded-lg bg-secondary-100 text-secondary-600 hover:bg-secondary-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Next (→)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 transition-colors ml-2"
              title="Close (Esc)"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Document Preview */}
          <div className="flex-1 bg-secondary-100 p-4 overflow-auto">
            {isLoadingPreview ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-4 text-secondary-400 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-secondary-500">Loading preview...</p>
                </div>
              </div>
            ) : previewUrl ? (
              currentDoc.mime_type?.includes('pdf') ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full min-h-[60vh] rounded-lg bg-white shadow-lg"
                  title="Document Preview"
                />
              ) : currentDoc.mime_type?.includes('image') ? (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={previewUrl}
                    alt={currentDoc.original_filename ?? 'Document'}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-secondary-500">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-secondary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium">Preview not available</p>
                    <p className="text-sm">{currentDoc.mime_type}</p>
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full text-secondary-500">
                <p>Failed to load preview</p>
              </div>
            )}
          </div>

          {/* Right: Metadata Form */}
          <div className="w-96 border-l border-secondary-200 p-6 overflow-auto">
            {/* Document Info */}
            <div className="mb-6 pb-4 border-b border-secondary-200">
              <h3 className="font-medium text-secondary-900 truncate mb-1">
                {currentDoc.original_filename ?? 'Unnamed Document'}
              </h3>
              <p className="text-xs text-secondary-500">
                {currentDoc.source_email && `From: ${currentDoc.source_email}`}
              </p>
              <p className="text-xs text-secondary-500">
                Received: {new Date(currentDoc.received_at).toLocaleDateString()}
              </p>
              {currentDoc.ai_classification && currentDoc.ai_classification !== 'Unknown' && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-1 text-xs font-medium rounded bg-primary-100 text-primary-700">
                    🤖 {currentDoc.ai_classification}
                  </span>
                  {currentDoc.confidence_score !== null && (
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      currentDoc.confidence_score >= 70 
                        ? 'bg-success-100 text-success-700' 
                        : 'bg-warning-100 text-warning-700'
                    }`}>
                      {currentDoc.confidence_score}%
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Metadata Form */}
            <div className="space-y-4">
              {/* Worker Name */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Worker Name
                  {!hasAiWorkerName && (
                    <span className="ml-2 text-xs text-warning-600">(Not detected)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  placeholder="Enter worker name..."
                  className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all ${
                    !hasAiWorkerName && !workerName
                      ? 'border-warning-300 bg-warning-50 focus:border-warning-500 focus:ring-2 focus:ring-warning-200'
                      : 'border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                  }`}
                />
              </div>

              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Company / Subcontractor
                  {!hasAiCompanyName && (
                    <span className="ml-2 text-xs text-warning-600">(Not detected)</span>
                  )}
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name..."
                  className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all ${
                    !hasAiCompanyName && !companyName
                      ? 'border-warning-300 bg-warning-50 focus:border-warning-500 focus:ring-2 focus:ring-warning-200'
                      : 'border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                  }`}
                />
              </div>

              {/* Document Date */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Document Date
                  {!hasAiDocumentDate && (
                    <span className="ml-2 text-xs text-warning-600">(Not detected)</span>
                  )}
                </label>
                <input
                  type="date"
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-lg border outline-none transition-all ${
                    !hasAiDocumentDate && !documentDate
                      ? 'border-warning-300 bg-warning-50 focus:border-warning-500 focus:ring-2 focus:ring-warning-200'
                      : 'border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200'
                  }`}
                />
              </div>

              {/* Folder Selection */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  File to Folder
                </label>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all bg-white"
                >
                  <option value="">Leave unsorted</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.folder_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 space-y-3">
              <button
                onClick={handleSaveAndNext}
                disabled={isSaving}
                className="w-full px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {hasNext ? 'Save & Next' : 'Save & Close'}
                    <span className="text-xs opacity-75">(Enter)</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleSkip}
                disabled={isSaving}
                className="w-full px-4 py-2 text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors disabled:opacity-50"
              >
                {hasNext ? 'Skip' : 'Close'} <span className="text-xs opacity-75">(Shift+→)</span>
              </button>
            </div>

            {/* Keyboard Hints */}
            <div className="mt-6 pt-4 border-t border-secondary-200">
              <p className="text-xs text-secondary-400 text-center">
                ← → Navigate • Enter Save • Esc Close
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
