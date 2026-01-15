# HrdHat Supervisor - Architecture

**Last Updated:** 2026-01-13  
**Status:** Active Development

---

## Overview

HrdHat Supervisor is a separate React application that provides supervisors with a dashboard to manage construction projects, review AI-classified documents, and oversee worker form submissions.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HrdHat Supervisor Architecture                        │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │   Supervisor    │
                              │   (Browser)     │
                              └────────┬────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────┐
                    │       HrdHat Supervisor App      │
                    │         (React + Vite)           │
                    ├──────────────────────────────────┤
                    │  ┌─────────┐  ┌───────────────┐  │
                    │  │ Router  │  │    Stores     │  │
                    │  │ (v6)    │  │   (Zustand)   │  │
                    │  └─────────┘  └───────────────┘  │
                    │  ┌─────────────────────────────┐ │
                    │  │        UI Components        │ │
                    │  │     (Tailwind CSS v4)       │ │
                    │  └─────────────────────────────┘ │
                    └──────────────────┬───────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────┐
                    │         Supabase Backend         │
                    ├──────────────────────────────────┤
                    │  ┌──────────────┐ ┌───────────┐  │
                    │  │   Postgres   │ │  Storage  │  │
                    │  │   Database   │ │  (Files)  │  │
                    │  └──────────────┘ └───────────┘  │
                    │  ┌──────────────┐ ┌───────────┐  │
                    │  │     Auth     │ │   Edge    │  │
                    │  │   (Users)    │ │ Functions │  │
                    │  └──────────────┘ └───────────┘  │
                    └──────────────────────────────────┘
```

## Data Flow

### 1. Document Intake Flow

```
┌─────────┐    ┌──────────┐    ┌─────────────────┐    ┌──────────────┐
│ Worker  │───►│  Email   │───►│ Edge Function   │───►│  Database    │
│  sends  │    │ SendGrid │    │ process-email   │    │  Storage     │
│  email  │    │          │    │ + Gemini AI     │    │              │
└─────────┘    └──────────┘    └─────────────────┘    └──────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ Classification  │
                              │  Result:        │
                              │  • High (≥70%)  │──► Auto-file to folder
                              │  • Low (<70%)   │──► "Unsorted" for review
                              └─────────────────┘
```

### 2. Supervisor Review Flow

```
┌──────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Supervisor  │───►│  View Unsorted  │───►│  Move Document  │
│  Dashboard   │    │   Documents     │    │   to Folder     │
└──────────────┘    └─────────────────┘    └─────────────────┘
                                                    │
                                                    ▼
                                           ┌─────────────────┐
                                           │ Update Database │
                                           │  folder_id +    │
                                           │  status='filed' │
                                           └─────────────────┘
```

## Component Architecture

### Route Structure

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `Dashboard.tsx` | Home with overview stats |
| `/login` | `Login.tsx` | Supabase authentication |
| `/projects` | `Projects.tsx` | List all supervisor projects |
| `/projects/:projectId` | `ProjectDetail.tsx` | Single project management |

### State Management (Zustand)

```typescript
// authStore.ts
{
  user: User | null,
  loading: boolean,
  initialize(): void,
  login(email, password): Promise<void>,
  logout(): void
}

// supervisorStore.ts
{
  projects: SupervisorProject[],
  folders: ProjectFolder[],
  workers: ProjectWorker[],
  documents: ReceivedDocument[],
  
  // Project actions
  fetchProjects(): Promise<void>,
  createProject(input): Promise<void>,
  
  // Folder actions
  fetchFolders(projectId): Promise<void>,
  createFolder(input): Promise<void>,
  
  // Worker actions
  fetchWorkers(projectId): Promise<void>,
  addWorker(projectId, email): Promise<void>,
  
  // Document actions
  fetchDocuments(projectId): Promise<void>,
  moveDocument(docId, folderId): Promise<void>,
  deleteDocument(docId, reason): Promise<void>
}
```

## Security Model

### Row Level Security (RLS)

All database queries are protected by RLS policies:

```sql
-- Supervisors can only see their own projects
CREATE POLICY supervisor_own_projects ON supervisor_projects
  FOR SELECT USING (supervisor_id = auth.uid());

-- Supervisors can manage documents in their projects
CREATE POLICY supervisor_manage_documents ON received_documents
  FOR ALL USING (
    project_id IN (
      SELECT id FROM supervisor_projects 
      WHERE supervisor_id = auth.uid()
    )
  );
```

### Authentication Flow

1. User logs in via Supabase Auth
2. Auth token stored in browser
3. All Supabase queries include auth token
4. RLS policies filter data based on `auth.uid()`

## File Storage

Documents are stored in Supabase Storage:

```
document-intake/           # Bucket
├── {project-id}/          # Project folder
│   ├── {timestamp}-{filename}.pdf
│   └── {timestamp}-{filename}.jpg
```

Storage path is stored in `received_documents.storage_path`.

## Key Design Decisions

### 1. Virtual "Unsorted" Folder

Instead of creating a physical "Unsorted" folder per project, we use a virtual approach:
- Documents with `folder_id = null` AND `status = 'needs_review'` appear in "Unsorted"
- Simpler database design
- No folder clutter
- Easy to query

### 2. Tab-Based UI (Mobile-First)

Documents view uses tabs for folder navigation:
- Better for mobile touch interactions
- Reduces sidebar complexity
- Each folder = one tab
- "Unsorted" = special tab with badge count

### 3. Shared Supabase Project

Both HrdHat Frontend and Supervisor share the same Supabase project:
- Single source of truth for data
- Workers' forms visible to supervisors
- Consistent authentication
- Reduced infrastructure costs

## Future Considerations

- [ ] Push notifications for new documents
- [ ] Bulk document operations
- [ ] Document search across folders
- [ ] Export/download multiple documents
- [ ] Mobile native app (React Native)
