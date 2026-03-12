# Project Structure: will-done

## OVERVIEW
`will-done` is a high-performance desktop productivity application built with **Tauri 2**, **Rust**, and **React 19**. It implements a unique "Timeline" task management system that categorizes tasks into **NOW** (currently active), **WILL** (scheduled), and **DONE** (completed).

### Core Tech Stack
- **Frontend**: React 19 (TypeScript), Vite, Tailwind CSS, shadcn/ui, Framer Motion.
- **Backend**: Tauri 2, Rust, SQLite (via `sqlx`), Tokio (async runtime).
- **State Management**: React Hooks (Custom hooks for features) + Context Providers.
- **AI Integration**: Gemini API for automated daily/weekly retrospectives.
- **Interactions**: `@dnd-kit` for complex timeline drag-and-drop operations.

---

## STRUCTURE
```text
/
├── .gemini/                # AI Agent documentation and context
│   └── docs/
│       ├── STRUCTURE.md    # This file (Project Knowledge Base)
│       ├── DOCUMENT.md     # Architecture & Planning history
│       └── PLANNING.md     # Current execution plans
├── src/                    # Frontend (React + TypeScript)
│   ├── assets/             # Static assets (SVGs, etc.)
│   ├── components/         # Reusable UI & Layout
│   │   ├── layout/         # App-wide layout (Sidebar, MainLayout)
│   │   └── ui/             # shadcn/ui primitive components
│   ├── features/           # Feature-based modular logic
│   │   ├── onboarding/     # First-run experience
│   │   ├── retrospective/  # AI-powered review system
│   │   ├── settings/       # Global application settings
│   │   └── workspace/      # Core timeline & task management
│   ├── hooks/              # Global custom hooks (useApp, useDebounce)
│   ├── lib/                # Utilities (i18n, tailwind-merge)
│   ├── providers/          # React Context providers (Toast, App)
│   ├── types/              # Global TypeScript interfaces
│   ├── App.tsx             # Main View Switcher & Modal Container
│   └── main.tsx            # React Entry point
├── src-tauri/              # Backend (Rust)
│   ├── src/
│   │   ├── commands/       # Tauri Invoke handlers (API Layer)
│   │   ├── database/       # SQLite logic and SQL queries
│   │   ├── domain/         # Data models, Errors, and App State
│   │   ├── main.rs         # Binary entry point
│   │   └── lib.rs          # Core logic, Migrations, and Plugins
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
└── package.json            # Frontend dependencies & scripts
```

---

## WHERE TO LOOK
| Task / Workflow | File Path |
|:--- |:--- |
| **Database Schema/Migrations** | `src-tauri/src/lib.rs` (Setup block) |
| **Backend CRUD Logic** | `src-tauri/src/database/` |
| **Tauri API Endpoints** | `src-tauri/src/commands/` |
| **Global UI State** | `src/hooks/useApp.ts` |
| **Timeline Business Logic** | `src/features/workspace/hooks/useWorkspace.ts` |
| **Task Reordering Logic** | `src-tauri/src/database/timeline.rs` |
| **AI Retrospective Logic** | `src-tauri/src/commands/retrospective.rs` |
| **I18n / Translations** | `src/lib/i18n.ts` |

---

## CODE MAP
| Symbol | Type | Location | Description |
|:--- |:--- |:--- |:--- |
| `DbState` | Struct (Rust) | `src-tauri/src/domain/mod.rs` | Holds the SQLite connection pool. |
| `useApp` | Hook (TS) | `src/hooks/useApp.ts` | Orchestrates main data fetching, navigation, and Dnd handlers. |
| `useWorkspace` | Hook (TS) | `src/features/workspace/hooks/useWorkspace.ts` | Manages local workspace UI state, forms, and progress. |
| `WorkspaceView` | Component | `src/features/workspace/WorkspaceView.tsx` | The primary task management interface. |
| `TimeBlock` | Interface | `src/types/index.ts` | Core domain model for a task in the timeline. |
| `process_task_transition` | Command | `src-tauri/src/commands/timeline.rs` | Backend logic for moving tasks between NOW/WILL/DONE. |

---

## CONVENTIONS (THIS PROJECT)
1. **Surgical Separation**: Frontend and Backend are decoupled. Use Tauri commands as a clean API layer.
2. **Feature Modularity**: New functionality should be placed in `src/features/{feature_name}`.
3. **Frontend Architecture (3-Layer)**:
   - **Layer 1: View**: Pure presentational components (`components/`). Max 150 lines. No `invoke`.
   - **Layer 2: Hook**: Feature logic and state (`hooks/`).
   - **Layer 3: API**: IPC wrappers (`api/`).
4. **Rust TDD**: Write `#[test]` in Rust modules for complex logic (especially timeline calculations) before exposing as commands.
4. **Zod Validation**: All forms must use Zod schemas for runtime type safety.
5. **Dnd Constraints**: Timeline operations must respect logical day boundaries (configured in user settings).

---

## ANTI-PATTERNS / TECH DEBT
- **Hardcoded Migrations**: SQLite table creation/alteration is currently in `src-tauri/src/lib.rs`. Needs migration to `sqlx-migrations` or a dedicated module.
- **Large App.tsx**: `AppContent` handles too many modals and views; needs further decomposition.
- **CSP**: Content Security Policy is currently `null` in `tauri.conf.json`.

---

## COMMANDS
- **Run Development**: `npm run tauri dev`
- **Build Production**: `npm run tauri build`
- **Frontend Tests**: `npm run test`
- **Backend Tests**: `cargo test`
- **Lint/Format**: `npm run build` (runs tsc)

---

## NOTES
- The application uses a "Logical Day" concept (e.g., day starts at 04:00 AM) to handle late-night productivity sessions correctly.
- Database seeding and clearing in Dev mode can be triggered via CLI args `init` or `clear`.
