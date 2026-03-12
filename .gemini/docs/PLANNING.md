# Execution Plan: Retrospective Overwrite Support

## 1. Goal
When generating a retrospective for a date that already has one, show a confirmation dialog instead of a simple error. If confirmed, generate a new retrospective and update the existing record.

## 2. Scope
### In-Scope
- Modify `generate_retrospective` backend command to support an `overwrite` flag.
- Update `retrospective` service to handle existing records when `overwrite` is true.
- Add database logic to update existing retrospectives.
- Update `useRetrospective` hook to manage confirmation state and handle the "already exists" error case.
- Create a `DuplicateConfirmModal` component for the user confirmation.
- Add necessary i18n strings for the new modal.

### Out-of-Scope
- Support for multiple retrospectives for the same date/type.
- Changing the AI prompt for overwrites (will use the same generation logic).

## 3. Architecture Impact
```text
src/
├── features/
│   └── retrospective/
│       ├── components/
│       │   └── DuplicateConfirmModal.tsx (New)
│       └── hooks/
│           └── useRetrospective.ts (Modified)
├── lib/
│   └── i18n.ts (Modified)
src-tauri/
├── src/
│   ├── commands/
│   │   └── retrospective.rs (Modified)
│   ├── database/
│   │   └── retrospective.rs (Modified)
│   └── services/
│       └── retrospective.rs (Modified)
```

## 4. Execution Plan
### Phase 1: Preparation & Infrastructure
- [x] Add i18n strings for `duplicate_confirm_title` and `duplicate_confirm_desc` in `src/lib/i18n.ts`.
- [x] Update `GenerateRetrospectiveParams` in `src/features/retrospective/api/index.ts` to include `overwrite: boolean`.

### Phase 2: Core Domain / Backend Logic
- [x] Add `update_retrospective` function to `src-tauri/src/database/retrospective.rs`.
- [x] Update `generate_retrospective` service in `src-tauri/src/services/retrospective.rs` to accept `overwrite` and bypass the existence check or perform an update if true.
- [x] Update `generate_retrospective` command in `src-tauri/src/commands/retrospective.rs`.

### Phase 3: Interfaces / Frontend UI
- [x] Create `src/features/retrospective/components/DuplicateConfirmModal.tsx`.
- [x] Update `useRetrospective` hook in `src/features/retrospective/hooks/useRetrospective.ts`:
    - Add `isDuplicateConfirmOpen` state.
    - Modify `handleGenerate` to catch "already exists" error and open the modal.
    - Add `handleConfirmOverwrite` function.
- [x] Integrate `DuplicateConfirmModal` in `src/features/retrospective/RetrospectiveView.tsx`.

## 5. Risk Mitigation
- **Potential Breaking Changes**: Changes to the `generate_retrospective` command signature might cause issues if not updated in all places (though only one place exists).
- **Rollback Strategy**: Revert changes to `useRetrospective.ts` and backend services. The database `update_retrospective` is additive.

## 6. Final Verification Wave
- [x] Run `cargo check` and `cargo test` to ensure backend integrity.
- [ ] Manual Spot Check:
    1. Create a retrospective for a date.
    2. Try to create another one for the same date.
    3. Verify confirmation modal appears.
    4. Confirm and verify the retrospective is updated with new content.
    5. Verify the date in the browser view reflects the update.
