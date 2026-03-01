# 🚀 Master Plan: "will-done" (Product Requirements Document)

## 1. Project Overview & Vision

"will-done" is a cross-platform desktop application designed to manage workflow interruptions, separate contexts via "Workspaces," and generate high-quality performance reviews (Brag Documents) using an AI API.

*   **Architecture**: Tauri v2, Rust (Backend), React + TypeScript (Frontend), SQLite (Local DB).
*   **UI/UX Vision**: Strictly Dark Mode, pixel-perfect, modern desktop aesthetics with a **Dual Sidebar** layout.
*   **Current Status**: Core engine (Scheduling, Time-shifting, State transitions) and AI integration are implemented. Multi-language (KR/EN) support is active.

---

## 2. Core Domain Glossary

*   **User**: Global entity storing `Nickname`, `Gemini API Key`, and `Language` (KR/EN).
*   **Workspace**: User-defined environment profile. Isolates tasks and AI context. Includes `Core Time` and `Role Intro`.
*   **Unplugged Time**: Fixed, recurring time blocks (e.g., Lunch) that the scheduler automatically bypasses.
*   **Task**: The original job definition with `Title`, `Planning Memo`, and `Estimated Minutes`.
*   **TimeBlock**: Actual segments on the timeline.
    *   **Status**: `DONE` (Completed), `NOW` (Currently active), `WILL` (Scheduled), `UNPLUGGED` (Blocked), `PENDING` (Interrupted/Paused).
*   **Time Shift Engine**: The logic that automatically splits tasks around Unplugged times and shifts future tasks when interruptions or delays occur.

---

## 3. Implementation Progress & Current Features

### ✅ Phase 1: Foundation & Onboarding
*   [x] **Global Profile**: One-time setup for Nickname and Language.
*   [x] **Workspace Setup**: Creation of workspaces with Core/Unplugged times.
*   [x] **Dual Sidebar Layout**: Primary (Workspace switcher) + Secondary (Date/Inbox/Settings).

### ✅ Phase 2: Intelligent Scheduling Engine
*   [x] **Intelligent Greetings**: Context-aware greetings based on time and active task status.
*   [x] **Auto-Scheduling**: Tasks are automatically split into multiple blocks if they overlap with `Unplugged Time`.
*   [x] **Inbox & Timeline**: Seamless movement between the unscheduled queue (Inbox) and the daily timeline.
*   [x] **Drag & Drop**: Reordering tasks and moving between Sidebar/Main View using `dnd-kit`.

### ✅ Phase 3: Real-time Interaction
*   [x] **Task Transitions**: Manual and semi-automatic status changes (START -> DONE/DELAY).
*   [x] **Expiration Logic**: Detection of finished tasks and prompting for Review Memos.
*   [x] **Urgent Interruptions**: Inserting urgent tasks splits the current one and shifts the entire remaining schedule.

### ✅ Phase 4: AI & Archive
*   [x] **AI Retrospectives**: Generates professional summaries (Brag Documents) using Gemini 1.5 Flash based on Planning/Review memos.
*   [x] **History Archive**: View previous dates' timelines and saved retrospectives.
*   [x] **Multi-Frequency Retro**: Support for Daily, Weekly, and Monthly retrospective generation.

---

## 4. Detailed Technical Specifications

### A. Time Shift Logic (Rust)
1.  **Shift**: When a task is delayed or an urgent task is inserted, all subsequent `WILL` blocks are shifted by `N` minutes.
2.  **Split**: If a scheduled block crosses an `Unplugged Time` boundary, it is split into two or more blocks, maintaining the total duration.
3.  **Resume**: Interrupted tasks (by urgent ones) are set to `PENDING` and a new block for the remaining time is scheduled after the urgent task.

### B. Intelligent Greeting Logic
*   Morning (06-11), Lunch (11-13), Afternoon (13-18), Evening (18-22), Night (22-04), Dawn (04-06).
*   Greetings vary if there is a task currently in `NOW` status (Encouragement vs. Planning).

### C. AI Prompt Engineering
*   **Context**: Role Intro + Completed Task List (Title, Duration, Planning Memo, Review Memo).
*   **Output**: Structured Markdown in the user's preferred language.

---

## 5. Database Schema (Finalized)

*   **`users`**: `id` (1), `nickname`, `gemini_api_key`, `lang`.
*   **`workspaces`**: `id`, `name`, `core_time_start`, `core_time_end`, `role_intro`.
*   **`unplugged_times`**: `id`, `workspace_id`, `label`, `start_time`, `end_time`.
*   **`tasks`**: `id`, `workspace_id`, `title`, `planning_memo`, `estimated_minutes`.
*   **`time_blocks`**: `id`, `task_id`, `workspace_id`, `title`, `start_time`, `end_time`, `status`, `review_memo`, `is_urgent`.
*   **`retrospectives`**: `id`, `workspace_id`, `retro_type`, `content`, `date_label`, `created_at`.

---

## 6. Future Implementations (Next Sprints)

*   **Statistics View**: Visualize time spent per category/workspace.
*   **Pomodoro Integration**: Optional timer sounds and break reminders.
*   **Cloud Sync/Export**: Exporting data for external backup.