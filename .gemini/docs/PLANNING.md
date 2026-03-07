# Execution Plan: UI Bug Fixes and i18n Integration for Projects & Labels

## 1. Goal
Resolve three critical UI and data-flow bugs: the TaskForm dropdown "click-outside" misbehavior, the missing Color Picker in the Label Management tab, and the failure to save `project_id` and `label_id` to tasks. Additionally, implement full i18n (internationalization) support for all recently added Project and Label UI components.

## 2. Scope
### In-Scope
- **Dropdown Bug**: Fix `useOnClickOutside` hook or event handlers in `TaskForm` / `EditTaskModal` to prevent React Portal dropdown clicks from closing the modal.
- **Color Picker**: Debug and restore the Color Picker rendering and data flow in `LabelManagementTab.tsx`.
- **Data Mapping**: Ensure `project_id` and `label_id` are passed from the frontend and properly saved via SQLite `INSERT`/`UPDATE` queries in the Rust backend.
- **i18n**: Replace all hardcoded texts related to Projects and Labels in the `TaskForm`, `EditTaskModal`, and `WorkspaceSettingsModal` (including its tabs) with translation keys.

### Out-of-Scope
- Fixing unrelated bugs in other workspace components.
- Adding new i18n languages (only adding keys to existing configured languages).
- Refactoring the entire `useApp.ts` hook or core database schemas.

## 3. Architecture Impact
```text
src/
├── components/
│   └── settings/
│       ├── WorkspaceSettingsModal.tsx
│       ├── ProjectManagementTab.tsx
│       └── LabelManagementTab.tsx
├── features/
│   └── workspace/
│       └── components/
│           ├── TaskForm.tsx
│           └── EditTaskModal.tsx
├── hooks/
│   └── useOnClickOutside.ts
└── lib/
    └── i18n.ts (or locale dictionaries)
src-tauri/
└── src/
    ├── commands/
    │   └── workspace.rs
    └── database/
        └── workspace.rs
```

## 4. Execution Plan
*(Use `- [ ]` for all actionable steps. Break down into atomic tasks.)*

### Phase 1: Preparation & Infrastructure
- [x] Identify the existing i18n configuration (`src/lib/i18n.ts` or locale JSON files) and add necessary translation keys for Project/Label forms, placeholders, modal titles, table headers, and buttons.

### Phase 2: Core Domain / Backend Logic
- [x] Inspect and update the task creation and update queries in `src-tauri/src/database/workspace.rs` to ensure `project_id` and `label_id` are processed and persisted.
- [x] Verify `src-tauri/src/commands/workspace.rs` properly maps `project_id` and `label_id` from the Tauri invoke payload to the database layer.

### Phase 3: Interfaces / Frontend UI
- [x] Fix the Dropdown bug by updating `src/hooks/useOnClickOutside.ts` or adding portal/event-propagation exceptions in `TaskForm.tsx` and `EditTaskModal.tsx`.
- [x] Fix the missing Color Picker in `src/components/settings/LabelManagementTab.tsx`, ensuring hex values are correctly captured and sent to the backend.
- [x] Update frontend submit handlers in `TaskForm.tsx` and `EditTaskModal.tsx` to include `project_id` and `label_id` in the API payload.
- [x] Apply i18n translation functions (e.g., `t()`) to all hardcoded text across the targeted UI components (`TaskForm`, `EditTaskModal`, `WorkspaceSettingsModal`, `ProjectManagementTab`, `LabelManagementTab`).

## 5. Risk Mitigation
- **Potential Breaking Changes**: Altering `useOnClickOutside` could inadvertently affect other modals or popovers across the app. Database query changes might break task creation if types or nullability constraints are mismatched.
- **Rollback Strategy**: Use git to revert changes to `useOnClickOutside.ts` if global side-effects are detected. Keep backend modifications strictly additive to the payload, reverting if DB constraints fail.

## 6. Final Verification Wave
- [x] Run `cargo test` and `cargo check` (or equivalent backend validation)
- [x] Run `npm run build` or linting (or equivalent frontend validation)
- [x] Manual Spot Check instructions:
  - Open TaskForm, open the Project dropdown, click an option, and verify the form does NOT close.
  - Open Settings > Labels, verify the Color Picker renders and a color can be selected and saved.
  - Create a new task with a Project and Label, then verify in the SQLite database (or UI on reload) that the relations were saved.
  - Switch the app language and verify all Project/Label UI text translates correctly.
