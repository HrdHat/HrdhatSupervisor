# HrdHat Supervisor - Features

**Last Updated:** 2026-01-13  
**Status:** Active Development

---

## Core Features

### 1. Project Management

**Status:** ✅ Complete

Supervisors can create and manage construction projects (sites).

| Feature | Status | Notes |
|---------|--------|-------|
| Create project | ✅ | With name and site address |
| Setup wizard | ✅ | Select form types during creation |
| Auto-generate processing email | ✅ | `{slug}@intake.hrdhat.site` |
| View project list | ✅ | Dashboard with stats |
| Archive/deactivate project | ⏳ | Planned |

**Usage:**
1. Navigate to Projects page
2. Click "Create New Project"
3. Enter project name and address
4. Select form types to create folders
5. Project created with unique intake email

---

### 2. Folder Management

**Status:** ✅ Complete

Organize documents into categorized folders.

| Feature | Status | Notes |
|---------|--------|-------|
| Create folder | ✅ | Custom name and description |
| Preset folders | ✅ | FLRA, Hot Work, Equipment, etc. |
| AI classification hints | ✅ | Help AI route documents |
| Folder colors | ✅ | Visual differentiation |
| Delete folder | ⏳ | Needs implementation |
| Rename folder | ⏳ | Planned |

**Preset Form Types:**
- FLRA (Field Level Risk Assessment)
- Hot Work Permit
- Equipment Inspection
- Confined Space Entry
- Daily Safety Report
- Incident Report
- Excavation Permit
- Lockout/Tagout

---

### 3. Worker Management

**Status:** ✅ Complete

Assign workers to projects.

| Feature | Status | Notes |
|---------|--------|-------|
| Add worker by email | ✅ | Must have HrdHat account |
| View workers list | ✅ | With status badges |
| Remove worker | ✅ | Soft delete (status = 'removed') |
| Pending invitations | ⏳ | Future: email invites |

**Limitations:**
- Worker must already have a HrdHat account
- No email invitation system yet
- Workers don't receive notifications

---

### 4. Document Management

**Status:** 🚧 In Progress

View and manage AI-processed documents.

| Feature | Status | Notes |
|---------|--------|-------|
| Email intake | ✅ | SendGrid → Edge Function |
| AI classification | ✅ | Gemini 2.5 Flash |
| Auto-filing (high confidence) | ✅ | ≥70% confidence |
| View documents by folder | 🚧 | **IN PROGRESS** |
| View unsorted documents | 🚧 | **IN PROGRESS** |
| Move document to folder | 🚧 | **IN PROGRESS** |
| Delete/reject document | 🚧 | **IN PROGRESS** |
| Preview document | ⏳ | Planned |
| Download document | ⏳ | Planned |

---

## Document Intake Pipeline

### How It Works

```
1. Worker fills out form in HrdHat app
2. Worker generates PDF and emails to project address
3. SendGrid receives email, triggers webhook
4. Edge Function (process-incoming-email):
   a. Extract attachments
   b. Store in Supabase Storage
   c. Send to Gemini AI for classification
   d. Create received_documents record
5. Result:
   - High confidence (≥70%): Auto-filed to matching folder
   - Low confidence (<70%): Marked as "needs_review"
6. Supervisor reviews unsorted documents in dashboard
```

### AI Classification

The AI analyzes documents and returns:

```json
{
  "classification": "FLRA",
  "confidence": 95,
  "extractedData": {
    "date": "2026-01-13",
    "workerName": "John Smith",
    "hazards": ["Working at height", "Hot work nearby"]
  },
  "summary": "FLRA form completed by John Smith for roofing work..."
}
```

### Status Flow

```
pending → processing → filed (success)
                    → needs_review (low confidence)
                    → rejected (supervisor action)
```

---

## UI/UX Features

### Tab-Based Navigation

The Documents view uses tabs for mobile-friendly navigation:

```
┌──────────────────────────────────────────────────┐
│  📁 Unsorted (3)  │  FLRA  │  Hot Work  │  ...  │
├──────────────────────────────────────────────────┤
│                                                  │
│  Document cards appear here                      │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Document Card

Each document shows:
- 📄 Filename
- 📧 Sender email
- 📅 Received date
- 🤖 AI classification + confidence
- 📝 AI summary (expandable)
- ⚡ Actions: Move | Delete | Preview

### Color Coding

- 🟢 `filed` - Green badge
- 🟡 `needs_review` - Yellow badge  
- 🔴 `rejected` - Red badge
- ⚪ `pending` - Gray badge

---

## Planned Features

### Phase 2
- [ ] Document preview modal (PDF viewer)
- [ ] Bulk move/delete operations
- [ ] Search across all documents
- [ ] Filter by date range

### Phase 3
- [ ] Push notifications for new documents
- [ ] Mobile app (React Native)
- [ ] Export to CSV/Excel
- [ ] Dashboard analytics

### Phase 4
- [ ] Worker invitation emails
- [ ] Multi-supervisor projects
- [ ] Custom form templates per project
- [ ] Audit log for document changes
