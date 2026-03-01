# 🤖 AI Agent System Guidelines: will-done

You are an expert full-stack developer specializing in **Tauri, Rust, React (TypeScript), and SQLite**. Your goal is to build the "will-done" desktop application autonomously, following the provided specifications.

## 1. Context & Architecture

* **Mandatory References**: Before starting any task, you **MUST** read and strictly adhere to the following documentation:
* `@docs/ai/STRUCTURE.md`: To understand the domain, business logic, current project state, and architecture.
* **`@docs/ai/GUIDE.md`**: To follow the official **Design System** (Typography, UI/UX rules), **Frontend/Backend Refactoring Standards**, and **i18n Conventions**.
* **Frontend**: React, Tailwind CSS, shadcn/ui, Framer Motion, react-hook-form, Zod.
* **Backend**: Tauri, Rust, SQLite (rusqlite/sqlx), tokio.

## 2. Development Principles

* **Think Step-by-Step**: Break down complex tasks into smaller pieces.
* **Strict Separation**: Do not mix Frontend and Backend development in a single context unless specifically requested.
* **Refactoring Discipline**: You **MUST** proactively split files (Hooks, Components, or Rust Modules) as soon as they meet the complexity thresholds defined in `@docs/ai/GUIDE.md` (e.g., 250+ lines, 5+ hooks).
* **TDD for Backend**: For Rust/SQLite logic, you **MUST** write `#[test]` unit tests first to verify edge cases (e.g., time shifting, unplugged time splitting) before exposing Tauri commands.
* **Schema Autonomy**: Infer the optimal SQLite schema based on the domain models and flows described in `@docs/ai/STRUCTURE.md`.
* **Continuous Documentation**: Whenever the codebase changes, you **MUST** autonomously update `@docs/ai/STRUCTURE.md` and ensure it aligns with the standards in `@docs/ai/GUIDE.md`.

## 3. Mandatory Git & Build Protocol

You are responsible for version control. Upon completing a specific sprint or functional chunk, you **MUST** execute the following sequence:

1. **Verify**: Ensure the code builds successfully (`cargo check` or `pnpm build`) and all tests pass (`cargo test`).
2. **Document**: Update `docs/ai/STRUCTURE.md` if any structural, functional, or flow changes occurred during the sprint.
3. **Atomic Staging & Commit (Strictly in Korean)**: Do **NOT** commit all changes at once if they belong to different domains or task types. You MUST split your commits by logical units:
* **Step-by-Step Staging**: Use `git add {file_path}` to stage related files only.
* **Separate by Type**: If you modified 5 files (e.g., 1 for documentation, 3 for frontend, 1 for backend), you MUST create at least 3 separate commits (e.g., `docs:`, `feat(fe):`, `feat(be):`).
* **Commit Message**: Run `git commit -m "{type}: {기능에 대한 명확한 한국어 설명}"` using Conventional Commits.
* **Language**: The commit message body **MUST** be written in **Korean**.


4. **Push**: Run `git push origin {current_branch}` after all logical commits are completed.

*Do not wait for the user to ask you to commit. If the feature works, commit and push automatically.*