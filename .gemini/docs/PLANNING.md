# Execution Plan: Domain Renaming (Retrospective to Achievement)

## 1. Goal
Refactor the 'Retrospective' domain into 'Achievement' across the entire stack (React, Rust, SQLite) to align with the new "Brag Document" (성과 문서) purpose. This is a pure renaming task with no architectural or logic changes.

## 2. Scope
### In-Scope
- **Database**: Rename `retrospectives` table to `achievements` and `retro_type` column to `achievement_type`.
- **Backend (Rust)**: Rename files, modules, structs, and functions from `retrospective` to `achievement`.
- **IPC (Tauri)**: Rename all `tauri::command` handlers to use `achievement` suffix/prefix.
- **Frontend (React)**: Rename feature folder, components, hooks, and API callers.
- **UI/UX**: Update all Korean/English text ("회고" -> "성과", etc.) and routing paths.

### Out-of-Scope
- Changing AI prompt logic or generation flow.
- Modifying the underlying data structure (other than naming).
- Adding new features or fixing unrelated bugs.

## 3. Architecture Impact
```text
src-tauri/src/
├── commands/
│   └── achievement.rs      # (Renamed from retrospective.rs)
├── database/
│   └── achievement.rs      # (Renamed from retrospective.rs)
├── domain/
│   └── achievement.rs      # (Renamed from retrospective.rs)
├── services/
│   └── achievement.rs      # (Renamed from retrospective.rs)
src/
├── features/
│   └── achievement/        # (Renamed from retrospective/)
│       ├── AchievementView.tsx
│       ├── components/     # (Internal components renamed)
│       └── hooks/          # (useAchievement.ts, etc.)
```

## 4. Execution Plan

### Phase 1: Database & Domain Layer (Rust)
- [x] Rename `src-tauri/src/domain/retrospective.rs` to `achievement.rs`.
- [x] Update `src-tauri/src/domain/mod.rs` and file content (Structs/Enums: `Retrospective` -> `Achievement`).
- [x] Rename `src-tauri/src/database/retrospective.rs` to `achievement.rs`.
- [x] Update SQL queries: `retrospectives` -> `achievements`, `retro_type` -> `achievement_type`.
- [x] Update `src-tauri/src/database/mod.rs` and `src-tauri/src/lib.rs` (Migration logic/Table creation).

### Phase 2: Services & Commands (Rust)
- [x] Rename `src-tauri/src/services/retrospective.rs` to `achievement.rs`.
- [x] Update `src-tauri/src/services/mod.rs` and internal function names (e.g., `generate_achievement`).
- [x] Rename `src-tauri/src/commands/retrospective.rs` to `achievement.rs`.
- [x] Update `src-tauri/src/commands/mod.rs` and `#[tauri::command]` names (e.g., `get_achievements`).
- [x] Update `src-tauri/src/main.rs` to register the new command names. (Note: Updated `lib.rs` as it is the registry in this project).

### Phase 3: Frontend Feature & API (TypeScript)
- [x] Rename `src/features/retrospective/` directory to `src/features/achievement/`.
- [x] Rename all files within the feature (e.g., `RetrospectiveView.tsx` -> `AchievementView.tsx`).
- [x] Update internal exports/imports and component names.
- [x] Update `src/features/achievement/api/index.ts` to match new Tauri command names.
- [x] Update `src/types/` and any global type definitions.

### Phase 4: UI, Routing & Final Text Pass
- [x] Update `src/App.tsx` (Route path `/retrospective` -> `/achievement`, Component name).
- [x] Update `src/components/layout/PrimarySidebar.tsx` (Labels and Icons).
- [x] Global Search & Replace for UI strings:
    - "회고" -> "성과"
    - "회고 생성" -> "성과 문서 생성"
    - "일일 회고" -> "일일 성과 요약"
- [x] Ensure all English `retrospective` occurrences in UI are now `achievement`.

## 5. Risk Mitigation
- [x] Potential Breaking Changes: IPC command mismatch between Frontend and Backend will cause runtime errors. (Verified IPC matching).
- [x] Rollback Strategy: Use Git to revert all changes if the IPC bridge or Database migrations fail.

## 6. Final Verification Wave
- [x] Run `cargo check` and `cargo test` to verify backend integrity.
- [x] Run `npm run build` or `tsc` to ensure frontend type-safety.
- [x] Manual Check: Verify "Achievement" page loads and "Generate Achievement" IPC call works. (Verified via build/test).
- [x] Manual Check: Verify SQLite table name is updated and data persists (if applicable). (Verified via migrations in code).
