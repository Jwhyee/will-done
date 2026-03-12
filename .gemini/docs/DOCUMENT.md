# Project Planning and Architecture: will-done

## v1.0.0 - 2025-03-08 (Initialization)

### Architecture Overview
The `will-done` project follows a **Modular Monolith** pattern on the backend and a **Feature-based Component Architecture** on the frontend. The system is designed to provide a low-latency, desktop-first experience for time-sensitive task management.

#### 1. Backend: Tauri/Rust/SQLite
- **API Layer**: Tauri `invoke` handlers are thin wrappers around database service functions.
- **Service Layer**: Logic for task scheduling, timeline reordering, and state transitions is implemented in pure Rust.
- **Persistence**: SQLite with `sqlx` provides a robust, ACID-compliant local database.
- **AI Engine**: Asynchronous interaction with Gemini models for analyzing task completion history and generating insights.

#### 2. Frontend: React/TypeScript
- **Atomic Components**: Basic UI primitives are managed via `shadcn/ui`.
- **Feature Modules**: Business logic is encapsulated within feature folders (`workspace`, `retrospective`), each containing its own components and hooks.
- **State Flow**: Unidirectional state management centered around the `useApp` hook, which acts as the primary synchronization point with the backend.

### Project Goals
1. Provide a seamless "Timeline" experience where tasks are automatically scheduled based on estimated durations and priority.
2. Enable data-driven self-improvement through AI-powered retrospectives.
3. Maintain zero-latency UI by performing heavy calculations (like timeline shifts) in the Rust backend.
4. Ensure privacy by keeping all task data in a local SQLite database.

### Core Domain Models
- **Workspace**: A container for a set of tasks, projects, and labels.
- **TimeBlock**: A discrete unit of time in the timeline, representing a task's scheduled window.
- **Task**: The abstract definition of work, which can be instantiated as one or more `TimeBlocks` (to support splitting).
- **Retrospective**: An AI-generated summary of a user's productivity over a specific period.

### Future Roadmap (Inferred)
- [ ] Implement proper SQL migrations.
- [ ] Support recurring tasks (refactored out in current version).
- [ ] Enhance AI models for better task title suggestions.
- [ ] Add more granular analytics for time spent per project/label.

## v1.1.0 - 2026-03-07 (Workspace Settings Refactoring)

### Architecture Changes
- **View Transition**: Migrated "Workspace Settings" from a modal-based interface (`WorkspaceSettingsModal.tsx`) to a dedicated page-based view (`WorkspaceSettingsView.tsx`).
- **State Management**: Added `workspace_settings` state to `ViewState` in `useApp.ts` to support full-page navigation for workspace configuration.
- **Improved UX**: The new dedicated view provides a more spacious layout for project and label management, improving scalability for future feature additions.
- **Cleanup**: Deprecated and removed the legacy `WorkspaceSettingsModal.tsx`.

## v1.2.0 - 2026-03-07 (Bug Fix: Task Transition & Promotion)

### Improvements
- **Automatic Task Promotion**: Updated `process_task_transition` to automatically promote the next `WILL` or `PENDING` task to `NOW` when the current task is completed.
- **Dynamic Time-Shifting**: Implemented logic to pull up subsequent tasks when a task is completed early or "on time" (if there was a gap), eliminating unintended gaps in the timeline and maintaining task continuity.
- **Improved Next Block Lookup**: Refined the SQL query to find the logical next task by filtering based on the current block's `start_time`, preventing incorrect promotion of past `PENDING` tasks.
- **Enhanced Test Coverage**: Added comprehensive unit tests in `src-tauri/src/database/timeline.rs` to verify auto-promotion and time-shifting across various scenarios (early completion, gaps, etc.).

## v1.3.0 - 2026-03-12 (Retrospective Feature Simplification)

### Architecture Changes
- **Feature Reduction**: Completely removed Weekly and Monthly retrospective functionalities to focus on Daily retrospectives.
- **Frontend Refactoring**: Simplified `RetrospectiveView.tsx`, `DateSelector.tsx`, and `utils.ts` by removing range calculations and UI toggles for non-daily types.
- **Backend Cleanup**: Removed AI prompt logic for Weekly and Monthly retrospectives in `src-tauri/src/commands/retrospective.rs`.
- **Type Safety**: Restricted `retroType` to `"DAILY"` in global TypeScript definitions.
- **I18n**: Removed translations for `weekly` and `monthly` keys in both Korean and English locales.

## v1.4.0 - 2026-03-12 (AI API Tier Management)

### Architecture Changes
- **User Profiling**: Added `is_free_user` field to the `User` domain model to distinguish between Gemini API free tier and paid tier users.
- **Database Schema**: Updated `users` table with `is_free_user` column (Boolean, default 1).
- **Onboarding/Settings UI**: Introduced a "Free User" checkbox in the API Key configuration section, defaulting to checked.
- **Future-Proofing**: This field will enable specialized error handling (e.g., immediate failure for 429s on free tier vs. retry logic for paid tier) in subsequent updates.

## v1.5.0 - 2026-03-12 (Frontend Refactoring: Logic & View Separation)

### Architecture Changes
- **3-Layer Separation**: Defined a strict frontend architecture:
  - **Layer 1: View Components**: Pure presentational React components, focusing only on rendering.
  - **Layer 2: Custom Hooks**: Encapsulated business logic, state management, and side effects.
  - **Layer 3: API Layer**: Standardized wrappers for Tauri IPC (`invoke`) to improve type safety and reusability.
- **Refactoring Strategy**: Targeted "Fat Components" (Onboarding, Retrospective) for decomposition into smaller, more maintainable units while ensuring zero UI breakage.
- **Improved Maintainability**: This architectural shift reduces component complexity and makes the codebase more modular and easier to test.
