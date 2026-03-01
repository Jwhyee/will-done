# 📘 AI Development & Design Guide (v1.0)

This document defines the **strict guidelines** for maintaining UI/UX consistency and a scalable code architecture for the **Will-done** project. All AI agents and developers MUST adhere to these rules.

---

## 🎨 1. Design System & Typography

### 🅰️ Typography Standards
- **Main Title**: `text-2xl` (font-black, tracking-tighter). **Limit to ONE per page.**
- **Section Title**: `text-lg` (font-bold). Used for card headers or section dividers.
- **Description/Label**: `text-xs` (font-medium, text-text-secondary).
- **Content Text**: `text-sm` (leading-relaxed). Standard for body text and markdown content.

### 🎨 Visual Elements & Rules
- **Icon/Emoji Restriction**: Emojis or decorative icons are **STRICTLY PROHIBITED** except within functional buttons (e.g., "✨ Generate"). Remove all floating or decorative Sparkles/Emojis from headers and backgrounds.
- **Visual Hierarchy**: 
    - Use `background` for the base layer.
    - Use `surface` for cards/containers.
    - Use `surface-elevated` for highlighted interactive elements.
    - Maintain a consistent 1px `border` for all element boundaries.

---

## ⚛️ 2. Frontend Guidelines (React/TypeScript)

### 📂 Mandatory File Refactoring (Decomposition)
Immediately split the file into sub-components or hooks if **ANY** of the following conditions are met:
1. **Line Count**: A single `.tsx` file exceeds **250 lines**.
2. **Hook Density**: A component uses **5 or more** Hooks (e.g., `useState`, `useEffect`). Extract logic to `useDomain.ts`.
3. **Component Nesting**: More than **2 sub-components** are declared within a single file.
4. **Tauri Invocation**: A single file contains **3 or more** `invoke()` calls.

### 🛠️ State Management & Safety
- **Atomic State Updates**: To prevent `date-fns` parsing errors during tab transitions (e.g., Daily ↔ Weekly), you **MUST** validate the `inputValue` format via Regex before updating the `type` state.
- **Runtime Safety**: Use **Optional Chaining** (`?.`) for all object properties.
- **Error Boundaries**: Always provide **Fallback UIs** (Skeletons or Empty States) and default values for asynchronous data.

---

## 🦀 3. Backend Guidelines (Rust/Tauri)

### 📂 Module Architecture & Splitting
1. **lib.rs Maintenance**: `lib.rs` SHALL only contain module declarations (`mod`) and `generate_handler!` registration. No business logic allowed.
2. **Command Decomposition**: If a single `.rs` file contains **5 or more** `#[tauri::command]` functions, split them into sub-modules (e.g., `commands/retro/create.rs`).
3. **Database Isolation**: Direct SQL execution (e.g., `sqlx::query!`) within command handlers is **PROHIBITED**. All DB operations must be isolated in the `database/` directory using the Repository pattern.

### 🛠️ Communication & Conventions
- **Struct Serialization**: Apply `#[serde(rename_all = "camelCase")]` to all structs interacting with the frontend.
- **Unified Error Handling**: Return a custom `AppError` enum instead of raw `String` errors to ensure consistent toast messaging in the UI.

---

## 🌐 4. Internationalization (i18n)

### ✍️ Text Management Rules
1. **Zero Hard-coding**: Every user-facing string MUST be registered in `src/lib/i18n.ts`.
2. **Safe Referencing**: Always use Optional Chaining with fallbacks: `t.common?.year || 'Year'`.
3. **Language Purity**: Avoid dual-language labels (e.g., "Type (유형)"). Display only the current active language string.
4. **Dynamic Strings**: Use `.replace('{var}', value)` for strings containing dynamic variables.

---

## 📑 5. Documentation & Context
- **Structure Updates**: AI agents **MUST** update `@docs/ai/STRUCTURE.md` whenever the file system or architecture changes.