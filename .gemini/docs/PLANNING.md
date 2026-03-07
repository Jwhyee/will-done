# Execution Plan: Enforce Zero Seconds for Time Blocks

## 1. Goal
Ensure that all `start_time` and `end_time` data stored in the `time_blocks` table (and related tables like `unplugged_times`) always have the seconds part set to `00`. This provides a cleaner UI and consistent time calculations across the application.

## 2. Scope
### In-Scope
- **Database Migration**: Normalize existing data in `time_blocks` and `unplugged_times` to set seconds to `00`.
- **Backend Logic**: Update Rust code to truncate seconds to `00` before inserting or updating time-related fields.
- **API Layer**: Ensure Tauri commands correctly format timestamps sent to the database.
- **Verification**: Update and run tests to ensure normalization is correctly applied.

### Out-of-Scope
- Changing the storage type (keeping it as ISO-8601 strings in SQLite).
- Modifying the frontend UI (as it already lacks second-level precision).

## 3. Architecture Impact
```text
src-tauri/
├── src/
│   ├── lib.rs              # Database setup & one-time migration
│   ├── database/
│   │   └── timeline.rs     # Time formatting logic for time_blocks
│   └── commands/
│       └── retrospective.rs # Time formatting logic for range queries
```

## 4. Execution Plan

### Phase 1: Database Migration & Setup
- [x] Add a normalization migration in `src-tauri/src/lib.rs` within the `setup` block.
    - SQL: `UPDATE time_blocks SET start_time = strftime('%Y-%m-%dT%H:%M:00', start_time), end_time = strftime('%Y-%m-%dT%H:%M:00', end_time);`
    - SQL: `UPDATE unplugged_times SET start_time = strftime('%H:%M', start_time), end_time = strftime('%H:%M', end_time);`

### Phase 2: Backend Logic Refinement
- [x] Update `src-tauri/src/database/timeline.rs`:
    - Replace all occurrences of `.format("%Y-%m-%dT%H:%M:%S")` with `.format("%Y-%m-%dT%H:%M:00")` when saving to the database.
    - Specifically check functions: `add_task_at`, `process_task_transition`, `update_task`, `reorder_internal`, `schedule_task_blocks`, and `shift_future_blocks`.
- [x] Update `src-tauri/src/commands/retrospective.rs`:
    - Ensure `start_of_range` and `end_of_range` are formatted with `:00` seconds.

### Phase 3: Test Updates & Validation
- [x] Update Rust unit tests in `src-tauri/src/database/timeline.rs` to reflect the strictly normalized timestamps.
- [x] Add a new test case to verify that `add_task_at` correctly truncates current time seconds to `00`.

## 5. Risk Mitigation
- **Potential Breaking Changes**: If any logic depends on precise seconds for duration calculations, it might shift by a few seconds. However, the app's smallest unit is 1 minute, so this is negligible.
- **Rollback Strategy**: Existing data can be restored if a backup exists, or the migration can be reversed (though unnecessary as normalization is the goal).

## 6. Final Verification Wave
- [x] Run `cargo test` to ensure all backend logic remains correct.
- [x] Run `cargo check` to verify no compilation errors.
- [ ] **Manual Spot Check**:
    1. Add a new task and check the database file (using a SQLite browser or `sqlite3` CLI) to ensure seconds are `00`.
    2. Complete a task and verify the `end_time` in the DB has `00` seconds.
    3. Reorder tasks and verify the updated `start_time` and `end_time` are still normalized.
