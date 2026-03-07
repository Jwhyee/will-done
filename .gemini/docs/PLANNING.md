# Execution Plan: Task Deletion Time-Shift Bug Fix

## 1. Goal
Fix the bug where deleting a task (specifically one placed immediately after a 'NOW' task) fails to trigger the time-shift recalculation, causing subsequent 'WILL' tasks to retain incorrect start/end times.

## 2. Scope
### In-Scope
- Update the Rust backend task deletion logic (e.g., `delete_task`) to trigger timeline recalculation (time-shift) immediately after a task is removed.
- Ensure the deletion and recalculation happen safely within a database transaction or sequence.
- Ensure the frontend timeline UI correctly and immediately synchronizes with the newly calculated times after a deletion.
### Out-of-Scope
- Completely rewriting the time calculation engine if it already functions correctly for other operations (like drag-and-drop or task completion).
- Refactoring frontend UI components unrelated to the timeline view.

## 3. Architecture Impact
```text
src-tauri/
└── src/
    ├── commands/
    │   └── workspace.rs
    └── database/
        └── workspace.rs
src/
└── features/
    └── workspace/
        ├── WorkspaceView.tsx
        └── hooks/
            └── useWorkspace.ts
```

## 4. Execution Plan
*(Use `- [ ]` for all actionable steps. Break down into atomic tasks.)*

### Phase 1: Preparation & Infrastructure
- [x] Locate the backend task deletion handler (e.g., `delete_task` in `src-tauri/src/commands/workspace.rs` and `src-tauri/src/database/workspace.rs`).
- [x] Identify the exact Rust function responsible for reordering (`sort_order`) and recalculating timeline times.

### Phase 2: Core Domain / Backend Logic
- [x] Modify the deletion database operation to wrap both the `DELETE` statement and the subsequent timeline recalculation within a robust flow (e.g., a database transaction).
- [x] Ensure that after the task is deleted, the recalculation logic correctly shifts the times of all subsequent 'WILL' tasks forward.
- [x] Return the fully updated list of tasks (or ensure a success signal prompts the frontend to refetch).

### Phase 3: Interfaces / Frontend UI
- [x] Update the frontend deletion function (e.g., inside `useWorkspace.ts`) to handle the backend response, either by updating the local state with the returned recalculated tasks or by triggering a timeline refetch.
- [x] Confirm that `WorkspaceView.tsx` (or related timeline components) immediately reflects the new times without requiring a page reload.

## 5. Risk Mitigation
- **Potential Breaking Changes**: Triggering complex recalculation queries within the deletion transaction could cause database locks or slow down the UI if not optimized.
- **Rollback Strategy**: Revert the backend `delete_task` command to its previous state and decouple the recalculation if performance issues or deadlocks occur.

## 6. Final Verification Wave
- [x] Run `cargo test` and `cargo check` (or equivalent backend validation)
- [x] Run `npm run build` or linting (or equivalent frontend validation)
- [x] Manual Spot Check instructions:
  - Create a new task.
  - Move the new task to be sequentially right after the currently running ('NOW') task.
  - Delete this task.
  - Observe the timeline: Verify that the start and end times of all subsequent 'WILL' tasks immediately shift forward by the duration of the deleted task.
