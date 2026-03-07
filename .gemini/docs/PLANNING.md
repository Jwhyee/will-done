# Execution Plan: Fix TaskForm TimePicker Click-Outside Bug

## 1. Goal
Fix a bug where clicking an item in the `TimePicker` dropdown inside an expanded `TaskForm` is incorrectly registered as an outside click, causing the form to collapse unexpectedly.

## 2. Scope
### In-Scope
- Modify the outside click detection logic related to `TaskForm` and `TimePicker`.
- Ensure clicks inside the `TimePicker` dropdown or popover are correctly identified as being "inside" the `TaskForm`.

### Out-of-Scope
- Refactoring the entire `TaskForm` component.
- Modifying backend task creation logic.
- Changing the visual design of the `TimePicker`.

## 3. Architecture Impact
```text
src/
├── features/
│   └── workspace/
│       └── components/
│           ├── TaskForm.tsx (Modify)
│           └── TimePicker.tsx (Review/Modify)
└── hooks/
    └── useOnClickOutside.ts (Review/Modify, if necessary)
```

## 4. Execution Plan
*(Use `- [ ]` for all actionable steps. Break down into atomic tasks.)*
### Phase 1: Preparation & Infrastructure
- [x] Investigate the DOM structure of the `TimePicker` dropdown (e.g., if it uses React portals or absolute positioning).
- [x] Identify how `useOnClickOutside` or similar click-away logic is applied in the `TaskForm` component.

### Phase 2: Interfaces / Frontend UI
- [x] Update the click-outside handler to safely ignore clicks originating from the `TimePicker` dropdown. This may involve checking the event target against specific class names, data attributes, or utilizing Radix UI/portal specific exclusions.
- [x] If the `TimePicker` renders into a portal outside the `TaskForm` DOM node, implement a mechanism (like a shared ref, or portal container check) so the outside-click logic recognizes it as part of the form.
- [x] Verify the form remains expanded when interacting with the time picker, but still correctly collapses when clicking completely outside the form area.

## 5. Risk Mitigation
- **Potential Breaking Changes**: Modifying the global or hook-level outside-click logic might accidentally break other outside-click behaviors (e.g., leaving the form expanded when clicking other unrelated popovers).
- **Rollback Strategy**: Revert changes to `TaskForm.tsx` and the click-outside logic to restore previous behavior.

## 6. Final Verification Wave
- [x] Run `cargo test` and `cargo check` (or equivalent backend validation)
- [x] Run `npm run build` or linting (or equivalent frontend validation)
- [x] Manual Spot Check instructions:
  - Expand the `TaskForm`.
  - Open the `TimePicker`.
  - Click a time option inside the dropdown.
  - Verify the selected time updates and the form **stays expanded**.
  - Click completely outside the form.
  - Verify the form **collapses**.