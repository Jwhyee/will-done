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
