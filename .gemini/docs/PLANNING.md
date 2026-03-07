# Execution Plan: Completion Modal Bug Fix & UX Improvement

## 1. Goal
Fix the infinite loop bug where the Completion Modal (Transition Modal) keeps reopening after being closed via click-outside or the 'X' button. Improve UX by adding a "Continue" button and unifying all cancellation logic to safely abort the completion process.

## 2. Scope
### In-Scope
- Add a "Continue" (진행 중) button to the `TransitionModal`.
- Unify event handlers for the "Continue" button, 'X' button, and Click-outside (`onInteractOutside`).
- Implement a "dismissal" mechanism in `useApp.ts` to prevent the auto-opening logic from re-triggering the modal for the same task block immediately after cancellation.
- Ensure state is fully reset when the modal is closed.
### Out-of-Scope
- Changing the backend logic for task completion (unless absolutely necessary for state synchronization).
- Redesigning the entire transition flow.

## 3. Architecture Impact
```text
src/
├── lib/
│   └── i18n.ts             # Add new translation keys
├── hooks/
│   └── useApp.ts           # Implement dismissal logic to stop infinite loop
└── features/
    └── workspace/
        └── components/
            └── modals/
                └── TransitionModal/
                    ├── index.tsx             # Unify event handlers and close logic
                    └── CompletionSection.tsx # Add "Continue" button
```

## 4. Execution Plan

### Phase 1: Preparation & Internationalization
- [x] Add `continue_btn` translation key to `main.transition` in `src/lib/i18n.ts` for both `ko` and `en`.
    - `ko`: "계속 진행"
    - `en`: "Still working"

### Phase 2: Core Logic (Infinite Loop Fix)
- [x] Modify `useApp.ts` to include a `dismissedBlockId` state or similar mechanism.
- [x] Update `fetchMainData` in `useApp.ts` to skip auto-opening the `TransitionModal` if the current active block's ID matches `dismissedBlockId`.
- [x] Update `onTransition` or create a new `onDismissTransition` to update this state.

### Phase 3: UI Implementation & Event Integration
- [x] Update `TransitionModal/CompletionSection.tsx` to include the "Continue" button below the submit button.
- [x] Update `TransitionModal/index.tsx` to:
    - Add an 'X' button to `DialogHeader` (or ensure shadcn/ui Dialog's default close button is visible and hooked up).
    - Map the new "Continue" button, 'X' button, and `onOpenChange` (which handles click-outside) to a single `handleCancel` function.
    - Ensure `handleCancel` calls the dismissal logic in `useApp.ts`.

## 5. Risk Mitigation
- **Potential Breaking Changes**: If the dismissal state is not cleared appropriately, the auto-modal might not appear when it should (e.g., if the user manually extends the task and it ends again).
- **Rollback Strategy**: Revert `useApp.ts` logic to the previous auto-opening condition and remove the new UI components.

## 6. Final Verification Wave
- [x] Run `cargo check` to ensure backend stability (though minimal changes expected).
- [x] Run `npm run build` or `tsc` to verify frontend types.
- [ ] **Manual Spot Check**:
    1. Start a task and wait for it to end (or manually set end time to past).
    2. Verify `TransitionModal` opens automatically.
    3. Click outside the modal. Verify it closes and DOES NOT reopen in 1 second.
    4. Verify the "Continue" button exists and performs the same closing action.
    5. Refresh the app and ensure the modal can reappear if the task is still in "NOW" status and past its end time (or decide if dismissal should persist).
