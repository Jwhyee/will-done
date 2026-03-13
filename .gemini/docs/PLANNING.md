# Execution Plan: Implement "Back to Today" Button in Timeline

## 1. Goal
Provide a way for users to quickly return to the current logical date's timeline when viewing past or future dates.

## 2. Scope
### In-Scope
- Update `useWorkspace` hook to include `isNotToday` and `handleGoToToday`.
- Add a conditional "Back to Today" button at the bottom of the timeline list in `WorkspaceTimeline`.
- Add i18n support for the button text.
- Ensure immediate refetch/update when clicking the button.

### Out-of-Scope
- Changing the calendar selection logic in the header.
- Modifying how logical days are calculated in the backend.

## 3. Architecture Impact
```text
src/
├── features/workspace/
│   ├── components/timeline/
│   │   └── WorkspaceTimeline.tsx   # Add conditional button
│   ├── hooks/
│   │   └── useWorkspace.ts         # Add logic & handlers
│   └── WorkspaceView.tsx           # Pass necessary props
└── lib/
    └── i18n.ts                     # Add translation keys
```

## 4. Execution Plan
### Phase 1: Preparation & Infrastructure
- [x] Add translation keys `timeline.button.go_to_today` to `src/lib/i18n.ts`.

### Phase 2: Core Domain / Hook Logic
- [x] Modify `useWorkspace.ts` to accept `selectedDate`, `logicalDate`, and `onDateChange`.
- [x] Implement `isNotToday` boolean and `handleGoToToday` function in `useWorkspace.ts`.
- [x] Update `WorkspaceView.tsx` to pass the required props to `useWorkspace`.

### Phase 3: Interfaces / Frontend UI
- [x] Update `WorkspaceTimeline.tsx` to accept `isNotToday` and `onGoToToday`.
- [x] Add the "Back to Today" button at the bottom of the timeline list with `lucide-react` icon (e.g., `RotateCcw` or `ArrowLeft`).
- [x] Style the button using shadcn/ui and Tailwind (e.g., `variant="outline"`, `w-full` or centered).

## 5. Risk Mitigation
- **Potential Breaking Changes**: Incorrect date comparison might show the button on the current day if not handled carefully.
- **Rollback Strategy**: Revert changes to `useWorkspace.ts` and `WorkspaceTimeline.tsx`.

## 6. Final Verification Wave
- [x] Verify button visibility only when viewing non-today dates.
- [x] Verify button click immediately resets the view to today.
- [x] Run `npm run test` (if applicable) and check for linting/type errors.
- [x] Manual check: Change date via calendar, ensure button appears, click it, ensure it disappears and date resets.
