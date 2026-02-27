# 🚀 Master Plan: "will-done" (Product Requirements Document)

## 1. Project Overview & Vision
"will-done" is a cross-platform desktop application designed to manage workflow interruptions, separate contexts via "Workspaces," and generate high-quality performance reviews (Brag Documents) using an AI API.
- **Architecture**: A secure, high-performance Desktop App utilizing a decoupled Frontend UI and a native Backend with a local database. (Specific frameworks are at the developer's discretion).
- **UI/UX Vision**: Strictly Dark Mode, pixel-perfect, modern desktop application aesthetics.

---

## 2. Core Domain Glossary
- **Workspace**: A user-defined environment profile (e.g., "Company Team", "Personal Blog"). Each workspace isolates settings, tasks, and AI context.
- **Core Time**: The main working hours (e.g., 09:00~18:00). *OPTIONAL*. If omitted, the app operates in a 24/7 free-working mode.
- **Unplugged Time**: Specific time blocks where no tasks can be scheduled (e.g., Lunch, Gym). *OPTIONAL*. Users can add multiple Unplugged Times.
- **Task**: The original job definition.
- **TimeBlock**: The actual time segment placed on the timeline. A Task can be split into multiple TimeBlocks due to Unplugged Times or urgent interruptions.

---

## 3. User Scenarios & Functional Specifications

### Scenario A: Multi-step Onboarding
1. **Step 1 (Global Profile)**: Input user `Nickname`.
2. **Step 2 (Workspace Creation)**: Input a custom `Workspace Name`.
3. **Step 3 (Workspace Detail)**:
    - **Core Time**: `[Start Time] ~ [End Time]` (Optional).
    - **Unplugged Time**: `[Label]`, `[Start Time] ~ [End Time]` (Optional, multiple entries allowed).
    - **Role Intro**: A description of the user's role, tools, and main responsibilities (Used as AI prompt context).
4. **Step 4 (AI Setup)**: Input AI API Key (Optional). Save all data to the local DB and navigate to the Main Screen.

### Scenario B: Intelligent Greetings & Task Planning
1. **Intelligent Greeting**: Displayed at the top of the main screen. The text changes dynamically based on the system time and the current active task status:
    - **06:00~11:00 (Morning)**
        - *Idle*: "Good morning, [Nickname]. Let's plan an energetic day!"
        - *Active*: "[Nickname], great focus this morning! Is everything on track?"
    - **11:00~13:00 (Lunch)**
        - *Idle*: "Great work this morning. Shall we plan the afternoon after eating?"
        - *Active*: "Lunchtime is approaching. Are you wrapping up your current task?"
    - **13:00~18:00 (Afternoon)**
        - *Idle*: "Lazy afternoon. Let's set a goal for the rest of the day."
        - *Active*: "Keep it up! Maintain the momentum on your current task."
    - **18:00~22:00 (Evening)**
        - *Idle*: "Past clock-out time. Shall we organize for tomorrow?"
        - *Active*: "Working late. Pace yourself and don't overdo it."
    - **22:00~04:00 (Night)**
        - *Idle*: "Great job today. Have a peaceful night."
        - *Active*: "Working the night shift! Please take a rest after this."
    - **04:00~06:00 (Dawn)**
        - *Idle*: "Early dawn. What plan will you make in this quiet time?"
        - *Active*: "An early start! Don't forget to log your progress."
2. **Task Input**: Uses separated Number Inputs for `[Hours (0-23)]` and `[Minutes (0-59)]`. Both cannot be zero.
3. **Planning Memo**: A markdown-supported text area with the placeholder: *"Write specific steps, references, or goals to complete this task."*
4. **Placement**: Pressing Enter schedules the block. If it overlaps with an `Unplugged Time`, the system MUST automatically split the TimeBlock to bypass the unplugged segment.

### Scenario C: Task Expiration & Transition Logic
1. **Expiration**: When the allocated time ends, a system alert appears. The app enters an *Idle/Waiting* state. **It MUST NOT auto-start the next task.**
2. **Action - [Delay Processing]**:
    - *"Need 15/30 more mins"*: Extends duration and shifts subsequent tasks backward.
    - *"Finished on time"*: Ignores overtime, logs as finished exactly on schedule, then marks as Complete.
    - *"Took X extra mins"*: User inputs extra time manually. The system adds this time to the log and immediately marks as Complete.
3. **Action - [Completion & Review]**:
    - Upon completion, a **Review Memo** modal (Markdown supported) appears for a brief retrospective.
4. **Action - [Next Task Decision]**: If a queued task exists:
    - *Start Immediately*: Next timer begins.
    - *Take a Break*: User selects or inputs wait time (`5m`, `10m`, `15m`, `Custom`). Timer starts automatically after the delay.
    - *Undecided*: Timer stops. System triggers an hourly reminder: *"When do you plan to start your next task?"*

### Scenario D: Urgent Ad-hoc Interruptions (Time Shift Engine)
1. **Trigger**: User checks the `[🔥 Urgent Task]` box when adding a task.
2. **Split Logic**: The currently running task is split into two incomplete blocks: `[Logged Time]` and `[Remaining Time]`.
3. **Shift Logic**: The `Urgent Task` is inserted between them. All subsequent scheduled tasks are shifted backwards.
4. **Resolution**: After finishing the Urgent Task, the user MUST resume and finish the `[Remaining Time]` block to mark the original parent Task as fully Complete.

### Scenario E: End-of-day Overtime Alert
1. **Condition**: Active ONLY if the Workspace has a `Core Time End` configured.
2. **Trigger**: 30 minutes before `Core Time End`, the system calculates total remaining task duration. If it exceeds the End time, show an alert.
3. **Action - [Delay]**: Split the current task, move all remaining tasks to an unscheduled Inbox queue.
4. **Action - [Continue]**: Display *"If you continue without breaks, you will finish at [Calculated Time]."* Alert is dismissed.

### Scenario F: AI Retrospectives
1. **Trigger**: The **[✨ Generate Retrospective]** button is ALWAYS ACTIVE as long as `Completed Tasks >= 1` for today.
2. **Execution**: Sends the `Planning Memo`, `Review Memo`, and `Role Intro` context to the AI API. Renders a customized, markdown-formatted summary of achievements. Supports Daily, Weekly, and Monthly scopes.

---

## 4. Strict UI/UX & Data Constraints
1. **Form Validation**: Time inputs MUST strictly be Numbers (min/max enforced).
2. **Markdown Viewers**: Planning memos, Review memos, and AI Retrospectives MUST be rendered using a robust Markdown viewer (supporting headings, lists, bold, inline code).
3. **Immutability Protection**: If a user attempts to edit a `Completed` task, a Confirmation Dialog MUST appear.
4. **Drag & Drop**: Future scheduled tasks in the timeline MUST support reordering via fluid drag-and-drop interactions.

---

## 5. Database Schema Design (Core Entities)
- `workspaces`: `id`, `name`, `core_time_start` (Nullable), `core_time_end` (Nullable), `role_intro`
- `unplugged_times`: `id`, `workspace_id`, `label`, `start_time`, `end_time`
- `tasks`: `id`, `workspace_id`, `title`, `planning_memo`, `is_routine`
- `time_blocks`: `id`, `task_id`, `start_time`, `end_time`, `status`, `review_memo`

---

## 6. Future Implementations (Out of Scope for MVP)
- **Workspace Management**: Adding unlimited new workspaces, Editing existing settings (Core time, Unplugged time, Role intro), and Deleting/Archiving workspaces.
- **GitHub Auto-Sync**: Background cron job (every 1 hour) to serialize DB data to JSON/Markdown (excluding sensitive User IDs) and auto-push to a private `will-done-sync` GitHub repository.
- **Manual Export/Import**: Ability to manually export/import the local database file via the Settings menu.