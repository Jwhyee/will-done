# Execution Plan: AI Model Selection for Retrospectives

## 1. Goal
Implement a feature allowing users to manually select an AI model for generating retrospectives, with specialized fallback logic in the backend and enhanced error handling in the frontend.

## 2. Scope
### In-Scope
- Backend: Update `generate_retrospective` command to accept an optional `target_model`.
- Backend: Implement logic to bypass fallback if a specific model is selected.
- Frontend: Add a model selection UI (Select Box) to the Retrospective view.
- Frontend: Fetch and display active AI models from the database.
- Frontend: Display a hint for Free Tier users regarding model selection.
- Frontend: Handle model-specific errors with desktop notifications and helpful links.

### Out-of-Scope
- Modifying the AI prompt logic.
- Adding new AI providers (only Gemini is supported).
- Changing the retrospective storage schema.

## 3. Architecture Impact
```text
src-tauri/src/
├── commands/
│   └── retrospective.rs    # Update command signature, add fetch_available_models
├── services/
│   ├── gemini.rs           # Add execute_single_model logic
│   └── retrospective.rs    # Update orchestration logic for target_model
src/
├── features/
│   └── retrospective/
│       ├── api/
│       │   └── index.ts    # Add fetchAvailableModels API
│       ├── components/
│       │   └── CreateTabContent.tsx # Add Select Box & Hint UI
│       └── hooks/
│           └── useRetrospective.ts  # Add model selection & error logic
```

## 4. Execution Plan

### Phase 1: Backend Infrastructure (Rust)
- [x] Update `src-tauri/src/services/gemini.rs`: Add `execute_single_model` that tries only one model and returns error immediately on failure (429, etc.).
- [x] Update `src-tauri/src/services/retrospective.rs`: Modify `generate_retrospective` to accept `target_model: Option<String>` and branch logic between `execute_with_fallback` and `execute_single_model`.
- [x] Update `src-tauri/src/commands/retrospective.rs`: Update `generate_retrospective` command signature to include `target_model`.
- [x] Verify: Add/run `#[test]` in `services/retrospective.rs` to ensure branching logic works as expected.

### Phase 2: Frontend API & State (TypeScript/React)
- [x] Update `src/features/retrospective/api/index.ts`: Add `fetchAvailableModels` call and update `GenerateRetrospectiveParams` type.
- [x] Update `src/features/retrospective/hooks/useRetrospective.ts`:
    - Add state for `availableModels` and `selectedModel`.
    - Fetch active models on mount using `retrospectiveApi.fetchAvailableModels`.
    - Update `handleGenerate` to include `selectedModel` in the payload.
    - Implement error handling: trigger `sendNotification` and show toast with clickable link to Google AI Studio rate limit page if a specific model fails.

### Phase 3: UI Implementation (React)
- [x] Update `src/features/retrospective/components/CreateTabContent.tsx`:
    - Add a `Select` component for model selection.
    - Default option: "Latest Model" (sends `null`).
    - Map `availableModels` to select options.
    - Add the conditional hint message for free users: "Free Tier는 사용 가능한 모델 폭이 좁으므로, '최신 모델'을 선택하는 것을 권장합니다."

## 5. Risk Mitigation
- **Potential Breaking Changes**: Updating the Tauri command signature requires matching changes in the frontend API call to avoid IPC serialization errors.
- **Rollback Strategy**: Revert to the previous `generate_retrospective` signature and restore `execute_with_fallback` as the only execution path.

## 6. Final Verification Wave
- [x] Run `cargo check` and `cargo test` to verify backend integrity.
- [x] Run `pnpm build` (or equivalent) to ensure no TypeScript regressions.
- [x] Manual Check: Verify that selecting "Latest Model" still uses fallback logic.
- [x] Manual Check: Verify that selecting a specific model skips fallback and shows the correct error/notification on failure.
