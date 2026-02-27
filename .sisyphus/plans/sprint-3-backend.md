# Sprint 3 (Backend) - Task Scheduling & Greeting Plan

## 🎯 Goal
Implement the core task scheduling algorithm and greeting system. This includes finding empty timeline slots, handling unplugged times by splitting blocks, and returning time-based greetings.

## 🏗️ Technical Decisions
- **Date/Time Handling**: Use `chrono` crate (already in Cargo.toml).
- **Status Enum**: Task status: `Scheduled`, `InProgress`, `Completed`. TimeBlock status: `Will`, `Now`, `Done`, `Unplugged`.
- **Time Format**: Stored as `HH:mm` for times-of-day, ISO8601 for timestamps.

---

## 📋 Implementation Tasks

### 1. Extend Models (`src-tauri/src/models/mod.rs`)
- Add `TaskInput` struct for creating tasks.
- Add `TimeBlockInput` struct for creating time blocks.
- Add `TimelineEntry` for unified view of time blocks + unplugged times.

### 2. Implement `AutoScheduleUseCase` (`src-tauri/src/usecases/scheduling.rs`)
- **Logic**:
  1. Calculate task duration (start_time + duration).
  2. Find existing time blocks for the workspace on the given date.
  3. Find unplugged times for the workspace.
  4. Determine the earliest available slot:
     - If no blocks exist, start at `core_time_start` (or 00:00 if no core time).
     - If blocks exist, find the gap after the last block.
  5. **Split Logic**:
     - If the task spans over an unplugged time, split into multiple blocks:
       - Block A: Start -> Unplugged Start
       - Block B: Unplugged End -> Task End
     - Mark blocks as `Will` status initially.
  6. Insert task into `tasks` table.
  7. Insert generated time blocks into `time_blocks` table.
- **Function Signature**:
  ```rust
  pub fn auto_schedule_task(
      conn: &mut Connection,
      workspace_id: i64,
      title: String,
      planning_memo: Option<String>,
      duration_minutes: i64,
      is_urgent: bool,
      target_date: String, // YYYY-MM-DD
  ) -> Result<Task, String>
  ```

### 3. Implement `GreetingUseCase` (`src-tauri/src/usecases/greeting.rs`)
- **Logic**:
  1. Get current system time (UTC or local? Use local).
  2. Determine time slot (Morning, Lunch, Afternoon, Evening, Night, Dawn).
  3. Check if any task has status `InProgress` (Active).
  4. Select greeting template based on time slot + active status.
  5. Return greeting with `nickname` (from localStorage/frontend state - we'll need to pass it or fetch it. Since we don't store nickname in DB yet, we'll accept it as an argument or return just the template).
- **Function Signature**:
  ```rust
  pub fn get_greeting(nickname: &str, active_task_exists: bool) -> String
  ```

### 4. Implement Tauri Commands (`src-tauri/src/commands/scheduling.rs`)
- `add_task`: Wrapper around `auto_schedule_task`.
- `get_timeline(workspace_id, date)`: Returns combined list of time blocks and unplugged times for a given date.
- `get_greeting(nickname)`: Returns greeting string.

### 5. Wire Commands (`src-tauri/src/lib.rs`)
- Register new commands in `invoke_handler`.

### 6. Unit Tests (`src-tauri/tests/`)
- **Test Case 1**: Task with 60 min duration, no unplugged times -> 1 block created.
- **Test Case 2**: Task with 60 min duration, unplugged 12:00-13:00 -> 2 blocks created (before and after).
- **Test Case 3**: Task overlaps with multiple unplugged times -> Correct number of blocks.

---

## Acceptance Criteria
1. `add_task` successfully creates a task and time blocks.
2. When a task overlaps an unplugged time, it is split into correct number of blocks.
3. `get_timeline` returns sorted blocks for a date.
4. `get_greeting` returns correct greeting based on time of day.
5. Unit tests pass for splitting logic.