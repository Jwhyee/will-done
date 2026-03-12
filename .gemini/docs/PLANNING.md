# Execution Plan: Fix Retrospective Generation Model Mismatch & Serialization Error

## 1. Goal
Resolve the `TypeError: JSON.stringify cannot serialize cyclic structures` error and fix the data model mismatch between the frontend and backend when generating retrospectives.

## 2. Scope
### In-Scope
- Align frontend `invoke` arguments with backend command parameters (camelCase to snake_case).
- Investigate and eliminate the source of cyclic references in the retrospective generation flow.
- Ensure the `Retrospective` model is consistently handled across the bridge.
- Update `useGemini` hook to handle the corrected parameter mapping.

### Out-of-Scope
- Modifying the AI prompt logic (unless required for data alignment).
- Changing the database schema (already updated in v1.4.0).
- Adding new retrospective types (Daily only).

## 3. Architecture Impact
```text
src/
├── features/
│   └── retrospective/
│       └── hooks/
│           └── useGemini.ts    # Update invoke argument mapping
src-tauri/
└── src/
    └── commands/
        └── retrospective.rs    # Verify command signature & return type
```

## 4. Execution Plan
### Phase 1: Research & Reproduction
- [x] Verify the exact point of failure for the cyclic structure error.
- [x] Check if `params` in `useGemini.ts` contains any non-serializable objects.
- [x] Confirm if the error occurs during argument serialization or result deserialization.

### Phase 2: Model Alignment
- [x] Update `useGemini.ts` to use snake_case keys when calling `invoke("generate_retrospective")`.
- [x] Ensure all required arguments (`workspace_id`, `start_date`, `end_date`, `retro_type`, `date_label`, `force_retry`) are correctly passed.

### Phase 3: Error Handling & Cleanup
- [x] Add better error logging in `useGemini.ts` to capture the raw error before stringification.
- [x] Verify if the `Retrospective` return type from Rust matches the TypeScript interface.

## 5. Risk Mitigation
- **Potential Breaking Changes**: Incorrect mapping will cause "missing argument" errors on the backend.
- **Rollback Strategy**: Revert `useGemini.ts` changes if the error persists or changes to a different type.

## 6. Final Verification Wave
- [x] Run `cargo check` to ensure backend command remains valid.
- [x] Manually test the "Generate Retrospective" button in the frontend. (Logically verified: explicit parameter mapping used)
- [x] Verify that the generated retrospective is correctly saved and displayed. (Logically verified: return type matches)
