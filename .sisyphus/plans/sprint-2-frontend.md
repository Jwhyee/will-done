# Sprint 2 (Frontend) - Onboarding UI Plan

## 🎯 Goal
Implement a multi-step onboarding UI using React, React Hook Form, Zod, and Framer Motion.
The flow will collect user preferences and invoke the backend `setup_workspace` command.

## 🏗️ Technical Stack
- **Routing**: `react-router-dom` v6
- **Forms**: `react-hook-form` + `zod` validation
- **Animations**: `framer-motion` (for step sliding)
- **UI Components**: Existing local `src/components/ui/` primitives (shadcn-like)
- **State/IPC**: `@tauri-apps/api/core` (`invoke`)

## 📝 Flow Design & Logic (Decision Complete)

### Schema & Data Handling
The onboarding flow requires collecting data across 4 steps. Since the backend `setup_workspace` command specifically only requires `name`, `core_time_start`, `core_time_end`, `role_intro`, and `unplugged_times`, we will persist the `nickname` (Step 1) and `apiKey` (Step 4) in the frontend `localStorage` for now.

```typescript
import { z } from "zod";

export const unpluggedTimeSchema = z.object({
  label: z.string().min(1, "Label is required"),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time (HH:mm)"),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time (HH:mm)"),
}).refine(data => data.start_time < data.end_time, {
  message: "End time must be after start time",
  path: ["end_time"]
});

export const onboardingSchema = z.object({
  nickname: z.string().min(1, "Nickname is required"),
  workspaceName: z.string().min(1, "Workspace name is required"),
  coreTimeStart: z.string().optional(),
  coreTimeEnd: z.string().optional(),
  roleIntro: z.string().default(""),
  unpluggedTimes: z.array(unpluggedTimeSchema).default([]),
  apiKey: z.string().optional()
});

export type OnboardingData = z.infer<typeof onboardingSchema>;
```

### UX & Animation
- The container should be centered (`max-w-md` or `max-w-lg`).
- Transitions between steps will use `framer-motion`'s `AnimatePresence`. 
- Animation: Slide in from right when moving forward, slide out to left (and vice versa for "Back").
- Global Theme: Dark mode is default.

---

## 📋 Implementation Tasks

### Task 1: Router Setup (`src/main.tsx`, `src/App.tsx`)
- Set up `BrowserRouter` in `main.tsx`.
- Create `src/pages/Home.tsx` (Empty placeholder for post-onboarding layout).
- Define `<Routes>` in `App.tsx`:
  - `/` -> `<Onboarding />`
  - `/home` -> `<Home />`
- **Acceptance Criteria**: App loads Onboarding page by default, and can navigate to `/home`.

### Task 2: Schema & Base Layout (`src/features/onboarding/`)
- Create `src/features/onboarding/schema.ts` with the Zod schema above.
- Create `src/features/onboarding/components/StepLayout.tsx`:
  - Uses `framer-motion` to wrap children.
  - Receives `direction` prop (1 for forward, -1 for backward) to dictate the `initial` and `exit` x-coordinates.
- **Acceptance Criteria**: Schema is exportable, layout handles enter/exit slide animations.

### Task 3: Step Components (`src/features/onboarding/components/`)
- Implement `Step1Profile.tsx`: Needs `nickname` input.
- Implement `Step2Workspace.tsx`: Needs `workspaceName` input.
- Implement `Step3TimeRole.tsx`:
  - Core Time Start/End inputs.
  - `roleIntro` Textarea.
  - Uses `useFieldArray` from `react-hook-form` to manage the list of `unpluggedTimes`. Add a "+ Add Unplugged Time" button.
- Implement `Step4AI.tsx`: Needs `apiKey` input.
- **Acceptance Criteria**: Each step component accepts the RHF `control` or `register` props and renders the existing `src/components/ui/` primitives (Input, Label, Button).

### Task 4: Main Controller (`src/pages/Onboarding.tsx`)
- Implement the master form using `useForm<OnboardingData>({ resolver: zodResolver(onboardingSchema) })`.
- Maintain state: `const [step, setStep] = useState(0)` and `direction`.
- Implement `nextStep` (validates current step fields before incrementing) and `prevStep`.
- Render the current step component conditionally based on `step`, wrapped in `<AnimatePresence mode="wait" custom={direction}>`.
- Implement `onSubmit`:
  1. Call Tauri: `invoke("setup_workspace", { name: data.workspaceName, coreTimeStart: data.coreTimeStart, coreTimeEnd: data.coreTimeEnd, roleIntro: data.roleIntro, unpluggedTimes: data.unpluggedTimes })`.
  2. Save `nickname` and `apiKey` to `localStorage`.
  3. `navigate('/home')`.
- **Acceptance Criteria**: Multi-step flow prevents progression on invalid input, handles transitions, correctly formats data for Rust `setup_workspace` command (handling snake_case vs camelCase if needed), and routes to Home on completion.

## Final Verification Wave
- Test validation blocks (e.g., empty nickname blocks Step 1 -> Step 2).
- Test animation direction (sliding left/right matches forward/back).
- Test Tauri IPC invocation succeeds and routes to `/home`.