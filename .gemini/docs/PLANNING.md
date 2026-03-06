# Execution Plan: Improve Urgent Task Splitting Logic (PENDING Status)

## 1. Goal
Modify the logic that handles task splitting when an urgent task is inserted. Instead of marking the suspended (past) part as `DONE`, it should be marked as `PENDING`. Both the past and future parts of the split task should reflect a suspended/pending state to maintain logical consistency.

## 2. Scope
### In-Scope
- Modification of `add_task_at` in `src-tauri/src/database/timeline.rs` to set `PENDING` status for suspended task parts.
- Updating `shift_future_blocks` in `src-tauri/src/database/timeline.rs` to ensure `PENDING` blocks are correctly shifted if they are in the future.
- Updating `process_task_transition` and `update_block_status` in `src-tauri/src/database/timeline.rs` to ensure `PENDING` tasks can be correctly transitioned or resumed.
- Verification of backend tests to reflect the new status behavior.

### Out-of-Scope
- General UI improvements to the timeline.
- Changes to the AI retrospective generation logic (except ensuring `PENDING` tasks are not treated as `DONE`).
- Frontend state management refactoring.

## 3. Architecture Impact
```text
src-tauri/
└── src/
    └── database/
        ├── timeline.rs        # Core logic for task splitting, shifting, and status updates
        └── retrospective.rs   # Verification of completed task block queries
```

## 4. Execution Plan
### Phase 1: Preparation & Reproduction
- [x] Create a new backend test case in `src-tauri/src/database/timeline.rs` (e.g., `test_urgent_task_splits_to_pending`) to confirm current behavior and verify the fix.
- [x] Validate that the frontend correctly renders `PENDING` status (existing `SortableItem.tsx` and `i18n.ts` suggest it is supported).

### Phase 2: Core Domain / Backend Logic
- [x] Modify `add_task_at` in `src-tauri/src/database/timeline.rs`:
    - Change status update of the suspended block from `DONE` to `PENDING`.
    - Change status of the scheduled future block from `WILL` to `PENDING` when split by an urgent task.
- [x] Update `shift_future_blocks` in `src-tauri/src/database/timeline.rs`:
    - Extend the query to include blocks with `status = 'PENDING'` in addition to `WILL`.
- [x] Review `process_task_transition` in `src-tauri/src/database/timeline.rs`:
    - Ensure `status != 'DONE'` checks correctly encompass `PENDING` blocks for task transition validation.

### Phase 3: Interfaces / Frontend UI Verification
- [x] Manual verification in the application:
    - Start a task (`NOW`).
    - Add an urgent task.
    - Verify that the original task is split into two `PENDING` blocks.
    - Verify that the timeline remains mathematically correct (no overlaps).

## 5. Risk Mitigation
- **Potential Breaking Changes**: If `PENDING` blocks are not included in `shift_future_blocks`, they will overlap with subsequent tasks when the schedule is adjusted.
- **Rollback Strategy**: Revert changes to `src-tauri/src/database/timeline.rs` using git.

## 6. Final Verification Wave
- [x] Run `cargo test` to verify backend logic and new status transitions.
- [x] Run `npm run build` to ensure frontend compatibility.
- [x] Manual Spot Check:
    - [x] Create a `NOW` task.
    - [x] Insert an Urgent task -> Verify split parts are `PENDING`.
    - [x] Complete the Urgent task -> Verify `PENDING` parts stay `PENDING`.
    - [x] Resume a `PENDING` part -> Verify it becomes `NOW`.
