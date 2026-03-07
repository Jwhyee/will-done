# Execution Plan: Implement Autocomplete for TaskForm Title

## 1. Goal
Add an autocomplete/suggestion dropdown to the `TaskForm` title input, fetching distinct past task titles from the SQLite database via a new Tauri command, with frontend debouncing to prevent excessive backend calls.

## 2. Scope
### In-Scope
- Add a new Tauri command in Rust to query distinct task titles matching a search string using `LIKE` in SQLite.
- Implement debounce logic on the frontend title input in `TaskForm`.
- Create a dropdown/popover UI beneath the `TaskForm` input to display autocomplete suggestions.
- Update the input value when a suggestion is clicked and close the dropdown.

### Out-of-Scope
- Refactoring the entire `TaskForm` component.
- Modifying other fields in `TaskForm` (like time picker or date).
- Implementing global search across the app.

## 3. Architecture Impact
```text
src/
└── features/
    └── workspace/
        └── components/
            └── TaskForm.tsx (Modify)

src-tauri/
└── src/
    ├── commands/
    │   └── workspace.rs (Modify)
    └── database/
        └── workspace.rs (Modify)
```

## 4. Execution Plan
*(Use `- [ ]` for all actionable steps. Break down into atomic tasks.)*
### Phase 1: Preparation & Infrastructure
- [x] Review `src-tauri/src/database/workspace.rs` to understand the existing SQLite task tables.
- [x] Review `src/features/workspace/components/TaskForm.tsx` to understand the current input and state management.

### Phase 2: Core Domain / Backend Logic
- [x] Implement a new database function in `src-tauri/src/database/workspace.rs` (e.g., `search_task_titles`) that queries `DISTINCT title` using `LIKE %query%` with a reasonable limit.
- [x] Add `#[test]` unit tests for the new database function to verify edge cases.
- [x] Implement a new Tauri command in `src-tauri/src/commands/workspace.rs` (e.g., `suggest_task_titles`) that calls the database function.
- [x] Register the new Tauri command in the main application setup (`src-tauri/src/lib.rs` or `main.rs`).

### Phase 3: Interfaces / Frontend UI
- [x] Implement a debounce utility or use an existing one (e.g., a custom `useDebounce` hook) in the frontend.
- [x] Add local state to `TaskForm.tsx` for tracking the search query, suggestions array, and dropdown visibility.
- [x] Update the `TaskForm` input `onChange` handler to trigger the debounced backend Tauri command `suggest_task_titles`.
- [x] Build a Popover or Dropdown UI within `TaskForm.tsx` to display the suggestions list.
- [x] Implement click handlers on suggestions to update the input title value, clear the suggestions, and close the dropdown.

## 5. Risk Mitigation
- **Potential Breaking Changes**: Adding a new Popover might interfere with existing `useOnClickOutside` or `TaskForm` collapse logic. The debounce implementation might cause lag if not configured correctly.
- **Rollback Strategy**: Revert `TaskForm.tsx` changes and remove the new Tauri command and database queries.

## 6. Final Verification Wave
- [x] Run `cargo test` and `cargo check` (or equivalent backend validation)
- [x] Run `npm run build` or linting (or equivalent frontend validation)
- [x] Manual Spot Check instructions
  - Open the `TaskForm`.
  - Type a few characters into the title input that match an existing task.
  - Verify that a dropdown appears with suggestions after a brief delay (debounce).
  - Click a suggestion and verify the input updates correctly and the dropdown closes.
  - Verify that excessive typing does not spam the backend.