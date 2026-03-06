# Project Structure: will-done

## Project Introduction
**will-done** is a desktop productivity and task management application designed to help users manage their daily workflows, routines, and retrospectives. It leverages a modern tech stack to provide a fast, native-feeling desktop experience with a timeline-centric workspace.

## Directory Structure
```text
/Users/jwhy/dev/git/will-done/
├── .gemini/                    # AI Agent configuration and documentation
│   └── docs/                   # Foundation documentation (STRUCTURE, DOCUMENT)
├── .github/                    # CI/CD workflows (release.yml)
├── .sisyphus/                  # Internal notes and execution history
├── public/                     # Static assets
├── src/                        # Frontend: React (TypeScript) + Tailwind CSS
│   ├── assets/                 # Image and SVG assets
│   ├── components/             # UI Components
│   │   ├── layout/             # MainLayout, PrimarySidebar
│   │   ├── settings/           # Workspace and Global settings modals
│   │   └── ui/                 # Reusable shadcn/ui components
│   ├── features/               # Feature-based modules
│   │   ├── onboarding/         # Onboarding flow
│   │   ├── retrospective/      # Daily/Weekly retrospective views
│   │   └── workspace/          # Core timeline and task management logic
│   ├── hooks/                  # Global React hooks
│   ├── lib/                    # Shared utilities (i18n, tailwind-merge)
│   ├── providers/              # React Context providers (App, Toast, Updater)
│   └── types/                  # TypeScript interface definitions
├── src-tauri/                  # Backend: Rust + Tauri
│   ├── capabilities/           # Tauri security configuration
│   ├── gen/                    # Generated files (schemas)
│   ├── icons/                  # Application icons
│   ├── src/                    # Rust source code
│   │   ├── commands/           # Tauri command handlers (API layer)
│   │   ├── database/           # SQLite (rusqlite/sqlx) persistence layer
│   │   ├── error.rs            # Custom error types
│   │   ├── lib.rs              # Library entry point
│   │   ├── main.rs             # Application entry point
│   │   └── models.rs           # Shared Rust data models
│   ├── Cargo.toml              # Rust dependencies and metadata
│   └── tauri.conf.json         # Tauri configuration
├── components.json             # shadcn/ui configuration
├── package.json                # Frontend dependencies and scripts
├── tailwind.config.js          # Tailwind CSS configuration
└── tsconfig.json               # TypeScript configuration
```

## Testing and Build Verification
### Frontend (React/Vite)
- **Build Verification**: `npm run build` or `vite build`
- **Linting**: `npm run lint`
- **Type Checking**: `npx tsc --noEmit`

### Backend (Rust/Tauri)
- **Unit Tests**: `cargo test` inside `src-tauri/`
- **Compilation Check**: `cargo check`
- **Tauri Dev**: `npm run tauri dev`
- **Tauri Build**: `npm run tauri build`

## Key Roles
- **src-tauri/src/database/**: Manages the SQLite schema and all CRUD operations for tasks, retrospectives, and user data.
- **src-tauri/src/commands/**: Serves as the bridge between the React frontend and Rust backend.
- **src/features/workspace/**: The core logic for the interactive timeline and drag-and-drop task management.
