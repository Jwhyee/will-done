import { z } from "zod";

export const unpluggedTimeSchema = z.object({
  label: z.string().min(1, "Label is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
}).refine(data => data.start_time < data.end_time, {
  message: "End time must be after start time",
  path: ["end_time"]
});

export const onboardingSchema = z.object({
  nickname: z.string().min(1, "Nickname is required"),
  workspaceName: z.string().min(1, "Workspace name is required"),
  coreTimeStart: z.string().optional(),
  coreTimeEnd: z.string().optional(),
  roleIntro: z.string(),
  unpluggedTimes: z.array(unpluggedTimeSchema),
  apiKey: z.string().optional()
});

export type OnboardingData = z.infer<typeof onboardingSchema>;
