# Project Structure & Knowledge Base

## OVERVIEW
**will-done** is a desktop application designed for daily planning and retrospectives. It helps users manage their time through time-blocking, AI-powered retrospective analysis (using Gemini), and workspace-based organization.

- **Domain**: Productivity, Time Management, AI-assisted Reflection.
- **Tech Stack**:
  - **Frontend**: React (TypeScript), Vite, Tailwind CSS, shadcn/ui, Framer Motion, dnd-kit.
  - **Backend**: Tauri (Rust), SQLite (sqlx), tokio.
  - **AI**: Google Gemini API for retrospective generation.

---

## STRUCTURE
```text
/
├── .gemini/               # AI-related documentation and configuration
│   └── docs/              # Structured project knowledge base
├── src/                   # React Frontend
│   ├── assets/            # Static assets
│   ├── components/        # Shared UI components
│   │   ├── layout/        # MainLayout, Sidebar
│   │   ├── settings/      # Settings modals and tabs
│   │   └── ui/            # shadcn/ui base components
│   ├── features/          # Feature-based modules
│   │   ├── onboarding/    # First-run experience
│   │   ├── retrospective/ # AI retrospective views
│   │   └── workspace/     # Main timeline and task management
│   ├── hooks/             # Global React hooks (useApp, etc.)
│   ├── lib/               # Utilities (i18n, common utils)
│   ├── providers/         # Context providers (Toast, App, Updater)
│   └── types/             # TypeScript interfaces and types
├── src-tauri/             # Rust Backend
│   ├── src/
│   │   ├── commands/      # Tauri command handlers (API layer)
│   │   ├── database/      # SQLite access and migrations
│   │   ├── error.rs       # Custom error types
│   │   ├── lib.rs         # Tauri setup and database initialization
│   │   ├── main.rs        # Binary entry point
│   │   └── models.rs      # Shared data structures (Rust)
│   ├── tauri.conf.json    # Tauri configuration
│   └── Cargo.toml         # Rust dependencies
├── package.json           # Frontend dependencies and scripts
└── tailwind.config.js     # Tailwind CSS configuration
```

---

## WHERE TO LOOK
| Task / Workflow | Exact File Path |
| :--- | :--- |
| **Database Schema/Migrations** | `src-tauri/src/lib.rs` (Hardcoded migrations) |
| **Database CRUD Operations** | `src-tauri/src/database/*.rs` |
| **Tauri Command Handlers** | `src-tauri/src/commands/*.rs` |
| **Frontend State Management** | `src/hooks/useApp.ts` |
| **Main UI Layout** | `src/components/layout/MainLayout.tsx` |
| **Timeline & Task Logic** | `src/features/workspace/WorkspaceView.tsx` |
| **AI Retrospective Logic** | `src-tauri/src/commands/retrospective.rs` |
| **i18n / Localizations** | `src/lib/i18n.ts` |
| **Drag and Drop Logic** | `src/features/workspace/utils/dndValidation.ts` |

---

## CODE MAP
| Symbol | Type | Location |
| :--- | :--- | :--- |
| `User` | Struct/Interface | `src-tauri/src/models.rs`, `src/types/index.ts` |
| `Workspace` | Struct/Interface | `src-tauri/src/models.rs`, `src/types/index.ts` |
| `TimeBlock` | Struct/Interface | `src-tauri/src/models.rs`, `src/types/index.ts` |
| `Task` | Struct/Interface | `src-tauri/src/models.rs`, `src/types/index.ts` |
| `DbState` | Struct | `src-tauri/src/models.rs` (Holds DB Pool) |
| `useApp` | Hook | `src/hooks/useApp.ts` (Core app controller) |
| `useWorkspace` | Hook | `src/features/workspace/hooks/useWorkspace.ts` |
| `AppProvider` | Component | `src/providers/AppProvider.tsx` |

---

## CONVENTIONS (THIS PROJECT)
- **Tauri Bridge**: Frontend uses `invoke` from `@tauri-apps/api/core` to call Rust commands.
- **Async SQLite**: Backend uses `sqlx` with `tokio` for non-blocking database operations.
- **Naming Bridge**: Rust structs use `#[serde(rename_all = "camelCase")]` to match TypeScript conventions.
- **Feature-First**: Components and logic are grouped by feature in `src/features/`.
- **Logical Date**: The application uses a "logical day" (starting at `day_start_time`, e.g., 04:00 AM) to handle late-night sessions as part of the previous day.
- **Styling**: Strict use of Tailwind CSS and shadcn/ui for consistent design.

---

## ANTI-PATTERNS / TECH DEBT
- **Hardcoded Migrations**: Database schema updates are hardcoded strings in `src-tauri/src/lib.rs` instead of using a migration tool or separate SQL files.
- **Error Suppression**: Several database queries in Rust use `.ok()` or `.unwrap()` instead of proper error propagation via `Result`.
- **Large Control Hook**: `useApp.ts` has grown significantly and handles state for navigation, drag-and-drop, notifications, and data fetching. Consider splitting into domain-specific hooks.
- **Implicit Dependency**: The frontend depends on the logical date calculation being consistent with the backend query logic.

---

## COMMANDS
- **Run in Development**: `npm run tauri dev`
- **Build Production**: `npm run tauri build`
- **Frontend Tests**: `npm test`
- **Backend Tests**: `cargo test`
- **Linting**: `npm run lint` (if configured)

---

## NOTES
- The project implements a custom Drag and Drop validation in `src/features/workspace/utils/dndValidation.ts` to prevent invalid timeline reordering.
- Notification handling is integrated with Tauri's notification plugin and listens for custom actions to open modals.
