# Onboarding UX Improvements

- [x] **Schema Validation**: Modify `src/features/onboarding/schema.ts` to add a refinement to the Zod schema. This refinement will check if `coreTimeStart` is filled while `coreTimeEnd` is empty, or vice-versa. If so, it should return a validation error with a Korean message.
- [ ] **UI Descriptions and Layout**: Edit `src/features/onboarding/components/Step3TimeRole.tsx` to:
    - [ ] Add a `<p>` tag with a descriptive text for the Core Time section.
    - [ ] Add a `<p>` tag with a descriptive text for the Unplugged Time section.
    - [ ] Move the "Add Unplugged Time" button below the section label. This will likely involve wrapping the label and button in a flex container with `flex-col`.
- [ ] **Core Time Reset Button**: In `src/features/onboarding/components/Step3TimeRole.tsx`, add a reset `Button` component next to the core time inputs. The `onClick` handler for this button should use the `setValue` function from `react-hook-form` to set both `coreTimeStart` and `coreTimeEnd` to empty strings.
- [ ] **Navigation Fix**: Investigate and fix the navigation issue in `src/pages/Onboarding.tsx`. The `navigate('/home')` call on line 53 should be executing correctly. Verify that there are no preceding errors and that the `invoke` call to `setup_workspace` is completing successfully. Ensure all state updates related to form submission are handled correctly to allow the navigation to trigger.
- [ ] **Verification**: After all changes are implemented, run `npm run build` to ensure there are no build errors. Manually test the onboarding flow to confirm all new features and fixes are working as expected.
