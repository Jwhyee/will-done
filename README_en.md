# 🚀 will-done

<div align="right">
  <a href="./README.md">한국어</a> | <strong>English</strong>
</div>

**"A time tracker that turns your scattered work hours into a powerful career portfolio."**

Are you preparing for a job change but struggling to remember your daily achievements? Have you ever lost track of your planned tasks due to sudden, urgent requests?

`will-done` is not just another TODO app. 
It is a desktop productivity tool designed to help you systematically design your work hours (**will**) and turn your completed records (**done**) into a powerful **Brag Document** for your next salary negotiation or resume update.

---

## 💡 Who is this for?

* [x] Professionals who feel empty after work, wondering, "What did I actually do today?"
* [x] Junior developers struggling to recall past tasks when updating their resumes.
* [x] Hyper-focused individuals who easily lose track of time and miss other scheduled tasks.
* [x] Privacy-conscious users who want their work data safely stored locally, not on external servers.

With **will-done**, every minute of your time builds your career.

---

## ✨ Core Features

### 1. Intelligent Time-Shift & Scheduling Engine
* **Urgent Task Handling**: When a sudden, urgent task arises, the app instantly suspends (PENDING) and splits your current task. The scheduler mathematically calculates the duration of the urgent task and accurately pushes back (Shifts) all subsequent planned schedules.
* **Unplugged Time Evasion**: Set fixed non-working hours (e.g., lunch breaks, regular meetings). The scheduler will automatically split and allocate task blocks to avoid these "unplugged" periods.

### 2. AI-Powered Retrospective & Brag Document Generator
* **Automated Brag Documents**: It aggregates 'plan notes' and 'review notes' from completed tasks to generate professional, markdown-formatted performance reports tailored to your predefined Role Intro.
* **Multi-Model Fallback Engine**: To ensure maximum stability against Gemini API Quota Exceeded (429) or Server Errors, the engine automatically switches and retries in the following order: `Local Cache Model -> flash-lite -> flash -> pro`.

### 3. Context Isolation & Local-First Privacy
* **Workspace-Based Isolation**: Perfectly isolates your Core Time settings and AI prompt contexts by Workspace. Manage your side projects and main job in a single app without mixing up the data.
* **Absolute Data Sovereignty**: All data is securely stored in a local SQLite database rather than external servers, providing ultimate privacy and security.

---

## 🛠️ Tech Stack

**will-done** is built with a modern stack to deliver top-tier desktop performance and a seamless UI/UX.

### Frontend
* **Core**: React 18, TypeScript, Vite
* **Styling/UI**: Tailwind CSS, shadcn/ui, Framer Motion (Fluid transitions & glow effects)
* **State/Interaction**: `dnd-kit` (Drag-and-drop based Inbox/Timeline), `react-hook-form` + `zod`

### Backend (Core Engine)
* **Framework**: Tauri v2
* **Language**: Rust
* **Database**: SQLite (`sqlx`, async connection pool & transaction management)
* **Concurrency**: `tokio`

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [Rust](https://www.rust-lang.org/tools/install)
* OS-specific Tauri dependencies (macOS: Xcode Command Line Tools, Windows: C++ Build Tools)

### Installation

1. Clone the repository:
```bash
git clone [https://github.com/USERNAME/will-done.git](https://github.com/USERNAME/will-done.git)
cd will-done

```

2. Install NPM packages:

```bash
npm install

```

3. Run the app in development mode:

```bash
npm run tauri dev

```

---

## 🏗️ System Architecture

The architecture strictly separates the frontend (UI rendering & state management) and the backend (DB I/O & scheduling calculations) to maintain a scalable and clean codebase.

```text
will-done/
├── src/                      # Frontend (React/TS)
│   ├── components/           # Reusable UI & Layouts
│   ├── features/             # Domain-specific business logic
│   │   ├── workspace/        # Timeline, Task Blocks, DND views
│   │   ├── retrospective/    # AI Retrospective form & browser
│   │   └── onboarding/       # Initial setup flow
│   ├── lib/                  # i18n & Utilities
│   └── types/                # Shared TypeScript Interfaces
└── src-tauri/                # Backend (Rust)
    ├── src/
    │   ├── commands/         # Tauri IPC Command Layer
    │   ├── database/         # Data Access Layer (DAL), SQL queries
    │   ├── models.rs         # Data entities & DTOs
    │   └── error.rs          # Unified error handling
    └── Cargo.toml

```

## 🧠 Core Domain Lifecycle

1. **Inbox -> Timeline**: Temporarily save ideas or tasks in the Inbox, then drag-and-drop them into the Timeline to schedule them (**WILL**).
2. **Transition (NOW)**: When a task starts based on the schedule, its state changes to `NOW`. If the deadline passes, the UI sends a warning with a red "breathing" glow effect.
3. **Completion (DONE)**: Upon finishing a task, log the actual time spent and a review memo to mark it as `DONE`. (Past blocks of a split task are synchronized automatically.)
4. **Archive (AI)**: At the end of the week or month, compile your accumulated `DONE` data into a high-quality 'Retrospective/Brag Document' with a single click.