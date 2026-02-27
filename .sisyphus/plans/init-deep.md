# Plan for `will-done` Project Initialization (`/init-deep`)

## Overview
This plan outlines the foundational steps to establish quality gates and best practices for the `will-done` Tauri desktop application. It covers setting up backend unit testing guidelines, configuring frontend linting and formatting with ESLint and Prettier, and managing a deprecated Rust dependency. The plan also includes generating hierarchical `AGENTS.md` files to document these decisions and provide clear guidance for future development.

## Key Decisions Made by User
- **Testing Strategy**: Implement basic unit tests for critical backend (Rust) logic only. No frontend testing at this stage.
- **CI/CD**: No CI/CD pipeline is required at this time.
- **Deprecated Rust Dependency**: Automatically identify and update the deprecated dependency in `src-tauri/Cargo.lock` to a stable version.
- **Linting/Formatting**: Configure ESLint and Prettier for both frontend (React/TypeScript) and backend (Rust) to enforce consistent code style.
- **Linting Scope**: Establish linting/formatting as a baseline for *new code only*. Existing code will not be auto-fixed by this initiative.
- **Frontend Linting Ruleset**: Use a standard React/TypeScript ruleset (recommended ESLint defaults with TypeScript).

## Scope
- **IN**: 
    - Setting up ESLint and Prettier for `src/` (React/TypeScript) and documenting Rust unit testing guidelines for `src-tauri/`.
    - Automatically identifying and updating the deprecated Rust dependency in `src-tauri/Cargo.lock`.
    - Creating `AGENTS.md` files at the project root, `src/`, and `src-tauri/`.
    - Adding `lint` and `format` scripts to `package.json`.
- **OUT**: 
    - Implementing any frontend tests (unit, integration, E2E).
    - Implementing any CI/CD pipelines (GitHub Actions, Jenkins, etc.).
    - Auto-fixing existing frontend code for linting/formatting issues beyond a safe `--fix` that doesn't alter logic.
    - Writing actual Rust unit tests (only the requirement will be documented).
    - Addressing any other technical debt not explicitly related to the deprecated dependency or linting/formatting setup.

## Guardrails (from Metis)
- **Linting Rabbit Hole**: Applying ESLint to an existing unlinted codebase can result in hundreds of errors. The plan explicitly avoids fixing all existing errors in this PR, focusing on a new code baseline.
- **Dependency Hell**: Updating one deprecated Rust dependency might require updating its parent crates, leading to a cascade of updates. The plan will use `cargo update -p <crate_name>` to isolate the update.
- **Over-engineering AGENTS.md**: `AGENTS.md` files will be concise, focusing strictly on the user's core decisions and not providing overly generic advice.

## Auto-Resolved Gaps & Defaults Applied
- **Linting Ruleset**: Applied "Standard React/TS Ruleset" as per user's choice.
- **Deprecated Dependency Identification**: Will be automatically identified using `cargo audit` or `cargo tree` by the agent as per user's choice.

## Work Plan
This plan is structured into two waves to optimize parallel execution.

### Wave 1: Core Configuration (Parallel Execution)
These tasks can be executed simultaneously as they are independent.

#### Task 1: Update Deprecated Rust Dependency
- **Description**: Automatically identify the deprecated dependency in `src-tauri/Cargo.lock` (using `cargo audit` or `cargo tree`) and update it to the latest stable version. Ensure the backend still compiles successfully after the update.
- **Delegation Recommendation**: `quick` category, `git-master` skill.
- **Acceptance Criteria**: `cd src-tauri && cargo check` (should exit with code 0).
- **Commit Strategy**: `chore(backend): update deprecated dependency [name]`

#### Task 2: Configure ESLint & Prettier
- **Description**: Set up ESLint and Prettier for the React/TypeScript frontend (`src/`). This involves creating `.eslintrc.json` (or `.cjs`), `.prettierrc`, `.eslintignore`, and `.prettierignore` files. Add `lint` and `format` scripts to `package.json`. The configuration will use a standard React/TypeScript ruleset. Existing code will *not* be auto-fixed beyond safe, non-logic-altering `--fix` operations.
- **Delegation Recommendation**: `visual-engineering` category, `frontend-ui-ux`, `git-master` skills.
- **Acceptance Criteria**: `npm run lint --if-present` and `npm run format --check` (or `npx prettier --check "src/**/*.{ts,tsx,css}"`). These commands must execute successfully, confirming valid configurations (even if lint reports errors, it must parse).
- **Commit Strategy**: `chore(frontend): configure eslint and prettier for react/ts`

### Wave 2: Documentation (Sequential Execution)
This task depends on the completion of Wave 1, as the `AGENTS.md` files need to reflect the finalized configurations.

#### Task 3: Generate Hierarchical `AGENTS.md`
- **Description**: Create three `AGENTS.md` files:
    - **Project Root `AGENTS.md`**: Document global project guidelines, including the decision *not* to implement CI/CD at this time, and a high-level overview of the project architecture.
    - **`src/AGENTS.md` (Frontend)**: Document frontend-specific guidelines, emphasizing the use of the newly configured ESLint and Prettier for all new React/TypeScript code.
    - **`src-tauri/AGENTS.md` (Backend)**: Document backend-specific guidelines, explicitly stating the requirement for writing unit tests for critical Rust logic.
- **Delegation Recommendation**: `writing` category, `git-master` skill.
- **Acceptance Criteria**: `cat AGENTS.md && cat src/AGENTS.md && cat src-tauri/AGENTS.md` (all three files must exist and output their contents).
- **Commit Strategy**: `docs: establish hierarchical AGENTS.md guidelines`

## Final Verification Wave
Upon completion of all tasks, a final verification will ensure:
1. The backend (`src-tauri/`) compiles without warnings related to the updated dependency.
2. The `lint` and `format` scripts in `package.json` run successfully for the frontend (`src/`).
3. The three `AGENTS.md` files are correctly generated and contain the specified guidance.

This plan provides a clear, actionable roadmap for establishing key development standards and documentation for the `will-done` project.