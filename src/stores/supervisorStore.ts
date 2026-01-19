import { create } from 'zustand';

import { supabase } from '@/config/supabaseClient';
import type {
  SupervisorProject,
  ProjectFolder,
  ProjectWorker,
  ProjectSubcontractor,
  ReceivedDocument,
  CreateProjectInput,
  CreateFolderInput,
  CreateSubcontractorInput,
  UpdateSubcontractorInput,
  // Shift types
  ProjectShift,
  ProjectShiftWithStats,
  ShiftWorker,
  CreateShiftInput,
  UpdateShiftInput,
  AddShiftWorkerInput,
  CloseoutShiftInput,
  CloseoutChecklistItem,
  // Shift tasks/notes types
  ShiftTask,
  ShiftNote,
  CustomCategory,
  // Discovery types
  DiscoveredWorker,
  DiscoveredSubcontractor,
  // Contact types
  SupervisorContact,
  CreateContactInput,
  // Daily Log & PDR types
  ProjectDailyLog,
  ProjectDailyReport,
  DailyLogType,
  CreateDailyLogInput,
  UpdateDailyLogInput,
  CreateDailyReportInput,
  SiteIssueStatus,
} from '@/types/supervisor';
import { getEffectiveMetadata } from '@/types/supervisor';

// Form type presets for the setup wizard
export const FORM_TYPE_PRESETS = [
  { name: 'FLRA', hint: 'Field Level Risk Assessment, hazard identification, job safety analysis', color: '#3B82F6' },
  { name: 'Hot Work Permit', hint: 'Welding, cutting, grinding, open flame work permits', color: '#EF4444' },
  { name: 'Equipment Inspection', hint: 'Crane, forklift, scaffold, ladder inspection checklists', color: '#F59E0B' },
  { name: 'Confined Space Entry', hint: 'Permit required confined space, atmospheric testing', color: '#8B5CF6' },
  { name: 'Daily Safety Report', hint: 'Daily site safety checklist, toolbox talks, site conditions', color: '#10B981' },
  { name: 'Incident Report', hint: 'Near miss, injury, property damage reports', color: '#DC2626' },
  { name: 'Excavation Permit', hint: 'Trenching, shoring, excavation safety permits', color: '#78716C' },
  { name: 'Lockout/Tagout', hint: 'Energy isolation, LOTO procedures', color: '#0EA5E9' },
] as const;

interface SupervisorState {
  // Data
  projects: SupervisorProject[];
  currentProject: SupervisorProject | null;
  folders: ProjectFolder[];
  workers: ProjectWorker[];
  subcontractors: ProjectSubcontractor[];
  documents: ReceivedDocument[];
  shifts: ProjectShiftWithStats[];
  currentShift: ProjectShiftWithStats | null;
  shiftWorkers: ShiftWorker[];
  contacts: SupervisorContact[];

  // UI State
  loading: boolean;
  error: string | null;

  // Project Actions
  fetchProjects: () => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<SupervisorProject | null>;
  createProjectWithSetup: (
    input: CreateProjectInput,
    selectedFormTypes: string[]
  ) => Promise<{ project: SupervisorProject; processingEmail: string } | null>;
  setCurrentProject: (project: SupervisorProject | null) => void;
  updateProjectEmail: (projectId: string, email: string) => Promise<void>;

  // Folder Actions
  fetchFolders: (projectId: string) => Promise<void>;
  createFolder: (input: CreateFolderInput) => Promise<ProjectFolder | null>;
  createBulkFolders: (projectId: string, formTypes: string[]) => Promise<ProjectFolder[]>;
  deleteFolder: (folderId: string) => Promise<void>;

  // Worker Actions
  fetchWorkers: (projectId: string) => Promise<void>;
  addWorker: (projectId: string, userEmail: string, subcontractorId?: string) => Promise<void>;
  removeWorker: (workerId: string) => Promise<void>;
  updateWorkerSubcontractor: (workerId: string, subcontractorId: string | null) => Promise<void>;

  // Subcontractor Actions
  fetchSubcontractors: (projectId: string) => Promise<void>;
  createSubcontractor: (input: CreateSubcontractorInput) => Promise<ProjectSubcontractor | null>;
  updateSubcontractor: (subcontractorId: string, input: UpdateSubcontractorInput) => Promise<void>;
  deleteSubcontractor: (subcontractorId: string) => Promise<void>;
  getDocumentCountBySubcontractor: (companyName: string) => number;
  getWorkerCountBySubcontractor: (subcontractorId: string) => number;

  // Document Actions
  fetchDocuments: (projectId: string) => Promise<void>;
  moveDocumentToFolder: (documentId: string, folderId: string) => Promise<void>;
  moveDocumentsToFolder: (documentIds: string[], folderId: string) => Promise<void>;
  updateDocumentMetadata: (documentId: string, folderId: string | null, metadata: Record<string, unknown>) => Promise<void>;
  deleteDocument: (documentId: string, reason?: string) => Promise<void>;
  deleteDocuments: (documentIds: string[], reason?: string) => Promise<void>;
  reprocessDocumentsWithAI: (projectId: string) => Promise<{ success: boolean; processed: number; filed: number; message: string }>;
  getUnsortedDocuments: () => ReceivedDocument[];
  getDocumentsByFolder: (folderId: string) => ReceivedDocument[];
  getDocumentCountByFolder: (folderId: string | null) => number;
  getDocumentDownloadUrl: (storagePath: string) => Promise<string | null>;
  downloadDocument: (document: ReceivedDocument) => Promise<void>;
  
  // Realtime Document Actions (for subscription handlers)
  addDocumentRealtime: (document: ReceivedDocument) => void;
  updateDocumentRealtime: (documentId: string, changes: Partial<ReceivedDocument>) => void;
  removeDocumentRealtime: (documentId: string) => void;

  // Shift Actions
  fetchShifts: (projectId: string) => Promise<void>;
  createShift: (input: CreateShiftInput) => Promise<ProjectShift | null>;
  updateShift: (shiftId: string, input: UpdateShiftInput) => Promise<void>;
  deleteShift: (shiftId: string) => Promise<void>;
  activateShift: (shiftId: string) => Promise<void>;
  setCurrentShift: (shift: ProjectShiftWithStats | null) => void;
  
  // Shift Worker Actions
  fetchShiftWorkers: (shiftId: string) => Promise<void>;
  addShiftWorker: (input: AddShiftWorkerInput) => Promise<ShiftWorker | null>;
  addExistingWorkersToShift: (shiftId: string, projectWorkerIds: string[]) => Promise<ShiftWorker[]>;
  removeShiftWorker: (shiftWorkerId: string) => Promise<void>;
  updateShiftWorkerNotificationStatus: (shiftWorkerId: string, status: ShiftWorker['notification_status'], error?: string) => Promise<void>;
  markShiftWorkerFormSubmitted: (shiftWorkerId: string, documentId: string) => Promise<void>;
  
  // Shift Closeout Actions
  closeoutShift: (input: CloseoutShiftInput) => Promise<void>;
  
  // Shift Notification Actions
  sendShiftNotifications: (shiftId: string) => Promise<{ success: boolean; sent: number; failed: number; message: string }>;
  
  // Shift Helpers
  getShiftById: (shiftId: string) => ProjectShiftWithStats | undefined;
  getActiveShifts: () => ProjectShiftWithStats[];
  getShiftFormProgress: (shiftId: string) => { submitted: number; total: number; percentage: number };
  getDocumentsByShift: (shiftId: string) => ReceivedDocument[];

