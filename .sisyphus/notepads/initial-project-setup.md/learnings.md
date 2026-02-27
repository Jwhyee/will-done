## Learnings
- pnpm was not in the path but available via npx pnpm.
- create-tauri-app can be run non-interactively with flags: `npx create-tauri-app will-done-temp --template react-ts --manager pnpm --yes`.
- Moving files from a temporary directory is a good way to scaffold into a non-empty directory.
## Frontend Dependencies & Design System Setup
- Installed Tailwind CSS v3 and initialized it.
- Configured Tailwind paths in `tailwind.config.ts`.
- Added Tailwind directives to `src/index.css`.
- Initialized shadcn/ui and installed core components (`button`, `input`, `dialog`, `card`, `select`, `label`).
- Installed additional frontend libraries (`react-hook-form`, `zod`, `@hookform/resolvers`, `framer-motion`, `@hello-pangea/dnd`, `react-markdown`, `remark-gfm`, `dayjs`, `lucide-react`).
- Configured Strict Dark Mode in `index.html`, `tailwind.config.ts`, and `src/index.css`.
- Fixed `tsconfig.json` and `vite.config.ts` to support path aliases (`@/*`) required by shadcn/ui.

### Backend (Rust) Dependency Setup
- Rust was not initially found in the environment. Installed it using the standard rustup installer.
- Used absolute path `/Users/jwhy/.cargo/bin/cargo` to ensure the correct binary is used.
- Successfully added `rusqlite`, `tokio` (full), `serde` (derive), `serde_json`, `reqwest`, and `chrono` (serde) to `src-tauri/Cargo.toml`.
- Verified the setup with `cargo check`, which passed successfully.
