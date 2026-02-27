# 🎨 UI/UX Design Specification: "will-done"

## Global Theme & Design System

* **Theme**: Strictly Dark Mode. High contrast for readability to reduce eye strain for developers.
* **Backgrounds**: Deepest dark (e.g., `#09090b`) for the app background. Slightly lighter dark (e.g., `#18181b`) for surfaces, cards, and sidebars.
* **Borders**: Subtle dark borders (e.g., `#27272a`) to separate sections.
* **Text**: Primary text must be near-white. Muted/placeholder text should be gray.

* **Typography**: Sans-serif for UI elements. Monospace font MUST be used for live clocks and time duration displays to prevent horizontal layout shifting.
* **Markdown Renderers**: Any field displaying a "Planning Memo", "Review Memo", or "AI Retrospective" MUST render markdown (Headings, bold, lists, inline code blocks).

---

## 0. Onboarding Screen (Multi-step Setup)

*Layout: Centered, sleek card container (max-width: 500px). Smooth slide-in/out animations between steps.*

* **Step 1 (Profile)**: Text input for Nickname.
* **Step 2 (Workspace Name)**: Text input for Workspace Name.
* **Step 3 (Time & Role)**:
* **Core Time**: Two time-picker inputs (Start, End). Clearly marked as "Optional".
* **Unplugged Time**: A dynamic list. Each item has a text input for [Label] and time-pickers for [Start, End]. A `[+ Add Unplugged Time]` button at the bottom.
* **Role Intro**: A large textarea.


* **Step 4 (AI)**: Text input for the AI API Key. A prominent `[Complete]` button.

---

## 1. Sidebar Navigation (Dual Sidebar Layout)

*Layout: Docked to the left edge of the screen. Divided into a narrow Primary Sidebar and a wider Secondary Sidebar.*

### A. Primary Sidebar (Workspace Selector)

*Layout: Narrow, vertical strip (e.g., 64px wide). Behaves similar to Slack's workspace switcher.*

* **Workspace Icons**: Displays rounded square icons or initials for each created workspace.
* **Active State**: The currently selected workspace is highlighted with a distinct left border or glowing effect.
* **Add Workspace**: A persistent `[+]` icon button at the bottom to trigger the creation of a new workspace.

### B. Secondary Sidebar (Workspace Context)

*Layout: Fixed width (e.g., 256px), attached to the right of the Primary Sidebar. Displays data specific to the actively selected workspace.*

* **Top (Date Search & Archive)**:
* A Date Picker or Date Input field.
* *Behavior*: Selecting a date opens a Modal displaying the completed tasks and review memos for that specific day.

* **Middle (Inbox / Unscheduled Task Queue)**:
* A scrollable list of unprocessed Task Cards waiting to be scheduled.
* Cards MUST have a drag-handle icon indicating they can be dragged and dropped onto the Right Main Workspace (Timeline).

* **Bottom (Settings)**:
* A persistent Gear icon + "Settings" button.
* *Behavior*: Clicking this opens the Workspace Settings view/modal where users can reconfigure `Core Time`, `Unplugged Time`, `Role Intro`, and Workspace Name.

---

## 2. Right Main Workspace (Execution & Tracking)

*Layout: Takes the remaining horizontal space to the right of the Secondary Sidebar. Displays the active workspace's timeline and tasks. Divided into Header and Timeline Board.*

### A. Header (Greeting & Input Controls)

* **Top Row**:
* **Live Clock**: Monospaced `HH:mm:ss`.
* **Intelligent Greeting**: Faded text displaying the time-contextual greeting (e.g., "Good morning, [Nickname]...").
* **AI Button**: A visually distinct **[✨ Generate Retrospective]** button anchored to the top right. Enabled only if Completed Tasks >= 1.

* **Input Row (Low-Friction)**:
* A horizontal flex container.
* `[Task Title Input]` (Expands to fill space).
* `[Hours Input]` & `[Minutes Input]`: Strict number inputs with up/down arrows. Min/Max constraints applied visually (e.g., 0-23, 0-59).
* `[🔥 Urgent Task]` Checkbox: Red accent color.
* `[Add Task]` Submit button.

* **Planning Memo Area**:
* Immediately below the input row, a collapsible markdown textarea with the placeholder: *"Write specific steps, references, or goals to complete this task."*

### B. The Timeline Board

*Layout: A vertical (or chronological) list representing the day's time flow.*

* **Visual States for TimeBlocks**:
* **`Done` (Completed)**: Green accent borders. Subtle green background. Clickable to reveal the Review Memo.
* **`Now` (Running)**: Highly prominent. A solid **Red horizontal line** indicating the exact current time cutting across the block. The block itself has a soft red/orange glowing shadow.
* **`Will` (Scheduled)**: Semi-transparent blue/gray blocks. Hovering reveals a grab cursor for Drag & Drop reordering.
* **`Unplugged` (Blocked)**: Distinct repeating diagonal striped pattern (dark gray on black). Displays the custom Label (e.g., "Lunch", "Gym").


* **Urgent Task Visuals (Split Tasks)**:
* If a task was split by an urgent interruption, the `[Logged Time]` block and the `[Remaining Time]` block MUST share the same accent color.
* A dashed vertical line connecting the two pieces should visually indicate they belong to the same parent Task.

---

## 3. Overlay Popups & Dialogs

*UI: Renders above the Main Workspace with a blurred dark backdrop.*

### A. Task Expiration & Transition Modal

*Triggered when a running task's time is up.*

* **Header**: "Task Time is Up: [Task Title]"
* **Section 1: Delay vs. Complete**:
* Radio buttons or distinct selectable cards:
* *Need more time (15m/30m)*
* *Finished on time*
* *Took X extra mins* (Reveals a number input).

* **Section 2: Review Memo**:
* A markdown textarea to quickly log outcomes or blockers.

* **Section 3: Next Task Action** (Only visible if there is a next scheduled task):
* "Start Next Task ([Next Task Title]):"
* Options: `[Start Immediately]`, `[Wait 5m]`, `[Wait 10m]`, `[Wait 15m]`, `[Custom...]`, `[Undecided/Pause]`.


* **Action**: A primary `[Confirm]` button at the bottom.

### B. Overtime Alert Modal

*Triggered 30 mins before Core Time End.*

* **Visuals**: Warning colors (Yellow/Amber borders and icons).
* **Content**: Lists the remaining tasks and shows the calculated finish time: *"If you continue without breaks, you will finish at [Calculated Time]."*
* **Actions**:
* `[Yes, move remaining to Inbox]` (Secondary style).
* `[No, I will finish them today]` (Primary style).


### C. Archive & AI Retrospective Viewer Modal

* **Layout**: A wide, spacious modal focusing on readability.
* **Trigger**: Opened by selecting a date in the Secondary Sidebar, or by clicking the Generate Retrospective button.
* **Content**: Displays the daily log or a rich Markdown viewer displaying the AI-generated summary.
* **Actions**: `[Copy to Clipboard]` button.

### D. Edit Completed Task Protection

* If a user clicks a `Done` task to edit it, a standard Alert Dialog MUST appear warning: *"This task is already marked as completed. Are you sure you want to edit it?"* Require a `[Confirm]` click before opening the edit form.