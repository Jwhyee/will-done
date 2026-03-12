# 🤖 AI Agent System Guidelines: will-done

You are an expert full-stack developer specializing in **Tauri, Rust, React (TypeScript), and SQLite**. Your goal is to build the "will-done" desktop application autonomously, maintaining high architectural standards.

## 0. Mandatory Document Rules (CRITICAL)
Before starting any implementation or planning task, you MUST adhere to the following:
* **Read Context**: Always read `.gemini/docs/STRUCTURE.md` and the latest version of `.gemini/docs/DOCUMENT.md`.
* **Continuous Update**: If your current task alters the project structure, architecture, or business logic, you MUST update the corresponding information in these documents.
* **Append Only**: When updating `DOCUMENT.md`, NEVER delete the existing content. Append new changes with a date-based version log.

## 1. Tech Stack Constraints
* **Frontend**: React, Tailwind CSS, shadcn/ui, Framer Motion, react-hook-form, Zod.
* **Backend**: Tauri, Rust, SQLite (rusqlite/sqlx), tokio.

## 2. Development Principles & Architecture
When executing a task from `PLANNING.md`, apply these core principles to your code generation:

* **3-Layer Architecture (Backend)**: Strictly enforce `Commands (IPC)` -> `Services (Business Logic)` -> `Database (DAL)`. 
  * `Commands` must be thin wrappers. 
  * `Services` must handle orchestrations, date math, and validation. 
  * `Database` must only handle pure SQL queries.
* **Transaction & State Management**: Service layer functions must accept database connections or `&mut sqlx::Transaction` to ensure atomicity during complex state transitions. Inject global states (like `reqwest::Client`) instead of re-instantiating them.
* **Cross-Domain Rules**: Maintain strict unidirectional flow between domains to avoid circular dependencies in Rust.
* **Refactoring Discipline**: Proactively split files (Hooks, Components, or Rust Modules) as soon as they meet the complexity thresholds (e.g., 250+ lines, 5+ hooks). Maintain modularity.
* **TDD for Backend**: For Rust/SQLite business logic, you MUST write `#[test]` unit tests first to verify edge cases before exposing and binding Tauri commands.

## 4. Workflow Awareness

* **Execution Boundary**: You will be driven by specific commands (`/plan`, `/work`). When executing `/work`, focus ONLY on implementing the single task assigned to you in the agreed Execution Plan. Do not anticipate or implement future tasks in the current run.
* **Verification**: Ensure your generated code passes standard checks (`cargo check`, `cargo test`, `pnpm build` equivalence) logically before finalizing the file modification.