  // Shift Task/Note Actions (supervisor-only planning)
  addShiftTask: (shiftId: string, task: Omit<ShiftTask, 'id' | 'created_at'>) => Promise<void>;
  toggleShiftTask: (shiftId: string, taskId: string) => Promise<void>;
  removeShiftTask: (shiftId: string, taskId: string) => Promise<void>;
  addShiftNote: (shiftId: string, note: Omit<ShiftNote, 'id' | 'created_at'>) => Promise<void>;
  updateShiftNote: (shiftId: string, noteId: string, content: string) => Promise<void>;
  removeShiftNote: (shiftId: string, noteId: string) => Promise<void>;
  addCustomCategory: (shiftId: string, category: Omit<CustomCategory, 'id'>) => Promise<void>;
  removeCustomCategory: (shiftId: string, categoryId: string) => Promise<void>;
  getTasksByCategory: (shiftId: string, category: string) => ShiftTask[];
  getNotesByCategory: (shiftId: string, category: string) => ShiftNote[];
  getTaskCompletionByCategory: (shiftId: string) => Record<string, { total: number; completed: number }>;

  // AI Discovery Actions
  discoverWorkersFromDocuments: (projectId: string) => Promise<DiscoveredWorker[]>;
  discoverSubcontractorsFromDocuments: (projectId: string) => Promise<DiscoveredSubcontractor[]>;

  // Contact Actions
  fetchContacts: () => Promise<void>;
  addContact: (input: CreateContactInput) => Promise<SupervisorContact | null>;
  removeContact: (contactId: string) => Promise<void>;

  // Daily Log Actions
  dailyLogs: ProjectDailyLog[];
  dailyReports: ProjectDailyReport[];
  fetchDailyLogs: (projectId: string, date?: string) => Promise<void>;
  addDailyLog: (input: CreateDailyLogInput) => Promise<ProjectDailyLog | null>;
  updateDailyLog: (logId: string, input: UpdateDailyLogInput) => Promise<void>;
  deleteDailyLog: (logId: string) => Promise<void>;
  toggleSiteIssueStatus: (logId: string, newStatus: SiteIssueStatus) => Promise<void>;
  getDailyLogsByDate: (date: string) => ProjectDailyLog[];
  getDailyLogsByType: (date: string, logType: DailyLogType) => ProjectDailyLog[];
  getOpenSiteIssues: () => ProjectDailyLog[];
  
  // PDR Actions
  fetchDailyReports: (projectId: string) => Promise<void>;
  generateDailyReport: (input: CreateDailyReportInput) => Promise<ProjectDailyReport | null>;
  updateDailyReport: (reportId: string, weather?: CreateDailyReportInput['weather'], summaryNotes?: string) => Promise<void>;
  deleteDailyReport: (reportId: string) => Promise<void>;
  getDailyReportByDate: (date: string) => ProjectDailyReport | undefined;

  // Utilities
  clearError: () => void;
  generateProcessingEmail: (projectName: string) => string;
}

