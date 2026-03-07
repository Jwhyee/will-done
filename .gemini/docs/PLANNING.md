# Execution Plan: Project and Label Management System Integration

## 1. Goal
Introduce a comprehensive 'Project' and 'Label' management system to enhance task categorization. This includes frontend UI components (Creatable Select, Color Pickers), a centralized management interface in settings, backend SQLite schema updates with atomic transactions, and dynamic badge styling in the timeline.

## 2. Scope
### In-Scope
- **Form UI**: Integrate Creatable Select in `TaskForm` and `EditTaskModal` for projects and labels. Include a "None" (empty) option at the top and sort the rest by recently used.
- **Backend & DB**: Add `color` field to Label schema. Implement atomic transactions in Rust/SQLite to insert new projects/labels and map them to tasks during creation/update.
- **Central Management**: Add "Project Management" and "Label Management" tabs to `WorkspaceSettingsModal`. Implement full CRUD operations and a GitHub-style color picker for labels.
- **Timeline UI**: Update task item titles to the format `[{Project}] {Label} {Task Title}`. Render labels as GitHub-style rounded badges with dynamic styling (original color for text/border, 10-20% opacity for background).

### Out-of-Scope
- Implementing filtering or searching tasks by project/label on the timeline (deferred to future update).
- Analytics or charts based on projects/labels.

## 3. Architecture Impact
```text
src/
├── components/
│   └── settings/
│       ├── WorkspaceSettingsModal.tsx
│       ├── ProjectManagementTab.tsx (New)
│       └── LabelManagementTab.tsx (New)
├── features/
│   └── workspace/
│       ├── components/
│       │   ├── TaskForm.tsx
│       │   ├── EditTaskModal.tsx
│       │   └── TimelineItem.tsx (or equivalent rendering component)
src-tauri/
└── src/
    ├── models.rs
    ├── commands/
    │   └── workspace.rs
    └── database/
        └── workspace.rs
```

## 4. Execution Plan
*(Use `- [ ]` for all actionable steps. Break down into atomic tasks.)*

### Phase 1: Preparation & Infrastructure
- [x] Define Rust structs for `Project` and `Label` in `src-tauri/src/models.rs`, including the `color` field (Hex code) for `Label`.
- [x] Add SQLite schema creation scripts/migrations in `src-tauri/src/lib.rs` for `projects`, `labels`, and their mapping tables or foreign keys on the `tasks` table.
- [x] Create corresponding TypeScript interfaces in `src/types/index.ts`.

### Phase 2: Core Domain / Backend Logic
- [x] Implement DB CRUD operations for Projects and Labels in `src-tauri/src/database/workspace.rs` (e.g., `create_project`, `get_projects`, `update_project`, `delete_project`, and similarly for labels).
- [x] Implement query logic to fetch projects/labels ordered by "recently used".
- [x] Update task creation/editing database logic to use atomic transactions: if a new project/label text is provided, insert it first, then map the generated ID to the task.
- [x] Create and register Tauri commands in `src-tauri/src/commands/workspace.rs` to expose these operations to the frontend.
- [x] Write `#[test]` unit tests for the new database queries and transactions.

### Phase 3: Interfaces / Frontend UI
- [x] Build "Project Management" and "Label Management" tabs in `src/components/settings/WorkspaceSettingsModal.tsx` for CRUD operations.
- [x] Integrate a GitHub-style Color Picker component in the "Label Management" tab.
- [x] Implement a `Creatable Select` component for `TaskForm` and `EditTaskModal`.
- [x] Wire the `Creatable Select` to fetch options (recently used sorted) via Tauri commands, ensuring "None" is pinned at the top.
- [x] Update the timeline rendering UI to format task strings as `[{Project}] {Label} {Task Title}`.
- [x] Implement the dynamic Badge component for labels with custom style calculation (Text/Border = original color, Background = original color + 10-20% opacity).

## 5. Risk Mitigation
- **Potential Breaking Changes**: Modifying the core task insertion logic could break existing task creation if transactions fail. Schema changes without proper migration handling might corrupt existing local databases.
- **Rollback Strategy**: Backup the SQLite database file before applying schema migrations. Revert Rust backend logic and UI changes if structural issues arise.

## 6. Final Verification Wave
- [x] Run `cargo test` and `cargo check` (or equivalent backend validation)
- [x] Run `npm run build` or linting (or equivalent frontend validation)
- [x] Manual Spot Check instructions:
  - Open Settings, create a new Project and a Label (with a specific color).
  - Open TaskForm, verify they appear in the select dropdown.
  - Type a new non-existing project name in TaskForm and save the task.
  - Verify the new project is saved to the DB and appears in Settings.
  - Check the timeline to ensure the task renders the Badge correctly with the correct opacity styles.
