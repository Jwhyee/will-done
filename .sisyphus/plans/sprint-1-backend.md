# Sprint 1 (Backend) - Database & Onboarding Work Plan

## 🎯 Goal
Set up the SQLite database schema in the Tauri environment and implement the initial onboarding logic (`InitializeWorkspaceUseCase`). 
UI code is strictly out of scope.

## 🏗️ Architecture & Decisions
1. **Database Library**: `rusqlite` (Synchronous).
2. **State Management**: Wrapped in `tauri::State<std::sync::Mutex<rusqlite::Connection>>`.
3. **Storage Location**: `{app_data_dir}/database.sqlite` (resolved via `tauri::AppHandle::path().app_data_dir()`).
4. **Dates & Times**:
   - Time-of-day (Core Time, Unplugged Time) stored as `TEXT` (`HH:mm` format).
   - Absolute timestamps (Created At, TimeBlock periods) stored as `TEXT` (ISO8601 format e.g., `2025-02-27T10:00:00Z`).
   - Booleans stored as `INTEGER` (`0`/`1`).
5. **Error Handling**: Use cases must return a custom `AppError` enum that maps to `String` so it can be cleanly serialized to the Frontend via Tauri.

## 📝 Schema Design (Decision Complete)

```sql
-- Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    core_time_start TEXT, -- 'HH:mm', NULL if flexible
    core_time_end TEXT,   -- 'HH:mm', NULL if flexible
    role_intro TEXT NOT NULL, -- Empty string if not provided
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Unplugged Times
CREATE TABLE IF NOT EXISTS unplugged_times (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    label TEXT NOT NULL,
    start_time TEXT NOT NULL, -- 'HH:mm'
    end_time TEXT NOT NULL,   -- 'HH:mm'
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    planning_memo TEXT,
    is_routine INTEGER NOT NULL DEFAULT 0,
    is_urgent INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'Scheduled',
    FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Time Blocks
CREATE TABLE IF NOT EXISTS time_blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    start_time TEXT, -- ISO8601
    end_time TEXT,   -- ISO8601
    status TEXT NOT NULL, -- 'Will', 'Now', 'Done', 'Unplugged' (from Design.md)
    review_memo TEXT,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

---

## 📋 Implementation Tasks

### 1. Database Initialization (`src-tauri/src/database/connection.rs`)
- Create `init_db(app_handle: &tauri::AppHandle) -> Result<rusqlite::Connection, String>`.
- Resolve the path `app_handle.path().app_data_dir()`. Create the directory if it doesn't exist.
- Connect to `{app_data_dir}/database.sqlite`.
- Execute the table creation SQL statements. Pragma `foreign_keys = ON;` must be set.
- Return the connection to be wrapped in Tauri's managed state.

### 2. Models (`src-tauri/src/models/*`)
- `models/workspace.rs`: Define `Workspace` struct deriving `Serialize, Deserialize`.
- `models/unplugged_time.rs`: Define `UnpluggedTime` struct.
- `models/task.rs`: Define `Task` struct.
- `models/time_block.rs`: Define `TimeBlock` struct.

### 3. Use Cases (`src-tauri/src/usecases/workspace.rs`)
- Implement `InitializeWorkspaceUseCase(conn: &mut rusqlite::Connection, name, start, end, role, unplugged_times) -> Result<i64, String>`
  - MUST start a transaction `conn.transaction()`.
  - Insert the workspace record and retrieve `last_insert_rowid()`.
  - Loop through `unplugged_times` and insert them using the retrieved `workspace_id`.
  - Commit the transaction. If any insertion fails, it must automatically roll back.
- Implement `GetCurrentWorkspaceUseCase(conn: &rusqlite::Connection) -> Result<Option<Workspace>, String>`
  - Fetch the most recently created workspace (e.g., `ORDER BY id DESC LIMIT 1`).
  - *Note: MVP only requires single workspace tracking.*

### 4. Tauri Commands (`src-tauri/src/commands/workspace.rs`)
- Create `setup_workspace(name, core_time_start, core_time_end, role_intro, unplugged_times, state: tauri::State<Mutex<Connection>>)` command.
  - Locks the state. Calls `InitializeWorkspaceUseCase`. Returns the newly created workspace ID.
- Create `get_current_workspace(state: tauri::State<Mutex<Connection>>)` command.
  - Locks the state. Calls `GetCurrentWorkspaceUseCase`.

### 5. Application Wiring (`src-tauri/src/lib.rs`)
- Call `init_db` during Tauri's `setup` hook.
- Inject `std::sync::Mutex::new(conn)` into `app.manage()`.
- Register `setup_workspace` and `get_current_workspace` in `invoke_handler`.

## Final Verification Wave
- Verify that `rusqlite` correctly opens/creates the database file in standard OS app data directories.
- Verify transaction rolling back upon intentional failure in `unplugged_times`.
- Verify the frontend (or manual testing via Tauri IPC) receives clean `Result::Ok` or `Result::Err` serialized objects.