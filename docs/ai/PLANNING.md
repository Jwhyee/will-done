# 🚀 Master Plan: "will-done" (Product Requirements Document)

## 1. Project Overview & Vision

"will-done" is a cross-platform desktop application designed to manage workflow interruptions, separate contexts via "Workspaces," and generate high-quality performance reviews (Brag Documents) using an AI API.

* **Architecture**: A secure, high-performance Desktop App utilizing a decoupled Frontend UI and a native Backend with a local database.
* **UI/UX Vision**: Strictly Dark Mode, pixel-perfect, modern desktop application aesthetics with a **Dual Sidebar** layout (Slack-style).

---

## 2. Core Domain Glossary

* **User/Global Settings**: A single-row entity storing the user's nickname and AI API Key.
* **Workspace**: A user-defined environment profile (e.g., "Toss Payments", "Side Project"). Each workspace isolates settings, tasks, and AI context.
* **Core Time**: The main working hours (e.g., 09:00~18:00). *OPTIONAL*.
* **Unplugged Time**: Fixed, recurring time blocks where no tasks should be scheduled (e.g., Lunch, Dinner). *OPTIONAL*.
* **Task**: The original job definition.
* **TimeBlock**: The actual time segment on the timeline. A Task can be split into multiple TimeBlocks due to Unplugged Times or urgent interruptions.

---

## 3. User Scenarios & Functional Specifications

### Scenario A: Initial Setup & Onboarding

1. **Global Profile (One-time)**: If no user exists, show a modal to input `Nickname` (Required) and `AI API Key` (Optional, with a guide: "Used for AI Retrospectives").
2. **Workspace Creation**:
* Input `Workspace Name`.
* Set `Core Time` and multiple `Unplugged Times` with labels.
* Input `Role Intro` for AI context.


3. **Dual Sidebar Interface**:
* **Primary Sidebar (Left-most)**: Workspace switcher (Icon list).
* **Secondary Sidebar**:
* Date Search (Top): View archive for specific dates.
* Inbox (Middle): Task queue for unscheduled tasks.
* Settings (Bottom): Reconfigure Workspace/Core/Unplugged times.





### Scenario B: Intelligent Greetings & Task Planning

1. **Intelligent Greeting**: Changes dynamically based on the system time and active task status (Morning, Lunch, Afternoon, Evening, Night, Dawn).
2. **Task Input**: Separate Number Inputs for `[Hours (0-23)]` and `[Minutes (0-59)]`.
3. **Planning Memo**: Markdown-supported area to define steps or goals.
4. **Auto-Scheduling**: If a task overlaps with `Unplugged Time`, the system MUST split the block to bypass that segment.

### Scenario C: Task Expiration & Transition Logic

1. **Expiration**: Timer ends → System Alert → Idle state. No auto-start for the next task.
2. **Action - [Delay]**: Extend duration (15/30m, or manual) and shift subsequent tasks.
3. **Action - [Completion]**: Mark as Done and prompt for a **Review Memo** (Markdown supported).
4. **Next Step**: Choose to start immediately, wait (5/10/15m/Custom), or stay undecided (Hourly reminders).

### Scenario D: Urgent Ad-hoc Interruptions (Time Shift Engine)

1. **Trigger**: Check `[🔥 Urgent Task]` during entry.
2. **Process**: Split the currently running task → Insert Urgent Task → Shift all subsequent tasks backward.
3. **Resume**: The original task's `[Remaining Time]` must be finished later to complete the task.

### Scenario E: End-of-day Overtime Alert

1. **Trigger**: 30 minutes before `Core Time End`.
2. **Logic**: If total remaining duration > Core Time End, show warning.
3. **Action**: User decides to move remaining tasks to the Inbox or continue working.

### Scenario F: AI Retrospectives

1. **Trigger**: **[✨ Generate Retrospective]** button (Enabled if Completed Tasks >= 1).
2. **Execution**: Combines `Planning Memo`, `Review Memo`, and `Role Intro` to generate a markdown summary via AI.

---

## 4. Strict UI/UX & Data Constraints

1. **Form Validation**: Time inputs MUST strictly be Numbers (min/max enforced).
2. **Markdown Viewers**: Planning/Review memos and AI Retrospectives MUST be rendered as rich text.
3. **Immutability Protection**: Editing a `Completed` task requires confirmation.
4. **Drag & Drop**: Support moving tasks between the Inbox (Secondary Sidebar) and the Main Timeline, and reordering within the timeline.

---

## 5. Database Schema Design (Core Entities)

* **`users`**: `id` (Primary, always 1), `nickname`, `gemini_api_key`.
* **`workspaces`**: `id`, `name`, `core_time_start` (Nullable), `core_time_end` (Nullable), `role_intro`.
* **`unplugged_times`**: `id`, `workspace_id` (FK), `label`, `start_time`, `end_time`. (Stored as separate rows for efficient scheduling).
* **`tasks`**: `id`, `workspace_id` (FK), `title`, `planning_memo`.
* **`time_blocks`**: `id`, `task_id` (FK), `start_time`, `end_time`, `status`, `review_memo`.

---

## 6. Future Implementations (Out of Scope for MVP)

* **GitHub Auto-Sync**: Background cron job to push anonymized data to a private repository.
* **Manual Export/Import**: Export/Import local `.sqlite` file.