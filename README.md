# HrdHat Supervisor

## 🎯 Overview

HrdHat Supervisor is a **companion web application** for supervisors to manage construction site documentation. It provides a dashboard for overseeing worker safety forms, managing project folders, and reviewing AI-classified documents received via email.

**This is NOT the main HrdHat worker app.** Workers use the HrdHat Frontend app to fill out safety forms. Supervisors use this app to:
- Create and manage construction projects
- Organize documents into folders (FLRA, Hot Work Permits, etc.)
- Review AI-processed documents sent via email
- Manually sort documents that couldn't be auto-classified
- Add/remove workers from projects

## 🔗 Relationship to Main HrdHat App

```
┌──────────────────────────────────────────────────────────────────────┐
│                         HrdHat Ecosystem                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────┐         ┌─────────────────────────────────┐ │
│  │  HrdHat Frontend    │         │  HrdHat Supervisor              │ │
│  │  (Worker App)       │         │  (Supervisor Dashboard)         │ │
│  ├─────────────────────┤         ├─────────────────────────────────┤ │
│  │ • Fill out forms    │         │ • Manage projects & folders     │ │
│  │ • Sign forms        │         │ • Review AI-sorted documents    │ │
│  │ • Generate PDFs     │         │ • Manually sort unsorted docs   │ │
│  │ • Email forms       │ ──────► │ • View worker forms             │ │
│  │ • View form history │         │ • Manage project workers        │ │
│  └─────────────────────┘         └─────────────────────────────────┘ │
│           │                                    │                      │
│           └────────────┬───────────────────────┘                      │
│                        ▼                                              │
│              ┌──────────────────────┐                                 │
│              │  Supabase Backend    │                                 │
│              │  (Shared Database)   │                                 │
│              ├──────────────────────┤                                 │
│              │ • form_instances     │                                 │
│              │ • supervisor_projects│                                 │
│              │ • project_folders    │                                 │
│              │ • received_documents │                                 │
│              │ • project_workers    │                                 │
│              └──────────────────────┘                                 │
│                        │                                              │
│                        ▼                                              │
│              ┌──────────────────────┐                                 │
│              │  Edge Functions      │                                 │
│              │  (AI Processing)     │                                 │
│              ├──────────────────────┤                                 │
│              │ • process-incoming   │                                 │
│              │   -email             │                                 │
│              │ • Gemini 2.5 Flash   │                                 │
│              │ • Auto-classification│                                 │
│              └──────────────────────┘                                 │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI Framework |
| Vite | Build Tool |
| TypeScript | Type Safety |
| React Router v6 | Navigation |
| Zustand | State Management |
| Tailwind CSS v4 | Styling |
| Supabase | Backend (shared with Frontend) |

## 📁 Project Structure

```
Hrdhat - Supervisor/
├── src/
│   ├── app/
│   │   ├── router.tsx          # Route definitions
│   │   └── routes/
│   │       ├── Dashboard.tsx   # Home dashboard
│   │       ├── Login.tsx       # Authentication
│   │       ├── Projects.tsx    # Project list
│   │       └── ProjectDetail.tsx # Single project view
│   │
│   ├── components/
│   │   └── ui/                 # Reusable UI components
│   │
│   ├── config/
│   │   └── supabaseClient.ts   # Supabase connection
│   │
│   ├── stores/
│   │   ├── authStore.ts        # Authentication state
│   │   └── supervisorStore.ts  # Project/folder/worker state
│   │
│   ├── types/
│   │   └── supervisor.ts       # TypeScript interfaces
│   │
│   ├── App.tsx                 # Root component
│   ├── main.tsx                # Entry point
│   └── index.css               # Tailwind imports
│
├── docs/                       # Documentation
│   ├── architecture.md         # System architecture
│   ├── database-schema.md      # Database tables
│   └── features.md             # Feature documentation
│
├── tailwind.config.js          # Tailwind configuration
├── vite.config.ts              # Vite configuration
└── package.json                # Dependencies
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Access to HrdHat Supabase project

### Installation

```bash
cd "Hrdhat - Supervisor"
npm install
```

### Environment Variables

Create a `.env` file (or use the existing one from Frontend):

```env
VITE_SUPABASE_URL=https://ybonzpfwdcyxbzxkyeji.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## 📊 Database Schema

The Supervisor app uses these tables (shared with main HrdHat backend):

| Table | Purpose |
|-------|---------|
| `supervisor_projects` | Construction sites managed by supervisors |
| `project_folders` | Document categories (FLRA, Hot Work, etc.) |
| `project_workers` | Workers assigned to projects |
| `received_documents` | AI-processed documents from email intake |
| `form_instances` | Worker-submitted forms (linked via project_id) |

See `docs/database-schema.md` for full schema details.

## 🤖 AI Document Processing

Documents are automatically classified using the email intake system:

1. **Worker emails form** → `{project-slug}@intake.hrdhat.site`
2. **SendGrid webhook** → triggers Edge Function
3. **Gemini 2.5 Flash** → classifies document type
4. **Auto-filing** → high confidence (≥70%) → filed to folder
5. **Manual review** → low confidence → stays in "Unsorted"

Supervisors can manually move unsorted documents to the correct folder.

## 🔐 Authentication & RLS

- Uses Supabase Auth (same as main Frontend)
- Row Level Security (RLS) ensures supervisors only see their own projects
- Workers can only see projects they're assigned to

## 📱 Mobile-First Design

- Responsive design with Tailwind CSS
- Tab-based navigation for folder views (mobile-friendly)
- Touch-optimized buttons and cards

## 🧑‍💻 Development Guidelines

1. **Styling**: Use Tailwind CSS exclusively (matches Frontend rules)
2. **State**: Use Zustand stores for all state management
3. **Types**: All data must have TypeScript interfaces
4. **Naming**: Follow kebab-case for files, PascalCase for components

See the main Frontend `docs/project-standards.md` for full guidelines.

## 📄 License

Proprietary - HrdHat

## 👥 Contributors

- HrdHat Development Team
