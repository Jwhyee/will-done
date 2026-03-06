# Project Planning and Architecture: will-done

## Architectural Overview
The **will-done** application follows a strictly decoupled architecture, separating the high-level UI concerns (React) from the low-level system operations and data persistence (Rust/Tauri/SQLite).

### 1. Core Architecture Principles
- **Clean Command Layer**: All interactions between the frontend and backend must go through a well-defined Tauri command API. Commands should focus on input validation and orchestration, while business logic should reside in dedicated Rust modules.
- **SQLite-First Persistence**: Data integrity is paramount. All core application state (tasks, settings, retrospectives) is persisted in a local SQLite database, using `rusqlite` or `sqlx` for structured access.
- **Feature-Based Frontend**: The React codebase is organized by business feature (e.g., `workspace`, `retrospective`) to minimize coupling and improve maintainability.
- **Atomic UI**: Using `shadcn/ui` for consistent, accessible primitives. Custom components should be built by composing these atoms.

### 2. Tech Stack Detail
- **Frontend**: React (with TypeScript), Vite, Tailwind CSS, shadcn/ui.
- **Backend**: Tauri (v2), Rust, SQLite.
- **State Management**: React Hooks and Context for local UI state; Tauri commands for persistent state.

### 3. Key Workflows
- **Task Lifecycle**: Created in `src/features/workspace`, persisted via `src-tauri/src/commands/workspace.rs` into the database.
- **Retrospective Cycle**: Daily/Weekly summaries are calculated in Rust (`src-tauri/src/database/retrospective.rs`) and presented in the `retrospective` feature view.

## Versioning Log
### v1.0.0 - 2026-03-06
- Initial project structure analysis and foundation documentation.
- Identified core tech stack: Tauri, Rust, React, SQLite.
- Mapped key directory roles and verification methods.
- Established mandatory AI Agent guidelines for project documentation.

### v1.1.0 - 2026-03-06
- Implemented TaskForm UI/UX revamp with floating modal and Framer Motion animations.
- Added `useOnClickOutside` hook for better interaction control.
- Implemented comprehensive unit tests for `TaskForm` using Vitest and RTL.
- Improved auto-focus and state preservation logic in the task creation flow.

### v1.1.1 - 2026-03-06
- Fixed TaskForm background visibility issue by changing from translucent `bg-surface/95` with blur to solid `bg-surface-elevated`.
- Enhanced floating UI separation with stronger borders and rings.

### v1.1.2 - 2026-03-06
- Improved Task Title Input visibility in expanded view with a distinct background (`bg-background`) and border (`border-zinc-700`).
- Ensured input styles revert to default when the form is collapsed to maintain a clean interface.
