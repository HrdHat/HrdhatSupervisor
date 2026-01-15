# HrdHat Supervisor - Database Schema

**Last Updated:** 2026-01-13  
**Migration:** `005_supervisor_extension.sql`  
**Status:** Applied to Development (ybonzpfwdcyxbzxkyeji)

---

## Overview

The Supervisor extension adds 4 new tables to support project management, worker assignment, and AI document processing.

## Entity Relationship Diagram

```
┌─────────────────────┐       ┌─────────────────────┐
│   supervisor_       │       │    project_         │
│   projects          │◄──────│    workers          │
├─────────────────────┤  1:N  ├─────────────────────┤
│ id (PK)             │       │ id (PK)             │
│ supervisor_id (FK)  │       │ project_id (FK)     │
│ name                │       │ user_id (FK)        │
│ site_address        │       │ added_by (FK)       │
│ processing_email    │       │ added_at            │
│ is_active           │       │ status              │
│ created_at          │       └─────────────────────┘
│ updated_at          │
└──────────┬──────────┘
           │
           │ 1:N
           ▼
┌─────────────────────┐       ┌─────────────────────┐
│    project_         │       │    received_        │
│    folders          │◄──────│    documents        │
├─────────────────────┤  1:N  ├─────────────────────┤
│ id (PK)             │       │ id (PK)             │
│ project_id (FK)     │       │ project_id (FK)     │
│ folder_name         │       │ folder_id (FK)      │
│ description         │       │ original_filename   │
│ ai_classification   │       │ storage_path        │
│ _hint               │       │ source_email        │
│ color               │       │ ai_classification   │
│ sort_order          │       │ ai_extracted_data   │
│ created_at          │       │ ai_summary          │
└─────────────────────┘       │ confidence_score    │
                              │ status              │
                              │ received_at         │
                              └─────────────────────┘
```

## Tables

### 1. supervisor_projects

Construction sites/projects managed by supervisors.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, default gen_random_uuid() | Primary key |
| `supervisor_id` | UUID | FK → auth.users, NOT NULL | Owner supervisor |
| `name` | TEXT | NOT NULL, CHECK length > 0 | Project name |
| `site_address` | TEXT | nullable | Physical address |
| `processing_email` | TEXT | UNIQUE, nullable | Email for document intake |
| `is_active` | BOOLEAN | default true | Active/inactive status |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default now() | Last update (trigger) |

**RLS Policies:**
- `supervisor_own_projects_select` - Supervisors see only their projects
- `supervisor_own_projects_insert/update/delete` - Full CRUD for own projects
- `worker_view_assigned_projects` - Workers see projects they're assigned to

---

### 2. project_folders

Categories for organizing forms within a project.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `project_id` | UUID | FK → supervisor_projects, NOT NULL | Parent project |
| `folder_name` | TEXT | NOT NULL, CHECK length > 0 | Display name |
| `description` | TEXT | nullable | User description |
| `ai_classification_hint` | TEXT | nullable | Keywords for AI routing |
| `color` | TEXT | default '#6B7280' | UI badge color (hex) |
| `sort_order` | INTEGER | default 0 | Display order |
| `created_at` | TIMESTAMPTZ | default now() | Creation timestamp |

**Constraints:**
- UNIQUE(project_id, folder_name) - No duplicate folder names per project

**RLS Policies:**
- `supervisor_manage_folders` - Supervisors can CRUD folders in their projects
- `worker_view_folders` - Workers can view folders in assigned projects

---

### 3. project_workers

Links workers to supervisor projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `project_id` | UUID | FK → supervisor_projects, NOT NULL | Parent project |
| `user_id` | UUID | FK → auth.users, NOT NULL | Worker user |
| `added_by` | UUID | FK → auth.users, NOT NULL | Who added this worker |
| `added_at` | TIMESTAMPTZ | default now() | When added |
| `status` | TEXT | CHECK IN ('active', 'removed', 'pending') | Worker status |

**Constraints:**
- UNIQUE(project_id, user_id) - Each worker only once per project

**Status Values:**
- `active` - Can submit forms to this project
- `removed` - Soft-deleted from project
- `pending` - Invited but not confirmed

---

### 4. received_documents

Documents received via email intake, processed by AI.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Primary key |
| `project_id` | UUID | FK → supervisor_projects, NOT NULL | Parent project |
| `folder_id` | UUID | FK → project_folders, nullable | Destination folder (null = unsorted) |
| `original_filename` | TEXT | nullable | Original file name |
| `storage_path` | TEXT | NOT NULL, CHECK length > 0 | Supabase Storage path |
| `file_size` | INTEGER | nullable | File size in bytes |
| `mime_type` | TEXT | nullable | Content type |
| `source_email` | TEXT | nullable | Sender email address |
| `email_subject` | TEXT | nullable | Email subject line |
| `ai_classification` | TEXT | nullable | AI-determined document type |
| `ai_extracted_data` | JSONB | default '{}' | Structured data from AI |
| `ai_summary` | TEXT | nullable | AI-generated summary |
| `confidence_score` | INTEGER | CHECK 0-100 | AI confidence percentage |
| `status` | TEXT | CHECK IN (...), default 'pending' | Processing status |
| `reviewed_by` | UUID | FK → auth.users, nullable | Manual reviewer |
| `reviewed_at` | TIMESTAMPTZ | nullable | Manual review timestamp |
| `rejection_reason` | TEXT | nullable | Reason if rejected |
| `received_at` | TIMESTAMPTZ | default now() | When document arrived |
| `processed_at` | TIMESTAMPTZ | nullable | When AI processing completed |

**Status Values:**
- `pending` - Awaiting AI processing
- `processing` - AI is currently working
- `filed` - Successfully classified and filed to folder
- `needs_review` - Low confidence, requires manual review
- `rejected` - Supervisor rejected the document

---

## Indexes

```sql
-- Performance indexes for common queries
CREATE INDEX idx_supervisor_projects_supervisor_id ON supervisor_projects(supervisor_id);
CREATE INDEX idx_project_workers_project_id ON project_workers(project_id);
CREATE INDEX idx_project_workers_user_id ON project_workers(user_id);
CREATE INDEX idx_project_folders_project_id ON project_folders(project_id);
CREATE INDEX idx_received_documents_project_id ON received_documents(project_id);
CREATE INDEX idx_received_documents_folder_id ON received_documents(folder_id);
CREATE INDEX idx_received_documents_status ON received_documents(status);
CREATE INDEX idx_received_documents_received_at ON received_documents(received_at DESC);
```

---

## Common Queries

### Get all projects for current supervisor
```sql
SELECT * FROM supervisor_projects
WHERE supervisor_id = auth.uid()
ORDER BY created_at DESC;
```

### Get folders with document counts
```sql
SELECT 
  pf.*,
  COUNT(rd.id) as document_count
FROM project_folders pf
LEFT JOIN received_documents rd ON rd.folder_id = pf.id
WHERE pf.project_id = $1
GROUP BY pf.id
ORDER BY pf.sort_order;
```

### Get "unsorted" documents (virtual folder)
```sql
SELECT * FROM received_documents
WHERE project_id = $1
AND folder_id IS NULL
AND status IN ('needs_review', 'pending')
ORDER BY received_at DESC;
```

### Move document to folder
```sql
UPDATE received_documents
SET 
  folder_id = $2,
  status = 'filed',
  reviewed_by = auth.uid(),
  reviewed_at = now()
WHERE id = $1;
```

---

## Migration History

| Version | Name | Date Applied | Notes |
|---------|------|--------------|-------|
| 005 | supervisor_extension | 2026-01-12 | Initial supervisor tables |
