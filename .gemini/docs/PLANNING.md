# Execution Plan: Refactor Workspace Settings to Dedicated Page

## 1. Goal
Refactor the "Workspace Settings" from a restricted modal to a full-screen dedicated page view. This improves scalability for future features (like detailed project/label management) and provides a better UX for complex configuration tasks.

## 2. Scope
### In-Scope
- Introduce a new `workspace_settings` view state in the application.
- Create a `WorkspaceSettingsView` component that implements the settings UI.
- Update `App.tsx` to handle the transition to the settings view.
- Update `PrimarySidebar` to trigger the new view instead of the modal.
- Implement a "Back" button and ensure navigation returns to the main workspace view.
- Preserve all existing functionality: Basic settings, Time settings, Project/Label management, and Workspace deletion.
### Out-of-Scope
- Redesigning the underlying settings logic or backend commands.
- Changing the global "Global Settings" modal (keep it as a modal for now).

## 3. Architecture Impact
```text
src/
├── hooks/
│   └── useApp.ts           # Add 'workspace_settings' to ViewState
├── features/
│   └── workspace/
│       ├── WorkspaceSettingsView.tsx  # New dedicated view component
│       └── components/
│           └── settings/
│               └── WorkspaceSettingsModal.tsx # REMOVED
└── App.tsx                 # Update renderView and remove Modal usage
```

## 4. Execution Plan

### Phase 1: Infrastructure & State
- [x] Add `workspace_settings` to `ViewState` union in `src/hooks/useApp.ts`.
- [x] Add `settingsWorkspaceId` state to `useApp.ts` (or manage it in `AppContent`) to track which workspace is being edited.

### Phase 2: Core View Implementation
- [x] Create `src/features/workspace/WorkspaceSettingsView.tsx`.
    - Adapt the layout from `WorkspaceSettingsModal.tsx` to a full-page layout.
    - Implement a header with a "Back" button that sets view back to `main`.
    - Reuse existing tab components: `WorkspaceBasicTab`, `WorkspaceTimeTab`, `ProjectManagementTab`, `LabelManagementTab`, `WorkspaceAdvancedTab`.
    - Implement the deletion confirmation dialog within the new view.

### Phase 3: Interface Integration
- [x] Update `App.tsx`:
    - Add `case "workspace_settings"` to `renderView`.
    - Remove `WorkspaceSettingsModal` component and its associated local states if moved to `useApp`.
    - Update `onOpenWorkspaceSettings` in `PrimarySidebar` props to trigger the view change.
- [x] Update `PrimarySidebar.tsx`:
    - Ensure the settings icon triggers the navigation correctly.

### Phase 4: Refinement & Cleanup
- [x] Ensure "Save Changes" correctly updates the workspace and provides feedback.
- [x] Verify that deleting a workspace correctly redirects the user.
- [x] Remove `src/features/workspace/components/settings/WorkspaceSettingsModal.tsx` after verification.

## 5. Risk Mitigation
- **Potential Breaking Changes**: Interruption of the settings flow if navigation state is lost on refresh (should be handled by `init` logic in `useApp`).
- **Rollback Strategy**: Revert `App.tsx` and `useApp.ts` changes; restore `WorkspaceSettingsModal.tsx` usage.

## 6. Final Verification Wave
- [x] Run `cargo check` and `npm run build` (tsc) to ensure no type regressions.
- [x] **Manual Spot Check**:
    1. Open workspace settings from the sidebar.
    2. Verify all tabs (Basic, Time, Projects, Labels, Advanced) load and function.
    3. Change a setting and save. Verify the update is reflected in the UI.
    4. Click the "Back" button and ensure it returns to the correct workspace view.
    5. Test workspace deletion and ensure it redirects correctly.
