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
    set({ currentProject: project, folders: [], workers: [], subcontractors: [], documents: [] });
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

    try {
      // First, find the user by email
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', userEmail)
        .single();

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
