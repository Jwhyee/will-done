# Execution Plan: Task Edit Modal Fixes

## 1. Goal
Fix the Task Edit Modal to correctly display registered labels in the dropdown and ensure that Project/Label changes are persisted upon submission.

## 2. Scope
### In-Scope
- Fix `CreatableSelect` component to show all available options when the dropdown is opened.
- Update `onEditTaskSubmit` in `useApp.ts` to include `projectName` and `labelName` in the backend API call.
- Verify persistence of Project and Label data in the database.

### Out-of-Scope
- Changing the database schema (already supports these fields).
- Modifying other modals or views.
- Redesigning the `CreatableSelect` UI beyond functional fixes.

## 3. Architecture Impact
```text
src/
├── components/
│   └── ui/
│       └── creatable-select.tsx    # Modify filtering/display logic
└── hooks/
    └── useApp.ts                  # Update onEditTaskSubmit invoke call
```

## 4. Execution Plan
### Phase 1: Preparation & Infrastructure
- [x] Research current `CreatableSelect` behavior and `useApp.ts` implementation. (Completed)

### Phase 2: Core Domain / Backend Logic
- [x] Verify `UpdateTaskInput` struct in `src-tauri/src/domain/timeline.rs` includes `projectName` and `labelName`. (Verified: OK)
- [x] Verify `update_task` in `src-tauri/src/database/timeline.rs` correctly handles these fields. (Verified: OK)

### Phase 3: Interfaces / Frontend UI
- [x] **Fix Persistence**: Update `onEditTaskSubmit` in `src/hooks/useApp.ts` to pass `projectName` and `labelName` to the `update_task` command.
- [x] **Fix Dropdown Visibility**: Modify `src/components/ui/creatable-select.tsx` to ensure all options are visible when the popover is first opened, regardless of the current value.
    - *Strategy*: Use a separate `searchTerm` for filtering or clear `inputValue` on open if it matches the current `value`.

## 5. Risk Mitigation
- **Potential Breaking Changes**: None expected as fields are optional and already exist in the backend.
- **Rollback Strategy**: Revert changes in `useApp.ts` and `creatable-select.tsx`.

## 6. Final Verification Wave
- [x] Run `cargo check` to ensure backend compatibility.
- [x] Manual Spot Check:
    1. Open Edit Task Modal for a task with an existing label.
    2. Click the Label input. Verify ALL registered labels appear in the list.
    3. Select a different label and project.
    4. Save the task.
    5. Re-open the modal or check the timeline to verify the label/project changed.
