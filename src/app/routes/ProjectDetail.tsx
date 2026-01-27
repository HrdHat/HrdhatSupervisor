import { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/stores/authStore';
import { useSupervisorStore } from '@/stores/supervisorStore';
import { useDocumentRealtime } from '@/hooks/useDocumentRealtime';
import { DocumentFilterBar, filterDocuments } from '@/components/DocumentFilterBar';
import { QuickReviewModal } from '@/components/QuickReviewModal';
import { ShiftCloseout } from '@/components/ShiftCloseout';
import { CreateShiftModal } from '@/components/CreateShiftModal';
import { DiscoverFromFormsModal } from '@/components/DiscoverFromFormsModal';
import { ProjectDailyReportModal } from '@/components/ProjectDailyReportModal';
import { GenerateDailyReportModal } from '@/components/GenerateDailyReportModal';
import { QuickAddBar } from '@/components/QuickAddBar';
import { DailyLogModal } from '@/components/DailyLogModal';
import { DailyLogList } from '@/components/DailyLogList';
import { SupervisorFormsList } from '@/components/SupervisorFormsList';
import { NewSupervisorFormPicker } from '@/components/NewSupervisorFormPicker';
import { SupervisorFormEditor } from '@/components/SupervisorFormEditor';
import type { ReceivedDocument, DocumentFilters, DocumentMetadata, ProjectSubcontractor, CreateSubcontractorInput, ProjectShiftWithStats, ProjectDailyReport, DailyLogType } from '@/types/supervisor';
import { getEffectiveMetadata } from '@/types/supervisor';

// Toast notification for new documents
interface Toast {
  id: string;
  message: string;
  sender?: string;
  type: 'new_document' | 'updated';
}

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  // Management panel state (for settings dropdown)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  
  // Tab state - 'documents' is now the primary "Forms" tab
  const [activeTab, setActiveTab] = useState<'folders' | 'contacts' | 'subcontractors' | 'documents'>('documents');
  
  // Forms sub-tab state (within the Forms tab)
  const [formsSubTab, setFormsSubTab] = useState<'received' | 'my_forms'>('received');
  const [showFormPicker, setShowFormPicker] = useState(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  
  // Daily log modal state (for QuickAddBar)
  const [showDailyLogModal, setShowDailyLogModal] = useState(false);
  const [selectedLogType, setSelectedLogType] = useState<DailyLogType | null>(null);
  
  // Shift management state
  const [showCreateShiftModal, setShowCreateShiftModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ProjectShiftWithStats | null>(null);
  const [showShiftCloseout, setShowShiftCloseout] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  
  // Worker management state
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [workerEmail, setWorkerEmail] = useState('');
  const [workerSubcontractorId, setWorkerSubcontractorId] = useState<string>('');

  // Subcontractor management state
  const [showSubcontractorModal, setShowSubcontractorModal] = useState(false);
  const [editingSubcontractor, setEditingSubcontractor] = useState<ProjectSubcontractor | null>(null);
  const [subcontractorForm, setSubcontractorForm] = useState<CreateSubcontractorInput>({
    project_id: '',
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    notes: '',
  });

  // Document management state
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null); // null = unsorted
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ReceivedDocument | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessResult, setReprocessResult] = useState<{ show: boolean; success: boolean; message: string } | null>(null);
  
  // Preview state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<DocumentFilters>({
    search: '',
    workerName: null,
    companyName: null,
    dateFrom: null,
    dateTo: null,
    documentType: null,
  });
  const [showFilters, setShowFilters] = useState(true); // Show filters by default
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'company' | 'worker'>('date_desc');
  
  // Quick Review modal state
  const [showQuickReview, setShowQuickReview] = useState(false);
  const [quickReviewStartIndex, setQuickReviewStartIndex] = useState(0);
  
  // Bulk selection state
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [showBulkMoveModal, setShowBulkMoveModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState('');
  
  // Toast notifications for realtime updates
  const [toasts, setToasts] = useState<Toast[]>([]);

  // AI Discovery modal state
  const [showDiscoverWorkersModal, setShowDiscoverWorkersModal] = useState(false);
  const [showDiscoverSubcontractorsModal, setShowDiscoverSubcontractorsModal] = useState(false);

  // Daily Log & PDR state
  const [showPDRModal, setShowPDRModal] = useState(false);
  const [pdrDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedPDR, setSelectedPDR] = useState<ProjectDailyReport | null>(null);
  
  // AI Daily Report modal state
  const [showAIDailyReportModal, setShowAIDailyReportModal] = useState(false);

  // Project overview collapse state (collapsed by default on mobile)
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 640 : true
  );

  // Quick Add collapse state (expanded by default)
  const [isQuickAddExpanded, setIsQuickAddExpanded] = useState(true);
  
  // Daily Logs and Forms collapse states (expanded by default)
  const [isDailyLogsExpanded, setIsDailyLogsExpanded] = useState(true);
  const [isFormsExpanded, setIsFormsExpanded] = useState(true);

  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const setLastActiveProject = useAuthStore((s) => s.setLastActiveProject);

  const projects = useSupervisorStore((s) => s.projects);
  const folders = useSupervisorStore((s) => s.folders);
  const contacts = useSupervisorStore((s) => s.contacts);
  const subcontractors = useSupervisorStore((s) => s.subcontractors);
  const documents = useSupervisorStore((s) => s.documents);
  const loading = useSupervisorStore((s) => s.loading);
  const error = useSupervisorStore((s) => s.error);
  const fetchProjects = useSupervisorStore((s) => s.fetchProjects);
  const fetchFolders = useSupervisorStore((s) => s.fetchFolders);
  const fetchContacts = useSupervisorStore((s) => s.fetchContacts);
  const fetchSubcontractors = useSupervisorStore((s) => s.fetchSubcontractors);
  const fetchDocuments = useSupervisorStore((s) => s.fetchDocuments);
  const createFolder = useSupervisorStore((s) => s.createFolder);
  const removeContact = useSupervisorStore((s) => s.removeContact);
  const createSubcontractor = useSupervisorStore((s) => s.createSubcontractor);
  const updateSubcontractor = useSupervisorStore((s) => s.updateSubcontractor);
  const deleteSubcontractor = useSupervisorStore((s) => s.deleteSubcontractor);
  const addWorker = useSupervisorStore((s) => s.addWorker);
  // const removeWorker = useSupervisorStore((s) => s.removeWorker); // Kept for future use
  const getDocumentCountBySubcontractor = useSupervisorStore((s) => s.getDocumentCountBySubcontractor);
  const getWorkerCountBySubcontractor = useSupervisorStore((s) => s.getWorkerCountBySubcontractor);
  const moveDocumentToFolder = useSupervisorStore((s) => s.moveDocumentToFolder);
  const deleteDocument = useSupervisorStore((s) => s.deleteDocument);
  const reprocessDocumentsWithAI = useSupervisorStore((s) => s.reprocessDocumentsWithAI);
  const getUnsortedDocuments = useSupervisorStore((s) => s.getUnsortedDocuments);
  const getDocumentsByFolder = useSupervisorStore((s) => s.getDocumentsByFolder);
  const getDocumentCountByFolder = useSupervisorStore((s) => s.getDocumentCountByFolder);
  const getDocumentDownloadUrl = useSupervisorStore((s) => s.getDocumentDownloadUrl);
  const downloadDocument = useSupervisorStore((s) => s.downloadDocument);
  const updateDocumentMetadata = useSupervisorStore((s) => s.updateDocumentMetadata);
  const moveDocumentsToFolder = useSupervisorStore((s) => s.moveDocumentsToFolder);
  const deleteDocuments = useSupervisorStore((s) => s.deleteDocuments);
  const clearError = useSupervisorStore((s) => s.clearError);
  
  // Shift store selectors
  const shifts = useSupervisorStore((s) => s.shifts);
  const shiftWorkers = useSupervisorStore((s) => s.shiftWorkers);
  const fetchShifts = useSupervisorStore((s) => s.fetchShifts);
  const setCurrentShift = useSupervisorStore((s) => s.setCurrentShift);

  // Daily Log & PDR store selectors
  const dailyLogs = useSupervisorStore((s) => s.dailyLogs);
  const dailyReports = useSupervisorStore((s) => s.dailyReports);
  const fetchDailyLogsForDateRange = useSupervisorStore((s) => s.fetchDailyLogsForDateRange);
  const fetchDailyReports = useSupervisorStore((s) => s.fetchDailyReports);
  const deleteDailyLog = useSupervisorStore((s) => s.deleteDailyLog);
  const getDailyLogsGroupedByPeriod = useSupervisorStore((s) => s.getDailyLogsGroupedByPeriod);
  
  // Navigation for archive
  const navigate = useNavigate();

  // Supervisor Forms store selectors
  const fetchSupervisorForms = useSupervisorStore((s) => s.fetchSupervisorForms);

  const project = projects.find((p) => p.id === projectId);

  // Toast management
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Realtime document subscription
  useDocumentRealtime(projectId, {
    onNewDocument: (doc) => {
      addToast({
        message: doc.original_filename ?? 'New document received',
        sender: doc.source_email ?? undefined,
        type: 'new_document',
      });
    },
    onDocumentUpdated: (doc) => {
      // Only toast for status changes to 'filed' (auto-filed by AI)
      if (doc.status === 'filed' && doc.folder_id) {
        addToast({
          message: `${doc.original_filename ?? 'Document'} was auto-filed`,
          type: 'updated',
        });
      }
    },
  });

  useEffect(() => {
    if (projects.length === 0) {
      fetchProjects();
    }
  }, [projects.length, fetchProjects]);

  // Helper to get date strings for the 7-day range
  const getSevenDayRange = useCallback(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
    return { startDate: sevenDaysAgoStr, endDate: todayStr };
  }, []);

  useEffect(() => {
    if (projectId) {
      // Track this as the last active project for redirect on next login
      setLastActiveProject(projectId);
      
      fetchFolders(projectId);
      fetchContacts(); // Fetch supervisor's global contacts
      fetchSubcontractors(projectId);
      fetchDocuments(projectId);
      fetchShifts(projectId);
      
      // Fetch daily logs for the past 7 days
      const { startDate, endDate } = getSevenDayRange();
      fetchDailyLogsForDateRange(projectId, startDate, endDate);
      
      fetchDailyReports(projectId);
      fetchSupervisorForms(projectId);
    }
  }, [projectId, setLastActiveProject, fetchFolders, fetchContacts, fetchSubcontractors, fetchDocuments, fetchShifts, fetchDailyLogsForDateRange, fetchDailyReports, fetchSupervisorForms, getSevenDayRange]);

  // Handle URL query parameters for deep linking (e.g., from Dashboard "Start New Shift")
  useEffect(() => {
    const newShift = searchParams.get('newShift');
    
    if (newShift === 'true') {
      // Small delay to ensure data is loaded
      setTimeout(() => {
        setShowCreateShiftModal(true);
      }, 100);
      // Clear the URL params after processing
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!projectId) return;

    const folder = await createFolder({
      project_id: projectId,
      folder_name: newFolderName,
      description: newFolderDescription || undefined,
    });

    if (folder) {
      setShowFolderModal(false);
      setNewFolderName('');
      setNewFolderDescription('');
    }
  };

  const handleInviteWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!projectId || !workerEmail.trim()) return;

    await addWorker(projectId, workerEmail, workerSubcontractorId || undefined);

    if (!error) {
      setShowWorkerModal(false);
      setWorkerEmail('');
      setWorkerSubcontractorId('');
    }
  };

  // Worker removal handler - kept for future use
  // const handleRemoveWorker = async (workerId: string) => {
  //   if (window.confirm('Are you sure you want to remove this worker from the project?')) {
  //     await removeWorker(workerId);
  //   }
  // };

  // Subcontractor handlers
  const openSubcontractorModal = (subcontractor?: ProjectSubcontractor) => {
    if (subcontractor) {
      setEditingSubcontractor(subcontractor);
      setSubcontractorForm({
        project_id: subcontractor.project_id,
        company_name: subcontractor.company_name,
        contact_name: subcontractor.contact_name ?? '',
        contact_email: subcontractor.contact_email ?? '',
        contact_phone: subcontractor.contact_phone ?? '',
        notes: subcontractor.notes ?? '',
      });
    } else {
      setEditingSubcontractor(null);
      setSubcontractorForm({
        project_id: projectId ?? '',
        company_name: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        notes: '',
      });
    }
    setShowSubcontractorModal(true);
  };

  const handleSubcontractorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!projectId) return;

    if (editingSubcontractor) {
      await updateSubcontractor(editingSubcontractor.id, {
        company_name: subcontractorForm.company_name,
        contact_name: subcontractorForm.contact_name || null,
        contact_email: subcontractorForm.contact_email || null,
        contact_phone: subcontractorForm.contact_phone || null,
        notes: subcontractorForm.notes || null,
      });
    } else {
      await createSubcontractor({
        ...subcontractorForm,
        project_id: projectId,
      });
    }

    if (!error) {
      setShowSubcontractorModal(false);
      setEditingSubcontractor(null);
    }
  };

  const handleDeleteSubcontractor = async (subcontractorId: string, companyName: string) => {
    if (window.confirm(`Are you sure you want to remove "${companyName}" from the project? Workers linked to this subcontractor will be unlinked.`)) {
      await deleteSubcontractor(subcontractorId);
    }
  };

  const handleMoveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!selectedDocument || !showMoveModal) return;

    const targetFolderId = (e.target as HTMLFormElement).querySelector<HTMLSelectElement>('#target-folder')?.value;
    if (!targetFolderId) return;

    await moveDocumentToFolder(selectedDocument.id, targetFolderId);

    if (!error) {
      setShowMoveModal(false);
      setSelectedDocument(null);
    }
  };

  const handleDeleteDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!selectedDocument) return;

    await deleteDocument(selectedDocument.id, deleteReason || undefined);

    if (!error) {
      setShowDeleteModal(false);
      setSelectedDocument(null);
      setDeleteReason('');
    }
  };

  const openMoveModal = (doc: ReceivedDocument) => {
    setSelectedDocument(doc);
    setShowMoveModal(true);
  };

  const openDeleteModal = (doc: ReceivedDocument) => {
    setSelectedDocument(doc);
    setShowDeleteModal(true);
  };

  const handlePreviewDocument = async (doc: ReceivedDocument) => {
    setIsLoadingPreview(true);
    setSelectedDocument(doc);

    const url = await getDocumentDownloadUrl(doc.storage_path);
    
    if (url) {
      // For PDFs or images, show in preview modal
      if (doc.mime_type?.includes('pdf') || doc.mime_type?.includes('image')) {
        setPreviewUrl(url);
        setShowPreviewModal(true);
      } else {
        // For other files, open in new tab
        window.open(url, '_blank');
      }
    } else {
      clearError();
    }
    
    setIsLoadingPreview(false);
  };

  const handleDownloadDocument = async (doc: ReceivedDocument) => {
    await downloadDocument(doc);
  };

  const closePreviewModal = () => {
    setShowPreviewModal(false);
    setPreviewUrl(null);
    setSelectedDocument(null);
  };

  const handleReprocessAll = async () => {
    if (!projectId || isReprocessing) return;

    setIsReprocessing(true);
    setReprocessResult(null);

    const result = await reprocessDocumentsWithAI(projectId);

    setIsReprocessing(false);
    setReprocessResult({
      show: true,
      success: result.success,
      message: result.success 
        ? `✅ Processed ${result.processed} documents. ${result.filed} auto-filed to folders.`
        : `❌ ${result.message}`,
    });

    // Auto-hide success message after 5 seconds
    if (result.success) {
      setTimeout(() => setReprocessResult(null), 5000);
    }
  };

  // Quick Review handlers
  const handleOpenQuickReview = (startIndex = 0) => {
    setQuickReviewStartIndex(startIndex);
    setShowQuickReview(true);
  };

  const handleQuickReviewSave = async (
    documentId: string,
    updates: { folderId: string | null; metadata: Partial<DocumentMetadata> }
  ) => {
    await updateDocumentMetadata(documentId, updates.folderId, updates.metadata);
  };

  // Bulk selection handlers
  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const selectAllDocuments = () => {
    setSelectedDocIds(new Set(currentDocuments.map((d) => d.id)));
  };

  const deselectAllDocuments = () => {
    setSelectedDocIds(new Set());
  };

  const handleBulkMove = async (folderId: string) => {
    if (selectedDocIds.size === 0) return;
    
    await moveDocumentsToFolder(Array.from(selectedDocIds), folderId);
    setSelectedDocIds(new Set());
    setShowBulkMoveModal(false);
  };

  const handleBulkDelete = async () => {
    if (selectedDocIds.size === 0) return;
    
    await deleteDocuments(Array.from(selectedDocIds), bulkDeleteReason || undefined);
    setSelectedDocIds(new Set());
    setShowBulkDeleteModal(false);
    setBulkDeleteReason('');
  };

  // Clear selection when folder changes
  useEffect(() => {
    setSelectedDocIds(new Set());
  }, [selectedFolderId]);

  // Get documents based on selected folder tab, then apply filters and sorting
  const folderDocuments = selectedFolderId === null 
    ? getUnsortedDocuments() 
    : getDocumentsByFolder(selectedFolderId);
  
  // Apply filters and sorting to get final document list
  const currentDocuments = useMemo(() => {
    const filtered = filterDocuments(folderDocuments, filters);
    
    // Apply sorting
    return [...filtered].sort((a, b) => {
      const metaA = getEffectiveMetadata(a.ai_extracted_data);
      const metaB = getEffectiveMetadata(b.ai_extracted_data);
      
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.received_at).getTime() - new Date(a.received_at).getTime();
        case 'date_asc':
          return new Date(a.received_at).getTime() - new Date(b.received_at).getTime();
        case 'name_asc':
          return (a.original_filename ?? '').localeCompare(b.original_filename ?? '');
        case 'name_desc':
          return (b.original_filename ?? '').localeCompare(a.original_filename ?? '');
        case 'company':
          return (metaA.companyName ?? '').localeCompare(metaB.companyName ?? '');
        case 'worker':
          return (metaA.workerName ?? '').localeCompare(metaB.workerName ?? '');
        default:
          return 0;
      }
    });
  }, [folderDocuments, filters, sortBy]);

  const unsortedCount = getDocumentCountByFolder(null);
  const totalDocumentsCount = documents.filter(d => d.status !== 'rejected').length;
  
  // Count active filters for badge
  const activeFilterCount = [
    filters.search,
    filters.workerName,
    filters.companyName,
    filters.dateFrom,
    filters.dateTo,
    filters.documentType,
  ].filter(Boolean).length;

  if (!project && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Project not found</h2>
          <Link to="/projects" className="text-[#d1bd23] hover:underline">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  // Filter contacts by current project (or show all if no project filter needed)
  // Kept for future use
  // const projectContacts = projectId 
  //   ? contacts.filter((c) => c.recent_project_id === projectId || c.recent_project_id === null)
  //   : contacts;
  const activeSubcontractors = subcontractors.filter((s) => s.status === 'active');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated gradient orbs */}
      <div
        className="fixed top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20 blur-3xl z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #d1bd23 0%, transparent 70%)',
          animation: 'pulse 8s ease-in-out infinite',
        }}
      />
      <div
        className="fixed bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-15 blur-3xl z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #7fb069 0%, transparent 70%)',
          animation: 'pulse 10s ease-in-out infinite reverse',
        }}
      />

      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Link to="/" className="hidden sm:block text-xl font-bold text-white hover:text-[#d1bd23] transition-colors">
                HrdHat Supervisor
              </Link>
              <span className="hidden sm:block text-slate-600">/</span>
              <Link to="/projects" className="text-slate-400 hover:text-[#d1bd23] transition-colors whitespace-nowrap">
                Projects
              </Link>
              <span className="text-slate-600">:</span>
              <span className="text-white font-medium truncate max-w-[150px] sm:max-w-none">{project?.name ?? 'Loading...'}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden sm:block text-sm text-slate-400">{user?.email}</span>
              <button
                onClick={logout}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Alert Banner for Documents Needing Review */}
        {unsortedCount > 0 && activeTab !== 'documents' && (
          <div 
            onClick={() => setActiveTab('documents')}
            className="mb-6 p-4 bg-warning-50 border-2 border-warning-300 rounded-xl cursor-pointer hover:bg-warning-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-warning-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-warning-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-warning-900">
                    {unsortedCount} Document{unsortedCount !== 1 ? 's' : ''} Need Review
                  </h3>
                  <p className="text-sm text-warning-700">
                    Click here to review and sort incoming documents
                  </p>
                </div>
              </div>
              <svg className="w-5 h-5 text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        )}

        {/* Project Header - Collapsible */}
        <div className="bg-white rounded-xl shadow-card mb-6 overflow-hidden">
          {/* Header row - always visible, clickable to toggle */}
          <div 
            className="p-4 sm:p-6 flex items-start gap-3 cursor-pointer"
            onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
          >
            {/* Collapse toggle - visible on all screen sizes */}
            <svg 
              className={`w-5 h-5 text-secondary-400 transition-transform duration-200 flex-shrink-0 mt-1 ${isOverviewExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-secondary-900 truncate">{project?.name}</h2>
                <span
                  className={`flex-shrink-0 px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm font-medium rounded ${
                    project?.is_active ? 'bg-success-100 text-success-700' : 'bg-secondary-100 text-secondary-600'
                  }`}
                >
                  {project?.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {project?.site_address && (
                <p className="text-secondary-600 mt-1 text-sm sm:text-base truncate">{project.site_address}</p>
              )}
            </div>
          </div>

          {/* Collapsible content */}
          <div className={`${isOverviewExpanded ? 'block' : 'hidden'}`}>
            {/* Project Email - Compact inline version */}
            {project?.processing_email && (
              <div className="px-4 sm:px-6 pb-4 flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
                <svg className="w-4 h-4 text-secondary-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-secondary-500">Send forms to:</span>
                <code className="font-mono text-primary-600 bg-primary-50 px-2 py-0.5 rounded text-xs sm:text-sm break-all">
                  {project.processing_email}
                </code>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (project.processing_email) {
                      navigator.clipboard.writeText(project.processing_email);
                    }
                  }}
                  className="p-1.5 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  title="Copy email address"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            )}

            {/* Stats - 2 cols on mobile, 5 cols on desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 px-4 sm:px-6 pb-4 sm:pb-6 pt-4 border-t border-secondary-200">
              <div className="text-center sm:text-left">
                <div className="text-xl sm:text-2xl font-bold text-secondary-900">{folders.length}</div>
                <div className="text-xs sm:text-sm text-secondary-500">Folders</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-xl sm:text-2xl font-bold text-secondary-900">{activeSubcontractors.length}</div>
                <div className="text-xs sm:text-sm text-secondary-500">Subcontractors</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-xl sm:text-2xl font-bold text-secondary-900">{contacts.length}</div>
                <div className="text-xs sm:text-sm text-secondary-500">Contacts</div>
              </div>
              <div className="text-center sm:text-left">
                <div className="text-xl sm:text-2xl font-bold text-secondary-900">{totalDocumentsCount}</div>
                <div className="text-xs sm:text-sm text-secondary-500">Documents</div>
                {unsortedCount > 0 && (
                  <div className="text-xs text-warning-600 mt-1">{unsortedCount} need review</div>
                )}
              </div>
              <div className="text-center sm:text-left col-span-2 sm:col-span-1">
                <div className="text-xl sm:text-2xl font-bold text-secondary-900">{dailyReports.length}</div>
                <div className="text-xs sm:text-sm text-secondary-500">Daily Reports</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Add Bar - Collapsible */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div 
            className="flex items-center gap-2 p-4 cursor-pointer"
            onClick={() => setIsQuickAddExpanded(!isQuickAddExpanded)}
          >
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isQuickAddExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Add</span>
          </div>
          <div className={`${isQuickAddExpanded ? 'block' : 'hidden'} px-4 pb-4`}>
            <QuickAddBar 
              onAddShift={() => setShowCreateShiftModal(true)}
              onAddLog={(type) => {
                setSelectedLogType(type);
                setShowDailyLogModal(true);
              }}
            />
            {/* Generate Daily Report Button */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => setShowAIDailyReportModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all shadow-sm"
              >
                <span className="text-lg">📊</span>
                <span className="font-medium">Generate daily report powered by Gemini</span>
              </button>
            </div>
          </div>
        </div>

        {/* Daily Logs List - Collapsible, Grouped by Period (Today, Yesterday, Earlier This Week) */}
        <div className="mt-4">
          <DailyLogList 
            logs={dailyLogs}
            title="Recent Logs"
            groupedByPeriod={getDailyLogsGroupedByPeriod()}
            onDeleteLog={async (logId) => {
              await deleteDailyLog(logId);
              // Refresh logs after deletion
              if (projectId) {
                const { startDate, endDate } = getSevenDayRange();
                fetchDailyLogsForDateRange(projectId, startDate, endDate);
              }
            }}
            onViewArchive={() => {
              if (projectId) {
                navigate(`/projects/${projectId}/log-archive`);
              }
            }}
            isExpanded={isDailyLogsExpanded}
            onToggleExpand={() => setIsDailyLogsExpanded(!isDailyLogsExpanded)}
          />
        </div>

        {/* Main Content Tabs - Collapsible */}
        <div className="bg-white rounded-xl shadow-card mt-6 overflow-hidden">
          <div className="border-b border-secondary-200">
            <nav className="flex -mb-px">
              {/* Collapse toggle */}
              <button
                onClick={() => setIsFormsExpanded(!isFormsExpanded)}
                className="px-3 py-4 text-secondary-400 hover:text-secondary-600 transition-colors"
                aria-label={isFormsExpanded ? 'Collapse forms section' : 'Expand forms section'}
              >
                <svg 
                  className={`w-5 h-5 transition-transform duration-200 ${isFormsExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Primary tab: Forms (received + created) */}
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-4 sm:px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'documents'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-secondary-500 hover:text-secondary-700'
                }`}
              >
                Forms
                {/* Show badge for documents needing review */}
                {unsortedCount > 0 && (
                  <span className="bg-warning-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
                    {unsortedCount}
                  </span>
                )}
              </button>
              
              {/* Divider */}
              <div className="flex-1" />
              
              {/* Settings dropdown for management tabs */}
              <div className="relative">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className={`px-4 py-4 text-sm font-medium transition-colors flex items-center gap-2 ${
                    showSettingsMenu || ['folders', 'subcontractors', 'contacts'].includes(activeTab)
                      ? 'text-primary-600'
                      : 'text-secondary-500 hover:text-secondary-700'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Manage
                  <svg className={`w-4 h-4 transition-transform ${showSettingsMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown menu */}
                {showSettingsMenu && (
                  <>
                    {/* Click outside to close */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowSettingsMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-secondary-200 py-1 z-20">
                    <button
                      onClick={() => { setActiveTab('folders'); setShowSettingsMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary-50 flex items-center gap-2 ${activeTab === 'folders' ? 'text-primary-600 bg-primary-50' : 'text-secondary-700'}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      Folders
                      <span className="ml-auto text-xs text-secondary-400">{folders.length}</span>
                    </button>
                    <button
                      onClick={() => { setActiveTab('subcontractors'); setShowSettingsMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary-50 flex items-center gap-2 ${activeTab === 'subcontractors' ? 'text-primary-600 bg-primary-50' : 'text-secondary-700'}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Subcontractors
                      <span className="ml-auto text-xs text-secondary-400">{activeSubcontractors.length}</span>
                    </button>
                    <button
                      onClick={() => { setActiveTab('contacts'); setShowSettingsMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-secondary-50 flex items-center gap-2 ${activeTab === 'contacts' ? 'text-primary-600 bg-primary-50' : 'text-secondary-700'}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Contacts
                      <span className="ml-auto text-xs text-secondary-400">{contacts.length}</span>
                    </button>
                  </div>
                  </>
                )}
              </div>
            </nav>
          </div>

          {/* Collapsible content */}
          {isFormsExpanded && (
          <div className="p-6">
            {/* Folders Tab */}
            {activeTab === 'folders' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-secondary-900">Form Folders</h3>
                  <button
                    onClick={() => setShowFolderModal(true)}
                    className="px-3 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                  >
                    + Add Folder
                  </button>
                </div>

                {/* Unsorted Documents Card - Always visible */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <button
                    onClick={() => {
                      setSelectedFolderId(null);
                      setActiveTab('documents');
                    }}
                    className={`p-4 rounded-lg border-2 transition-colors text-left cursor-pointer ${
                      unsortedCount > 0
                        ? 'bg-warning-50 border-warning-300 hover:bg-warning-100 hover:border-warning-400'
                        : 'bg-secondary-50 border-secondary-200 hover:bg-secondary-100 hover:border-secondary-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          unsortedCount > 0 ? 'bg-warning-200' : 'bg-secondary-200'
                        }`}>
                          <svg className={`w-5 h-5 ${unsortedCount > 0 ? 'text-warning-700' : 'text-secondary-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <h4 className={`font-semibold ${unsortedCount > 0 ? 'text-warning-900' : 'text-secondary-700'}`}>
                          Unsorted
                        </h4>
                      </div>
                      {unsortedCount > 0 && (
                        <span className="px-3 py-1 text-sm font-bold bg-warning-500 text-white rounded-full animate-pulse">
                          {unsortedCount}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${unsortedCount > 0 ? 'text-warning-700' : 'text-secondary-500'}`}>
                      {unsortedCount > 0 
                        ? `${unsortedCount} document${unsortedCount !== 1 ? 's' : ''} need review`
                        : 'No documents awaiting review'}
                    </p>
                    <div className={`mt-2 text-xs flex items-center gap-1 ${
                      unsortedCount > 0 ? 'text-warning-700 font-medium' : 'text-secondary-500'
                    }`}>
                      {unsortedCount > 0 ? 'Review now →' : 'View inbox →'}
                    </div>
                  </button>
                </div>

                {folders.length === 0 ? (
                  <div className="text-center py-8 text-secondary-500">
                    No folders yet. Create folders to organize incoming forms.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {folders.map((folder) => {
                      const docCount = getDocumentCountByFolder(folder.id);
                      return (
                        <button
                          key={folder.id}
                          onClick={() => {
                            setSelectedFolderId(folder.id);
                            setActiveTab('documents');
                          }}
                          className="p-4 rounded-lg border border-secondary-200 hover:border-primary-300 hover:bg-primary-50 transition-colors text-left cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: folder.color }}
                              />
                              <h4 className="font-medium text-secondary-900">{folder.folder_name}</h4>
                            </div>
                            {docCount > 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-secondary-100 text-secondary-700 rounded-full">
                                {docCount}
                              </span>
                            )}
                          </div>
                          {folder.description && (
                            <p className="text-sm text-secondary-500">{folder.description}</p>
                          )}
                          <div className="mt-2 text-xs text-primary-600 flex items-center gap-1">
                            View documents →
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Subcontractors Tab */}
            {activeTab === 'subcontractors' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-secondary-900">Subcontractors</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDiscoverSubcontractorsModal(true)}
                      className="px-3 py-2 text-sm border border-primary-600 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-1"
                      title="Discover subcontractors from submitted forms"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Discover
                    </button>
                    <button
                      onClick={() => openSubcontractorModal()}
                      className="px-3 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                    >
                      + Add Subcontractor
                    </button>
                  </div>
                </div>

                {activeSubcontractors.length === 0 ? (
                  <div className="text-center py-8 text-secondary-500">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary-100 flex items-center justify-center">
                      <svg className="w-8 h-8 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <p className="mb-2">No subcontractors added yet.</p>
                    <p className="text-sm">Add subcontractor companies working on this project.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeSubcontractors.map((sub) => {
                      const docCount = getDocumentCountBySubcontractor(sub.company_name);
                      const workerCount = getWorkerCountBySubcontractor(sub.id);
                      return (
                        <div
                          key={sub.id}
                          className="p-4 rounded-lg border border-secondary-200 hover:border-primary-200 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                              <div>
                                <h4 className="font-semibold text-secondary-900">{sub.company_name}</h4>
                                {sub.contact_name && (
                                  <p className="text-sm text-secondary-500">{sub.contact_name}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openSubcontractorModal(sub)}
                                className="p-1.5 text-secondary-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteSubcontractor(sub.id, sub.company_name)}
                                className="p-1.5 text-secondary-500 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Contact Info */}
                          <div className="space-y-1 text-sm mb-3">
                            {sub.contact_email && (
                              <div className="flex items-center gap-2 text-secondary-600">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span>{sub.contact_email}</span>
                              </div>
                            )}
                            {sub.contact_phone && (
                              <div className="flex items-center gap-2 text-secondary-600">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span>{sub.contact_phone}</span>
                              </div>
                            )}
                          </div>

                          {/* Stats */}
                          <div className="flex items-center gap-4 pt-3 border-t border-secondary-100">
                            <div className="flex items-center gap-1.5 text-sm text-secondary-600">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              <span>{workerCount} worker{workerCount !== 1 ? 's' : ''}</span>
                            </div>
                            <button
                              onClick={() => {
                                setFilters(prev => ({ ...prev, companyName: sub.company_name }));
                                setActiveTab('documents');
                              }}
                              className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <span>{docCount} document{docCount !== 1 ? 's' : ''}</span>
                            </button>
                          </div>

                          {/* Notes */}
                          {sub.notes && (
                            <p className="text-xs text-secondary-500 mt-2 line-clamp-2">{sub.notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Contacts Tab */}
            {activeTab === 'contacts' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-secondary-900">Contacts</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDiscoverWorkersModal(true)}
                      className="px-3 py-2 text-sm border border-primary-600 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-1"
                      title="Discover contacts from submitted forms"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Discover
                    </button>
                  </div>
                </div>

                {contacts.length === 0 ? (
                  <div className="text-center py-8 text-secondary-500">
                    <p className="mb-2">No contacts in your list yet.</p>
                    <p className="text-sm">Click "Discover" to find contacts from submitted forms.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="p-4 rounded-lg border border-secondary-200 hover:border-primary-200 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-primary-700 font-semibold text-sm">
                                {contact.name[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-secondary-900">
                                {contact.name}
                              </div>
                              {contact.email && (
                                <div className="text-sm text-secondary-500">{contact.email}</div>
                              )}
                              {contact.phone && (
                                <div className="text-sm text-secondary-500">{contact.phone}</div>
                              )}
                              {contact.company_name && (
                                <div className="text-xs text-primary-600 mt-1">{contact.company_name}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                              contact.source === 'discovered' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-secondary-100 text-secondary-700'
                            }`}>
                              {contact.source === 'discovered' ? 'Discovered' : 'Manual'}
                            </span>
                            <button
                              onClick={() => removeContact(contact.id)}
                              className="px-3 py-1.5 text-sm text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        
                        {/* Notes */}
                        {contact.notes && (
                          <div className="mt-3 pt-3 border-t border-secondary-100">
                            <div className="text-xs text-secondary-500">{contact.notes}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Forms Tab */}
            {activeTab === 'documents' && (
              <div>
                {/* Forms Sub-tabs */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setFormsSubTab('received')}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                        formsSubTab === 'received' 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Received
                      {unsortedCount > 0 && (
                        <span className="bg-warning-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {unsortedCount}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setFormsSubTab('my_forms')}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        formsSubTab === 'my_forms' 
                          ? 'bg-white text-gray-900 shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      My Forms
                    </button>
                  </div>
                </div>

                {/* My Forms Sub-tab */}
                {formsSubTab === 'my_forms' && projectId && (
                  <SupervisorFormsList
                    projectId={projectId}
                    onCreateForm={() => setShowFormPicker(true)}
                    onEditForm={(formId) => setEditingFormId(formId)}
                  />
                )}

                {/* Received Documents Sub-tab */}
                {formsSubTab === 'received' && (
                  <div>
                    {/* Header with Reprocess and Filter Buttons */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-secondary-900">Received Forms</h3>
                        <p className="text-sm text-secondary-500">
                          {unsortedCount > 0 
                            ? `${unsortedCount} form${unsortedCount !== 1 ? 's' : ''} need review`
                            : 'All forms have been sorted'}
                        </p>
                      </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-secondary-500 hidden sm:inline">Sort:</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
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
                      onClick={() => setShowFilters(!showFilters)}
                      className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                        showFilters || activeFilterCount > 0
                          ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                          : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                      {showFilters ? 'Hide Filters' : 'Filters'}
                      {activeFilterCount > 0 && (
                        <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
                          {activeFilterCount}
                        </span>
                      )}
                    </button>
                    
                    {/* Quick Review Button */}
                    {currentDocuments.length > 0 && (
                      <button
                        onClick={() => handleOpenQuickReview(0)}
                        className="px-4 py-2 bg-success-600 hover:bg-success-700 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Quick Review
                      </button>
                    )}
                    
                    {/* Reprocess Button */}
                    {unsortedCount > 0 && (
                      <button
                        onClick={handleReprocessAll}
                        disabled={isReprocessing || loading}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isReprocessing ? (
                          <>
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Reprocessing...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Reprocess All with AI
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
                    onFiltersChange={setFilters}
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
                        onClick={() => setFilters({
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
                  <div className={`mb-4 p-4 rounded-lg border ${
                    reprocessResult.success 
                      ? 'bg-success-50 border-success-200 text-success-800' 
                      : 'bg-danger-50 border-danger-200 text-danger-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span>{reprocessResult.message}</span>
                      <button 
                        onClick={() => setReprocessResult(null)}
                        className="text-current opacity-60 hover:opacity-100"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* Folder Tabs */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-secondary-200 pb-4">
                  {/* Unsorted Tab */}
                  <button
                    onClick={() => setSelectedFolderId(null)}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 border-2"
                    style={{
                      backgroundColor: selectedFolderId === null ? '#f59e0b' : '#fef3c7',
                      color: selectedFolderId === null ? '#ffffff' : '#92400e',
                      borderColor: selectedFolderId === null ? '#d97706' : '#fcd34d',
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Unsorted
                    {unsortedCount > 0 && (
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full font-bold"
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
                        onClick={() => setSelectedFolderId(folder.id)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                          selectedFolderId === folder.id
                            ? 'bg-primary-100 text-primary-800 border-2 border-primary-300'
                            : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: folder.color }}
                        />
                        {folder.folder_name}
                        {count > 0 && (
                          <span className="bg-secondary-300 text-secondary-700 text-xs px-2 py-0.5 rounded-full">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selection Header & Bulk Actions */}
                {currentDocuments.length > 0 && (
                  <div className="flex items-center justify-between mb-4 p-3 bg-secondary-50 rounded-lg border border-secondary-200">
                    <div className="flex items-center gap-3">
                      {/* Select All Checkbox */}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedDocIds.size === currentDocuments.length && currentDocuments.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              selectAllDocuments();
                            } else {
                              deselectAllDocuments();
                            }
                          }}
                          className="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-secondary-700">
                          {selectedDocIds.size > 0 
                            ? `${selectedDocIds.size} selected`
                            : 'Select all'}
                        </span>
                      </label>
                      
                      {selectedDocIds.size > 0 && (
                        <button
                          onClick={deselectAllDocuments}
                          className="text-sm text-secondary-500 hover:text-secondary-700"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    
                    {/* Bulk Actions */}
                    {selectedDocIds.size > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowBulkMoveModal(true)}
                          className="px-3 py-1.5 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          Move to Folder
                        </button>
                        <button
                          onClick={() => setShowBulkDeleteModal(true)}
                          className="px-3 py-1.5 text-sm font-medium bg-danger-600 hover:bg-danger-700 text-white rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Documents List */}
                {currentDocuments.length === 0 ? (
                  <div className="text-center py-12 text-secondary-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-secondary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {selectedFolderId === null ? (
                      <>
                        <p className="text-lg font-medium mb-2">No documents need review</p>
                        <p className="text-sm">
                          All incoming documents have been sorted or the inbox is empty.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-medium mb-2">No documents in this folder</p>
                        <p className="text-sm">
                          Documents will appear here when they are sorted into this folder.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className={`p-4 rounded-xl border transition-colors bg-white ${
                          selectedDocIds.has(doc.id)
                            ? 'border-primary-400 bg-primary-50/30 ring-2 ring-primary-200'
                            : 'border-secondary-200 hover:border-primary-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Selection Checkbox */}
                          <div className="flex-shrink-0 pt-1">
                            <input
                              type="checkbox"
                              checked={selectedDocIds.has(doc.id)}
                              onChange={() => toggleDocumentSelection(doc.id)}
                              className="w-4 h-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                            />
                          </div>
                          
                          {/* Document Content */}
                          <div className="flex-1 min-w-0 flex items-start justify-between gap-4">
                            {/* Document Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                {/* File Icon */}
                                <div className="w-10 h-10 rounded-lg bg-secondary-100 flex items-center justify-center flex-shrink-0">
                                {doc.mime_type?.includes('pdf') ? (
                                  <svg className="w-6 h-6 text-danger-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                ) : doc.mime_type?.includes('image') ? (
                                  <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                ) : (
                                  <svg className="w-6 h-6 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                )}
                              </div>
                              
                              {/* Filename & Date */}
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-secondary-900 truncate">
                                  {doc.original_filename ?? 'Unnamed Document'}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-secondary-500 mt-1">
                                  <span>{new Date(doc.received_at).toLocaleDateString()}</span>
                                  {doc.source_email && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate">{doc.source_email}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* AI Classification & Status */}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {doc.ai_classification && doc.ai_classification !== 'Unknown' && (
                                <span className="px-2 py-1 text-xs font-medium rounded bg-primary-100 text-primary-700">
                                  🤖 {doc.ai_classification}
                                </span>
                              )}
                              {doc.confidence_score !== null && doc.confidence_score > 0 && (
                                <span className={`px-2 py-1 text-xs font-medium rounded ${
                                  doc.confidence_score >= 70 
                                    ? 'bg-success-100 text-success-700' 
                                    : 'bg-warning-100 text-warning-700'
                                }`}>
                                  {doc.confidence_score}% confidence
                                </span>
                              )}
                              <span className={`px-2 py-1 text-xs font-medium rounded ${
                                doc.status === 'filed' ? 'bg-success-100 text-success-700' :
                                doc.status === 'needs_review' ? 'bg-warning-100 text-warning-700' :
                                doc.status === 'rejected' ? 'bg-danger-100 text-danger-700' :
                                'bg-secondary-100 text-secondary-600'
                              }`}>
                                {doc.status.replace('_', ' ')}
                              </span>
                            </div>

                            {/* Extracted Metadata */}
                            {(() => {
                              const meta = getEffectiveMetadata(doc.ai_extracted_data);
                              const hasMetadata = meta.workerName || meta.companyName || meta.documentDate;
                              
                              if (!hasMetadata) return null;
                              
                              return (
                                <div className="flex flex-wrap items-center gap-3 mb-2 text-xs">
                                  {meta.workerName && (
                                    <div className="flex items-center gap-1 text-secondary-600">
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                      <span className="font-medium">{meta.workerName}</span>
                                    </div>
                                  )}
                                  {meta.companyName && (
                                    <div className="flex items-center gap-1 text-secondary-600">
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                      </svg>
                                      <span className="font-medium">{meta.companyName}</span>
                                    </div>
                                  )}
                                  {meta.documentDate && (
                                    <div className="flex items-center gap-1 text-secondary-600">
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <span className="font-medium">{meta.documentDate}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* AI Summary */}
                            {doc.ai_summary && doc.ai_summary !== 'AI classification not configured' && !doc.ai_summary.startsWith('AI error') && (
                              <p className="text-sm text-secondary-600 line-clamp-2">
                                {doc.ai_summary}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            {/* Preview Button */}
                            <button
                              onClick={() => handlePreviewDocument(doc)}
                              disabled={isLoadingPreview}
                              className="px-3 py-1.5 text-sm font-medium text-secondary-700 bg-secondary-100 hover:bg-secondary-200 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Preview
                            </button>
                            
                            {/* Download Button */}
                            <button
                              onClick={() => handleDownloadDocument(doc)}
                              className="px-3 py-1.5 text-sm font-medium text-secondary-700 bg-secondary-100 hover:bg-secondary-200 rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              Download
                            </button>
                            
                            {selectedFolderId === null && folders.length > 0 && (
                              <button
                                onClick={() => openMoveModal(doc)}
                                className="px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                              >
                                Move to Folder
                              </button>
                            )}
                            <button
                              onClick={() => openDeleteModal(doc)}
                              className="px-3 py-1.5 text-sm font-medium text-danger-600 bg-danger-50 hover:bg-danger-100 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      </main>

      {/* Form Picker Modal */}
      {projectId && (
        <NewSupervisorFormPicker
          projectId={projectId}
          isOpen={showFormPicker}
          onClose={() => setShowFormPicker(false)}
          onFormCreated={(formId) => {
            setEditingFormId(formId);
            setFormsSubTab('my_forms');
          }}
        />
      )}

      {/* Form Editor Modal */}
      {editingFormId && (
        <SupervisorFormEditor
          formId={editingFormId}
          isOpen={!!editingFormId}
          onClose={() => setEditingFormId(null)}
          onSaved={() => {
            // Form is auto-saved, just close
          }}
        />
      )}

      {/* Create Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-secondary-900 mb-6">Create New Folder</h3>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label htmlFor="folder-name" className="block text-sm font-medium text-secondary-700 mb-2">
                  Folder Name *
                </label>
                <input
                  id="folder-name"
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                  placeholder="e.g., FLRA Forms"
                />
              </div>

              <div>
                <label htmlFor="folder-description" className="block text-sm font-medium text-secondary-700 mb-2">
                  Description
                </label>
                <textarea
                  id="folder-description"
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all resize-none"
                  placeholder="What types of forms go in this folder?"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-danger-50 border border-danger-200">
                  <p className="text-sm text-danger-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowFolderModal(false);
                    clearError();
                  }}
                  className="flex-1 px-4 py-3 border border-secondary-300 text-secondary-700 rounded-lg hover:bg-secondary-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !newFolderName.trim()}
                  className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Worker Modal */}
      {showWorkerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-secondary-900 mb-2">Invite Worker to Project</h3>
            <p className="text-sm text-secondary-600 mb-6">
              Enter the email address of a registered HrdHat user to add them to this project.
            </p>

            <form onSubmit={handleInviteWorker} className="space-y-4">
              <div>
                <label htmlFor="worker-email" className="block text-sm font-medium text-secondary-700 mb-2">
                  Worker Email Address *
                </label>
                <input
                  id="worker-email"
                  type="email"
                  value={workerEmail}
                  onChange={(e) => setWorkerEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                  placeholder="worker@example.com"
                />
                <p className="text-xs text-secondary-500 mt-2">
                  The worker must have an existing HrdHat account with this email address.
                </p>
              </div>

              {activeSubcontractors.length > 0 && (
                <div>
                  <label htmlFor="worker-subcontractor" className="block text-sm font-medium text-secondary-700 mb-2">
                    Subcontractor (Optional)
                  </label>
                  <select
                    id="worker-subcontractor"
                    value={workerSubcontractorId}
                    onChange={(e) => setWorkerSubcontractorId(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all bg-white"
                  >
                    <option value="">No subcontractor / Direct employee</option>
                    {activeSubcontractors.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.company_name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-secondary-500 mt-2">
                    Link this worker to a subcontractor company if applicable.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-danger-50 border border-danger-200">
                  <p className="text-sm text-danger-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowWorkerModal(false);
                    setWorkerEmail('');
                    setWorkerSubcontractorId('');
                    clearError();
                  }}
                  className="flex-1 px-4 py-3 border border-secondary-300 text-secondary-700 rounded-lg hover:bg-secondary-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !workerEmail.trim()}
                  className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Inviting...' : 'Invite Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subcontractor Modal */}
      {showSubcontractorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-secondary-900 mb-2">
              {editingSubcontractor ? 'Edit Subcontractor' : 'Add Subcontractor'}
            </h3>
            <p className="text-sm text-secondary-600 mb-6">
              {editingSubcontractor 
                ? 'Update the subcontractor company information.'
                : 'Add a subcontractor company working on this project.'}
            </p>

            <form onSubmit={handleSubcontractorSubmit} className="space-y-4">
              <div>
                <label htmlFor="sub-company" className="block text-sm font-medium text-secondary-700 mb-2">
                  Company Name *
                </label>
                <input
                  id="sub-company"
                  type="text"
                  value={subcontractorForm.company_name}
                  onChange={(e) => setSubcontractorForm(prev => ({ ...prev, company_name: e.target.value }))}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                  placeholder="ABC Electrical Inc."
                />
              </div>

              <div>
                <label htmlFor="sub-contact" className="block text-sm font-medium text-secondary-700 mb-2">
                  Contact Name
                </label>
                <input
                  id="sub-contact"
                  type="text"
                  value={subcontractorForm.contact_name}
                  onChange={(e) => setSubcontractorForm(prev => ({ ...prev, contact_name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg border border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                  placeholder="John Smith"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sub-email" className="block text-sm font-medium text-secondary-700 mb-2">
                    Email
                  </label>
                  <input
                    id="sub-email"
                    type="email"
                    value={subcontractorForm.contact_email}
                    onChange={(e) => setSubcontractorForm(prev => ({ ...prev, contact_email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                    placeholder="john@abc.com"
                  />
                </div>
                <div>
                  <label htmlFor="sub-phone" className="block text-sm font-medium text-secondary-700 mb-2">
                    Phone
                  </label>
                  <input
                    id="sub-phone"
                    type="tel"
                    value={subcontractorForm.contact_phone}
                    onChange={(e) => setSubcontractorForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg border border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="sub-notes" className="block text-sm font-medium text-secondary-700 mb-2">
                  Notes
                </label>
                <textarea
                  id="sub-notes"
                  value={subcontractorForm.notes}
                  onChange={(e) => setSubcontractorForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all resize-none"
                  placeholder="Additional notes about this subcontractor..."
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-danger-50 border border-danger-200">
                  <p className="text-sm text-danger-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowSubcontractorModal(false);
                    setEditingSubcontractor(null);
                    clearError();
                  }}
                  className="flex-1 px-4 py-3 border border-secondary-300 text-secondary-700 rounded-lg hover:bg-secondary-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !subcontractorForm.company_name.trim()}
                  className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : editingSubcontractor ? 'Update' : 'Add Subcontractor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Document Modal */}
      {showMoveModal && selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-secondary-900 mb-2">Move Document to Folder</h3>
            <p className="text-sm text-secondary-600 mb-4">
              Select a folder to file this document:
            </p>
            
            <div className="p-3 rounded-lg bg-secondary-50 mb-4">
              <p className="text-sm font-medium text-secondary-900 truncate">
                {selectedDocument.original_filename ?? 'Unnamed Document'}
              </p>
              {selectedDocument.ai_classification && selectedDocument.ai_classification !== 'Unknown' && (
                <p className="text-xs text-secondary-500 mt-1">
                  AI suggests: {selectedDocument.ai_classification}
                </p>
              )}
            </div>

            <form onSubmit={handleMoveDocument} className="space-y-4">
              <div>
                <label htmlFor="target-folder" className="block text-sm font-medium text-secondary-700 mb-2">
                  Destination Folder *
                </label>
                <select
                  id="target-folder"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all bg-white"
                >
                  <option value="">Select a folder...</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.folder_name}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-danger-50 border border-danger-200">
                  <p className="text-sm text-danger-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoveModal(false);
                    setSelectedDocument(null);
                    clearError();
                  }}
                  className="flex-1 px-4 py-3 border border-secondary-300 text-secondary-700 rounded-lg hover:bg-secondary-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Moving...' : 'Move Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Document Modal */}
      {showDeleteModal && selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-danger-700 mb-2">Delete Document</h3>
            <p className="text-sm text-secondary-600 mb-4">
              Are you sure you want to delete this document? This action marks the document as rejected.
            </p>
            
            <div className="p-3 rounded-lg bg-danger-50 border border-danger-200 mb-4">
              <p className="text-sm font-medium text-secondary-900 truncate">
                {selectedDocument.original_filename ?? 'Unnamed Document'}
              </p>
              <p className="text-xs text-secondary-500 mt-1">
                Received: {new Date(selectedDocument.received_at).toLocaleDateString()}
              </p>
            </div>

            <form onSubmit={handleDeleteDocument} className="space-y-4">
              <div>
                <label htmlFor="delete-reason" className="block text-sm font-medium text-secondary-700 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  id="delete-reason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border border-secondary-300 focus:border-danger-500 focus:ring-2 focus:ring-danger-200 outline-none transition-all resize-none"
                  placeholder="e.g., Duplicate document, wrong project, spam..."
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-danger-50 border border-danger-200">
                  <p className="text-sm text-danger-700">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedDocument(null);
                    setDeleteReason('');
                    clearError();
                  }}
                  className="flex-1 px-4 py-3 border border-secondary-300 text-secondary-700 rounded-lg hover:bg-secondary-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-danger-600 hover:bg-danger-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Deleting...' : 'Delete Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {showPreviewModal && selectedDocument && previewUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-secondary-200">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-secondary-100 flex items-center justify-center flex-shrink-0">
                  {selectedDocument.mime_type?.includes('pdf') ? (
                    <svg className="w-6 h-6 text-danger-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-secondary-900 truncate">
                    {selectedDocument.original_filename ?? 'Document Preview'}
                  </h3>
                  <p className="text-xs text-secondary-500">
                    {selectedDocument.mime_type ?? 'Unknown type'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadDocument(selectedDocument)}
                  className="px-3 py-2 text-sm font-medium text-secondary-700 bg-secondary-100 hover:bg-secondary-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
                <button
                  onClick={() => window.open(previewUrl, '_blank')}
                  className="px-3 py-2 text-sm font-medium text-secondary-700 bg-secondary-100 hover:bg-secondary-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in Tab
                </button>
                <button
                  onClick={closePreviewModal}
                  className="p-2 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto bg-secondary-100 p-4">
              {selectedDocument.mime_type?.includes('pdf') ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full min-h-[70vh] rounded-lg bg-white"
                  title="Document Preview"
                />
              ) : selectedDocument.mime_type?.includes('image') ? (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={previewUrl}
                    alt={selectedDocument.original_filename ?? 'Document'}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-secondary-500">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 text-secondary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium">Preview not available</p>
                    <p className="text-sm mt-1">Download the file to view it</p>
                  </div>
                </div>
              )}
            </div>

            {/* Document Info Footer */}
            <div className="p-4 border-t border-secondary-200 bg-secondary-50">
              <div className="flex flex-wrap gap-4 text-sm text-secondary-600">
                {selectedDocument.source_email && (
                  <div>
                    <span className="font-medium">From:</span> {selectedDocument.source_email}
                  </div>
                )}
                <div>
                  <span className="font-medium">Received:</span> {new Date(selectedDocument.received_at).toLocaleString()}
                </div>
                {selectedDocument.ai_classification && selectedDocument.ai_classification !== 'Unknown' && (
                  <div>
                    <span className="font-medium">AI Classification:</span> {selectedDocument.ai_classification}
                    {selectedDocument.confidence_score && ` (${selectedDocument.confidence_score}%)`}
                  </div>
                )}
              </div>
              {selectedDocument.ai_summary && !selectedDocument.ai_summary.startsWith('AI error') && selectedDocument.ai_summary !== 'AI classification not configured' && (
                <div className="mt-3 text-sm text-secondary-600">
                  <span className="font-medium">Summary:</span> {selectedDocument.ai_summary}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Review Modal */}
      {showQuickReview && currentDocuments.length > 0 && (
        <QuickReviewModal
          documents={currentDocuments}
          folders={folders}
          initialIndex={quickReviewStartIndex}
          onClose={() => setShowQuickReview(false)}
          onSave={handleQuickReviewSave}
          getDocumentUrl={getDocumentDownloadUrl}
        />
      )}

      {/* Bulk Move Modal */}
      {showBulkMoveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-secondary-900 mb-2">Move {selectedDocIds.size} Documents</h3>
            <p className="text-sm text-secondary-600 mb-6">
              Select a folder to move the selected documents to:
            </p>

            <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleBulkMove(folder.id)}
                  disabled={loading}
                  className="w-full p-3 text-left rounded-lg border border-secondary-200 hover:border-primary-300 hover:bg-primary-50 transition-colors flex items-center gap-3 disabled:opacity-50"
                >
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: folder.color }}
                  />
                  <span className="font-medium text-secondary-900">{folder.folder_name}</span>
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-danger-50 border border-danger-200">
                <p className="text-sm text-danger-700">{error}</p>
              </div>
            )}

            <button
              onClick={() => setShowBulkMoveModal(false)}
              className="w-full px-4 py-3 border border-secondary-300 text-secondary-700 rounded-lg hover:bg-secondary-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h3 className="text-xl font-semibold text-danger-700 mb-2">Delete {selectedDocIds.size} Documents</h3>
            <p className="text-sm text-secondary-600 mb-6">
              Are you sure you want to delete these documents? This will mark them as rejected.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  value={bulkDeleteReason}
                  onChange={(e) => setBulkDeleteReason(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border border-secondary-300 focus:border-danger-500 focus:ring-2 focus:ring-danger-200 outline-none transition-all resize-none"
                  placeholder="e.g., Duplicates, wrong project, spam..."
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-danger-50 border border-danger-200">
                <p className="text-sm text-danger-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBulkDeleteModal(false);
                  setBulkDeleteReason('');
                }}
                className="flex-1 px-4 py-3 border border-secondary-300 text-secondary-700 rounded-lg hover:bg-secondary-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-danger-600 hover:bg-danger-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Deleting...' : 'Delete Documents'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications for Realtime Updates */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`
                flex items-start gap-3 p-4 rounded-xl shadow-lg border-2 min-w-[320px] max-w-md
                animate-slide-in-right
                ${toast.type === 'new_document' 
                  ? 'bg-primary-50 border-primary-300' 
                  : 'bg-success-50 border-success-300'}
              `}
              style={{
                animation: 'slideInRight 0.3s ease-out',
              }}
            >
              {/* Icon */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                ${toast.type === 'new_document' ? 'bg-primary-200' : 'bg-success-200'}
              `}>
                {toast.type === 'new_document' ? (
                  <svg className="w-5 h-5 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-success-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${
                  toast.type === 'new_document' ? 'text-primary-800' : 'text-success-800'
                }`}>
                  {toast.type === 'new_document' ? '📄 New Document Received' : '✅ Document Filed'}
                </p>
                <p className="text-sm text-secondary-700 truncate mt-0.5">
                  {toast.message}
                </p>
                {toast.sender && (
                  <p className="text-xs text-secondary-500 mt-1 truncate">
                    From: {toast.sender}
                  </p>
                )}
              </div>
              
              {/* Dismiss button */}
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-secondary-400 hover:text-secondary-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Shift Modal */}
      {projectId && (
        <CreateShiftModal
          projectId={projectId}
          isOpen={showCreateShiftModal}
          onClose={() => setShowCreateShiftModal(false)}
          onShiftCreated={(shiftId) => {
            // Refresh shifts list
            fetchShifts(projectId);
            // Select the newly created shift
            const newShift = shifts.find(s => s.id === shiftId);
            if (newShift) {
              setSelectedShift(newShift);
              setCurrentShift(newShift);
            }
          }}
        />
      )}

      {/* Daily Log Modal */}
      {projectId && selectedLogType && (
        <DailyLogModal
          projectId={projectId}
          logType={selectedLogType}
          isOpen={showDailyLogModal}
          onClose={() => {
            setShowDailyLogModal(false);
            setSelectedLogType(null);
          }}
          onLogAdded={() => {
            // Refresh daily logs for the 7-day range
            const { startDate, endDate } = getSevenDayRange();
            fetchDailyLogsForDateRange(projectId, startDate, endDate);
          }}
        />
      )}

      {/* Shift Closeout Modal */}
      {selectedShift && showShiftCloseout && (
        <ShiftCloseout
          shift={selectedShift}
          workers={shiftWorkers}
          onClose={() => setShowShiftCloseout(false)}
          onComplete={() => {
            setShowShiftCloseout(false);
            if (projectId) {
              fetchShifts(projectId);
            }
            // Update selected shift to reflect completion
            const updatedShift = shifts.find(s => s.id === selectedShift.id);
            if (updatedShift) {
              setSelectedShift({ ...updatedShift, status: 'completed' });
            }
          }}
        />
      )}

      {/* Project Daily Report Modal */}
      {showPDRModal && projectId && project && (
        <ProjectDailyReportModal
          projectId={projectId}
          projectName={project.name}
          reportDate={pdrDate}
          existingReport={selectedPDR ?? undefined}
          onClose={() => {
            setShowPDRModal(false);
            setSelectedPDR(null);
          }}
          onGenerated={(_report) => {
            fetchDailyReports(projectId);
          }}
        />
      )}

      {/* Generate AI Daily Report Modal */}
      {showAIDailyReportModal && projectId && project && (
        <GenerateDailyReportModal
          projectId={projectId}
          projectName={project.name}
          isOpen={showAIDailyReportModal}
          onClose={() => setShowAIDailyReportModal(false)}
          onGenerated={(formId) => {
            // Open the generated form for review
            setEditingFormId(formId);
            // Switch to My Forms tab to see the generated report
            setActiveTab('documents');
            setFormsSubTab('my_forms');
          }}
        />
      )}

      {/* Discover Contacts Modal */}
      {projectId && showDiscoverWorkersModal && (
        <DiscoverFromFormsModal
          projectId={projectId}
          mode="workers"
          onClose={() => {
            setShowDiscoverWorkersModal(false);
            // Refresh contacts list after adding
            fetchContacts();
          }}
        />
      )}

      {/* Discover Subcontractors Modal */}
      {projectId && showDiscoverSubcontractorsModal && (
        <DiscoverFromFormsModal
          projectId={projectId}
          mode="subcontractors"
          onClose={() => {
            setShowDiscoverSubcontractorsModal(false);
            // Refresh subcontractors list after adding
            fetchSubcontractors(projectId);
          }}
        />
      )}

      {/* Animation keyframes (injected via style tag) */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.1); opacity: 0.15; }
        }
      `}</style>
    </div>
  );
}