export const useSupervisorStore = create<SupervisorState>((set, get) => ({
  // Initial State
  projects: [],
  currentProject: null,
  folders: [],
  workers: [],
  subcontractors: [],
  documents: [],
  shifts: [],
  currentShift: null,
  shiftWorkers: [],
  contacts: [],
  dailyLogs: [],
  dailyReports: [],
  loading: false,
  error: null,

  // ============================================================================
  // Project Actions
  // ============================================================================

  fetchProjects: async () => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('supervisor_projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ projects: data ?? [], loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch projects';
      set({ error: message, loading: false });
    }
  },

  createProject: async (input) => {
    set({ loading: true, error: null });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('supervisor_projects')
        .insert({
          supervisor_id: user.id,
          name: input.name,
          site_address: input.site_address ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      set((state) => ({
        projects: [data, ...state.projects],
        loading: false,
      }));

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create project';
      set({ error: message, loading: false });
      return null;
    }
  },

  setCurrentProject: (project) => {
    set({ currentProject: project, folders: [], workers: [], subcontractors: [], documents: [], shifts: [], currentShift: null, shiftWorkers: [], contacts: [], dailyLogs: [], dailyReports: [] });
  },

  createProjectWithSetup: async (input, selectedFormTypes) => {
    set({ loading: true, error: null });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Generate a unique processing email
      const processingEmail = get().generateProcessingEmail(input.name);

      // Create the project with processing email
      const { data: project, error: projectError } = await supabase
        .from('supervisor_projects')
        .insert({
          supervisor_id: user.id,
          name: input.name,
          site_address: input.site_address ?? null,
          processing_email: processingEmail,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create folders for selected form types
      if (selectedFormTypes.length > 0) {
        const foldersToCreate = selectedFormTypes.map((formType, index) => {
          const preset = FORM_TYPE_PRESETS.find((p) => p.name === formType);
          return {
            project_id: project.id,
            folder_name: formType,
            ai_classification_hint: preset?.hint ?? null,
            color: preset?.color ?? '#6B7280',
            sort_order: index,
          };
        });

        const { error: foldersError } = await supabase.from('project_folders').insert(foldersToCreate);

        if (foldersError) {
          console.error('Failed to create folders:', foldersError);
          // Don't fail the whole operation, folders can be added later
        }
      }

      // Add to local state
      set((state) => ({
        projects: [project, ...state.projects],
        loading: false,
      }));

      return { project, processingEmail };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create project';
      set({ error: message, loading: false });
      return null;
    }
  },

  updateProjectEmail: async (projectId, email) => {
    set({ loading: true, error: null });

    try {
      const { error } = await supabase
        .from('supervisor_projects')
        .update({ processing_email: email })
        .eq('id', projectId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        projects: state.projects.map((p) => (p.id === projectId ? { ...p, processing_email: email } : p)),
        currentProject:
          state.currentProject?.id === projectId
            ? { ...state.currentProject, processing_email: email }
            : state.currentProject,
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update project email';
      set({ error: message, loading: false });
    }
  },

  // ============================================================================
  // Folder Actions
  // ============================================================================

  fetchFolders: async (projectId) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('project_folders')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      set({ folders: data ?? [], loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch folders';
      set({ error: message, loading: false });
    }
  },

  createFolder: async (input) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('project_folders')
        .insert({
          project_id: input.project_id,
          folder_name: input.folder_name,
          description: input.description ?? null,
          ai_classification_hint: input.ai_classification_hint ?? null,
          color: input.color ?? '#6B7280',
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      set((state) => ({
        folders: [...state.folders, data],
        loading: false,
      }));

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create folder';
      set({ error: message, loading: false });
      return null;
    }
  },

  deleteFolder: async (folderId) => {
    set({ loading: true, error: null });

    try {
      const { error } = await supabase.from('project_folders').delete().eq('id', folderId);

      if (error) throw error;

      // Remove from local state
      set((state) => ({
        folders: state.folders.filter((f) => f.id !== folderId),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete folder';
      set({ error: message, loading: false });
    }
  },

  createBulkFolders: async (projectId, formTypes) => {
    set({ loading: true, error: null });

    try {
      const foldersToCreate = formTypes.map((formType, index) => {
        const preset = FORM_TYPE_PRESETS.find((p) => p.name === formType);
        return {
          project_id: projectId,
          folder_name: formType,
          ai_classification_hint: preset?.hint ?? null,
          color: preset?.color ?? '#6B7280',
          sort_order: index,
        };
      });

      const { data, error } = await supabase.from('project_folders').insert(foldersToCreate).select();

      if (error) throw error;

      // Add to local state
      set((state) => ({
        folders: [...state.folders, ...(data ?? [])],
        loading: false,
      }));

      return data ?? [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create folders';
      set({ error: message, loading: false });
      return [];
    }
  },

  // ============================================================================
  // Worker Actions
  // ============================================================================

  fetchWorkers: async (projectId) => {
    set({ loading: true, error: null });

    try {
      // Join with user_profiles and project_subcontractors
      const { data, error } = await supabase
        .from('project_workers')
        .select(
          `
          *,
          user_profiles!project_workers_user_id_fkey(email, full_name),
          project_subcontractors(company_name)
        `
        )
        .eq('project_id', projectId)
        .order('added_at', { ascending: false });

      if (error) throw error;

      // Flatten the joined data
      const workersWithUserInfo = (data ?? []).map((worker: any) => ({
        ...worker,
        user_email: worker.user_profiles?.email ?? null,
        user_full_name: worker.user_profiles?.full_name ?? null,
        subcontractor_name: worker.project_subcontractors?.company_name ?? null,
      }));

      set({ workers: workersWithUserInfo, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch workers';
      set({ error: message, loading: false });
    }
  },

  addWorker: async (projectId, userEmail, subcontractorId) => {
    set({ loading: true, error: null });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0fb85a1d-a3b1-4c77-bfeb-610e3c7231e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supervisorStore.ts:addWorker:entry',message:'addWorker called',data:{projectId,userEmail,subcontractorId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2,H4'})}).catch(()=>{});
    // #endregion

    try {
      // First, find the user by email
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', userEmail)
        .single();

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0fb85a1d-a3b1-4c77-bfeb-610e3c7231e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supervisorStore.ts:addWorker:userLookup',message:'User lookup result',data:{userEmail,found:!!userData,userId:userData?.id,error:userError?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
      // #endregion

      if (userError || !userData) {
        throw new Error('User not found with that email address');
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Add worker to project
      const { data, error } = await supabase
        .from('project_workers')
        .insert({
          project_id: projectId,
          user_id: userData.id,
          added_by: user.id,
          status: 'active',
          subcontractor_id: subcontractorId ?? null,
        })
        .select()
        .single();

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0fb85a1d-a3b1-4c77-bfeb-610e3c7231e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'supervisorStore.ts:addWorker:insertResult',message:'Insert result',data:{success:!!data,workerId:data?.id,error:error?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion

      if (error) throw error;

      // Get subcontractor name if applicable
      let subcontractorName = null;
      if (subcontractorId) {
        const sub = get().subcontractors.find(s => s.id === subcontractorId);
        subcontractorName = sub?.company_name ?? null;
      }

      // Add to local state
      set((state) => ({
        workers: [{ ...data, user_email: userEmail, subcontractor_name: subcontractorName }, ...state.workers],
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add worker';
      set({ error: message, loading: false });
      // Re-throw so the caller knows the operation failed
      throw error;
    }
  },

  removeWorker: async (workerId) => {
    set({ loading: true, error: null });

    try {
      const { error } = await supabase
        .from('project_workers')
        .update({ status: 'removed' })
        .eq('id', workerId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        workers: state.workers.map((w) => (w.id === workerId ? { ...w, status: 'removed' as const } : w)),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove worker';
      set({ error: message, loading: false });
    }
  },

  updateWorkerSubcontractor: async (workerId, subcontractorId) => {
    set({ loading: true, error: null });

    try {
      const { error } = await supabase
        .from('project_workers')
        .update({ subcontractor_id: subcontractorId })
        .eq('id', workerId);

      if (error) throw error;

      // Get subcontractor name if applicable
      let subcontractorName = null;
      if (subcontractorId) {
        const sub = get().subcontractors.find(s => s.id === subcontractorId);
        subcontractorName = sub?.company_name ?? null;
      }

      // Update local state
      set((state) => ({
        workers: state.workers.map((w) => 
          w.id === workerId 
            ? { ...w, subcontractor_id: subcontractorId, subcontractor_name: subcontractorName } 
            : w
        ),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update worker';
      set({ error: message, loading: false });
    }
  },

  // ============================================================================
  // Subcontractor Actions
  // ============================================================================

  fetchSubcontractors: async (projectId) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('project_subcontractors')
        .select('*')
        .eq('project_id', projectId)
        .order('company_name', { ascending: true });

      if (error) throw error;

      set({ subcontractors: data ?? [], loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch subcontractors';
      set({ error: message, loading: false });
    }
  },

  createSubcontractor: async (input) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('project_subcontractors')
        .insert({
          project_id: input.project_id,
          company_name: input.company_name,
          contact_name: input.contact_name ?? null,
          contact_email: input.contact_email ?? null,
          contact_phone: input.contact_phone ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state (sorted alphabetically)
      set((state) => ({
        subcontractors: [...state.subcontractors, data].sort((a, b) => 
          a.company_name.localeCompare(b.company_name)
        ),
        loading: false,
      }));

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create subcontractor';
      set({ error: message, loading: false });
      return null;
    }
  },

  updateSubcontractor: async (subcontractorId, input) => {
    set({ loading: true, error: null });

    try {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      
      if (input.company_name !== undefined) updateData.company_name = input.company_name;
      if (input.contact_name !== undefined) updateData.contact_name = input.contact_name;
      if (input.contact_email !== undefined) updateData.contact_email = input.contact_email;
      if (input.contact_phone !== undefined) updateData.contact_phone = input.contact_phone;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.status !== undefined) updateData.status = input.status;

      const { error } = await supabase
        .from('project_subcontractors')
        .update(updateData)
        .eq('id', subcontractorId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        subcontractors: state.subcontractors.map((s) =>
          s.id === subcontractorId ? { ...s, ...updateData } as ProjectSubcontractor : s
        ).sort((a, b) => a.company_name.localeCompare(b.company_name)),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update subcontractor';
      set({ error: message, loading: false });
    }
  },

  deleteSubcontractor: async (subcontractorId) => {
    set({ loading: true, error: null });

    try {
      const { error } = await supabase
        .from('project_subcontractors')
        .delete()
        .eq('id', subcontractorId);

      if (error) throw error;

      // Remove from local state and update workers who were linked to this subcontractor
      set((state) => ({
        subcontractors: state.subcontractors.filter((s) => s.id !== subcontractorId),
        workers: state.workers.map((w) => 
          w.subcontractor_id === subcontractorId 
            ? { ...w, subcontractor_id: null, subcontractor_name: null }
            : w
        ),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete subcontractor';
      set({ error: message, loading: false });
    }
  },

  getDocumentCountBySubcontractor: (companyName) => {
    const state = get();
    return state.documents.filter((doc) => {
      if (doc.status === 'rejected') return false;
      const meta = getEffectiveMetadata(doc.ai_extracted_data);
      // Case-insensitive comparison
      return meta.companyName?.toLowerCase() === companyName.toLowerCase();
    }).length;
  },

  getWorkerCountBySubcontractor: (subcontractorId) => {
    const state = get();
    return state.workers.filter(
      (w) => w.subcontractor_id === subcontractorId && w.status === 'active'
    ).length;
  },

  // ============================================================================
  // Document Actions
  // ============================================================================

  fetchDocuments: async (projectId) => {
    set({ loading: true, error: null });

    try {
      console.log('📄 Fetching documents for project:', projectId);
      
      const { data, error } = await supabase
        .from('received_documents')
        .select('*')
        .eq('project_id', projectId)
        .order('received_at', { ascending: false });

      if (error) throw error;

      console.log('📄 Documents fetched:', data?.length ?? 0, 'documents');
      set({ documents: data ?? [], loading: false });
    } catch (error) {
      console.error('❌ Failed to fetch documents:', error);
      const message = error instanceof Error ? error.message : 'Failed to fetch documents';
      set({ error: message, loading: false });
    }
  },

  moveDocumentToFolder: async (documentId, folderId) => {
    set({ loading: true, error: null });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('received_documents')
        .update({
          folder_id: folderId,
          status: 'filed',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === documentId
            ? { ...doc, folder_id: folderId, status: 'filed' as const, reviewed_by: user.id, reviewed_at: new Date().toISOString() }
            : doc
        ),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to move document';
      set({ error: message, loading: false });
    }
  },

  moveDocumentsToFolder: async (documentIds, folderId) => {
    set({ loading: true, error: null });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('received_documents')
        .update({
          folder_id: folderId,
          status: 'filed',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .in('id', documentIds);

      if (error) throw error;

      // Update local state
      set((state) => ({
        documents: state.documents.map((doc) =>
          documentIds.includes(doc.id)
            ? { ...doc, folder_id: folderId, status: 'filed' as const, reviewed_by: user.id, reviewed_at: new Date().toISOString() }
            : doc
        ),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to move documents';
      set({ error: message, loading: false });
    }
  },

  updateDocumentMetadata: async (documentId, folderId, metadata) => {
    set({ loading: true, error: null });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Get current document to merge metadata
      const currentDoc = get().documents.find((d) => d.id === documentId);
      const mergedMetadata = {
        ...(currentDoc?.ai_extracted_data ?? {}),
        ...metadata,
      };

      const updateData: Record<string, unknown> = {
        ai_extracted_data: mergedMetadata,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      };

      // Only update folder and status if folderId is provided
      if (folderId) {
        updateData.folder_id = folderId;
        updateData.status = 'filed';
      }

      const { error } = await supabase
        .from('received_documents')
        .update(updateData)
        .eq('id', documentId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === documentId
            ? {
                ...doc,
                ai_extracted_data: mergedMetadata,
                folder_id: folderId ?? doc.folder_id,
                status: folderId ? ('filed' as const) : doc.status,
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
              }
            : doc
        ),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update document';
      set({ error: message, loading: false });
      throw error; // Re-throw for the Quick Review modal to handle
    }
  },

  deleteDocument: async (documentId, reason) => {
    set({ loading: true, error: null });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('received_documents')
        .update({
          status: 'rejected',
          rejection_reason: reason ?? null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (error) throw error;

      // Update local state - mark as rejected (soft delete)
      set((state) => ({
        documents: state.documents.map((doc) =>
          doc.id === documentId
            ? { ...doc, status: 'rejected' as const, rejection_reason: reason ?? null }
            : doc
        ),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete document';
      set({ error: message, loading: false });
    }
  },

  deleteDocuments: async (documentIds, reason) => {
    set({ loading: true, error: null });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('received_documents')
        .update({
          status: 'rejected',
          rejection_reason: reason ?? null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .in('id', documentIds);

      if (error) throw error;

      // Update local state - mark as rejected (soft delete)
      set((state) => ({
        documents: state.documents.map((doc) =>
          documentIds.includes(doc.id)
            ? { ...doc, status: 'rejected' as const, rejection_reason: reason ?? null }
            : doc
        ),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete documents';
      set({ error: message, loading: false });
    }
  },

  reprocessDocumentsWithAI: async (projectId) => {
    set({ loading: true, error: null });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error('Not authenticated');

      console.log('🔄 Calling reprocess-documents edge function...');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reprocess-documents`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ project_id: projectId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Reprocess result:', result);

      // Log detailed results including any errors
      if (result.results && Array.isArray(result.results)) {
        const errors = result.results.filter((r: { status: string; error?: string }) => r.status === 'error');
        if (errors.length > 0) {
          console.error('❌ Document processing errors:', errors);
        }
        result.results.forEach((r: { id: string; status: string; classification?: string; error?: string }) => {
          if (r.error) {
            console.error(`   Document ${r.id.substring(0, 8)}: ${r.error}`);
          } else {
            console.log(`   Document ${r.id.substring(0, 8)}: ${r.classification} → ${r.status}`);
          }
        });
      }

      // Refresh documents after reprocessing
      await get().fetchDocuments(projectId);

      set({ loading: false });

      return {
        success: true,
        processed: result.processed ?? 0,
        filed: result.filed ?? 0,
        message: result.message ?? 'Processing complete',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reprocess documents';
      console.error('❌ Reprocess error:', message);
      set({ error: message, loading: false });
      return {
        success: false,
        processed: 0,
        filed: 0,
        message,
      };
    }
  },

  getUnsortedDocuments: () => {
    const state = get();
    return state.documents.filter(
      (doc) => doc.folder_id === null && doc.status !== 'rejected'
    );
  },

  getDocumentsByFolder: (folderId) => {
    const state = get();
    return state.documents.filter(
      (doc) => doc.folder_id === folderId && doc.status !== 'rejected'
    );
  },

  getDocumentCountByFolder: (folderId) => {
    const state = get();
    if (folderId === null) {
      // Unsorted count
      return state.documents.filter(
        (doc) => doc.folder_id === null && doc.status !== 'rejected'
      ).length;
    }
    return state.documents.filter(
      (doc) => doc.folder_id === folderId && doc.status !== 'rejected'
    ).length;
  },

  getDocumentDownloadUrl: async (storagePath) => {
    try {
      // Documents are stored in the 'document-intake' bucket (private)
      const { data, error } = await supabase.storage
        .from('document-intake')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (error) {
        console.error('Failed to get signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error getting document URL:', error);
      return null;
    }
  },

  downloadDocument: async (document) => {
    try {
      const url = await get().getDocumentDownloadUrl(document.storage_path);
      
      if (!url) {
        throw new Error('Could not get download URL');
      }

      // Create a temporary anchor element to trigger download
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.original_filename ?? 'document';
      link.target = '_blank';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading document:', error);
      const message = error instanceof Error ? error.message : 'Failed to download document';
      set({ error: message });
    }
  },

  // ============================================================================
  // Realtime Document Actions (for subscription handlers)
  // ============================================================================

  addDocumentRealtime: (document) => {
    console.log('📡 Realtime: New document received:', document.id, document.original_filename);
    set((state) => {
      // Check if document already exists (prevent duplicates)
      if (state.documents.some((doc) => doc.id === document.id)) {
        console.log('📡 Realtime: Document already exists, skipping');
        return state;
      }
      // Add to beginning of list (newest first)
      return { documents: [document, ...state.documents] };
    });
  },

  updateDocumentRealtime: (documentId, changes) => {
    console.log('📡 Realtime: Document updated:', documentId, changes);
    set((state) => ({
      documents: state.documents.map((doc) =>
        doc.id === documentId ? { ...doc, ...changes } : doc
      ),
    }));
  },

  removeDocumentRealtime: (documentId) => {
    console.log('📡 Realtime: Document removed:', documentId);
    set((state) => ({
      documents: state.documents.filter((doc) => doc.id !== documentId),
    }));
  },

  // ============================================================================
  // Shift Actions
  // ============================================================================

  fetchShifts: async (projectId) => {
    set({ loading: true, error: null });

    try {
      // Fetch shifts with worker counts
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('project_shifts')
        .select('*')
        .eq('project_id', projectId)
        .order('scheduled_date', { ascending: false });

      if (shiftsError) throw shiftsError;

      // For each shift, get worker counts
      const shiftsWithStats: ProjectShiftWithStats[] = await Promise.all(
        (shiftsData ?? []).map(async (shift) => {
          const { count: workerCount } = await supabase
            .from('shift_workers')
            .select('*', { count: 'exact', head: true })
            .eq('shift_id', shift.id);

          const { count: submittedCount } = await supabase
            .from('shift_workers')
            .select('*', { count: 'exact', head: true })
            .eq('shift_id', shift.id)
            .eq('form_submitted', true);

          return {
            ...shift,
            closeout_checklist: (shift.closeout_checklist as CloseoutChecklistItem[]) ?? [],
            shift_tasks: (shift.shift_tasks as ShiftTask[]) ?? [],
            shift_notes: (shift.shift_notes as ShiftNote[]) ?? [],
            custom_categories: (shift.custom_categories as CustomCategory[]) ?? [],
            worker_count: workerCount ?? 0,
            forms_submitted: submittedCount ?? 0,
          };
        })
      );

      set({ shifts: shiftsWithStats, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch shifts';
      set({ error: message, loading: false });
    }
  },

  createShift: async (input) => {
    set({ loading: true, error: null });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('project_shifts')
        .insert({
          project_id: input.project_id,
          name: input.name,
          scheduled_date: input.scheduled_date,
          start_time: input.start_time ?? null,
          end_time: input.end_time ?? null,
          notes: input.notes ?? null,
          shift_tasks: input.shift_tasks ?? [],
          shift_notes: input.shift_notes ?? [],
          custom_categories: input.custom_categories ?? [],
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const shiftWithStats: ProjectShiftWithStats = {
        ...data,
        closeout_checklist: (data.closeout_checklist as CloseoutChecklistItem[]) ?? [],
        shift_tasks: (data.shift_tasks as ShiftTask[]) ?? [],
        shift_notes: (data.shift_notes as ShiftNote[]) ?? [],
        custom_categories: (data.custom_categories as CustomCategory[]) ?? [],
        worker_count: 0,
        forms_submitted: 0,
      };

      // Add to local state
      set((state) => ({
        shifts: [shiftWithStats, ...state.shifts],
        loading: false,
      }));

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create shift';
      set({ error: message, loading: false });
      return null;
    }
  },

  updateShift: async (shiftId, input) => {
    set({ loading: true, error: null });

    try {
      const updateData: Record<string, unknown> = {};

      if (input.name !== undefined) updateData.name = input.name;
      if (input.scheduled_date !== undefined) updateData.scheduled_date = input.scheduled_date;
      if (input.start_time !== undefined) updateData.start_time = input.start_time;
      if (input.end_time !== undefined) updateData.end_time = input.end_time;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.shift_tasks !== undefined) updateData.shift_tasks = input.shift_tasks;
      if (input.shift_notes !== undefined) updateData.shift_notes = input.shift_notes;
      if (input.custom_categories !== undefined) updateData.custom_categories = input.custom_categories;
      if (input.closeout_checklist !== undefined) updateData.closeout_checklist = input.closeout_checklist;
      if (input.closeout_notes !== undefined) updateData.closeout_notes = input.closeout_notes;
      if (input.incomplete_reason !== undefined) updateData.incomplete_reason = input.incomplete_reason;

      const { error } = await supabase
        .from('project_shifts')
        .update(updateData)
        .eq('id', shiftId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        shifts: state.shifts.map((s) =>
          s.id === shiftId ? { ...s, ...updateData } as ProjectShiftWithStats : s
        ),
        currentShift: state.currentShift?.id === shiftId
          ? { ...state.currentShift, ...updateData } as ProjectShiftWithStats
          : state.currentShift,
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update shift';
      set({ error: message, loading: false });
    }
  },

  deleteShift: async (shiftId) => {
    set({ loading: true, error: null });

    try {
      const { error } = await supabase
        .from('project_shifts')
        .delete()
        .eq('id', shiftId);

      if (error) throw error;

      // Remove from local state
      set((state) => ({
        shifts: state.shifts.filter((s) => s.id !== shiftId),
        currentShift: state.currentShift?.id === shiftId ? null : state.currentShift,
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete shift';
      set({ error: message, loading: false });
    }
  },

  activateShift: async (shiftId) => {
    set({ loading: true, error: null });

    try {
      const { error } = await supabase
        .from('project_shifts')
        .update({ status: 'active' })
        .eq('id', shiftId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        shifts: state.shifts.map((s) =>
          s.id === shiftId ? { ...s, status: 'active' as const } : s
        ),
        currentShift: state.currentShift?.id === shiftId
          ? { ...state.currentShift, status: 'active' as const }
          : state.currentShift,
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to activate shift';
      set({ error: message, loading: false });
    }
  },

  setCurrentShift: (shift) => {
    set({ currentShift: shift, shiftWorkers: [] });
  },

  // ============================================================================
  // Shift Worker Actions
  // ============================================================================

  fetchShiftWorkers: async (shiftId) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('shift_workers')
        .select(`
          *,
          project_subcontractors(company_name)
        `)
        .eq('shift_id', shiftId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Flatten the joined data
      const workersWithSubcontractor = (data ?? []).map((worker: any) => ({
        ...worker,
        subcontractor_name: worker.project_subcontractors?.company_name ?? null,
      }));

      set({ shiftWorkers: workersWithSubcontractor, loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch shift workers';
      set({ error: message, loading: false });
    }
  },

  addShiftWorker: async (input) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('shift_workers')
        .insert({
          shift_id: input.shift_id,
          worker_type: input.worker_type,
          user_id: input.user_id ?? null,
          subcontractor_id: input.subcontractor_id ?? null,
          name: input.name,
          phone: input.phone ?? null,
          email: input.email ?? null,
          notification_method: input.notification_method ?? 'sms',
        })
        .select()
        .single();

      if (error) throw error;

      // Get subcontractor name if applicable
      let subcontractorName = null;
      if (input.subcontractor_id) {
        const sub = get().subcontractors.find(s => s.id === input.subcontractor_id);
        subcontractorName = sub?.company_name ?? null;
      }

      const workerWithSubcontractor: ShiftWorker = {
        ...data,
        subcontractor_name: subcontractorName,
      };

      // Add to local state and update shift worker count
      set((state) => ({
        shiftWorkers: [...state.shiftWorkers, workerWithSubcontractor],
        shifts: state.shifts.map((s) =>
          s.id === input.shift_id ? { ...s, worker_count: s.worker_count + 1 } : s
        ),
        currentShift: state.currentShift?.id === input.shift_id
          ? { ...state.currentShift, worker_count: state.currentShift.worker_count + 1 }
          : state.currentShift,
        loading: false,
      }));

      return workerWithSubcontractor;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add shift worker';
      set({ error: message, loading: false });
      return null;
    }
  },

  addExistingWorkersToShift: async (shiftId, projectWorkerIds) => {
    set({ loading: true, error: null });

    try {
      // Get project workers details
      const { data: projectWorkersData, error: fetchError } = await supabase
        .from('project_workers')
        .select(`
          *,
          user_profiles!project_workers_user_id_fkey(email, full_name, phone),
          project_subcontractors(company_name)
        `)
        .in('id', projectWorkerIds);

      if (fetchError) throw fetchError;

      if (!projectWorkersData || projectWorkersData.length === 0) {
        throw new Error('No workers found');
      }

      // Create shift workers from project workers
      const shiftWorkersToInsert = projectWorkersData.map((pw: any) => ({
        shift_id: shiftId,
        worker_type: 'registered' as const,
        user_id: pw.user_id,
        subcontractor_id: pw.subcontractor_id,
        name: pw.user_profiles?.full_name ?? pw.user_profiles?.email ?? 'Unknown',
        phone: pw.user_profiles?.phone ?? null,
        email: pw.user_profiles?.email ?? null,
        notification_method: 'sms' as const,
      }));

      const { data, error } = await supabase
        .from('shift_workers')
        .insert(shiftWorkersToInsert)
        .select();

      if (error) throw error;

      // Add subcontractor names to the result
      const workersWithSubcontractor: ShiftWorker[] = (data ?? []).map((sw: any, index: number) => ({
        ...sw,
        subcontractor_name: (projectWorkersData[index] as any).project_subcontractors?.company_name ?? null,
      }));

      // Update local state
      set((state) => ({
        shiftWorkers: [...state.shiftWorkers, ...workersWithSubcontractor],
        shifts: state.shifts.map((s) =>
          s.id === shiftId ? { ...s, worker_count: s.worker_count + workersWithSubcontractor.length } : s
        ),
        currentShift: state.currentShift?.id === shiftId
          ? { ...state.currentShift, worker_count: state.currentShift.worker_count + workersWithSubcontractor.length }
          : state.currentShift,
        loading: false,
      }));

      return workersWithSubcontractor;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add workers to shift';
      set({ error: message, loading: false });
      return [];
    }
  },

  removeShiftWorker: async (shiftWorkerId) => {
    set({ loading: true, error: null });

    try {
      // Get shift_id before deleting
      const worker = get().shiftWorkers.find(w => w.id === shiftWorkerId);
      const shiftId = worker?.shift_id;

      const { error } = await supabase
        .from('shift_workers')
        .delete()
        .eq('id', shiftWorkerId);

      if (error) throw error;

      // Remove from local state and update shift worker count
      set((state) => ({
        shiftWorkers: state.shiftWorkers.filter((w) => w.id !== shiftWorkerId),
        shifts: shiftId ? state.shifts.map((s) =>
          s.id === shiftId ? { ...s, worker_count: Math.max(0, s.worker_count - 1) } : s
        ) : state.shifts,
        currentShift: state.currentShift?.id === shiftId
          ? { ...state.currentShift, worker_count: Math.max(0, state.currentShift.worker_count - 1) }
          : state.currentShift,
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove shift worker';
      set({ error: message, loading: false });
    }
  },

  updateShiftWorkerNotificationStatus: async (shiftWorkerId, status, errorMsg) => {
    set({ loading: true, error: null });

    try {
      const updateData: Record<string, unknown> = {
        notification_status: status,
      };

      if (status === 'sent' || status === 'delivered') {
        updateData.notification_sent_at = new Date().toISOString();
      }

      if (errorMsg) {
        updateData.notification_error = errorMsg;
      }

      const { error } = await supabase
        .from('shift_workers')
        .update(updateData)
        .eq('id', shiftWorkerId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        shiftWorkers: state.shiftWorkers.map((w) =>
          w.id === shiftWorkerId ? { ...w, ...updateData } as ShiftWorker : w
        ),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update notification status';
      set({ error: message, loading: false });
    }
  },

  markShiftWorkerFormSubmitted: async (shiftWorkerId, documentId) => {
    set({ loading: true, error: null });

    try {
      const worker = get().shiftWorkers.find(w => w.id === shiftWorkerId);
      const shiftId = worker?.shift_id;

      const { error } = await supabase
        .from('shift_workers')
        .update({
          form_submitted: true,
          form_submitted_at: new Date().toISOString(),
          document_id: documentId,
        })
        .eq('id', shiftWorkerId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        shiftWorkers: state.shiftWorkers.map((w) =>
          w.id === shiftWorkerId
            ? { ...w, form_submitted: true, form_submitted_at: new Date().toISOString(), document_id: documentId }
            : w
        ),
        shifts: shiftId ? state.shifts.map((s) =>
          s.id === shiftId ? { ...s, forms_submitted: s.forms_submitted + 1 } : s
        ) : state.shifts,
        currentShift: state.currentShift?.id === shiftId
          ? { ...state.currentShift, forms_submitted: state.currentShift.forms_submitted + 1 }
          : state.currentShift,
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to mark form as submitted';
      set({ error: message, loading: false });
    }
  },

  // ============================================================================
  // Shift Closeout Actions
  // ============================================================================

  closeoutShift: async (input) => {
    set({ loading: true, error: null });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('project_shifts')
        .update({
          status: 'completed',
          closeout_checklist: input.closeout_checklist,
          closeout_notes: input.closeout_notes ?? null,
          incomplete_reason: input.incomplete_reason ?? null,
          closed_at: new Date().toISOString(),
          closed_by: user.id,
        })
        .eq('id', input.shift_id);

      if (error) throw error;

      // Update local state
      set((state) => ({
        shifts: state.shifts.map((s) =>
          s.id === input.shift_id
            ? {
                ...s,
                status: 'completed' as const,
                closeout_checklist: input.closeout_checklist,
                closeout_notes: input.closeout_notes ?? null,
                incomplete_reason: input.incomplete_reason ?? null,
                closed_at: new Date().toISOString(),
                closed_by: user.id,
              }
            : s
        ),
        currentShift: state.currentShift?.id === input.shift_id
          ? {
              ...state.currentShift,
              status: 'completed' as const,
              closeout_checklist: input.closeout_checklist,
              closeout_notes: input.closeout_notes ?? null,
              incomplete_reason: input.incomplete_reason ?? null,
              closed_at: new Date().toISOString(),
              closed_by: user.id,
            }
          : state.currentShift,
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to close out shift';
      set({ error: message, loading: false });
    }
  },

  // ============================================================================
  // Shift Notification Actions
  // ============================================================================

  sendShiftNotifications: async (shiftId) => {
    set({ loading: true, error: null });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error('Not authenticated');

      console.log('📧 Sending shift notifications for:', shiftId);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-shift-notifications`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ shift_id: shiftId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Notification result:', result);

      // Refresh shift workers to get updated notification statuses
      await get().fetchShiftWorkers(shiftId);

      // Update shift status to active if it was in draft
      const shift = get().shifts.find(s => s.id === shiftId);
      if (shift?.status === 'draft') {
        set((state) => ({
          shifts: state.shifts.map((s) =>
            s.id === shiftId ? { ...s, status: 'active' as const } : s
          ),
          currentShift: state.currentShift?.id === shiftId
            ? { ...state.currentShift, status: 'active' as const }
            : state.currentShift,
        }));
      }

      set({ loading: false });

      return {
        success: true,
        sent: result.sent ?? 0,
        failed: result.failed ?? 0,
        message: result.message ?? 'Notifications sent',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send notifications';
      console.error('❌ Notification error:', message);
      set({ error: message, loading: false });
      return {
        success: false,
        sent: 0,
        failed: 0,
        message,
      };
    }
  },

  // ============================================================================
  // Shift Helpers
  // ============================================================================

  getShiftById: (shiftId) => {
    return get().shifts.find((s) => s.id === shiftId);
  },

  getActiveShifts: () => {
    return get().shifts.filter((s) => s.status === 'active');
  },

  getShiftFormProgress: (shiftId) => {
    const shift = get().shifts.find((s) => s.id === shiftId);
    if (!shift) return { submitted: 0, total: 0, percentage: 0 };

    const total = shift.worker_count;
    const submitted = shift.forms_submitted;
    const percentage = total > 0 ? Math.round((submitted / total) * 100) : 0;

    return { submitted, total, percentage };
  },

  getDocumentsByShift: (shiftId) => {
    return get().documents.filter((doc) => doc.shift_id === shiftId && doc.status !== 'rejected');
  },

  // ============================================================================
  // Shift Task/Note Actions (supervisor-only planning)
  // ============================================================================

  addShiftTask: async (shiftId, task) => {
    const shift = get().shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    const newTask: ShiftTask = {
      id: crypto.randomUUID(),
      category: task.category,
      content: task.content,
      checked: task.checked,
      created_at: new Date().toISOString(),
    };

    const updatedTasks = [...(shift.shift_tasks ?? []), newTask];

    try {
      const { error } = await supabase
        .from('project_shifts')
        .update({ shift_tasks: updatedTasks })
        .eq('id', shiftId);

      if (error) throw error;

      set((state) => ({
        shifts: state.shifts.map((s) =>
          s.id === shiftId ? { ...s, shift_tasks: updatedTasks } : s
        ),
        currentShift: state.currentShift?.id === shiftId
          ? { ...state.currentShift, shift_tasks: updatedTasks }
          : state.currentShift,
      }));
    } catch (error) {
      console.error('Failed to add shift task:', error);
    }
  },

  toggleShiftTask: async (shiftId, taskId) => {
    const shift = get().shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    const updatedTasks = (shift.shift_tasks ?? []).map((t) =>
      t.id === taskId ? { ...t, checked: !t.checked } : t
    );

    try {
      const { error } = await supabase
        .from('project_shifts')
        .update({ shift_tasks: updatedTasks })
        .eq('id', shiftId);

      if (error) throw error;

      set((state) => ({
        shifts: state.shifts.map((s) =>
          s.id === shiftId ? { ...s, shift_tasks: updatedTasks } : s
        ),
        currentShift: state.currentShift?.id === shiftId
          ? { ...state.currentShift, shift_tasks: updatedTasks }
          : state.currentShift,
      }));
    } catch (error) {
      console.error('Failed to toggle shift task:', error);
    }
  },

  removeShiftTask: async (shiftId, taskId) => {
    const shift = get().shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    const updatedTasks = (shift.shift_tasks ?? []).filter((t) => t.id !== taskId);

    try {
      const { error } = await supabase
        .from('project_shifts')
        .update({ shift_tasks: updatedTasks })
        .eq('id', shiftId);

      if (error) throw error;

      set((state) => ({
        shifts: state.shifts.map((s) =>
          s.id === shiftId ? { ...s, shift_tasks: updatedTasks } : s
        ),
        currentShift: state.currentShift?.id === shiftId
          ? { ...state.currentShift, shift_tasks: updatedTasks }
          : state.currentShift,
      }));
    } catch (error) {
      console.error('Failed to remove shift task:', error);
    }
  },

  addShiftNote: async (shiftId, note) => {
    const shift = get().shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    const newNote: ShiftNote = {
      id: crypto.randomUUID(),
      category: note.category,
      content: note.content,
      created_at: new Date().toISOString(),
    };

    const updatedNotes = [...(shift.shift_notes ?? []), newNote];

    try {
      const { error } = await supabase
        .from('project_shifts')
        .update({ shift_notes: updatedNotes })
        .eq('id', shiftId);

      if (error) throw error;

      set((state) => ({
        shifts: state.shifts.map((s) =>
          s.id === shiftId ? { ...s, shift_notes: updatedNotes } : s
        ),
        currentShift: state.currentShift?.id === shiftId
          ? { ...state.currentShift, shift_notes: updatedNotes }
          : state.currentShift,
      }));
    } catch (error) {
      console.error('Failed to add shift note:', error);
    }
  },

  updateShiftNote: async (shiftId, noteId, content) => {
    const shift = get().shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    const updatedNotes = (shift.shift_notes ?? []).map((n) =>
      n.id === noteId ? { ...n, content } : n
    );

    try {
      const { error } = await supabase
        .from('project_shifts')
        .update({ shift_notes: updatedNotes })
        .eq('id', shiftId);

      if (error) throw error;

      set((state) => ({
        shifts: state.shifts.map((s) =>
          s.id === shiftId ? { ...s, shift_notes: updatedNotes } : s
        ),
        currentShift: state.currentShift?.id === shiftId
          ? { ...state.currentShift, shift_notes: updatedNotes }
          : state.currentShift,
      }));
    } catch (error) {
      console.error('Failed to update shift note:', error);
    }
  },

  removeShiftNote: async (shiftId, noteId) => {
    const shift = get().shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    const updatedNotes = (shift.shift_notes ?? []).filter((n) => n.id !== noteId);

    try {
      const { error } = await supabase
        .from('project_shifts')
        .update({ shift_notes: updatedNotes })
        .eq('id', shiftId);

      if (error) throw error;

      set((state) => ({
        shifts: state.shifts.map((s) =>
          s.id === shiftId ? { ...s, shift_notes: updatedNotes } : s
        ),
        currentShift: state.currentShift?.id === shiftId
          ? { ...state.currentShift, shift_notes: updatedNotes }
          : state.currentShift,
      }));
    } catch (error) {
      console.error('Failed to remove shift note:', error);
    }
  },

  addCustomCategory: async (shiftId, category) => {
    const shift = get().shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    const newCategory: CustomCategory = {
      id: crypto.randomUUID(),
      name: category.name,
      color: category.color,
    };

    const updatedCategories = [...(shift.custom_categories ?? []), newCategory];

    try {
      const { error } = await supabase
        .from('project_shifts')
        .update({ custom_categories: updatedCategories })
        .eq('id', shiftId);

      if (error) throw error;

      set((state) => ({
        shifts: state.shifts.map((s) =>
          s.id === shiftId ? { ...s, custom_categories: updatedCategories } : s
        ),
        currentShift: state.currentShift?.id === shiftId
          ? { ...state.currentShift, custom_categories: updatedCategories }
          : state.currentShift,
      }));
    } catch (error) {
      console.error('Failed to add custom category:', error);
    }
  },

  removeCustomCategory: async (shiftId, categoryId) => {
    const shift = get().shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    const updatedCategories = (shift.custom_categories ?? []).filter((c) => c.id !== categoryId);

    try {
      const { error } = await supabase
        .from('project_shifts')
        .update({ custom_categories: updatedCategories })
        .eq('id', shiftId);

      if (error) throw error;

      set((state) => ({
        shifts: state.shifts.map((s) =>
          s.id === shiftId ? { ...s, custom_categories: updatedCategories } : s
        ),
        currentShift: state.currentShift?.id === shiftId
          ? { ...state.currentShift, custom_categories: updatedCategories }
          : state.currentShift,
      }));
    } catch (error) {
      console.error('Failed to remove custom category:', error);
    }
  },

  getTasksByCategory: (shiftId, category) => {
    const shift = get().shifts.find((s) => s.id === shiftId);
    if (!shift) return [];
    return (shift.shift_tasks ?? []).filter((t) => t.category === category);
  },

  getNotesByCategory: (shiftId, category) => {
    const shift = get().shifts.find((s) => s.id === shiftId);
    if (!shift) return [];
    return (shift.shift_notes ?? []).filter((n) => n.category === category);
  },

  getTaskCompletionByCategory: (shiftId) => {
    const shift = get().shifts.find((s) => s.id === shiftId);
    if (!shift) return {};

    const result: Record<string, { total: number; completed: number }> = {};
    
    for (const task of shift.shift_tasks ?? []) {
      if (!result[task.category]) {
        result[task.category] = { total: 0, completed: 0 };
      }
      result[task.category].total++;
      if (task.checked) {
        result[task.category].completed++;
      }
    }

    return result;
  },

  // ============================================================================
  // AI Discovery Actions
  // ============================================================================

  discoverWorkersFromDocuments: async (projectId) => {
    const { documents, contacts } = get();

    // Helper to parse email from "Name <email>" format
    const parseEmail = (sourceEmail: string | null): string | null => {
      if (!sourceEmail) return null;
      const match = sourceEmail.match(/<([^>]+)>/);
      return match ? match[1].toLowerCase() : sourceEmail.toLowerCase();
    };

    // Get documents for this project that have ai_extracted_data
    const projectDocs = documents.filter(
      (doc) => doc.project_id === projectId && doc.ai_extracted_data
    );

    // Build sets of existing contact names and emails (lowercased for comparison)
    const existingContactNames = new Set<string>();
    const existingContactEmails = new Set<string>();
    contacts.forEach((c) => {
      if (c.name) {
        existingContactNames.add(c.name.toLowerCase().trim());
      }
      if (c.email) {
        existingContactEmails.add(c.email.toLowerCase().trim());
      }
    });

    // Extract unique worker names from documents
    const workerMap = new Map<string, DiscoveredWorker>();

    for (const doc of projectDocs) {
      const extracted = doc.ai_extracted_data;
      const workerName = extracted?.workerName as string | undefined;

      if (workerName && workerName.trim()) {
        const normalizedName = workerName.toLowerCase().trim();
        const parsedEmail = parseEmail(doc.source_email);
        
        // Skip if already exists in contacts (by name OR email)
        if (existingContactNames.has(normalizedName)) {
          continue;
        }
        if (parsedEmail && existingContactEmails.has(parsedEmail)) {
          continue;
        }

        const existing = workerMap.get(normalizedName);
        if (existing) {
          // Update count and last seen
          existing.documentCount++;
          if (new Date(doc.created_at) > new Date(existing.lastSeen)) {
            existing.lastSeen = doc.created_at;
            // Update email if source_email is available
            if (doc.source_email) {
              existing.email = parseEmail(doc.source_email);
            }
          }
        } else {
          // New discovery
          workerMap.set(normalizedName, {
            name: workerName.trim(),
            email: parseEmail(doc.source_email),
            companyName: (extracted?.companyName as string) || null,
            documentCount: 1,
            lastSeen: doc.created_at,
          });
        }
      }
    }

    // Convert to array and sort by document count (most frequent first)
    return Array.from(workerMap.values()).sort((a, b) => b.documentCount - a.documentCount);
  },

  discoverSubcontractorsFromDocuments: async (projectId) => {
    const { documents, subcontractors } = get();

    // Get documents for this project that have ai_extracted_data
    const projectDocs = documents.filter(
      (doc) => doc.project_id === projectId && doc.ai_extracted_data
    );

    // Build a set of existing subcontractor names (lowercased for comparison)
    const existingCompanyNames = new Set<string>();
    subcontractors
      .filter((s) => s.project_id === projectId)
      .forEach((s) => {
        if (s.company_name) {
          existingCompanyNames.add(s.company_name.toLowerCase().trim());
        }
      });

    // Extract unique company names from documents
    const companyMap = new Map<string, DiscoveredSubcontractor>();

    for (const doc of projectDocs) {
      const extracted = doc.ai_extracted_data;
      const companyName = extracted?.companyName as string | undefined;

      if (companyName && companyName.trim()) {
        const normalizedName = companyName.toLowerCase().trim();

        // Skip if already exists in project subcontractors
        if (existingCompanyNames.has(normalizedName)) {
          continue;
        }

        const existing = companyMap.get(normalizedName);
        const workerName = extracted?.workerName as string | undefined;

        if (existing) {
          // Update count and last seen
          existing.documentCount++;
          if (new Date(doc.created_at) > new Date(existing.lastSeen)) {
            existing.lastSeen = doc.created_at;
          }
          // Add worker name if not already in list
          if (workerName && !existing.workerNames.includes(workerName.trim())) {
            existing.workerNames.push(workerName.trim());
          }
        } else {
          // New discovery
          companyMap.set(normalizedName, {
            companyName: companyName.trim(),
            documentCount: 1,
            lastSeen: doc.created_at,
            workerNames: workerName ? [workerName.trim()] : [],
          });
        }
      }
    }

    // Convert to array and sort by document count (most frequent first)
    return Array.from(companyMap.values()).sort((a, b) => b.documentCount - a.documentCount);
  },

  // ============================================================================
  // Contact Actions (Global per supervisor)
  // ============================================================================

  fetchContacts: async () => {
    try {
      // RLS ensures we only get our own contacts
      const { data, error } = await supabase
        .from('supervisor_contacts')
        .select('*')
        .order('recent_project_date', { ascending: false, nullsFirst: false });

      if (error) throw error;
      set({ contacts: data ?? [] });
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  },

  addContact: async (input) => {
    set({ loading: true, error: null });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('supervisor_contacts')
        .insert({
          supervisor_id: user.id,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          company_name: input.company_name ?? null,
          notes: input.notes ?? null,
          source: input.source ?? 'manual',
          recent_project_id: input.recent_project_id ?? null,
          recent_project_date: input.recent_project_id ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      set((state) => ({
        contacts: [data, ...state.contacts],
        loading: false,
      }));

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add contact';
      set({ error: message, loading: false });
      throw error;
    }
  },

  removeContact: async (contactId) => {
    set({ loading: true, error: null });

    try {
      const { error } = await supabase
        .from('supervisor_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      // Remove from local state
      set((state) => ({
        contacts: state.contacts.filter((c) => c.id !== contactId),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove contact';
      set({ error: message, loading: false });
    }
  },

  // ============================================================================
  // Daily Log Actions
  // ============================================================================

  fetchDailyLogs: async (projectId, date) => {
    set({ loading: true, error: null });

    try {
      let query = supabase
        .from('project_daily_logs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      // Filter by date if provided
      if (date) {
        query = query.eq('log_date', date);
      }

      const { data, error } = await query;

      if (error) throw error;

      set({ dailyLogs: data ?? [], loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch daily logs';
      set({ error: message, loading: false });
    }
  },

  addDailyLog: async (input) => {
    set({ loading: true, error: null });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Use today's date if not provided
      const logDate = input.log_date ?? new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('project_daily_logs')
        .insert({
          project_id: input.project_id,
          log_date: logDate,
          log_type: input.log_type,
          content: input.content,
          metadata: input.metadata ?? {},
          status: input.status ?? 'active',
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      set((state) => ({
        dailyLogs: [data, ...state.dailyLogs],
        loading: false,
      }));

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add daily log';
      set({ error: message, loading: false });
      return null;
    }
  },

  updateDailyLog: async (logId, input) => {
    set({ loading: true, error: null });

    try {
      const updateData: Record<string, unknown> = {};
      
      if (input.content !== undefined) updateData.content = input.content;
      if (input.metadata !== undefined) updateData.metadata = input.metadata;
      if (input.status !== undefined) updateData.status = input.status;

      const { error } = await supabase
        .from('project_daily_logs')
        .update(updateData)
        .eq('id', logId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        dailyLogs: state.dailyLogs.map((log) =>
          log.id === logId ? { ...log, ...updateData } as ProjectDailyLog : log
        ),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update daily log';
      set({ error: message, loading: false });
    }
  },

  deleteDailyLog: async (logId) => {
    set({ loading: true, error: null });

    try {
      const { error } = await supabase
        .from('project_daily_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;

      // Remove from local state
      set((state) => ({
        dailyLogs: state.dailyLogs.filter((log) => log.id !== logId),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete daily log';
      set({ error: message, loading: false });
    }
  },

  toggleSiteIssueStatus: async (logId, newStatus) => {
    set({ loading: true, error: null });

    try {
      const { error } = await supabase
        .from('project_daily_logs')
        .update({ status: newStatus })
        .eq('id', logId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        dailyLogs: state.dailyLogs.map((log) =>
          log.id === logId ? { ...log, status: newStatus } : log
        ),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update site issue status';
      set({ error: message, loading: false });
    }
  },

  getDailyLogsByDate: (date) => {
    return get().dailyLogs.filter((log) => log.log_date === date);
  },

  getDailyLogsByType: (date, logType) => {
    return get().dailyLogs.filter(
      (log) => log.log_date === date && log.log_type === logType
    );
  },

  getOpenSiteIssues: () => {
    return get().dailyLogs.filter(
      (log) => log.log_type === 'site_issue' && log.status !== 'resolved'
    );
  },

  // ============================================================================
  // PDR (Project Daily Report) Actions
  // ============================================================================

  fetchDailyReports: async (projectId) => {
    set({ loading: true, error: null });

    try {
      const { data, error } = await supabase
        .from('project_daily_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('report_date', { ascending: false });

      if (error) throw error;

      set({ dailyReports: data ?? [], loading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch daily reports';
      set({ error: message, loading: false });
    }
  },

  generateDailyReport: async (input) => {
    set({ loading: true, error: null });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('project_daily_reports')
        .insert({
          project_id: input.project_id,
          report_date: input.report_date,
          weather: input.weather ?? {},
          summary_notes: input.summary_notes ?? null,
          generated_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      set((state) => ({
        dailyReports: [data, ...state.dailyReports],
        loading: false,
      }));

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate daily report';
      set({ error: message, loading: false });
      return null;
    }
  },

  updateDailyReport: async (reportId, weather, summaryNotes) => {
    set({ loading: true, error: null });

    try {
      const updateData: Record<string, unknown> = {};
      
      if (weather !== undefined) updateData.weather = weather;
      if (summaryNotes !== undefined) updateData.summary_notes = summaryNotes;

      const { error } = await supabase
        .from('project_daily_reports')
        .update(updateData)
        .eq('id', reportId);

      if (error) throw error;

      // Update local state
      set((state) => ({
        dailyReports: state.dailyReports.map((report) =>
          report.id === reportId ? { ...report, ...updateData } as ProjectDailyReport : report
        ),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update daily report';
      set({ error: message, loading: false });
    }
  },

  deleteDailyReport: async (reportId) => {
    set({ loading: true, error: null });

    try {
      const { error } = await supabase
        .from('project_daily_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      // Remove from local state
      set((state) => ({
        dailyReports: state.dailyReports.filter((report) => report.id !== reportId),
        loading: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete daily report';
      set({ error: message, loading: false });
    }
  },

  getDailyReportByDate: (date) => {
    return get().dailyReports.find((report) => report.report_date === date);
  },

  // ============================================================================
  // Utilities
  // ============================================================================

  clearError: () => set({ error: null }),

  generateProcessingEmail: (projectName: string) => {
    // Convert project name to URL-safe slug
    const slug = projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 30); // Limit length

    // Add random suffix to ensure uniqueness
    const randomSuffix = Math.random().toString(36).substring(2, 6);

    return `${slug}-${randomSuffix}@intake.hrdhat.site`;
  },
}));
