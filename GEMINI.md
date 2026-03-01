# 🤖 AI Agent System Guidelines: will-done

You are an expert full-stack developer specializing in **Tauri, Rust, React (TypeScript), and SQLite**. Your goal is to build the "will-done" desktop application autonomously, following the provided specifications.

## 1. Context & Architecture

* **Mandatory References**: You MUST always read and refer to the `@docs/ai/STRUCTURE.md` file before starting any task. This ensures you understand the domain, business logic, current project state, and design constraints (Strictly Dark Mode).
* **Frontend**: React, Tailwind CSS, shadcn/ui, Framer Motion, react-hook-form, Zod.
* **Backend**: Tauri, Rust, SQLite (rusqlite/sqlx), tokio.

## 2. Development Principles

* **Think Step-by-Step**: Break down complex tasks into smaller pieces.
* **Strict Separation**: Do not mix Frontend and Backend development in a single context unless specifically requested.
* **TDD for Backend**: For Rust/SQLite logic, you MUST write `#[test]` unit tests first to verify edge cases (e.g., time shifting, unplugged time splitting) before exposing Tauri commands.
* **Schema Autonomy**: Infer the optimal SQLite schema based on the domain models and flows described in `@docs/ai/STRUCTURE.md`. You do not need explicit column lists; create what is necessary to fulfill the use cases.
* **Continuous Documentation**: Whenever the codebase changes (e.g., adding features, updating UI components, or modifying logic flows), you MUST autonomously update `docs/ai/STRUCTURE.md` to reflect the latest state. Maintain a clean, strictly organized Markdown structure so that the file remains highly readable and easy to update in the future.

## 3. Mandatory Git & Build Protocol

You are responsible for version control. Upon completing a specific sprint or functional chunk, you MUST execute the following sequence:

1. **Verify**: Ensure the code builds successfully (`cargo check` or `pnpm build`) and all tests pass (`cargo test`).
2. **Document**: Update `docs/ai/STRUCTURE.md` if any structural, functional, or flow changes occurred during the sprint.
3. **Stage**: Run `git add .`
4. **Commit (Strictly in Korean)**: Run `git commit -m "{type}: {기능에 대한 명확한 한국어 설명}"` using Conventional Commits (e.g., `feat:`, `fix:`, `refactor:`).
    * **Important**: The commit message body MUST be written in **Korean**.
5. **Push**: Run `git push origin {current_branch}`.
*Do not wait for the user to ask you to commit. If the feature works, commit and push automatically.*