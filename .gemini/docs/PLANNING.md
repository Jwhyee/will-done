# Execution Plan: Remove Weekly and Monthly Retrospectives

## 1. Goal
Completely remove weekly and monthly retrospective features from the application across the database logic, backend commands, and frontend UI, while preserving the daily retrospective functionality.

## 2. Scope
### In-Scope
- Remove "WEEKLY" and "MONTHLY" from the `retroType` enum and related logic in the frontend.
- Remove UI elements for switching to weekly/monthly retrospectives in `RetrospectiveView.tsx`.
- Remove date calculation and stepper logic for weekly/monthly ranges.
- Remove AI prompts and backend handling for weekly/monthly retrospectives in `retrospective.rs`.
- Remove translations related to weekly/monthly retrospectives.
- Ensure all saved retrospectives in the database are treated as "DAILY" if needed, or simply prevent new non-daily entries.

### Out-of-Scope
- Deleting the `retro_type` column from the `retrospectives` table (it is still needed to identify "DAILY" types, even if it's the only type remaining).
- Modifying other unrelated features in the `retrospective` module.

## 3. Architecture Impact
```text
src/
├── features/
│   └── retrospective/
│       ├── RetrospectiveView.tsx        # UI cleanup
│       ├── utils.ts                     # Range calculation cleanup
│       └── components/
│           └── DateSelector.tsx         # Stepper logic cleanup
├── types/
│   └── index.ts                         # Type definition update
└── lib/
    └── i18n.ts                          # Translation removal
src-tauri/
└── src/
    ├── commands/
    │   └── retrospective.rs             # AI prompt and logic cleanup
    └── domain/
        └── retrospective.rs             # Domain model comment update
```

## 4. Execution Plan

### Phase 1: Frontend Type & Translation Cleanup
- [x] Update `src/types/index.ts` to restrict `retroType` to `"DAILY"`.
- [x] Remove `weekly` and `monthly` keys from `src/lib/i18n.ts`.

### Phase 2: Frontend Logic & UI Cleanup
- [x] Remove weekly/monthly range calculations in `src/features/retrospective/utils.ts`.
- [x] Remove weekly/monthly stepper logic in `src/features/retrospective/components/DateSelector.tsx`.
- [x] Simplify `RetrospectiveView.tsx` by removing the type switcher and filtering logic for weekly/monthly.

### Phase 3: Backend Logic Cleanup
- [x] Update `src-tauri/src/commands/retrospective.rs` to remove "WEEKLY" and "MONTHLY" match arms in `generate_retrospective`.
- [x] Update comments in `src-tauri/src/domain/retrospective.rs`.
- [ ] (Optional) Add a migration or one-time query to ensure all existing retrospectives have `retro_type = 'DAILY'` if any weekly/monthly ones exist.

## 5. Risk Mitigation
- **Potential Breaking Changes**: Frontend components relying on the `WEEKLY` or `MONTHLY` types might crash if not updated simultaneously.
- **Rollback Strategy**: Revert changes via Git if critical functionality (Daily Retrospective) is affected.

## 6. Final Verification Wave
- [x] Run `cargo test` to ensure backend logic is sound.
- [x] Run `npm run build` (or equivalent) to ensure no TypeScript errors.
- [x] Manual Spot Check: Open Retrospective view and verify only Daily option is available and functional.
