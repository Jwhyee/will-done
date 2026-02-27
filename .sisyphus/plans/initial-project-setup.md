# Work Plan: Initial Project Setup for "will-done"

This plan details the steps to create a complete boilerplate for the "will-done" project. It incorporates guardrails to ensure a non-interactive and robust setup process. The chosen package manager is `pnpm`.

## Plan Overview

- [x] **Phase 1: Scaffolding**: Create the initial Tauri + React + TS application in a temporary directory to avoid conflicts, then move the files to the project root.
- [x] **Phase 2: Frontend Configuration**: Install and configure Tailwind CSS and all required frontend libraries.
- [x] **Phase 3: Backend Configuration**: Add all required Rust crates to the `Cargo.toml` file.
- [x] **Phase 4: UI & Directory Setup**: Initialize `shadcn/ui`, enforce the "Strictly Dark Mode" theme, and create the required directory structure.
5.  **Phase 5: Verification & Commit**: Perform a final, non-blocking verification of the entire setup and create a final commit.

---

### TASK 1: Initial Project Scaffolding
*Goal: Create the base Tauri + React + TypeScript project without conflicting with existing directories.*

1.  **Execute Scaffolding**: Run `pnpm create tauri-app` to generate the project in a temporary sub-directory.
    - When prompted, provide the following answers:
        - **Project name**: `will-done-temp`
        - **Choose your package manager**: `pnpm`
        - **Choose your UI template**: `react-ts`
2.  **Relocate Project Files**: Move all contents (including hidden dotfiles) from the `will-done-temp` directory into the current root directory.
3.  **Cleanup**: Remove the now-empty `will-done-temp` directory.
4.  **Install Dependencies**: Run `pnpm install` to fetch all the initial node modules.
5.  **Initial Commit**: Create a git commit with the message "chore: initial tauri react-ts scaffold".

*QA: The root directory should contain `package.json`, `src/`, and `src-tauri/`.*

---

### TASK 2: Frontend Dependencies & Design System Setup
*Goal: Install and configure Tailwind CSS, shadcn/ui, and all other required frontend libraries.*

1.  **Install Tailwind CSS**: Add Tailwind CSS, PostCSS, and Autoprefixer as development dependencies.
2.  **Initialize Tailwind**: Generate `tailwind.config.ts` and `postcss.config.js` files.
3.  **Configure Tailwind Paths**: Edit `tailwind.config.ts` to include the paths to all template files.
4.  **Add Tailwind Directives**: Add the `@tailwind` directives to the main CSS file (`src/styles.css` or similar).
5.  **Initialize shadcn/ui**: Run the `shadcn/ui init` command to set up the UI library. Provide default answers to the interactive prompts. This will create `components.json` and update project files.
6.  **Install Core Components**: Use the `shadcn/ui add` command to install the following components: `button`, `input`, `dialog`, `card`, `select`, `label`.
7.  **Install Additional Libraries**: Install the remaining libraries using `pnpm add`:
    - `react-hook-form zod @hookform/resolvers`
    - `framer-motion @hello-pangea/dnd`
    - `react-markdown remark-gfm`
    - `dayjs`
    - `lucide-react`
8.  **Configure Strict Dark Mode**:
    - Modify the root CSS file (`src/styles.css`) to set the dark theme colors as specified in `DESIGN.md`. Ensure the `body` has `bg-zinc-950` and appropriate text colors.
    - Edit `tailwind.config.ts` to set `darkMode: "class"` and ensure the default theme is dark.
    - In the main `index.html` file, add `class="dark"` to the `<html>` tag to enforce dark mode by default.

*QA: `package.json` should list all the new dependencies. `tailwind.config.ts` and `components.json` should be correctly configured.*

---

### TASK 3: Backend (Rust) Dependency Setup
*Goal: Add the required crates to the backend application.*

1.  **Navigate to Tauri directory**: All commands should be relative to the `src-tauri` directory.
2.  **Add Crates**: Use the `cargo add` command to add the following crates to `src-tauri/Cargo.toml`:
    - `rusqlite`
    - `tokio -F full`
    - `serde -F derive`
    - `serde_json`
    - `reqwest`
    - `chrono -F serde`

*QA: `src-tauri/Cargo.toml` should contain all the specified crates under `[dependencies]`.*

---

### TASK 4: Directory Structure Optimization
*Goal: Create the clean architecture directory structure for future development.*

1.  **Create Frontend Directories**: Use `mkdir -p` to create the following directories inside `src/`:
    - `src/components`
    - `src/features`
    - `src/hooks`
    - `src/lib`
    - `src/store`
2.  **Create Backend Directories**: Use `mkdir -p` to create the following directories inside `src-tauri/src/`:
    - `src-tauri/src/commands`
    - `src-tauri/src/database`
    - `src-tauri/src/models`
    - `src-tauri/src/usecases`

*QA: All specified directories must exist in the filesystem.*

---

### TASK 5: Final Verification and Commit
*Goal: Verify the entire setup using non-blocking commands and create a final commit.*

1.  **Verify Backend Compilation**: Run `cargo check --manifest-path src-tauri/Cargo.toml` to ensure all Rust dependencies are correctly resolved and the project compiles.
2.  **Verify Frontend Build**: Run `pnpm build` to ensure the frontend code and all its dependencies build successfully.
3.  **Final Commit**: Create a git commit with the message "feat: configure project dependencies, structure, and dark mode".

*QA: Both the `cargo check` and `pnpm build` commands must exit with a status code of 0.*
